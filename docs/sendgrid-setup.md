# SendGrid 邮件服务集成指南

## 概述

本项目使用 SendGrid 作为邮件发送服务，当用户创建报告并选择 `email` 投递方式时，系统会自动发送精美的 HTML 格式摘要邮件。

## 设置步骤

### 1. 创建 SendGrid 账号

1. 访问 [SendGrid 官网](https://sendgrid.com/)
2. 注册免费账号（每天可发送 100 封邮件）
3. 验证邮箱地址

### 2. 创建 API Key

1. 登录 SendGrid 控制台
2. 进入 **Settings** → **API Keys**
3. 点击 **Create API Key**
4. 选择权限：
   - **API Key Name**: `Cognition-Digest-Backend`
   - **API Key Permissions**: **Full Access** 或 **Mail Send** (推荐)
5. 复制生成的 API Key（只显示一次，请妥善保存）

### 3. 验证发件人邮箱

SendGrid 要求验证发件人身份：

#### 方法 A: 单个发件人验证（推荐用于开发）

1. 进入 **Settings** → **Sender Authentication**
2. 点击 **Verify a Single Sender**
3. 填写信息：
   - **From Name**: Cognition Digest
   - **From Email Address**: noreply@your-domain.com
   - **Reply To**: support@your-domain.com
   - 其他必填信息
4. 点击 **Create**
5. 检查邮箱并点击验证链接

#### 方法 B: 域名验证（推荐用于生产）

1. 进入 **Settings** → **Sender Authentication**
2. 点击 **Authenticate Your Domain**
3. 选择 DNS 提供商
4. 按照指引添加 DNS 记录（CNAME/TXT）
5. 等待验证完成（通常几分钟到几小时）

### 4. 配置环境变量

在项目根目录的 `.env` 文件中添加：

```bash
# SendGrid Email Service
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@your-domain.com
SENDGRID_FROM_NAME=Cognition Digest
```

**注意**:
- `SENDGRID_API_KEY`: 从 SendGrid 控制台复制的 API Key
- `SENDGRID_FROM_EMAIL`: 必须是已验证的发件人邮箱
- `SENDGRID_FROM_NAME`: 邮件中显示的发件人名称

## 使用方法

### 1. 测试邮件发送

启动服务器后，使用测试端点验证配置：

```bash
curl -X POST http://localhost:4000/api/test/email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-token-1" \
  -d '{"email": "your-email@example.com"}'
```

**成功响应**:
```json
{
  "success": true,
  "message": "Test email sent to your-email@example.com"
}
```

**失败响应**:
```json
{
  "success": false,
  "message": "SendGrid not configured"
}
```

### 2. 创建带邮件投递的报告

```bash
curl -X POST http://localhost:4000/api/reports \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-token-1" \
  -d '{
    "source": "youtube",
    "video_id": "xyz789",
    "format": "summary",
    "language": "en",
    "delivery": {
      "method": "email",
      "address": "user@example.com"
    }
  }'
```

**流程**:
1. 报告创建后立即返回响应（`delivery_status: "queued"`）
2. 2秒后模拟处理完成
3. 自动发送邮件到指定地址
4. 更新 `delivery_status` 为 `"sent"` 或 `"failed"`

### 3. 查看邮件发送状态

```bash
curl http://localhost:4000/api/reports/rpt_20251007_abc123 \
  -H "Authorization: Bearer dev-token-1"
```

**响应**:
```json
{
  "report_id": "rpt_20251007_abc123",
  "status": "completed",
  "delivery_status": "sent",  // 邮件已发送
  ...
}
```

## 邮件模板

### 邮件内容包含

- **标题**: 报告标题
- **关键要点**: 列表展示
- **完整摘要**: 全文内容（如果有）
- **元数据**: 字数、语言、来源、Report ID
- **源链接**: 如果提供了 URL

### 邮件样式

- 响应式设计，支持移动端
- 渐变色头部（紫色主题）
- 清晰的排版和间距
- 专业的品牌形象

### 自定义邮件模板

编辑 `src/services/emailService.ts` 中的 `generateHtmlEmail()` 函数：

```typescript
function generateHtmlEmail(data: DigestEmailData): string {
  // 修改 HTML 模板
  return `
    <!DOCTYPE html>
    <html>
      <!-- 你的自定义模板 -->
    </html>
  `;
}
```

## 监控和调试

### 查看发送日志

SendGrid 控制台提供详细的发送日志：

1. 进入 **Activity** → **Email Activity**
2. 查看每封邮件的状态：
   - **Delivered**: 成功投递
   - **Bounced**: 退信
   - **Dropped**: 被丢弃（无效邮箱等）
   - **Deferred**: 延迟发送

### 本地日志

服务器控制台会输出日志：

```
Email sent successfully to user@example.com
Email delivery for rpt_20251007_abc123: success
```

### 错误处理

如果邮件发送失败，会记录错误：

```
SendGrid error: [错误信息]
Failed to send email for report rpt_20251007_abc123: [详细错误]
```

## 常见问题

### 1. "SendGrid not configured" 错误

**原因**: 未设置 `SENDGRID_API_KEY` 环境变量

**解决**:
- 检查 `.env` 文件是否包含 `SENDGRID_API_KEY`
- 重启服务器使环境变量生效

### 2. "Forbidden" 或 "Unauthorized" 错误

**原因**: API Key 无效或权限不足

**解决**:
- 确认 API Key 正确复制（没有多余空格）
- 确认 API Key 有 **Mail Send** 权限
- 重新生成 API Key

### 3. "The from email does not match a verified Sender Identity"

**原因**: 发件人邮箱未验证

**解决**:
- 在 SendGrid 控制台验证发件人邮箱
- 确保 `SENDGRID_FROM_EMAIL` 与验证的邮箱一致

### 4. 邮件进入垃圾箱

**原因**: 发件人信誉度低或未配置 SPF/DKIM

**解决**:
- 使用域名验证（而非单个发件人验证）
- 配置 SPF 和 DKIM 记录
- 避免使用垃圾邮件关键词
- 提供退订链接

### 5. 免费额度用完

**原因**: 超过每天 100 封邮件限制

**解决**:
- 升级到付费计划
- 或使用 `delivery.method: "none"` 仅生成报告不发送邮件

## 生产环境建议

### 1. 使用域名验证

- 提高邮件送达率
- 建立发件人信誉
- 支持更高发送量

### 2. 配置 Webhook

接收邮件事件通知（打开、点击、退信等）：

```typescript
// 在 src/routes/report.ts 添加
fastify.post("/api/webhooks/sendgrid", async (req, reply) => {
  const events = req.body;
  // 处理 SendGrid 事件
  console.log("SendGrid events:", events);
  return reply.code(200).send({ ok: true });
});
```

### 3. 实现重试机制

对于发送失败的邮件，实现自动重试：

```typescript
async function sendEmailWithRetry(email: string, data: DigestEmailData, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const result = await sendDigestEmail(email, data);
    if (result.success) return result;
    
    // 等待后重试
    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
  }
  return { success: false, error: "Max retries exceeded" };
}
```

### 4. 使用队列系统

对于大量邮件发送，使用 Bull/BullMQ 队列：

```bash
npm install bull
```

```typescript
import Queue from 'bull';

const emailQueue = new Queue('email', {
  redis: { host: 'localhost', port: 6379 }
});

emailQueue.process(async (job) => {
  const { email, data } = job.data;
  return await sendDigestEmail(email, data);
});

// 添加到队列
emailQueue.add({ email, data });
```

### 5. 监控和告警

- 设置 SendGrid 告警（退信率、投诉率）
- 使用 Sentry 监控错误
- 定期检查发送统计

## 费用说明

### 免费计划
- **每天**: 100 封邮件
- **每月**: 约 3,000 封
- **功能**: 基础发送、API 访问、邮件活动日志

### 付费计划
- **Essentials**: $19.95/月，40,000 封/月
- **Pro**: $89.95/月，100,000 封/月
- **Premier**: 自定义定价

## 替代方案

如果不想使用 SendGrid，可以替换为：

1. **AWS SES** - 更便宜，适合大量发送
2. **Mailgun** - 类似 SendGrid
3. **Postmark** - 专注于交易邮件
4. **Resend** - 现代化的邮件 API

修改 `src/services/emailService.ts` 即可切换服务商。

## 相关资源

- [SendGrid 官方文档](https://docs.sendgrid.com/)
- [SendGrid Node.js SDK](https://github.com/sendgrid/sendgrid-nodejs)
- [邮件最佳实践](https://sendgrid.com/blog/email-best-practices/)
- [SPF/DKIM 配置指南](https://sendgrid.com/docs/ui/account-and-settings/how-to-set-up-domain-authentication/)
