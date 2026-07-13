"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  type InquiryDraft,
  type InquiryRecord,
  statusOptions,
  priorityOptions,
  toDateTimeLocal,
} from "@/lib/inquiry-helpers";

export default function CustomerWorkflowForm({
  inquiry,
  brokerNames = [],
}: {
  inquiry: InquiryRecord;
  brokerNames?: string[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<InquiryDraft>({
    status: inquiry.status ?? "new",
    priority: inquiry.priority ?? "normal",
    assigned_broker: inquiry.assigned_broker ?? "",
    broker_notes: inquiry.broker_notes ?? "",
    notes: inquiry.notes ?? "",
    last_contacted_at: toDateTimeLocal(inquiry.last_contacted_at),
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  const updateDraftField = <K extends keyof InquiryDraft>(field: K, value: InquiryDraft[K]) => {
    setSaved(false);
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const save = async () => {
    if (!inquiry.id) return;

    try {
      setSaving(true);
      setSaveError("");

      const response = await fetch("/api/admin/inquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: inquiry.id,
          status: draft.status,
          priority: draft.priority,
          assigned_broker: draft.assigned_broker,
          broker_notes: draft.broker_notes,
          notes: draft.notes,
          last_contacted_at: draft.last_contacted_at || null,
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to save inquiry updates.");

      setSaved(true);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save inquiry updates.";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4">
      <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Broker Workflow</p>
      <div className="mt-4 grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Status</span>
            <select
              value={draft.status}
              onChange={(event) => updateDraftField("status", event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#050B16] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value} className="bg-[#050B16] text-white">
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Priority</span>
            <select
              value={draft.priority}
              onChange={(event) => updateDraftField("priority", event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#050B16] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30"
            >
              {priorityOptions.map((option) => (
                <option key={option.value} value={option.value} className="bg-[#050B16] text-white">
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Assigned Broker</span>
          <input
            value={draft.assigned_broker}
            onChange={(event) => updateDraftField("assigned_broker", event.target.value)}
            placeholder="Assign a broker"
            list="customer-broker-roster-options"
            className="w-full rounded-xl border border-white/10 bg-[#050B16] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30"
          />
          <datalist id="customer-broker-roster-options">
            {brokerNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </label>

        <label>
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Last Contacted</span>
          <input
            type="datetime-local"
            value={draft.last_contacted_at}
            onChange={(event) => updateDraftField("last_contacted_at", event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#050B16] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30 [color-scheme:dark]"
          />
        </label>

        <label>
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Internal Notes</span>
          <textarea
            value={draft.notes}
            onChange={(event) => updateDraftField("notes", event.target.value)}
            rows={4}
            placeholder="Add internal CRM notes for this inquiry..."
            className="w-full rounded-xl border border-white/10 bg-[#050B16] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30"
          />
        </label>

        <label>
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Internal Broker Notes</span>
          <textarea
            value={draft.broker_notes}
            onChange={(event) => updateDraftField("broker_notes", event.target.value)}
            rows={5}
            placeholder="Add private notes for the internal deal team..."
            className="w-full rounded-xl border border-white/10 bg-[#050B16] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30"
          />
        </label>
      </div>

      {saveError ? <p className="mt-3 text-sm text-rose-200">{saveError}</p> : null}
      {saved && !saveError ? <p className="mt-3 text-sm text-emerald-200">Changes saved.</p> : null}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-4 w-full rounded-xl border border-[#C8A24D]/35 bg-[#C8A24D]/16 px-4 py-3 text-sm font-medium text-[#F0D38A] transition hover:bg-[#C8A24D]/24 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
