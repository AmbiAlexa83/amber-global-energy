"use client";

import { useEffect, useState } from "react";
import { emailDirectionOptions, emailDirectionStyles, formatEmailDirectionLabel } from "@/lib/email-helpers";

type EntityType = "inquiry" | "company" | "project" | "contract";

type EmailItem = {
  id: string;
  direction: string;
  subject: string;
  body: string | null;
  from_address: string | null;
  to_address: string | null;
  sent_at: string;
  logged_by: string;
};

const paramNameFor: Record<EntityType, string> = {
  inquiry: "inquiry_id",
  company: "company_id",
  project: "project_id",
  contract: "contract_id",
};

const emptyDraft = { direction: "outbound", subject: "", from_address: "", to_address: "", sent_at: "", body: "" };

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#050B16] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30 [&>option]:bg-[#050B16]";

const formatSentAt = (value: string) => {
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

export default function EmailTimeline({ entityType, entityId }: { entityType: EntityType; entityId: string }) {
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(emptyDraft);
  const [logging, setLogging] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const paramName = paramNameFor[entityType];

  const loadEmails = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`/api/admin/emails?${paramName}=${encodeURIComponent(entityId)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to load emails.");
      setEmails(payload.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load emails.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId]);

  const logEmail = async () => {
    if (!draft.subject.trim()) {
      setError("Subject is required.");
      return;
    }

    try {
      setLogging(true);
      setError("");

      const response = await fetch("/api/admin/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          sent_at: draft.sent_at ? new Date(draft.sent_at).toISOString() : undefined,
          [paramName]: entityId,
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to log email.");

      setDraft(emptyDraft);
      await loadEmails();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to log email.");
    } finally {
      setLogging(false);
    }
  };

  const remove = async (id: string) => {
    try {
      setDeletingId(id);
      setError("");
      const response = await fetch(`/api/admin/emails/${id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to delete email.");
      setEmails((current) => current.filter((email) => email.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete email.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4">
      <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Email Timeline</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <select
          value={draft.direction}
          onChange={(event) => setDraft((current) => ({ ...current, direction: event.target.value }))}
          className={inputClass}
        >
          {emailDirectionOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <input
          value={draft.subject}
          onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))}
          placeholder="Subject"
          className={inputClass}
        />
        <input
          value={draft.from_address}
          onChange={(event) => setDraft((current) => ({ ...current, from_address: event.target.value }))}
          placeholder="From"
          className={inputClass}
        />
        <input
          value={draft.to_address}
          onChange={(event) => setDraft((current) => ({ ...current, to_address: event.target.value }))}
          placeholder="To"
          className={inputClass}
        />
        <input
          type="datetime-local"
          value={draft.sent_at}
          onChange={(event) => setDraft((current) => ({ ...current, sent_at: event.target.value }))}
          className={`${inputClass} [color-scheme:dark]`}
        />
        <textarea
          value={draft.body}
          onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}
          placeholder="Body / notes"
          rows={1}
          className={`${inputClass} sm:col-span-2 lg:col-span-3`}
        />
      </div>

      {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}

      <button
        type="button"
        onClick={logEmail}
        disabled={logging}
        className="mt-3 rounded-xl border border-[#C8A24D]/35 bg-[#C8A24D]/16 px-4 py-2.5 text-sm font-medium text-[#F0D38A] transition hover:bg-[#C8A24D]/24 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {logging ? "Logging..." : "Log Email"}
      </button>

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-sm text-slate-500">Loading emails...</p>
        ) : emails.length === 0 ? (
          <p className="text-sm text-slate-500">No emails logged yet.</p>
        ) : (
          emails.map((email) => (
            <div key={email.id} className="rounded-2xl border border-white/10 bg-[#050B16]/70 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.15em] ${emailDirectionStyles[email.direction] ?? emailDirectionStyles.outbound}`}>
                      {formatEmailDirectionLabel(email.direction)}
                    </span>
                    <p className="truncate text-sm font-medium text-white">{email.subject}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {email.from_address || "—"} → {email.to_address || "—"} • {formatSentAt(email.sent_at)}
                  </p>
                  {email.body ? <p className="mt-1 text-sm text-slate-300">{email.body}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => remove(email.id)}
                  disabled={deletingId === email.id}
                  className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-rose-400/40 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {deletingId === email.id ? "Removing..." : "Remove"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
