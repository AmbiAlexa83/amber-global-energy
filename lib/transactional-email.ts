import { Resend } from "resend";

// Server-only transactional email sending for the Client Support Center
// (Phase 5.2, Stage 5.2.3). This module is the ONLY place RESEND_API_KEY is
// read — never import this file from a "use client" component.

export type SendEmailResult =
  | { ok: true; provider: "resend"; providerMessageId: string | null }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped: false; errorMessage: string };

let resendClient: Resend | null | undefined;

// Lazily constructed so a missing key never throws at module-load time
// (which would otherwise break every route that imports this file, even
// ones that never send email during a given request).
function getResendClient(): Resend | null {
  if (resendClient !== undefined) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  resendClient = apiKey ? new Resend(apiKey) : null;
  return resendClient;
}

export function isEmailProviderConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM_ADDRESS);
}

// Escapes dynamic values before they're interpolated into HTML email
// bodies — every piece of user-supplied text (subject, message, contact
// name, company name) passes through this before reaching a template.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const BRAND_GOLD = "#C8A24D";
const BRAND_INK = "#03070D";

// Simple, dependable HTML — no remote images, no template framework. Every
// value passed in `bodyHtml` must already be escaped by the caller (built
// via escapeHtml above); this function does not escape its input.
export function renderEmailLayout(input: { preheader: string; bodyHtml: string }): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Amber Global Energy</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
    <span style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
      ${escapeHtml(input.preheader)}
    </span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e2e5;">
            <tr>
              <td style="background-color:${BRAND_INK};padding:20px 28px;">
                <span style="color:${BRAND_GOLD};font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;">
                  Amber Global Energy
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;color:#1f2933;font-size:14px;line-height:1.65;">
                ${input.bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;background-color:#fafafa;border-top:1px solid #e2e2e5;color:#8a8f98;font-size:11px;line-height:1.6;">
                This is an automated message from Amber Global Energy. Please do not reply directly to this email if it was
                not sent to a monitored address.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendTransactionalEmail(input: {
  to: string;
  toName?: string | null;
  subject: string;
  html: string;
  text: string;
}): Promise<SendEmailResult> {
  if (!isEmailProviderConfigured()) {
    return { ok: false, skipped: true, reason: "Email provider is not configured." };
  }

  const client = getResendClient();
  if (!client) {
    return { ok: false, skipped: true, reason: "Email provider is not configured." };
  }

  const fromName = process.env.EMAIL_FROM_NAME?.trim() || "Amber Global Energy";
  const fromAddress = process.env.EMAIL_FROM_ADDRESS?.trim();
  if (!fromAddress) {
    return { ok: false, skipped: true, reason: "Email provider is not configured." };
  }

  try {
    const { data, error } = await client.emails.send({
      from: `${fromName} <${fromAddress}>`,
      to: input.toName ? `${input.toName} <${input.to}>` : input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    if (error) {
      // Never forward the provider's raw error object to a caller that
      // might surface it to the browser — only a short, safe message.
      return { ok: false, skipped: false, errorMessage: "The email provider declined to send this message." };
    }

    return { ok: true, provider: "resend", providerMessageId: data?.id ?? null };
  } catch {
    return { ok: false, skipped: false, errorMessage: "The email provider could not be reached." };
  }
}
