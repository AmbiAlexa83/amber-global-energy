"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DealMatchRecord } from "@/lib/supabase-server";
import { matchStatusStyles, formatMatchStatusLabel } from "@/app/admin/_components/match-score-card";

const WORKFLOW_STATUSES = ["suggested", "under_review", "approved", "rejected", "needs_information", "introduced", "archived"];

// The only mutation this panel performs is a human review decision — it
// never introduces the buyer and seller, never changes either inquiry's
// status, and never sends anything. Introduction remains a separate,
// explicitly human action taken outside this system.
export default function MatchReviewPanel({ match }: { match: DealMatchRecord }) {
  const router = useRouter();
  const [status, setStatus] = useState(match.match_status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submitDecision = async (matchStatus: string, brokerDecision?: string | null) => {
    try {
      setSaving(true);
      setError("");
      const body: Record<string, string | null> = { match_status: matchStatus };
      // Omit broker_decision entirely for workflow-only status changes so the
      // API leaves any previously recorded decision untouched.
      if (brokerDecision !== undefined) body.broker_decision = brokerDecision;
      const response = await fetch(`/api/admin/deal-matches/${match.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to update match.");
      setStatus(payload.data.match_status);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update match.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-white">Broker Review</h2>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${matchStatusStyles[status] ?? matchStatusStyles.suggested}`}>
          {formatMatchStatusLabel(status)}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-400">
        Recording a decision here does not introduce the parties or change either inquiry — it only marks this match for the next human step.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => submitDecision("approved", "approved")}
          disabled={saving}
          className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-70"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => submitDecision("needs_information", "needs_information")}
          disabled={saving}
          className="rounded-xl border border-[#C8A24D]/35 bg-[#C8A24D]/16 px-4 py-2.5 text-sm font-medium text-[#F0D38A] transition hover:bg-[#C8A24D]/24 disabled:cursor-not-allowed disabled:opacity-70"
        >
          Needs Information
        </button>
        <button
          type="button"
          onClick={() => submitDecision("rejected", "rejected")}
          disabled={saving}
          className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-2.5 text-sm font-medium text-rose-200 transition hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-70"
        >
          Reject
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label htmlFor="match-workflow-status" className="text-xs uppercase tracking-[0.2em] text-slate-500">Workflow status</label>
        <select
          id="match-workflow-status"
          value={status}
          onChange={(event) => {
            const next = event.target.value;
            setStatus(next);
            submitDecision(next);
          }}
          disabled={saving}
          className="rounded-xl border border-white/10 bg-[#071A2D] px-3 py-2 text-sm text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30 [&>option]:bg-[#050B16]"
        >
          {WORKFLOW_STATUSES.map((option) => (
            <option key={option} value={option}>{formatMatchStatusLabel(option)}</option>
          ))}
        </select>
      </div>

      {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}
    </section>
  );
}
