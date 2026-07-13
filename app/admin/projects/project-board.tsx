"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProjectRecord, CompanyRecord, BrokerRecord, InquiryServerRecord } from "@/lib/supabase-server";
import { formatCurrencyValue } from "@/lib/inquiry-helpers";
import { projectStageOptions, projectStageStyles, formatProjectStageLabel } from "@/lib/project-helpers";

type NewProjectDraft = {
  name: string;
  company_id: string;
  broker_id: string;
  inquiry_id: string;
  stage: string;
  estimated_value: string;
  expected_close_date: string;
  notes: string;
};

const emptyDraft: NewProjectDraft = {
  name: "",
  company_id: "",
  broker_id: "",
  inquiry_id: "",
  stage: "prospecting",
  estimated_value: "",
  expected_close_date: "",
  notes: "",
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#050B16] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30 [&>option]:bg-[#050B16]";

const inquiryLabel = (inquiry: InquiryServerRecord) =>
  `${inquiry.company_name ?? "Unknown company"} — ${inquiry.contact_name ?? inquiry.name ?? "Unnamed contact"}`;

export default function ProjectBoard({
  initialProjects,
  companies,
  brokers,
  inquiries,
}: {
  initialProjects: ProjectRecord[];
  companies: CompanyRecord[];
  brokers: BrokerRecord[];
  inquiries: InquiryServerRecord[];
}) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [draft, setDraft] = useState<NewProjectDraft>(emptyDraft);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [movingId, setMovingId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState("");

  const createProject = async () => {
    if (!draft.name.trim()) {
      setCreateError("Project name is required.");
      return;
    }

    try {
      setCreating(true);
      setCreateError("");

      const response = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to create project.");

      setProjects((current) => [payload.data, ...current]);
      setDraft(emptyDraft);
      router.refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Unable to create project.");
    } finally {
      setCreating(false);
    }
  };

  const moveStage = async (project: ProjectRecord, nextStage: string) => {
    try {
      setMovingId(project.id);
      setMoveError("");

      const response = await fetch(`/api/admin/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: nextStage }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to move project.");

      setProjects((current) => current.map((item) => (item.id === project.id ? payload.data : item)));
      router.refresh();
    } catch (err) {
      setMoveError(err instanceof Error ? err.message : "Unable to move project.");
    } finally {
      setMovingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
        <h2 className="text-xl font-semibold text-white">Add Project</h2>
        <p className="mt-1 text-sm text-slate-400">Create a new deal in the pipeline, optionally linked to a company, broker, and originating inquiry.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            placeholder="Project name"
            className={inputClass}
          />
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
            value={draft.broker_id}
            onChange={(event) => setDraft((current) => ({ ...current, broker_id: event.target.value }))}
            className={inputClass}
          >
            <option value="">No broker assigned</option>
            {brokers.map((broker) => (
              <option key={broker.id} value={broker.id}>{broker.name}</option>
            ))}
          </select>
          <select
            value={draft.inquiry_id}
            onChange={(event) => setDraft((current) => ({ ...current, inquiry_id: event.target.value }))}
            className={inputClass}
          >
            <option value="">No originating inquiry</option>
            {inquiries.map((inquiry) => (
              <option key={String(inquiry.id)} value={String(inquiry.id)}>{inquiryLabel(inquiry)}</option>
            ))}
          </select>
          <select
            value={draft.stage}
            onChange={(event) => setDraft((current) => ({ ...current, stage: event.target.value }))}
            className={inputClass}
          >
            {projectStageOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <input
            value={draft.estimated_value}
            onChange={(event) => setDraft((current) => ({ ...current, estimated_value: event.target.value }))}
            placeholder="Estimated value (e.g. 250000)"
            className={inputClass}
          />
          <input
            type="date"
            value={draft.expected_close_date}
            onChange={(event) => setDraft((current) => ({ ...current, expected_close_date: event.target.value }))}
            className={`${inputClass} [color-scheme:dark]`}
          />
          <textarea
            value={draft.notes}
            onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Notes"
            rows={1}
            className={`${inputClass} sm:col-span-2`}
          />
        </div>

        {createError ? <p className="mt-3 text-sm text-rose-200">{createError}</p> : null}

        <button
          type="button"
          onClick={createProject}
          disabled={creating}
          className="mt-4 rounded-xl border border-[#C8A24D]/35 bg-[#C8A24D]/16 px-4 py-2.5 text-sm font-medium text-[#F0D38A] transition hover:bg-[#C8A24D]/24 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {creating ? "Adding..." : "Add Project"}
        </button>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
        <h2 className="text-xl font-semibold text-white">Pipeline Board</h2>

        {moveError ? <p className="mt-3 text-sm text-rose-200">{moveError}</p> : null}

        <div className="mt-4 grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {projectStageOptions.map((stageOption) => {
            const stageProjects = projects.filter((project) => project.stage === stageOption.value);

            return (
              <div key={stageOption.value} className="rounded-[20px] border border-white/10 bg-[#071A2D]/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] ${projectStageStyles[stageOption.value]}`}>
                    {stageOption.label}
                  </span>
                  <span className="text-xs text-slate-500">{stageProjects.length}</span>
                </div>

                <div className="mt-3 space-y-2">
                  {stageProjects.length === 0 ? (
                    <p className="rounded-xl border border-white/5 bg-[#050B16]/50 px-3 py-4 text-center text-xs text-slate-500">No projects</p>
                  ) : (
                    stageProjects.map((project) => (
                      <div key={project.id} className="rounded-xl border border-white/10 bg-[#050B16]/70 p-3">
                        <p className="text-sm font-medium text-white">{project.name}</p>
                        {project.companies ? (
                          <Link
                            href={`/admin/companies/${project.company_id}`}
                            className="mt-1 block text-xs text-[#F0D38A] hover:underline"
                          >
                            {project.companies.name}
                          </Link>
                        ) : null}
                        {project.brokers ? <p className="mt-0.5 text-xs text-slate-500">Broker: {project.brokers.name}</p> : null}
                        {project.inquiries ? (
                          <Link
                            href={`/admin/customers/${project.inquiry_id}`}
                            className="mt-0.5 block text-xs text-slate-500 hover:text-white hover:underline"
                          >
                            From: {project.inquiries.contact_name ?? project.inquiries.name ?? "inquiry"}
                          </Link>
                        ) : null}
                        {project.estimated_value ? (
                          <p className="mt-1 text-sm font-semibold text-[#F0D38A]">{formatCurrencyValue(project.estimated_value)}</p>
                        ) : null}
                        {project.expected_close_date ? (
                          <p className="mt-0.5 text-[10px] uppercase tracking-[0.15em] text-slate-500">
                            Close: {project.expected_close_date}
                          </p>
                        ) : null}

                        <div className="mt-2 flex items-center gap-2">
                          <select
                            value={project.stage}
                            onChange={(event) => moveStage(project, event.target.value)}
                            disabled={movingId === project.id}
                            className="flex-1 rounded-lg border border-white/10 bg-[#071A2D] px-2 py-1.5 text-xs text-white outline-none transition focus:border-[#C8A24D] [&>option]:bg-[#050B16]"
                          >
                            {projectStageOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                          <Link
                            href={`/admin/projects/${project.id}`}
                            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-medium text-slate-300 transition hover:border-[#C8A24D]/40 hover:text-white"
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
