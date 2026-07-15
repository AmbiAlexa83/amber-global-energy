"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import MatchScoreCard from "@/app/admin/_components/match-score-card";
import type { DealMatchRecord } from "@/lib/supabase-server";

type MatchWithSummary = DealMatchRecord & {
  buyer: { companyName: string | null; product: string | null } | null;
  seller: { companyName: string | null; product: string | null } | null;
  priorityScore: number;
};

const STATUS_FILTERS = [
  { value: "", label: "All Statuses" },
  { value: "suggested", label: "Suggested" },
  { value: "under_review", label: "Under Review" },
  { value: "approved", label: "Approved" },
  { value: "needs_information", label: "Needs Information" },
  { value: "rejected", label: "Rejected" },
  { value: "introduced", label: "Introduced" },
  { value: "archived", label: "Archived" },
];

export default function MatchesBoard({ initialMatches }: { initialMatches: MatchWithSummary[] }) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("");
  const [recomputing, setRecomputing] = useState(false);
  const [error, setError] = useState("");
  const [lastComputed, setLastComputed] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const byStatus = statusFilter ? initialMatches.filter((match) => match.match_status === statusFilter) : initialMatches;

    // Priority Score ranks the suggested queue for brokers deciding what to
    // review next — it only governs ordering for "suggested" (or the
    // unfiltered "All" view, dominated by suggested matches). Already-
    // reviewed statuses keep the server's opportunity-score ordering, where
    // priority ranking is less meaningful.
    if (statusFilter === "" || statusFilter === "suggested") {
      return [...byStatus].sort((a, b) => b.priorityScore - a.priorityScore);
    }
    return byStatus;
  }, [initialMatches, statusFilter]);

  const recomputeAll = async () => {
    try {
      setRecomputing(true);
      setError("");
      const response = await fetch("/api/admin/deal-matches", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to compute matches.");
      setLastComputed(payload.computed ?? 0);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to compute matches.");
    } finally {
      setRecomputing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">Recompute Matches</h2>
            <p className="mt-1 text-sm text-slate-400">
              Scores every open buyer inquiry against every open seller inquiry. Suggestions only — nothing is introduced, changed, or sent automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={recomputeAll}
            disabled={recomputing}
            className="rounded-xl border border-[#C8A24D]/35 bg-[#C8A24D]/16 px-4 py-2.5 text-sm font-medium text-[#F0D38A] transition hover:bg-[#C8A24D]/24 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {recomputing ? "Computing..." : "Recompute All Matches"}
          </button>
        </div>
        {lastComputed !== null ? <p className="mt-3 text-sm text-emerald-200">Computed {lastComputed} candidate match{lastComputed === 1 ? "" : "es"}.</p> : null}
        {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}
      </section>

      <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-white">Matches ({filtered.length})</h2>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter matches by status"
            className="rounded-xl border border-white/10 bg-[#071A2D] px-3 py-2 text-sm text-white outline-none transition focus:border-[#C8A24D] focus:ring-2 focus:ring-[#C8A24D]/30 [&>option]:bg-[#050B16]"
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className="mt-4 space-y-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-500">No matches yet — run Recompute All Matches to generate candidates from open inquiries.</p>
          ) : (
            filtered.map((match) => <MatchScoreCard key={match.id} match={match} />)
          )}
        </div>
      </section>
    </div>
  );
}
