// Request schema for creating a digest report
export interface CreateReportRequest {
  source: "youtube" | "podcast" | "article";
  channel_id?: string;
  video_id?: string;
  url?: string;
  format: "summary" | "detailed" | "bullet_points";
  language: string;
  delivery: {
    method: "email" | "webhook" | "none";
    address?: string;
    webhook_url?: string;
  };
}

// Response schema for created report
export interface CreateReportResponse {
  status: "success" | "processing" | "failed";
  report_id: string;
  summary?: {
    title: string;
    key_points: string[];
    word_count: number;
  };
  delivery_status: "queued" | "sent" | "failed" | "none";
  timestamp: string;
}

// Get report by ID response
export interface GetReportResponse {
  report_id: string;
  status: "processing" | "completed" | "failed";
  source: string;
  format: string;
  language: string;
  summary?: {
    title: string;
    key_points: string[];
    word_count: number;
    full_text?: string;
  };
  delivery_status: string;
  created_at: string;
  completed_at?: string;
}

// Legacy types (kept for backward compatibility)
export interface Report {
  id: string;
  title?: string;
  createdAt?: string;
}

export interface ReportUpsertRequest {
  title?: string;
  createdAt?: string;
}

export interface ReportUpsertResponse {
  id: string;
  ok: boolean;
  message?: string;
}

export interface ErrorResponse {
  message: string;
  [k: string]: unknown;
}
