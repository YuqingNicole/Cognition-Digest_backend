# API 使用示例

## 新版 API（推荐）

### 1. 创建摘要报告

**端点**: `POST /api/reports`

**请求示例**:

```bash
curl -X POST http://localhost:4000/api/reports \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-token-1" \
  -d '{
    "source": "youtube",
    "channel_id": "UCabc123",
    "video_id": "xyz789",
    "format": "summary",
    "language": "en",
    "delivery": {
      "method": "email",
      "address": "user@example.com"
    }
  }'
```

**响应示例** (201 Created):

```json
{
  "status": "success",
  "report_id": "rpt_20251007_abc123",
  "summary": {
    "title": "AI Agent Revolution - Cognitive Era",
    "key_points": [
      "LLMs are redefining reasoning",
      "Agents are the next paradigm"
    ],
    "word_count": 523
  },
  "delivery_status": "queued",
  "timestamp": "2025-10-07T10:30:45Z"
}
```

### 2. 获取报告详情

**端点**: `GET /api/reports/:id`

**请求示例**:

```bash
curl http://localhost:4000/api/reports/rpt_20251007_abc123 \
  -H "Authorization: Bearer dev-token-1"
```

**响应示例** (200 OK):

```json
{
  "report_id": "rpt_20251007_abc123",
  "status": "completed",
  "source": "youtube",
  "format": "summary",
  "language": "en",
  "summary": {
    "title": "AI Agent Revolution - Cognitive Era",
    "key_points": [
      "LLMs are redefining reasoning",
      "Agents are the next paradigm",
      "Cognitive architectures enable complex workflows"
    ],
    "word_count": 523,
    "full_text": "This is a placeholder for the full summary text..."
  },
  "delivery_status": "sent",
  "created_at": "2025-10-07T10:30:45Z",
  "completed_at": "2025-10-07T10:30:47Z"
}
```

## 请求参数说明

### CreateReportRequest

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `source` | string | ✅ | 内容来源: `youtube`, `podcast`, `article` |
| `channel_id` | string | ❌ | 频道 ID（YouTube 可选） |
| `video_id` | string | ❌ | 视频 ID（YouTube 需要 video_id 或 url 之一） |
| `url` | string | ❌ | 内容 URL（可替代 video_id） |
| `format` | string | ✅ | 摘要格式: `summary`, `detailed`, `bullet_points` |
| `language` | string | ✅ | 语言代码，如 `en`, `zh`, `ja` |
| `delivery` | object | ✅ | 投递配置 |
| `delivery.method` | string | ✅ | 投递方式: `email`, `webhook`, `none` |
| `delivery.address` | string | ❌ | 邮箱地址（method=email 时必填） |
| `delivery.webhook_url` | string | ❌ | Webhook URL（method=webhook 时必填） |

### 响应状态说明

| 状态 | 说明 |
|------|------|
| `processing` | 正在处理中 |
| `completed` | 已完成 |
| `failed` | 处理失败 |

| 投递状态 | 说明 |
|----------|------|
| `queued` | 等待发送 |
| `sent` | 已发送 |
| `failed` | 发送失败 |
| `none` | 不投递 |

## 使用场景示例

### 场景 1: YouTube 视频摘要（邮件投递）

```bash
curl -X POST http://localhost:4000/api/reports \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-token-1" \
  -d '{
    "source": "youtube",
    "video_id": "dQw4w9WgXcQ",
    "format": "summary",
    "language": "en",
    "delivery": {
      "method": "email",
      "address": "user@example.com"
    }
  }'
```

### 场景 2: 使用 URL 创建报告

```bash
curl -X POST http://localhost:4000/api/reports \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-token-1" \
  -d '{
    "source": "youtube",
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "format": "detailed",
    "language": "zh",
    "delivery": {
      "method": "none"
    }
  }'
```

### 场景 3: Webhook 投递

```bash
curl -X POST http://localhost:4000/api/reports \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-token-1" \
  -d '{
    "source": "podcast",
    "url": "https://example.com/podcast/episode-1",
    "format": "bullet_points",
    "language": "en",
    "delivery": {
      "method": "webhook",
      "webhook_url": "https://your-app.com/api/webhooks/digest"
    }
  }'
```

## 前端集成示例

### React/TypeScript

```typescript
// types.ts
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

// api.ts
const API_BASE = 'http://localhost:4000';

export async function createReport(request: CreateReportRequest): Promise<CreateReportResponse> {
  const response = await fetch(`${API_BASE}/api/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // 使用 session cookie
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create report');
  }

  return response.json();
}

export async function getReport(reportId: string) {
  const response = await fetch(`${API_BASE}/api/reports/${reportId}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch report');
  }

  return response.json();
}

// Component.tsx
import { useState } from 'react';
import { createReport, getReport } from './api';

function DigestForm() {
  const [loading, setLoading] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await createReport({
        source: "youtube",
        video_id: "dQw4w9WgXcQ",
        format: "summary",
        language: "en",
        delivery: {
          method: "email",
          address: "user@example.com"
        }
      });

      setReportId(result.report_id);
      alert(`Report created: ${result.report_id}`);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleSubmit} disabled={loading}>
        {loading ? 'Creating...' : 'Create Digest'}
      </button>
      {reportId && (
        <p>Report ID: {reportId}</p>
      )}
    </div>
  );
}
```

## 错误处理

### 400 Bad Request

```json
{
  "message": "Missing required fields: source, format, language, delivery"
}
```

```json
{
  "message": "YouTube source requires either video_id or url"
}
```

```json
{
  "message": "Email delivery requires address"
}
```

### 401 Unauthorized

```json
{
  "message": "Unauthorized"
}
```

### 404 Not Found

```json
{
  "message": "Report rpt_20251007_abc123 not found"
}
```

### 500 Internal Server Error

```json
{
  "message": "Failed to create report"
}
```

## 旧版 API（向后兼容）

旧版 API 仍然可用，但建议迁移到新版 API。

### GET /api/report/:id

```bash
curl http://localhost:4000/api/report/r-1 \
  -H "Authorization: Bearer dev-token-1"
```

### POST /api/report/:id

```bash
curl -X POST http://localhost:4000/api/report/r-1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-token-1" \
  -d '{"title": "My Report"}'
```

## 测试建议

1. **单元测试**: 测试请求验证逻辑
2. **集成测试**: 测试完整的创建和查询流程
3. **E2E 测试**: 测试前端到后端的完整流程

示例测试用例：

```typescript
// report.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildApp } from '../src/app';

describe('POST /api/reports', () => {
  const app = buildApp();

  it('should create a report successfully', async () => {
    const res = await request(app.server)
      .post('/api/reports')
      .set('Authorization', 'Bearer dev-token-1')
      .send({
        source: 'youtube',
        video_id: 'test123',
        format: 'summary',
        language: 'en',
        delivery: { method: 'none' }
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.report_id).toMatch(/^rpt_/);
  });

  it('should reject missing required fields', async () => {
    const res = await request(app.server)
      .post('/api/reports')
      .set('Authorization', 'Bearer dev-token-1')
      .send({
        source: 'youtube'
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Missing required fields');
  });
});
```
