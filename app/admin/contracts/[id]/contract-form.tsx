"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ContractRecord, CompanyRecord, ProjectRecord, BrokerRecord } from "@/lib/supabase-server";
import { contractStatusOptions } from "@/lib/contract-helpers";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#050B16] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30 [&>option]:bg-[#050B16]";

export default function ContractForm({
  contract,
  companies,
  projects,
  brokers,
}: {
  contract: ContractRecord;
  companies: CompanyRecord[];
  projects: ProjectRecord[];
  brokers: BrokerRecord[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState({
    title: contract.title,
    contract_number: contract.contract_number ?? "",
    company_id: contract.company_id ?? "",
    project_id: contract.project_id ?? "",
    broker_id: contract.broker_id ?? "",
    status: contract.status,
    contract_value: contract.contract_value ?? "",
    start_date: contract.start_date ?? "",
    end_date: contract.end_date ?? "",
    signed_date: contract.signed_date ?? "",
    notes: contract.notes ?? "",
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

      const response = await fetch(`/api/admin/contracts/${contract.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to save contract.");

      setSaved(true);
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unable to save contract.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4">
      <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Contract Details</p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label>
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Title</span>
          <input value={draft.title} onChange={(event) => updateField("title", event.target.value)} className={inputClass} />
        </label>
        <label>
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Contract Number</span>
          <input value={draft.contract_number} onChange={(event) => updateField("contract_number", event.target.value)} className={inputClass} />
        </label>
        <label>
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Status</span>
          <select value={draft.status} onChange={(event) => updateField("status", event.target.value)} className={inputClass}>
            {contractStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Contract Value</span>
          <input value={draft.contract_value} onChange={(event) => updateField("contract_value", event.target.value)} className={inputClass} />
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
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Project</span>
          <select value={draft.project_id} onChange={(event) => updateField("project_id", event.target.value)} className={inputClass}>
            <option value="">No project linked</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
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
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Start Date</span>
          <input type="date" value={draft.start_date} onChange={(event) => updateField("start_date", event.target.value)} className={`${inputClass} [color-scheme:dark]`} />
        </label>
        <label>
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">End Date</span>
          <input type="date" value={draft.end_date} onChange={(event) => updateField("end_date", event.target.value)} className={`${inputClass} [color-scheme:dark]`} />
        </label>
        <label>
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Signed Date</span>
          <input type="date" value={draft.signed_date} onChange={(event) => updateField("signed_date", event.target.value)} className={`${inputClass} [color-scheme:dark]`} />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Notes</span>
        <textarea
          value={draft.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          rows={4}
          placeholder="Add internal notes about this contract..."
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
