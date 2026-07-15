import Link from "next/link";
import { formatCurrencyValue } from "@/lib/inquiry-helpers";
import { formatProjectStageLabel } from "@/lib/project-helpers";
import type { PipelineIntelligence as PipelineIntelligenceData } from "@/lib/executive-analytics";

export default function PipelineIntelligence({ pipeline }: { pipeline: PipelineIntelligenceData }) {
  const maxCount = Math.max(1, ...pipeline.stages.map((stage) => stage.count));

  return (
    <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
      <h2 className="text-xl font-semibold text-white">Pipeline Intelligence</h2>
      <p className="mt-1 text-sm text-slate-400">Deal count, value, weighted value, and stage-to-stage conversion.</p>

      <div className="mt-4 space-y-3">
        {pipeline.stages.map((stage) => (
          <div key={stage.stage}>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs uppercase tracking-[0.15em] text-slate-500">
              <span>{formatProjectStageLabel(stage.stage)}</span>
              <span>
                {stage.count} deals • {formatCurrencyValue(stage.value)} • weighted {formatCurrencyValue(stage.weightedValue)}
                {stage.conversionRate !== null ? ` • ${stage.conversionRate}% conversion` : ""}
              </span>
            </div>
            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-[#071A2D]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#C8A24D] to-[#F0D38A]"
                style={{ width: `${Math.max(4, Math.round((stage.count / maxCount) * 100))}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <p className="text-sm uppercase tracking-[0.25em] text-rose-300">Stalled Opportunities ({pipeline.stalledDeals.length})</p>
        {pipeline.stalledDeals.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No stalled deals — every active project has had recent activity.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {pipeline.stalledDeals.map((deal) => (
              <Link
                key={deal.projectId}
                href={deal.href}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#071A2D]/80 px-4 py-3 transition hover:border-[#C8A24D]/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{deal.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatProjectStageLabel(deal.stage)} • {formatCurrencyValue(deal.value)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-rose-400/35 bg-rose-400/12 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-rose-200">
                  {deal.daysSinceActivity}d idle
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
