import Link from "next/link";
import type { DealMatchRecord } from "@/lib/supabase-server";

export const confidenceStyles: Record<string, string> = {
  "Strong Match": "border-emerald-400/35 bg-emerald-400/12 text-emerald-200",
  "Potential Match": "border-sky-400/35 bg-sky-400/12 text-sky-200",
  "Needs Information": "border-[#C8A24D]/35 bg-[#C8A24D]/12 text-[#F0D38A]",
  "High Risk": "border-rose-400/35 bg-rose-400/12 text-rose-200",
  "Not Compatible": "border-slate-400/35 bg-slate-400/12 text-slate-300",
};

export const matchStatusStyles: Record<string, string> = {
  suggested: "border-slate-400/35 bg-slate-400/12 text-slate-300",
  under_review: "border-sky-400/35 bg-sky-400/12 text-sky-200",
  approved: "border-emerald-400/35 bg-emerald-400/12 text-emerald-200",
  rejected: "border-rose-400/35 bg-rose-400/12 text-rose-200",
  needs_information: "border-[#C8A24D]/35 bg-[#C8A24D]/12 text-[#F0D38A]",
  introduced: "border-violet-400/35 bg-violet-400/12 text-violet-200",
  archived: "border-slate-500/35 bg-slate-500/12 text-slate-400",
};

export const formatMatchStatusLabel = (status: string) =>
  status.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");

type MatchWithSummary = DealMatchRecord & {
  buyer: { companyName: string | null; product: string | null } | null;
  seller: { companyName: string | null; product: string | null } | null;
  priorityScore: number;
};

export default function MatchScoreCard({ match }: { match: MatchWithSummary }) {
  return (
    <Link
      href={`/admin/matches/${match.id}`}
      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#071A2D]/80 p-4 transition hover:border-[#C8A24D]/40 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">
          {match.buyer?.companyName ?? "Buyer"} <span className="text-slate-500">↔</span> {match.seller?.companyName ?? "Seller"}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          {match.buyer?.product ?? "—"} • {match.seller?.product ?? "—"}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span className="rounded-full border border-[#C8A24D]/35 bg-[#C8A24D]/12 px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] text-[#F0D38A]">
          Priority {match.priorityScore}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] text-slate-300">
          Compatibility {match.compatibility_score}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] text-slate-300">
          Opportunity {match.opportunity_score}
        </span>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${confidenceStyles[match.confidence] ?? confidenceStyles["Needs Information"]}`}>
          {match.confidence}
        </span>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${matchStatusStyles[match.match_status] ?? matchStatusStyles.suggested}`}>
          {formatMatchStatusLabel(match.match_status)}
        </span>
      </div>
    </Link>
  );
}
