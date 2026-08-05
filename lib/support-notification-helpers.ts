import {
  type SupportRequestRecord,
  type CompanyContactRecord,
  type SupportNotificationRecord,
  getCompanyContactsServer,
  getCompanyContactServer,
  getCompanyByIdServer,
  getAdminUserByIdServer,
  getSupportRequestServer,
  getOrCreatePendingSupportNotificationServer,
  updateSupportNotificationDeliveryServer,
  getSupportNotificationServer,
  createEmailServer,
} from "@/lib/supabase-server";
import { sendTransactionalEmail, renderEmailLayout, escapeHtml, type SendEmailResult } from "@/lib/transactional-email";
import {
  formatSupportCategoryLabel,
  formatSupportPriorityLabel,
  formatSupportStatusLabel,
} from "@/lib/support-request-helpers";

// Orchestration layer for support-request transactional email (Phase 5.2,
// Stage 5.2.3). Responsibilities, kept deliberately separate:
//   1. Recipient + template data (this file, build* functions)
//   2. Idempotent notification record (supabase-server.ts, reused here)
//   3. Provider send (lib/transactional-email.ts)
//   4. Delivery-status update (this file, finalizeDelivery)
//   5. Safe structured result — every exported dispatch function below
//      swallows its own errors and never throws, so a caller (the support
//      request routes) never needs a try/catch around them.
//
// Nothing in this file changes a support request's status, assignment, or
// resolution — it only reads the request and sends/records email. Workflow
// decisions remain entirely with the admin/broker who edits the request via
// the existing PATCH route. See docs/phase-5.2-stage-5.2.3-notifications.md
// "Workflow control" for the human-in-the-loop / future-AI boundary.

export type SupportNotificationType =
  | "support_acknowledgment"
  | "support_internal_alert"
  | "support_waiting_for_client"
  | "support_resolved"
  | "support_closed";

type ClientStatusNotificationType = Exclude<SupportNotificationType, "support_acknowledgment" | "support_internal_alert">;

const NO_RECIPIENT_PLACEHOLDER = "(no recipient available)";

const SUPPORT_EMAIL_FALLBACK = "support@amberglobalenergy.in";

function supportEmail(): string {
  return process.env.SUPPORT_EMAIL?.trim() || SUPPORT_EMAIL_FALLBACK;
}

function siteUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

function companyAdminLink(companyId: string): string | null {
  const base = siteUrl();
  return base ? `${base}/admin/companies/${companyId}` : null;
}

// Deterministic idempotency key. Acknowledgment/internal-alert are one-time
// creation events (no status suffix). Status-change emails include the
// target status, so a genuinely new transition into a status not previously
// notified for this request gets its own key — while a retried/duplicate
// PATCH for the *same* transition reuses the same key and therefore never
// re-sends. See docs/phase-5.2-stage-5.2.3-notifications.md "Idempotency
// strategy" for the tradeoff this implies on re-entering the same status
// after a prior notification for it.
function buildIdempotencyKey(supportRequestId: string, type: SupportNotificationType, status?: string): string {
  return status ? `${supportRequestId}:${type}:${status}` : `${supportRequestId}:${type}`;
}

const contactDisplayName = (contact: Pick<CompanyContactRecord, "first_name" | "last_name">) =>
  [contact.first_name, contact.last_name].filter(Boolean).join(" ");

// ─── Recipient selection ──────────────────────────────────────────────────

type ClientRecipient = { email: string; name: string; contactId: string };

