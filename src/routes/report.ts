import { FastifyPluginAsync } from "fastify";
import { reportRepo } from "../repo/reportRepo.js";
import { 
  CreateReportRequest, 
  CreateReportResponse,
  GetReportResponse,
  ReportUpsertRequest, 
  ReportUpsertResponse 
} from "../types/report.js";
import { sendTestEmail } from "../services/emailService.js";

function isISODateString(value: string): boolean {
  // Minimal ISO validation
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value);
}

export const reportRoutes: FastifyPluginAsync = async (fastify) => {
  // NEW API: Create digest report
  fastify.post<{ Body: CreateReportRequest }>("/api/reports", async (req, reply) => {
    const body = req.body;

    // Validate required fields
    if (!body.source || !body.format || !body.language || !body.delivery) {
      return reply.code(400).send({ 
        message: "Missing required fields: source, format, language, delivery" 
      });
    }

    // Validate source-specific fields
    if (body.source === "youtube" && !body.video_id && !body.url) {
      return reply.code(400).send({ 
        message: "YouTube source requires either video_id or url" 
      });
    }

    // Validate delivery configuration
    if (body.delivery.method === "email" && !body.delivery.address) {
      return reply.code(400).send({ 
        message: "Email delivery requires address" 
      });
    }

    if (body.delivery.method === "webhook" && !body.delivery.webhook_url) {
      return reply.code(400).send({ 
        message: "Webhook delivery requires webhook_url" 
      });
    }

    try {
      const report = await reportRepo.create(body);
      
      const response: CreateReportResponse = {
        status: "success",
        report_id: report.report_id,
        summary: report.summary,
        delivery_status: report.delivery_status,
        timestamp: report.created_at,
      };

      return reply.code(201).send(response);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ 
        message: "Failed to create report" 
      });
    }
  });

  // NEW API: Get report by ID
  fastify.get<{ Params: { id: string } }>("/api/reports/:id", async (req, reply) => {
    const { id } = req.params;
    
    const report = await reportRepo.getReport(id);
    
    if (!report) {
      return reply.code(404).send({ 
        message: `Report ${id} not found` 
      });
    }

    return reply.code(200).send(report);
  });

  // LEGACY API: Get report (backward compatibility)
  fastify.get<{ Params: { id: string } }>("/api/report/:id", async (req, reply) => {
    const { id } = req.params;
    const found = await reportRepo.get(id);
    const payload = {
      id,
      report: found,
      message: "placeholder – implement data source later",
    };
    return reply.code(200).send(payload);
  });

  // LEGACY API: Upsert report (backward compatibility)
  fastify.post<{ Params: { id: string }; Body: ReportUpsertRequest }>("/api/report/:id", async (req, reply) => {
    const { id } = req.params;
    const body = req.body ?? {};

    // Reject unknown properties (additionalProperties: false)
    const allowedKeys = new Set(["title", "createdAt"]);
    for (const key of Object.keys(body)) {
      if (!allowedKeys.has(key)) {
        return reply.code(400).send({ message: `Invalid payload: unexpected property '${key}'` });
      }
    }

    if (body.createdAt && !isISODateString(body.createdAt)) {
      return reply.code(400).send({ message: "Invalid payload: createdAt must be ISO-8601 string (e.g., 2025-01-05T10:15:00Z)" });
    }

    const saved = await reportRepo.upsert(id, body);
    const res: ReportUpsertResponse = { id: saved.id, ok: true, message: "placeholder – create/update not implemented" };
    return reply.code(200).send(res);
  });

  // TEST ENDPOINT: Send test email
  fastify.post<{ Body: { email: string } }>("/api/test/email", async (req, reply) => {
    const { email } = req.body;

    if (!email) {
      return reply.code(400).send({ message: "Email address is required" });
    }

    try {
      const result = await sendTestEmail(email);
      
      if (result.success) {
        return reply.code(200).send({ 
          success: true, 
          message: `Test email sent to ${email}` 
        });
      } else {
        return reply.code(500).send({ 
          success: false, 
          message: result.error || "Failed to send test email" 
        });
      }
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ 
        success: false, 
        message: error.message || "Failed to send test email" 
      });
    }
  });
};
