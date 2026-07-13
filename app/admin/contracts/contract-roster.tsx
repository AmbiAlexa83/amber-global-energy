"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ContractRecord, CompanyRecord, ProjectRecord, BrokerRecord } from "@/lib/supabase-server";
import { formatCurrencyValue } from "@/lib/inquiry-helpers";
import { contractStatusOptions, contractStatusStyles, formatContractStatusLabel, isContractExpiringSoon } from "@/lib/contract-helpers";

type NewContractDraft = {
  title: string;
  contract_number: string;
  company_id: string;
  project_id: string;
  broker_id: string;
  status: string;
  contract_value: string;
  start_date: string;
  end_date: string;
  signed_date: string;
  notes: string;
};

const emptyDraft: NewContractDraft = {
  title: "",
  contract_number: "",
  company_id: "",
  project_id: "",
  broker_id: "",
  status: "draft",
  contract_value: "",
  start_date: "",
  end_date: "",
  signed_date: "",
  notes: "",
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#050B16] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30 [&>option]:bg-[#050B16]";

export default function ContractRoster({
  initialContracts,
  companies,
  projects,
  brokers,
}: {
  initialContracts: ContractRecord[];
  companies: CompanyRecord[];
  projects: ProjectRecord[];
  brokers: BrokerRecord[];
}) {
  const router = useRouter();
  const [contracts, setContracts] = useState(initialContracts);
  const [draft, setDraft] = useState<NewContractDraft>(emptyDraft);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [movingId, setMovingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState("");

  const createContract = async () => {
    if (!draft.title.trim()) {
      setCreateError("Contract title is required.");
      return;
    }

    try {
      setCreating(true);
      setCreateError("");

      const response = await fetch("/api/admin/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to create contract.");

      setContracts((current) => [payload.data, ...current]);
      setDraft(emptyDraft);
      router.refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Unable to create contract.");
    } finally {
      setCreating(false);
    }
  };

  const changeStatus = async (contract: ContractRecord, nextStatus: string) => {
    try {
      setMovingId(contract.id);
      setRowError("");

      const response = await fetch(`/api/admin/contracts/${contract.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to update contract status.");

      setContracts((current) => current.map((item) => (item.id === contract.id ? payload.data : item)));
      router.refresh();
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "Unable to update contract status.");
    } finally {
      setMovingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
        <h2 className="text-xl font-semibold text-white">Add Contract</h2>
        <p className="mt-1 text-sm text-slate-400">Record a new agreement, optionally linked to a company, pipeline project, and broker.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            placeholder="Contract title"
            className={inputClass}
          />
          <input
            value={draft.contract_number}
            onChange={(event) => setDraft((current) => ({ ...current, contract_number: event.target.value }))}
            placeholder="Contract number (e.g. AGE-2026-001)"
            className={inputClass}
          />
          <select
            value={draft.status}
            onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}
            className={inputClass}
          >
            {contractStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={draft.company_id}
            onChange={(event) => setDraft((current) => ({ ...current, company_id: event.target.value }))}
            className={inputClass}
          >
            <option value="">No company linked</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </select>
          <select
            value={draft.project_id}
            onChange={(event) => setDraft((current) => ({ ...current, project_id: event.target.value }))}
            className={inputClass}
          >
            <option value="">No project linked</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
          <select
            value={draft.broker_id}
            onChange={(event) => setDraft((current) => ({ ...current, broker_id: event.target.value }))}
            className={inputClass}
          >
            <option value="">No broker assigned</option>
            {brokers.map((broker) => (
              <option key={broker.id} value={broker.id}>{broker.name}</option>
            ))}
          </select>
          <input
            value={draft.contract_value}
            onChange={(event) => setDraft((current) => ({ ...current, contract_value: event.target.value }))}
            placeholder="Contract value (e.g. 500000)"
            className={inputClass}
          />
          <label className="text-xs text-slate-500">
            <span className="mb-1 block uppercase tracking-[0.15em]">Start Date</span>
            <input
              type="date"
              value={draft.start_date}
              onChange={(event) => setDraft((current) => ({ ...current, start_date: event.target.value }))}
              className={`${inputClass} [color-scheme:dark]`}
            />
          </label>
          <label className="text-xs text-slate-500">
            <span className="mb-1 block uppercase tracking-[0.15em]">End Date</span>
            <input
              type="date"
              value={draft.end_date}
              onChange={(event) => setDraft((current) => ({ ...current, end_date: event.target.value }))}
              className={`${inputClass} [color-scheme:dark]`}
            />
          </label>
          <textarea
            value={draft.notes}
            onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Notes"
            rows={1}
            className={`${inputClass} sm:col-span-2 lg:col-span-3`}
          />
        </div>

        {createError ? <p className="mt-3 text-sm text-rose-200">{createError}</p> : null}

        <button
          type="button"
          onClick={createContract}
          disabled={creating}
          className="mt-4 rounded-xl border border-[#C8A24D]/35 bg-[#C8A24D]/16 px-4 py-2.5 text-sm font-medium text-[#F0D38A] transition hover:bg-[#C8A24D]/24 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {creating ? "Adding..." : "Add Contract"}
        </button>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
        <h2 className="text-xl font-semibold text-white">Contracts</h2>

        {rowError ? <p className="mt-3 text-sm text-rose-200">{rowError}</p> : null}

        {contracts.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#071A2D]/70 px-5 py-10 text-center text-slate-400">
            No contracts recorded yet.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
              <thead>
                <tr className="text-slate-400">
                  <th className="px-3 py-2 font-medium">Contract</th>
                  <th className="px-3 py-2 font-medium">Company</th>
                  <th className="px-3 py-2 font-medium">Project</th>
                  <th className="px-3 py-2 font-medium">Value</th>
                  <th className="px-3 py-2 font-medium">End Date</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => {
                  const expiring = contract.status === "active" && isContractExpiringSoon(contract.end_date);

                  return (
                    <tr key={contract.id} className="rounded-2xl bg-[#071A2D]/80 text-slate-300 align-top">
                      <td className="rounded-l-2xl px-3 py-3">
                        <p className="font-medium text-white">{contract.title}</p>
                        {contract.contract_number ? <p className="text-xs text-slate-500">{contract.contract_number}</p> : null}
                      </td>
                      <td className="px-3 py-3">
                        {contract.companies && contract.company_id ? (
                          <Link href={`/admin/companies/${contract.company_id}`} className="hover:underline">
                            {contract.companies.name}
                          </Link>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-3">
                        {contract.projects && contract.project_id ? (
                          <Link href={`/admin/projects/${contract.project_id}`} className="hover:underline">
                            {contract.projects.name}
                          </Link>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-3 text-slate-400">{contract.contract_value ? formatCurrencyValue(contract.contract_value) : "—"}</td>
                      <td className="px-3 py-3 text-slate-400">
                        {contract.end_date || "—"}
                        {expiring ? <span className="ml-2 rounded-full border border-rose-400/35 bg-rose-400/12 px-2 py-0.5 text-[9px] uppercase tracking-[0.15em] text-rose-200">Expiring</span> : null}
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={contract.status}
                          onChange={(event) => changeStatus(contract, event.target.value)}
                          disabled={movingId === contract.id}
                          className={`rounded-full border px-2.5 py-1 text-xs uppercase tracking-[0.15em] ${contractStatusStyles[contract.status]} bg-transparent [&>option]:bg-[#050B16] [&>option]:text-white`}
                        >
                          {contractStatusOptions.map((option) => (
                            <option key={option.value} value={option.value}>{formatContractStatusLabel(option.value)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="rounded-r-2xl px-3 py-3">
                        <Link
                          href={`/admin/contracts/${contract.id}`}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-[#C8A24D]/40 hover:text-white"
                        >
                          View
                        </Link>
                      </td>
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