// 1. The request's explicitly selected contact, when present and active
// 2. The company's active primary contact
// 3. Another active company contact with an email address
// 4. Otherwise null — callers must record the attempt as skipped, never
//    fall back to emailing an administrator as if they were the client.
async function selectClientRecipient(request: SupportRequestRecord): Promise<ClientRecipient | null> {
  const contacts = await getCompanyContactsServer(request.company_id).catch(() => [] as CompanyContactRecord[]);
  const usable = (contact: CompanyContactRecord) => contact.status === "active" && Boolean(contact.email);

  if (request.contact_id) {
    const explicit = contacts.find((contact) => contact.id === request.contact_id);
    if (explicit && usable(explicit)) {
      return { email: explicit.email as string, name: contactDisplayName(explicit), contactId: explicit.id };
    }
  }

  const primary = contacts.find((contact) => contact.is_primary && usable(contact));
  if (primary) {
    return { email: primary.email as string, name: contactDisplayName(primary), contactId: primary.id };
  }

  const anyActive = contacts.find(usable);
  if (anyActive) {
    return { email: anyActive.email as string, name: contactDisplayName(anyActive), contactId: anyActive.id };
  }

  return null;
}

type InternalRecipient = { email: string; name: string | null };

async function selectInternalRecipient(request: SupportRequestRecord): Promise<InternalRecipient | null> {
  if (request.assigned_to) {
    const broker = await getAdminUserByIdServer(request.assigned_to).catch(() => null);
    if (broker?.email) {
      return { email: broker.email, name: broker.name };
    }
  }

  const fallback = process.env.SUPPORT_NOTIFICATION_EMAIL?.trim();
  return fallback ? { email: fallback, name: null } : null;
}

// ─── Email content ─────────────────────────────────────────────────────────

type EmailContent = { subject: string; html: string; text: string };

function buildAcknowledgmentEmail(request: SupportRequestRecord, companyName: string, recipientName: string): EmailContent {
  const subject = `We've received your support request — ${request.subject}`;
  const greetingName = recipientName || "there";
  const category = formatSupportCategoryLabel(request.category);
  const priority = formatSupportPriorityLabel(request.priority);

  const html = renderEmailLayout({
    preheader: "We've received your support request and will respond shortly.",
    bodyHtml: `
      <p>Dear ${escapeHtml(greetingName)},</p>
      <p>Thank you for contacting Amber Global Energy on behalf of <strong>${escapeHtml(companyName)}</strong>. This confirms
      that we have received your request and it has been logged with our support team.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;font-size:13px;">
        <tr><td style="padding:4px 0;color:#6b7280;width:120px;">Subject</td><td style="padding:4px 0;">${escapeHtml(request.subject)}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">Category</td><td style="padding:4px 0;">${escapeHtml(category)}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">Priority</td><td style="padding:4px 0;">${escapeHtml(priority)}</td></tr>
      </table>
      <p>We typically respond within <strong>one business day</strong>. A member of our team will follow up directly at this
      email address.</p>
      <p>If you have any further questions in the meantime, you can reach us at
      <a href="mailto:${escapeHtml(supportEmail())}" style="color:${"#8a6d1f"};">${escapeHtml(supportEmail())}</a>.</p>
      <p style="color:#6b7280;font-size:12px;">This message confirms receipt only — it is not a resolution of your request.
      We will follow up separately once your request has been reviewed.</p>
      <p>Regards,<br />Amber Global Energy Support</p>
    `,
  });

  const text = [
    `Dear ${greetingName},`,
    ``,
    `Thank you for contacting Amber Global Energy on behalf of ${companyName}. This confirms that we have received your request and it has been logged with our support team.`,
    ``,
    `Subject: ${request.subject}`,
    `Category: ${category}`,
    `Priority: ${priority}`,
    ``,
    `We typically respond within one business day. A member of our team will follow up directly at this email address.`,
    ``,
    `If you have any further questions in the meantime, you can reach us at ${supportEmail()}.`,
    ``,
    `This message confirms receipt only — it is not a resolution of your request.`,
    ``,
    `Regards,`,
    `Amber Global Energy Support`,
  ].join("\n");

  return { subject, html, text };
}

