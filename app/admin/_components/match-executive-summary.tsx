import type { ExecutiveMatchSummary as ExecutiveMatchSummaryData } from "@/lib/match-executive-summary";
import { confidenceStyles } from "@/app/admin/_components/match-score-card";

// A concise, broker-facing digest — headline + why-matched + top 3 of each
// category + the single recommended action. The full itemized breakdown
// lives in MatchExplanationPanel below it; this panel is the quick read.
export default function MatchExecutiveSummary({ summary }: { summary: ExecutiveMatchSummaryData }) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-white">Executive Match Summary</h2>
        <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${confidenceStyles[summary.confidence] ?? confidenceStyles["Needs Information"]}`}>
          {summary.confidence}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-300">{summary.headline}</p>
      <p className="mt-3 text-sm leading-6 text-slate-300">{summary.whyMatched}</p>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Strengths</p>
          {summary.strengthsSummary.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">None identified.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {summary.strengthsSummary.map((item, index) => (
                <li key={index} className="text-sm text-slate-300">• {item}</li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-rose-300">Risks</p>
          {summary.risksSummary.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">None identified.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {summary.risksSummary.map((item, index) => (
                <li key={index} className="text-sm text-slate-300">• {item}</li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#F0D38A]">Missing Information</p>
          {summary.missingInformationSummary.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">None.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {summary.missingInformationSummary.map((item, index) => (
                <li key={index} className="text-sm text-slate-300">• {item}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-[#C8A24D]/25 bg-[#C8A24D]/8 px-4 py-3">
        <p className="text-xs uppercase tracking-[0.2em] text-[#F0D38A]">Recommended Broker Action</p>
        <p className="mt-1 text-sm text-slate-200">{summary.recommendedAction}</p>
      </div>
    </section>
  );
}
