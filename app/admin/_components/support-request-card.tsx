"use client";

import { useEffect, useState } from "react";
import {
  supportCategoryOptions,
  supportPriorityOptions,
  supportPriorityStyles,
  supportStatusStyles,
  notificationDeliveryStyles,
  formatSupportCategoryLabel,
  formatSupportPriorityLabel,
  formatSupportStatusLabel,
  formatNotificationDeliveryLabel,
} from "@/lib/support-request-helpers";

type ContactOption = {
  id: string;
  first_name: string;
  last_name: string | null;
  status: string;
};

type SupportRequestItem = {
  id: string;
  category: string;
  priority: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  admin_users: { name: string } | null;
};

type NotificationItem = {
  id: string;
  support_request_id: string;
  delivery_status: string;
};

const emptyDraft = {
  contact_id: "",
  category: supportCategoryOptions[0].value,
  priority: "normal",
  subject: "",
  message: "",
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#050B16] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30 [&>option]:bg-[#050B16]";

const formatSubmittedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export default function SupportRequestCard({ companyId }: { companyId: string }) {
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [requests, setRequests] = useState<SupportRequestItem[]>([]);
  const [notifications, setNotifications] = useState<Record<string, NotificationItem>>({});
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(emptyDraft);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [contactsResponse, requestsResponse, notificationsResponse] = await Promise.all([
        fetch(`/api/admin/companies/${companyId}/contacts`, { cache: "no-store" }),
        fetch(`/api/admin/support-requests?company_id=${encodeURIComponent(companyId)}`, { cache: "no-store" }),
        fetch(`/api/admin/support-notifications?company_id=${encodeURIComponent(companyId)}`, { cache: "no-store" }),
      ]);
      const contactsPayload = await contactsResponse.json();
      const requestsPayload = await requestsResponse.json();
      const notificationsPayload = await notificationsResponse.json();
      if (!contactsResponse.ok) throw new Error(contactsPayload.error ?? "Unable to load company contacts.");
      if (!requestsResponse.ok) throw new Error(requestsPayload.error ?? "Unable to load support requests.");
      setContacts((contactsPayload.data ?? []).filter((contact: ContactOption) => contact.status === "active"));
      setRequests(requestsPayload.data ?? []);

      // Latest notification per request — notifications come back newest
      // first, so the first one seen per support_request_id wins.
      const latest: Record<string, NotificationItem> = {};
      if (notificationsResponse.ok) {
        for (const notification of (notificationsPayload.data ?? []) as NotificationItem[]) {
          if (!(notification.support_request_id in latest)) {
            latest[notification.support_request_id] = notification;
          }
        }
      }
      setNotifications(latest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load the support center.");
    } finally {
      setLoading(false);
    }
  };

  const retryNotification = async (requestId: string, notificationId: string) => {
    try {
      setRetryingId(requestId);
      const response = await fetch(`/api/admin/support-notifications/${notificationId}/retry`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Email could not be delivered.");
      setNotifications((current) => ({ ...current, [requestId]: payload.data }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email could not be delivered.");
    } finally {
      setRetryingId(null);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const submit = async () => {
    if (!draft.subject.trim() || !draft.message.trim()) {
      setError("Subject and message are required.");
      setSubmitted(false);
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSubmitted(false);

      const response = await fetch("/api/admin/support-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          contact_id: draft.contact_id || null,
          category: draft.category,
          priority: draft.priority,
          subject: draft.subject,
          message: draft.message,
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to submit support request.");

      setDraft(emptyDraft);
      setSubmitted(true);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit support request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4">
      <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Need Assistance?</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        If you have questions, encounter technical issues, or would like to suggest improvements, we&apos;re here to help.
      </p>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
        <span>
          Contact Email: <span className="text-slate-300">support@amberglobalenergy.in</span>
        </span>
        <span>
          Response Time: <span className="text-slate-300">Typically within one business day.</span>
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <select
          value={draft.category}
          onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
          className={inputClass}
        >
          {supportCategoryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={draft.priority}
          onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value }))}
          className={inputClass}
        >
          {supportPriorityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={draft.contact_id}
          onChange={(event) => setDraft((current) => ({ ...current, contact_id: event.target.value }))}
          className={inputClass}
        >
          <option value="">No specific contact</option>
          {contacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {[contact.first_name, contact.last_name].filter(Boolean).join(" ")}
            </option>
          ))}
        </select>
        <input
          value={draft.subject}
          onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))}
          placeholder="Subject"
          className={inputClass}
        />
        <textarea
          value={draft.message}
          onChange={(event) => setDraft((current) => ({ ...current, message: event.target.value }))}
          placeholder="Describe the question, issue, or feedback..."
          rows={3}
          className={`${inputClass} sm:col-span-2 lg:col-span-4`}
        />
      </div>

      {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}
      {submitted && !error ? (
        <p className="mt-3 text-sm text-emerald-200">
          Thank you — your support request has been submitted. Our team typically responds within one business day.
        </p>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="mt-3 rounded-xl border border-[#C8A24D]/35 bg-[#C8A24D]/16 px-4 py-2.5 text-sm font-medium text-[#F0D38A] transition hover:bg-[#C8A24D]/24 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? "Submitting..." : "Submit Request"}
      </button>

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-sm text-slate-500">Loading support requests...</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-slate-500">No support requests on file for this company yet.</p>
        ) : (
          requests.map((item) => (
            <div key={item.id} className="rounded-2xl border border-white/10 bg-[#050B16]/70 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium text-white">{item.subject}</p>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.15em] ${supportPriorityStyles[item.priority] ?? supportPriorityStyles.normal}`}>
                  {formatSupportPriorityLabel(item.priority)}
                </span>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.15em] ${supportStatusStyles[item.status] ?? supportStatusStyles.new}`}>
                  {formatSupportStatusLabel(item.status)}
                </span>
                {notifications[item.id] ? (
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.15em] ${notificationDeliveryStyles[notifications[item.id].delivery_status] ?? notificationDeliveryStyles.pending}`}
                    title={notifications[item.id].delivery_status === "failed" ? "Email could not be delivered." : undefined}
                  >
                    {formatNotificationDeliveryLabel(notifications[item.id].delivery_status)}
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {formatSupportCategoryLabel(item.category)} • {formatSubmittedAt(item.created_at)}
                {item.admin_users ? ` • Assigned to ${item.admin_users.name}` : ""}
              </p>
              <p className="mt-1 text-sm text-slate-300">{item.message}</p>
              {notifications[item.id]?.delivery_status === "failed" ? (
                <button
                  type="button"
                  onClick={() => retryNotification(item.id, notifications[item.id].id)}
                  disabled={retryingId === item.id}
                  className="mt-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition hover:border-[#C8A24D]/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {retryingId === item.id ? "Retrying..." : "Retry Email"}
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