async function buildInternalAlertEmail(request: SupportRequestRecord, companyName: string): Promise<EmailContent> {
  const category = formatSupportCategoryLabel(request.category);
  const priority = formatSupportPriorityLabel(request.priority);
  const status = formatSupportStatusLabel(request.status);
  const createdAt = new Date(request.created_at);
  const createdLabel = Number.isNaN(createdAt.getTime())
    ? request.created_at
    : new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(
        createdAt,
      );

  const contact = request.contact_id ? await getCompanyContactServer(request.contact_id).catch(() => null) : null;
  const contactName = contact ? contactDisplayName(contact) : null;
  const contactEmail = contact?.email ?? null;

  const link = companyAdminLink(request.company_id);
  const subject = `New Support Request — ${companyName} (${priority})`;

  const contactLine = contactName || contactEmail ? `${contactName ?? "Unknown contact"}${contactEmail ? ` (${contactEmail})` : ""}` : "Not specified";

  const html = renderEmailLayout({
    preheader: `New support request from ${companyName}`,
    bodyHtml: `
      <p>A new support request has been submitted.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;font-size:13px;">
        <tr><td style="padding:4px 0;color:#6b7280;width:120px;">Company</td><td style="padding:4px 0;">${escapeHtml(companyName)}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">Contact</td><td style="padding:4px 0;">${escapeHtml(contactLine)}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">Subject</td><td style="padding:4px 0;">${escapeHtml(request.subject)}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">Category</td><td style="padding:4px 0;">${escapeHtml(category)}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">Priority</td><td style="padding:4px 0;">${escapeHtml(priority)}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">Status</td><td style="padding:4px 0;">${escapeHtml(status)}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">Created</td><td style="padding:4px 0;">${escapeHtml(createdLabel)}</td></tr>
      </table>
      <p style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Message</p>
      <p style="white-space:pre-wrap;">${escapeHtml(request.message)}</p>
      ${link ? `<p><a href="${escapeHtml(link)}" style="color:${"#8a6d1f"};">Open in the admin Client Support Center →</a></p>` : ""}
    `,
  });

  const text = [
    `A new support request has been submitted.`,
    ``,
    `Company: ${companyName}`,
    `Contact: ${contactLine}`,
    `Subject: ${request.subject}`,
    `Category: ${category}`,
    `Priority: ${priority}`,
    `Status: ${status}`,
    `Created: ${createdLabel}`,
    ``,
    `Message:`,
    request.message,
    ...(link ? ["", `Open in the admin Client Support Center: ${link}`] : []),
  ].join("\n");

  return { subject, html, text };
}

function buildStatusChangeEmail(
  type: Exclude<SupportNotificationType, "support_acknowledgment" | "support_internal_alert">,
  request: SupportRequestRecord,
  companyName: string,
  recipientName: string,
): EmailContent {
  const greetingName = recipientName || "there";
  const common = `<p>Dear ${escapeHtml(greetingName)},</p>`;

  if (type === "support_waiting_for_client") {
    const subject = `Action needed — ${request.subject}`;
    const html = renderEmailLayout({
      preheader: "Additional information is needed on your support request.",
      bodyHtml: `
        ${common}
        <p>We're following up on your support request <strong>${escapeHtml(request.subject)}</strong> for
        ${escapeHtml(companyName)}. Our team needs some additional information or action from you before we can continue.</p>
        <p>Please reply to this email, or contact us at
        <a href="mailto:${escapeHtml(supportEmail())}" style="color:${"#8a6d1f"};">${escapeHtml(supportEmail())}</a>, at your
        earliest convenience so we can move your request forward.</p>
        <p>Regards,<br />Amber Global Energy Support</p>
      `,
    });
    const text = [
      `Dear ${greetingName},`,
      ``,
      `We're following up on your support request "${request.subject}" for ${companyName}. Our team needs some additional information or action from you before we can continue.`,
      ``,
      `Please reply to this email, or contact us at ${supportEmail()}, at your earliest convenience so we can move your request forward.`,
      ``,
      `Regards,`,
      `Amber Global Energy Support`,
    ].join("\n");
    return { subject, html, text };
  }

  if (type === "support_resolved") {
    const subject = `Resolved — ${request.subject}`;
    const html = renderEmailLayout({
      preheader: "Your support request has been marked resolved.",
      bodyHtml: `
        ${common}
        <p>Your support request <strong>${escapeHtml(request.subject)}</strong> for ${escapeHtml(companyName)} has been marked
        as <strong>resolved</strong> by our team.</p>
        <p>If this fully addresses your question or issue, no further action is needed. If anything remains unresolved,
        simply reply to this email or contact us at
        <a href="mailto:${escapeHtml(supportEmail())}" style="color:${"#8a6d1f"};">${escapeHtml(supportEmail())}</a> and we
        will reopen it.</p>
        <p>Regards,<br />Amber Global Energy Support</p>
      `,
    });
    const text = [
      `Dear ${greetingName},`,
      ``,
      `Your support request "${request.subject}" for ${companyName} has been marked as resolved by our team.`,
      ``,
      `If this fully addresses your question or issue, no further action is needed. If anything remains unresolved, reply to this email or contact us at ${supportEmail()} and we will reopen it.`,
      ``,
      `Regards,`,
      `Amber Global Energy Support`,
    ].join("\n");
    return { subject, html, text };
  }

  // support_closed
  const subject = `Closed — ${request.subject}`;
  const html = renderEmailLayout({
    preheader: "Your support request has been closed.",
    bodyHtml: `
      ${common}
      <p>Your support request <strong>${escapeHtml(request.subject)}</strong> for ${escapeHtml(companyName)} has been
      closed.</p>
      <p>If a new question or issue comes up, please reach out any time at
      <a href="mailto:${escapeHtml(supportEmail())}" style="color:${"#8a6d1f"};">${escapeHtml(supportEmail())}</a> and we'll
      be glad to help.</p>
      <p>Regards,<br />Amber Global Energy Support</p>
    `,
  });
  const text = [
    `Dear ${greetingName},`,
    ``,
    `Your support request "${request.subject}" for ${companyName} has been closed.`,
    ``,
    `If a new question or issue comes up, please reach out any time at ${supportEmail()} and we'll be glad to help.`,
    ``,
    `Regards,`,
    `Amber Global Energy Support`,
  ].join("\n");
  return { subject, html, text };
}

