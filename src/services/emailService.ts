import sgMail from "@sendgrid/mail";

// Initialize SendGrid with API key
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@cognition-digest.com";
const FROM_NAME = process.env.SENDGRID_FROM_NAME || "Cognition Digest";

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export interface DigestEmailData {
  title: string;
  key_points: string[];
  word_count: number;
  full_text?: string;
  source: string;
  video_id?: string;
  channel_id?: string;
  url?: string;
  language: string;
  report_id: string;
}

/**
 * Send digest summary email
 */
export async function sendDigestEmail(
  toEmail: string,
  data: DigestEmailData
): Promise<{ success: boolean; error?: string }> {
  if (!SENDGRID_API_KEY) {
    console.warn("SendGrid API key not configured, skipping email send");
    return { success: false, error: "SendGrid not configured" };
  }

  try {
    const msg = {
      to: toEmail,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      subject: `📊 Digest: ${data.title}`,
      text: generatePlainTextEmail(data),
      html: generateHtmlEmail(data),
    };

    await sgMail.send(msg);
    console.log(`Email sent successfully to ${toEmail}`);
    return { success: true };
  } catch (error: any) {
    console.error("SendGrid error:", error);
    if (error.response) {
      console.error("SendGrid response body:", error.response.body);
    }
    return { 
      success: false, 
      error: error.message || "Failed to send email" 
    };
  }
}

/**
 * Generate plain text email content
 */
function generatePlainTextEmail(data: DigestEmailData): string {
  const lines = [
    `Cognition Digest - ${data.title}`,
    "",
    "=" .repeat(60),
    "",
    "📝 KEY POINTS:",
    "",
    ...data.key_points.map((point, i) => `${i + 1}. ${point}`),
    "",
    "=" .repeat(60),
    "",
    `📊 Word Count: ${data.word_count}`,
    `🌐 Language: ${data.language}`,
    `📍 Source: ${data.source}`,
  ];

  if (data.url) {
    lines.push(`🔗 URL: ${data.url}`);
  } else if (data.video_id) {
    lines.push(`🎥 Video ID: ${data.video_id}`);
  }

  if (data.full_text) {
    lines.push("", "=" .repeat(60), "", "📄 FULL SUMMARY:", "", data.full_text);
  }

  lines.push(
    "",
    "=" .repeat(60),
    "",
    `Report ID: ${data.report_id}`,
    "",
    "---",
    "Powered by Cognition Digest",
    "https://cognition-digest.com"
  );

  return lines.join("\n");
}

/**
 * Generate HTML email content
 */
function generateHtmlEmail(data: DigestEmailData): string {
  const keyPointsHtml = data.key_points
    .map(
      (point, i) => `
      <li style="margin-bottom: 12px; line-height: 1.6;">
        <strong style="color: #667eea;">${i + 1}.</strong> ${escapeHtml(point)}
      </li>
    `
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(data.title)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                📊 Cognition Digest
              </h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; opacity: 0.9; font-size: 14px;">
                Your AI-Powered Content Summary
              </p>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding: 30px 30px 20px 30px;">
              <h2 style="margin: 0; color: #333; font-size: 24px; line-height: 1.4;">
                ${escapeHtml(data.title)}
              </h2>
            </td>
          </tr>

          <!-- Key Points -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; border-radius: 8px;">
                <h3 style="margin: 0 0 15px 0; color: #667eea; font-size: 18px;">
                  🔑 Key Points
                </h3>
                <ul style="margin: 0; padding-left: 20px; list-style: none;">
                  ${keyPointsHtml}
                </ul>
              </div>
            </td>
          </tr>

          ${
            data.full_text
              ? `
          <!-- Full Summary -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">
                📄 Full Summary
              </h3>
              <div style="background-color: #ffffff; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px; line-height: 1.8; color: #555;">
                ${escapeHtml(data.full_text).replace(/\n/g, "<br>")}
              </div>
            </td>
          </tr>
          `
              : ""
          }

          <!-- Metadata -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <table width="100%" cellpadding="8" cellspacing="0" style="border-top: 1px solid #e0e0e0; padding-top: 20px;">
                <tr>
                  <td style="color: #666; font-size: 14px;">
                    <strong>📊 Word Count:</strong> ${data.word_count}
                  </td>
                  <td style="color: #666; font-size: 14px;">
                    <strong>🌐 Language:</strong> ${data.language.toUpperCase()}
                  </td>
                </tr>
                <tr>
                  <td style="color: #666; font-size: 14px;">
                    <strong>📍 Source:</strong> ${escapeHtml(data.source)}
                  </td>
                  <td style="color: #666; font-size: 14px;">
                    <strong>🆔 Report ID:</strong> ${escapeHtml(data.report_id)}
                  </td>
                </tr>
                ${
                  data.url
                    ? `
                <tr>
                  <td colspan="2" style="color: #666; font-size: 14px; padding-top: 8px;">
                    <strong>🔗 Source URL:</strong><br>
                    <a href="${escapeHtml(data.url)}" style="color: #667eea; text-decoration: none;">
                      ${escapeHtml(data.url)}
                    </a>
                  </td>
                </tr>
                `
                    : ""
                }
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                Powered by <strong style="color: #667eea;">Cognition Digest</strong>
              </p>
              <p style="margin: 0; color: #999; font-size: 12px;">
                AI-powered content summarization for the modern era
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Send test email (for debugging)
 */
export async function sendTestEmail(toEmail: string): Promise<{ success: boolean; error?: string }> {
  return sendDigestEmail(toEmail, {
    title: "Test Email - AI Agent Revolution",
    key_points: [
      "This is a test email from Cognition Digest",
      "SendGrid integration is working correctly",
      "You should receive beautifully formatted emails",
    ],
    word_count: 42,
    full_text: "This is a test email to verify that SendGrid integration is working properly. If you receive this email, your email service is configured correctly!",
    source: "test",
    language: "en",
    report_id: "test_" + Date.now(),
  });
}
