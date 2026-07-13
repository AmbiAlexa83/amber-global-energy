"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProjectRecord, CompanyRecord, BrokerRecord, InquiryServerRecord } from "@/lib/supabase-server";
import { projectStageOptions } from "@/lib/project-helpers";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#050B16] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30 [&>option]:bg-[#050B16]";

const inquiryLabel = (inquiry: InquiryServerRecord) =>
  `${inquiry.company_name ?? "Unknown company"} — ${inquiry.contact_name ?? inquiry.name ?? "Unnamed contact"}`;

export default function ProjectForm({
  project,
  companies,
  brokers,
  inquiries,
}: {
  project: ProjectRecord;
  companies: CompanyRecord[];
  brokers: BrokerRecord[];
  inquiries: InquiryServerRecord[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState({
    name: project.name,
    company_id: project.company_id ?? "",
    broker_id: project.broker_id ?? "",
    inquiry_id: project.inquiry_id ?? "",
    stage: project.stage,
    estimated_value: project.estimated_value ?? "",
    expected_close_date: project.expected_close_date ?? "",
    notes: project.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  const updateField = <K extends keyof typeof draft>(field: K, value: (typeof draft)[K]) => {
    setSaved(false);
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const save = async () => {
    try {
      setSaving(true);
      setSaveError("");

      const response = await fetch(`/api/admin/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to save project.");

      setSaved(true);
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unable to save project.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4">
      <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Project Details</p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label>
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Project Name</span>
          <input value={draft.name} onChange={(event) => updateField("name", event.target.value)} className={inputClass} />
        </label>
        <label>
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Stage</span>
          <select value={draft.stage} onChange={(event) => updateField("stage", event.target.value)} className={inputClass}>
            {projectStageOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Company</span>
          <select value={draft.company_id} onChange={(event) => updateField("company_id", event.target.value)} className={inputClass}>
            <option value="">No company linked</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Broker</span>
          <select value={draft.broker_id} onChange={(event) => updateField("broker_id", event.target.value)} className={inputClass}>
            <option value="">No broker assigned</option>
            {brokers.map((broker) => (
              <option key={broker.id} value={broker.id}>{broker.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Originating Inquiry</span>
          <select value={draft.inquiry_id} onChange={(event) => updateField("inquiry_id", event.target.value)} className={inputClass}>
            <option value="">No originating inquiry</option>
            {inquiries.map((inquiry) => (
              <option key={String(inquiry.id)} value={String(inquiry.id)}>{inquiryLabel(inquiry)}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Estimated Value</span>
          <input value={draft.estimated_value} onChange={(event) => updateField("estimated_value", event.target.value)} className={inputClass} />
        </label>
        <label>
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Expected Close Date</span>
          <input
            type="date"
            value={draft.expected_close_date}
            onChange={(event) => updateField("expected_close_date", event.target.value)}
            className={`${inputClass} [color-scheme:dark]`}
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Notes</span>
        <textarea
          value={draft.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          rows={4}
          placeholder="Add internal notes about this project..."
          className={inputClass}
        />
      </label>

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