// ─── Delivery + idempotent dispatch ────────────────────────────────────────

async function finalizeDelivery(notificationId: string, result: SendEmailResult): Promise<SupportNotificationRecord> {
  if (result.ok) {
    return updateSupportNotificationDeliveryServer(notificationId, {
      delivery_status: "sent",
      provider: result.provider,
      provider_message_id: result.providerMessageId,
      error_message: null,
      sent_at: new Date().toISOString(),
    });
  }
  if (result.skipped) {
    return updateSupportNotificationDeliveryServer(notificationId, {
      delivery_status: "skipped",
      error_message: result.reason,
    });
  }
  return updateSupportNotificationDeliveryServer(notificationId, {
    delivery_status: "failed",
    error_message: result.errorMessage,
  });
}

// Logs a successfully-sent automated email into the existing Email Timeline
// (public.emails) via the existing createEmailServer helper — no schema
// change, no second email-history system. logged_by clearly marks it as
// automated so it's distinguishable from manually-logged entries.
async function logToEmailTimeline(companyId: string, recipientEmail: string, subject: string, text: string): Promise<void> {
  await createEmailServer({
    subject,
    direction: "outbound",
    body: text,
    from_address: process.env.EMAIL_FROM_ADDRESS?.trim() || undefined,
    to_address: recipientEmail,
    links: { company_id: companyId },
  }).catch(() => {
    // Timeline logging is a best-effort convenience, not part of the
    // delivery contract — never let it affect the notification result.
  });
}

