import { CreateReportRequest, GetReportResponse, Report, ReportUpsertRequest } from "../types/report.js";
import { sendDigestEmail } from "../services/emailService.js";
import { pool } from "../lib/db.js";

interface StoredReport {
  report_id: string;
  status: "processing" | "completed" | "failed";
  source: string;
  channel_id?: string;
  video_id?: string;
  url?: string;
  format: string;
  language: string;
  summary?: {
    title: string;
    key_points: string[];
    word_count: number;
    full_text?: string;
  };
  delivery: {
    method: string;
    address?: string;
    webhook_url?: string;
  };
  delivery_status: "queued" | "sent" | "failed" | "none";
  created_at: string;
  completed_at?: string;
}

class ReportRepository {
  private legacyStore = new Map<string, Report>(); // Keep legacy store for backward compatibility

  // New API: Create report from request
  async create(request: CreateReportRequest): Promise<StoredReport> {
    const reportId = `rpt_${new Date().toISOString().split('T')[0].replace(/-/g, '')}_${Math.random().toString(36).substr(2, 6)}`;
    
    // Insert into database
    const result = await pool.query(
      `INSERT INTO reports (
        report_id, status, source, channel_id, video_id, url, format, language,
        delivery_method, delivery_address, delivery_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        reportId,
        'processing',
        request.source,
        request.channel_id || null,
        request.video_id || null,
        request.url || null,
        request.format,
        request.language,
        request.delivery.method,
        request.delivery.address || request.delivery.webhook_url || null,
        request.delivery.method === 'none' ? 'none' : 'queued'
      ]
    );

    const dbReport = result.rows[0];

    // Simulate async processing (in production, use a job queue)
    setTimeout(() => {
      this.completeReport(reportId).catch(console.error);
    }, 2000);

    return this.mapDbToStored(dbReport);
  }

  // Simulate report completion (mock data)
  private async completeReport(reportId: string): Promise<void> {
    // Fetch report from database
    const result = await pool.query(
      'SELECT * FROM reports WHERE report_id = $1',
      [reportId]
    );

    if (result.rows.length === 0) return;

    const mockSummary = {
      title: "AI Agent Revolution - Cognitive Era",
      key_points: [
        "LLMs are redefining reasoning",
        "Agents are the next paradigm",
        "Cognitive architectures enable complex workflows"
      ],
      word_count: 523,
      full_text: "This is a placeholder for the full summary text..."
    };

    // Update report with summary
    await pool.query(
      `UPDATE reports SET
        status = $1,
        summary_title = $2,
        summary_points = $3,
        word_count = $4,
        full_text = $5,
        completed_at = $6
      WHERE report_id = $7`,
      [
        'completed',
        mockSummary.title,
        mockSummary.key_points,
        mockSummary.word_count,
        mockSummary.full_text,
        new Date(),
        reportId
      ]
    );

    const report = result.rows[0];

    // Send email if delivery method is email
    if (report.delivery_method === "email" && report.delivery_address) {
      try {
        const emailResult = await sendDigestEmail(report.delivery_address, {
          title: mockSummary.title,
          key_points: mockSummary.key_points,
          word_count: mockSummary.word_count,
          full_text: mockSummary.full_text,
          source: report.source,
          video_id: report.video_id,
          channel_id: report.channel_id,
          url: report.url,
          language: report.language,
          report_id: report.report_id,
        });

        const deliveryStatus = emailResult.success ? "sent" : "failed";
        await pool.query(
          'UPDATE reports SET delivery_status = $1 WHERE report_id = $2',
          [deliveryStatus, reportId]
        );
        console.log(`Email delivery for ${reportId}: ${emailResult.success ? "success" : "failed"}`);
      } catch (error) {
        console.error(`Failed to send email for report ${reportId}:`, error);
        await pool.query(
          'UPDATE reports SET delivery_status = $1 WHERE report_id = $2',
          ['failed', reportId]
        );
      }
    } else {
      const deliveryStatus = report.delivery_method === "none" ? "none" : "queued";
      await pool.query(
        'UPDATE reports SET delivery_status = $1 WHERE report_id = $2',
        [deliveryStatus, reportId]
      );
    }
  }

  // Get report by ID
  async getReport(id: string): Promise<GetReportResponse | null> {
    const result = await pool.query(
      'SELECT * FROM reports WHERE report_id = $1',
      [id]
    );

    if (result.rows.length === 0) return null;

    const report = result.rows[0];

    return {
      report_id: report.report_id,
      status: report.status,
      source: report.source,
      format: report.format,
      language: report.language,
      summary: report.summary_title ? {
        title: report.summary_title,
        key_points: report.summary_points || [],
        word_count: report.word_count || 0,
        full_text: report.full_text,
      } : undefined,
      delivery_status: report.delivery_status,
      created_at: report.created_at.toISOString(),
      completed_at: report.completed_at?.toISOString(),
    };
  }

  // Helper: Map database row to StoredReport
  private mapDbToStored(dbReport: any): StoredReport {
    return {
      report_id: dbReport.report_id,
      status: dbReport.status,
      source: dbReport.source,
      channel_id: dbReport.channel_id,
      video_id: dbReport.video_id,
      url: dbReport.url,
      format: dbReport.format,
      language: dbReport.language,
      summary: dbReport.summary_title ? {
        title: dbReport.summary_title,
        key_points: dbReport.summary_points || [],
        word_count: dbReport.word_count || 0,
        full_text: dbReport.full_text,
      } : undefined,
      delivery: {
        method: dbReport.delivery_method,
        address: dbReport.delivery_address,
      },
      delivery_status: dbReport.delivery_status,
      created_at: dbReport.created_at.toISOString(),
      completed_at: dbReport.completed_at?.toISOString(),
    };
  }

  // Legacy API: Get (for backward compatibility)
  async get(id: string): Promise<Report | null> {
    return this.legacyStore.get(id) ?? null;
  }

  // Legacy API: Upsert (for backward compatibility)
  async upsert(id: string, payload: ReportUpsertRequest): Promise<Report> {
    const existing = this.legacyStore.get(id) ?? { id };
    const next: Report = { ...existing };
    if (typeof payload.title === "string") next.title = payload.title;
    if (typeof payload.createdAt === "string") next.createdAt = payload.createdAt;
    if (!next.createdAt) next.createdAt = new Date().toISOString();
    this.legacyStore.set(id, next);
    return next;
  }
}

export const reportRepo = new ReportRepository();
