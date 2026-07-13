"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CompanyRecord } from "@/lib/supabase-server";

type NewCompanyDraft = {
  name: string;
  registration_number: string;
  website: string;
  country: string;
  industry: string;
};

const emptyDraft: NewCompanyDraft = { name: "", registration_number: "", website: "", country: "", industry: "" };

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#050B16] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30";

const verificationBadgeClass = (status: string) => {
  if (status === "verified") return "border-emerald-400/35 bg-emerald-400/12 text-emerald-200";
  if (status === "pending") return "border-[#C8A24D]/35 bg-[#C8A24D]/12 text-[#F0D38A]";
  return "border-slate-400/35 bg-slate-400/12 text-slate-300";
};

export default function CompanyRoster({
  initialCompanies,
  inquiryCounts,
}: {
  initialCompanies: CompanyRecord[];
  inquiryCounts: Record<string, { active: number; total: number }>;
}) {
  const router = useRouter();
  const [companies, setCompanies] = useState(initialCompanies);
  const [draft, setDraft] = useState<NewCompanyDraft>(emptyDraft);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<NewCompanyDraft>(emptyDraft);
  const [rowError, setRowError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const createCompany = async () => {
    if (!draft.name.trim()) {
      setCreateError("Company name is required.");
      return;
    }

    try {
      setCreating(true);
      setCreateError("");

      const response = await fetch("/api/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to create company.");

      setCompanies((current) => [...current, payload.data].sort((a, b) => a.name.localeCompare(b.name)));
      setDraft(emptyDraft);
      router.refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Unable to create company.");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (company: CompanyRecord) => {
    setEditingId(company.id);
    setRowError("");
    setEditDraft({
      name: company.name,
      registration_number: company.registration_number ?? "",
      website: company.website ?? "",
      country: company.country ?? "",
      industry: company.industry ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setRowError("");
  };

  const saveEdit = async (id: string) => {
    try {
      setSavingId(id);
      setRowError("");

      const response = await fetch(`/api/admin/companies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editDraft),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to save company.");

      setCompanies((current) => current.map((item) => (item.id === id ? payload.data : item)));
      setEditingId(null);
      router.refresh();
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "Unable to save company.");
    } finally {
      setSavingId(null);
    }
  };

  const toggleStatus = async (company: CompanyRecord) => {
    const nextStatus = company.status === "active" ? "inactive" : "active";
    try {
      setSavingId(company.id);
      setRowError("");

      const response = await fetch(`/api/admin/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to update company status.");

      setCompanies((current) => current.map((item) => (item.id === company.id ? payload.data : item)));
      router.refresh();
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "Unable to update company status.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
        <h2 className="text-xl font-semibold text-white">Add Company</h2>
        <p className="mt-1 text-sm text-slate-400">Register a counterparty in the master company directory.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            placeholder="Company name"
            className={inputClass}
          />
          <input
            value={draft.registration_number}
            onChange={(event) => setDraft((current) => ({ ...current, registration_number: event.target.value }))}
            placeholder="Registration number"
            className={inputClass}
          />
          <input
            value={draft.website}
            onChange={(event) => setDraft((current) => ({ ...current, website: event.target.value }))}
            placeholder="Website"
            className={inputClass}
          />
          <input
            value={draft.country}
            onChange={(event) => setDraft((current) => ({ ...current, country: event.target.value }))}
            placeholder="Country"
            className={inputClass}
          />
          <input
            value={draft.industry}
            onChange={(event) => setDraft((current) => ({ ...current, industry: event.target.value }))}
            placeholder="Industry (e.g. Refined Products)"
            className={inputClass}
          />
        </div>

        {createError ? <p className="mt-3 text-sm text-rose-200">{createError}</p> : null}

        <button
          type="button"
          onClick={createCompany}
          disabled={creating}
          className="mt-4 rounded-xl border border-[#C8A24D]/35 bg-[#C8A24D]/16 px-4 py-2.5 text-sm font-medium text-[#F0D38A] transition hover:bg-[#C8A24D]/24 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {creating ? "Adding..." : "Add Company"}
        </button>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
        <h2 className="text-xl font-semibold text-white">Company Directory</h2>

        {rowError ? <p className="mt-3 text-sm text-rose-200">{rowError}</p> : null}

        {companies.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#071A2D]/70 px-5 py-10 text-center text-slate-400">
            No companies registered yet.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
              <thead>
                <tr className="text-slate-400">
                  <th className="px-3 py-2 font-medium">Company</th>
                  <th className="px-3 py-2 font-medium">Registration</th>
                  <th className="px-3 py-2 font-medium">Country</th>
                  <th className="px-3 py-2 font-medium">Industry</th>
                  <th className="px-3 py-2 font-medium">Inquiries</th>
                  <th className="px-3 py-2 font-medium">Verification</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => {
                  const counts = inquiryCounts[company.name.trim().toLowerCase()] ?? { active: 0, total: 0 };
                  const isEditing = editingId === company.id;

                  return (
                    <tr key={company.id} className="rounded-2xl bg-[#071A2D]/80 text-slate-300 align-top">
                      {isEditing ? (
                        <>
                          <td className="rounded-l-2xl px-3 py-3">
                            <input
                              value={editDraft.name}
                              onChange={(event) => setEditDraft((current) => ({ ...current, name: event.target.value }))}
                              className={inputClass}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              value={editDraft.registration_number}
                              onChange={(event) => setEditDraft((current) => ({ ...current, registration_number: event.target.value }))}
                              className={inputClass}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              value={editDraft.country}
                              onChange={(event) => setEditDraft((current) => ({ ...current, country: event.target.value }))}
                              className={inputClass}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              value={editDraft.industry}
                              onChange={(event) => setEditDraft((current) => ({ ...current, industry: event.target.value }))}
                              className={inputClass}
                            />
                          </td>
                          <td className="px-3 py-3 text-slate-400">
                            {counts.active} active / {counts.total} total
                          </td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs uppercase tracking-[0.2em] ${verificationBadgeClass(company.verification_status)}`}>
                              {company.verification_status}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs uppercase tracking-[0.2em] ${company.status === "active" ? "border-emerald-400/35 bg-emerald-400/12 text-emerald-200" : "border-slate-400/35 bg-slate-400/12 text-slate-300"}`}>
                              {company.status}
                            </span>
                          </td>
                          <td className="rounded-r-2xl px-3 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => saveEdit(company.id)}
                                disabled={savingId === company.id}
                                className="rounded-lg border border-[#C8A24D]/35 bg-[#C8A24D]/16 px-3 py-1.5 text-xs font-medium text-[#F0D38A] transition hover:bg-[#C8A24D]/24 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                {savingId === company.id ? "Saving..." : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:text-white"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="rounded-l-2xl px-3 py-3 font-medium text-white">{company.name}</td>
                          <td className="px-3 py-3">{company.registration_number || "—"}</td>
                          <td className="px-3 py-3">{company.country || "—"}</td>
                          <td className="px-3 py-3">{company.industry || "—"}</td>
                          <td className="px-3 py-3 text-slate-400">
                            {counts.active} active / {counts.total} total
                          </td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs uppercase tracking-[0.2em] ${verificationBadgeClass(company.verification_status)}`}>
                              {company.verification_status}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs uppercase tracking-[0.2em] ${company.status === "active" ? "border-emerald-400/35 bg-emerald-400/12 text-emerald-200" : "border-slate-400/35 bg-slate-400/12 text-slate-300"}`}>
                              {company.status}
                            </span>
                          </td>
                          <td className="rounded-r-2xl px-3 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/admin/companies/${company.id}`}
                                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-[#C8A24D]/40 hover:text-white"
                              >
                                View
                              </Link>
                              <button
                                type="button"
                                onClick={() => startEdit(company)}
                                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-[#C8A24D]/40 hover:text-white"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleStatus(company)}
                                disabled={savingId === company.id}
                                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-[#C8A24D]/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                {company.status === "active" ? "Deactivate" : "Activate"}
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