async function sendAndRecord(params: {
  type: SupportNotificationType;
  request: SupportRequestRecord;
  companyName: string;
  recipientEmail: string;
  recipientName: string | null;
  contactId: string | null;
  content: EmailContent;
  idempotencyKey: string;
}): Promise<SupportNotificationRecord> {
  const { record, created } = await getOrCreatePendingSupportNotificationServer({
    support_request_id: params.request.id,
    company_id: params.request.company_id,
    contact_id: params.contactId,
    notification_type: params.type,
    recipient_email: params.recipientEmail,
    recipient_name: params.recipientName,
    subject: params.content.subject,
    idempotency_key: params.idempotencyKey,
  });

  // Idempotency guard: a prior terminal outcome (sent/skipped) for this
  // exact event is never re-attempted. Only a fresh row, or one stuck in
  // 'pending' (e.g. the process crashed mid-send previously), proceeds.
  if (!created && record.delivery_status !== "pending" && record.delivery_status !== "failed") {
    return record;
  }

  const result = await sendTransactionalEmail({
    to: params.recipientEmail,
    toName: params.recipientName,
    subject: params.content.subject,
    html: params.content.html,
    text: params.content.text,
  });

  const updated = await finalizeDelivery(record.id, result);

  if (updated.delivery_status === "sent") {
    await logToEmailTimeline(params.request.company_id, params.recipientEmail, params.content.subject, params.content.text);
  }

  return updated;
}

async function recordSkipped(params: {
  type: SupportNotificationType;
  request: SupportRequestRecord;
  subject: string;
  idempotencyKey: string;
  reason: string;
}): Promise<SupportNotificationRecord> {
  const { record, created } = await getOrCreatePendingSupportNotificationServer({
    support_request_id: params.request.id,
    company_id: params.request.company_id,
    contact_id: null,
    notification_type: params.type,
    recipient_email: NO_RECIPIENT_PLACEHOLDER,
    recipient_name: null,
    subject: params.subject,
    idempotency_key: params.idempotencyKey,
  });

  if (!created && record.delivery_status !== "pending") {
    return record;
  }

  return updateSupportNotificationDeliveryServer(record.id, {
    delivery_status: "skipped",
    error_message: params.reason,
  });
}

// ─── Public dispatch entry points ──────────────────────────────────────────
// Every function below is safe to call fire-and-forget-style: internal
// failures are caught and recorded, never thrown, so a caller never needs
// its own try/catch to keep a support-request route from failing.

export async function dispatchNewSupportRequestNotifications(request: SupportRequestRecord): Promise<void> {
  const company = await getCompanyByIdServer(request.company_id).catch(() => null);
  const companyName = company?.name ?? "your company";

  try {
    const recipient = await selectClientRecipient(request);
    const idempotencyKey = buildIdempotencyKey(request.id, "support_acknowledgment");
    if (!recipient) {
      await recordSkipped({
        type: "support_acknowledgment",
        request,
        subject: `We've received your support request — ${request.subject}`,
        idempotencyKey,
        reason: "No active company contact with an email address was available.",
      });
    } else {
      const content = buildAcknowledgmentEmail(request, companyName, recipient.name);
      await sendAndRecord({
        type: "support_acknowledgment",
        request,
        companyName,
        recipientEmail: recipient.email,
        recipientName: recipient.name || null,
        contactId: recipient.contactId,
        content,
        idempotencyKey,
      });
    }
  } catch (error) {
    console.error("[support-notifications] acknowledgment dispatch failed:", error);
  }

  try {
    const recipient = await selectInternalRecipient(request);
    const idempotencyKey = buildIdempotencyKey(request.id, "support_internal_alert");
    if (!recipient) {
      await recordSkipped({
        type: "support_internal_alert",
        request,
        subject: `New Support Request — ${companyName}`,
        idempotencyKey,
        reason: "No assigned broker email and no SUPPORT_NOTIFICATION_EMAIL fallback configured.",
      });
    } else {
      const content = await buildInternalAlertEmail(request, companyName);
      await sendAndRecord({
        type: "support_internal_alert",
        request,
        companyName,
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        contactId: null,
        content,
        idempotencyKey,
      });
    }
  } catch (error) {
    console.error("[support-notifications] internal alert dispatch failed:", error);
  }
}

