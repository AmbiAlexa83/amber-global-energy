"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CompanyRecord } from "@/lib/supabase-server";

const verificationOptions = ["unverified", "pending", "verified"];

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#050B16] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30";

export default function CompanyForm({ company }: { company: CompanyRecord }) {
  const router = useRouter();
  const [draft, setDraft] = useState({
    name: company.name,
    registration_number: company.registration_number ?? "",
    website: company.website ?? "",
    country: company.country ?? "",
    industry: company.industry ?? "",
    verification_status: company.verification_status,
    notes: company.notes ?? "",
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

      const response = await fetch(`/api/admin/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to save company.");

      setSaved(true);
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unable to save company.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    const nextStatus = company.status === "active" ? "inactive" : "active";
    try {
      setSaving(true);
      setSaveError("");

      const response = await fetch(`/api/admin/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to update company status.");

      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unable to update company status.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Company Record</p>
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs uppercase tracking-[0.2em] ${company.status === "active" ? "border-emerald-400/35 bg-emerald-400/12 text-emerald-200" : "border-slate-400/35 bg-slate-400/12 text-slate-300"}`}>
          {company.status}
        </span>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label>
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Company Name</span>
          <input value={draft.name} onChange={(event) => updateField("name", event.target.value)} className={inputClass} />
        </label>
        <label>
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Registration Number</span>
          <input value={draft.registration_number} onChange={(event) => updateField("registration_number", event.target.value)} className={inputClass} />
        </label>
        <label>
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Website</span>
          <input value={draft.website} onChange={(event) => updateField("website", event.target.value)} className={inputClass} />
        </label>
        <label>
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Country</span>
          <input value={draft.country} onChange={(event) => updateField("country", event.target.value)} className={inputClass} />
        </label>
        <label>
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Industry</span>
          <input value={draft.industry} onChange={(event) => updateField("industry", event.target.value)} className={inputClass} />
        </label>
        <label>
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Verification Status</span>
          <select
            value={draft.verification_status}
            onChange={(event) => updateField("verification_status", event.target.value)}
            className={inputClass}
          >
            {verificationOptions.map((option) => (
              <option key={option} value={option} className="bg-[#050B16] text-white">
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-4 block">
        <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Internal Notes</span>
        <textarea
          value={draft.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          rows={4}
          placeholder="Add internal notes about this company..."
          className={inputClass}
        />
      </label>

      {saveError ? <p className="mt-3 text-sm text-rose-200">{saveError}</p> : null}
      {saved && !saveError ? <p className="mt-3 text-sm text-emerald-200">Changes saved.</p> : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-xl border border-[#C8A24D]/35 bg-[#C8A24D]/16 px-4 py-3 text-sm font-medium text-[#F0D38A] transition hover:bg-[#C8A24D]/24 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={toggleStatus}
          disabled={saving}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {company.status === "active" ? "Deactivate Company" : "Activate Company"}
        </button>
      </div>
    </div>
  );
}
