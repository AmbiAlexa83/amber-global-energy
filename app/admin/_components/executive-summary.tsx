import type { ExecutiveSummary as ExecutiveSummaryData } from "@/lib/executive-analytics";

const healthStyles: Record<ExecutiveSummaryData["pipelineHealth"]["status"], string> = {
  strong: "border-emerald-400/35 bg-emerald-400/12 text-emerald-200",
  steady: "border-sky-400/35 bg-sky-400/12 text-sky-200",
  at_risk: "border-rose-400/35 bg-rose-400/12 text-rose-200",
};

const priorityStyles: Record<"high" | "medium" | "low", string> = {
  high: "border-rose-400/35 bg-rose-400/12 text-rose-200",
  medium: "border-[#C8A24D]/35 bg-[#C8A24D]/12 text-[#F0D38A]",
  low: "border-slate-400/35 bg-slate-400/12 text-slate-300",
};

export default function ExecutiveSummary({ summary }: { summary: ExecutiveSummaryData }) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-white">Executive Summary</h2>
        <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${healthStyles[summary.pipelineHealth.status]}`}>
          {summary.pipelineHealth.status.replace("_", " ")}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-300">{summary.pipelineHealth.note}</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-rose-300">Highest-Priority Risks</p>
          {summary.topRisks.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No high-severity risks right now.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {summary.topRisks.map((risk) => (
                <li key={risk.alertId} className="text-sm text-slate-300">• {risk.note}</li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Near-Term Opportunities</p>
          {summary.nearTermOpportunities.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No deals currently at the introduction threshold.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {summary.nearTermOpportunities.map((opportunity) => (
                <li key={opportunity.entityId} className="text-sm text-slate-300">• {opportunity.entityLabel} — {opportunity.note}</li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-amber-300">Document Bottlenecks</p>
          <p className="mt-2 text-sm text-slate-300">{summary.documentBottlenecks.note}</p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Broker Workload</p>
          {summary.brokerWorkload.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No broker workload data yet.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {summary.brokerWorkload.map((broker) => (
                <li key={broker.brokerId} className="text-sm text-slate-300">• {broker.name} — {broker.note}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Recommended Management Actions</p>
        <div className="mt-2 space-y-2">
          {summary.recommendedActions.map((action, index) => (
            <div key={index} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#071A2D]/80 px-4 py-3">
              <p className="text-sm text-slate-200">{action.action}</p>
              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${priorityStyles[action.priority]}`}>
                {action.priority}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