const CLIENT_FACING_STATUS_TYPES: Partial<Record<string, ClientStatusNotificationType>> = {
  waiting_for_client: "support_waiting_for_client",
  resolved: "support_resolved",
  closed: "support_closed",
};

// Called only when the caller (the PATCH route) has already confirmed the
// status actually changed. `open`/`in_progress`/`new` intentionally have no
// entry above, so this is a no-op for those — matching the brief's
// "do not send client-facing emails for every internal status change".
export async function dispatchSupportStatusNotification(request: SupportRequestRecord, newStatus: string): Promise<void> {
  const type = CLIENT_FACING_STATUS_TYPES[newStatus];
  if (!type) return;

  try {
    const company = await getCompanyByIdServer(request.company_id).catch(() => null);
    const companyName = company?.name ?? "your company";
    const recipient = await selectClientRecipient(request);
    const idempotencyKey = buildIdempotencyKey(request.id, type, newStatus);

    if (!recipient) {
      await recordSkipped({
        type,
        request,
        subject: `${request.subject}`,
        idempotencyKey,
        reason: "No active company contact with an email address was available.",
      });
      return;
    }

    const content = buildStatusChangeEmail(type, request, companyName, recipient.name);
    await sendAndRecord({
      type,
      request,
      companyName,
      recipientEmail: recipient.email,
      recipientName: recipient.name || null,
      contactId: recipient.contactId,
      content,
      idempotencyKey,
    });
  } catch (error) {
    console.error("[support-notifications] status-change dispatch failed:", error);
  }
}

// Reuses the existing notification row (same id, same idempotency_key) —
// never inserts a new row. Rebuilds email content fresh from the support
// request's current state (accurate even if e.g. its status advanced again
// since the original failed attempt) rather than replaying stale content.
export async function retrySupportNotificationServer(notificationId: string): Promise<SupportNotificationRecord> {
  const notification = await getSupportNotificationServer(notificationId);
  if (!notification) {
    throw new Error("Notification not found.");
  }

  if (notification.delivery_status === "sent") {
    return notification;
  }

  if (notification.recipient_email === NO_RECIPIENT_PLACEHOLDER) {
    throw new Error("This notification has no recipient on file and cannot be retried. Add or activate a company contact with an email address first.");
  }

  const request = await getSupportRequestServer(notification.support_request_id);
  if (!request) {
    throw new Error("The associated support request no longer exists.");
  }

  const company = await getCompanyByIdServer(request.company_id).catch(() => null);
  const companyName = company?.name ?? "your company";

  let content: EmailContent;
  if (notification.notification_type === "support_internal_alert") {
    content = await buildInternalAlertEmail(request, companyName);
  } else if (notification.notification_type === "support_acknowledgment") {
    content = buildAcknowledgmentEmail(request, companyName, notification.recipient_name || "there");
  } else {
    content = buildStatusChangeEmail(
      notification.notification_type as Exclude<SupportNotificationType, "support_acknowledgment" | "support_internal_alert">,
      request,
      companyName,
      notification.recipient_name || "there",
    );
  }

  const result = await sendTransactionalEmail({
    to: notification.recipient_email,
    toName: notification.recipient_name,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });

  const updated = await finalizeDelivery(notification.id, result);

  if (updated.delivery_status === "sent") {
    await logToEmailTimeline(request.company_id, notification.recipient_email, content.subject, content.text);
  }

  return updated;
}
