import { formatCurrencyValue } from "@/lib/inquiry-helpers";
import type { BrokerIntelligence as BrokerIntelligenceData } from "@/lib/executive-analytics";

export default function BrokerIntelligence({ brokerMetrics }: { brokerMetrics: BrokerIntelligenceData }) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
      <h2 className="text-xl font-semibold text-white">Broker Intelligence</h2>
      <p className="mt-1 text-sm text-slate-400">Ranked by total assigned pipeline value. Brokers with no linked deals are listed separately, unranked.</p>

      {brokerMetrics.ranked.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No brokers with pipeline activity yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
            <thead>
              <tr className="text-slate-400">
                <th className="px-3 py-2 font-medium">Broker</th>
                <th className="px-3 py-2 font-medium">Active</th>
                <th className="px-3 py-2 font-medium">Pipeline Value</th>
                <th className="px-3 py-2 font-medium">Weighted Value</th>
                <th className="px-3 py-2 font-medium">Won / Lost</th>
                <th className="px-3 py-2 font-medium">Avg Response</th>
                <th className="px-3 py-2 font-medium">Follow-Up Rate</th>
                <th className="px-3 py-2 font-medium">High Priority</th>
                <th className="px-3 py-2 font-medium">Awaiting Docs</th>
              </tr>
            </thead>
            <tbody>
              {brokerMetrics.ranked.map((broker) => (
                <tr key={broker.brokerId} className="rounded-2xl bg-[#071A2D]/80 text-slate-300">
                  <td className="rounded-l-2xl px-3 py-3 font-medium text-white">{broker.name}</td>
                  <td className="px-3 py-3">{broker.activeDeals}</td>
                  <td className="px-3 py-3 text-[#F0D38A]">{formatCurrencyValue(broker.totalPipelineValue)}</td>
                  <td className="px-3 py-3">{formatCurrencyValue(broker.weightedPipelineValue)}</td>
                  <td className="px-3 py-3">
                    {broker.closedWonCount} / {broker.closedLostCount}
                  </td>
                  <td className="px-3 py-3">{broker.averageResponseTimeHours !== null ? `${broker.averageResponseTimeHours}h` : "—"}</td>
                  <td className="px-3 py-3">{broker.followUpCompletionRate !== null ? `${broker.followUpCompletionRate}%` : "—"}</td>
                  <td className="px-3 py-3">{broker.highPriorityWorkload}</td>
                  <td className="rounded-r-2xl px-3 py-3">{broker.dealsAwaitingDocuments}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[20px] border border-white/10 bg-[#071A2D]/80 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Unassigned Deals</p>
          <p className="mt-2 text-xl font-semibold text-amber-200">
            {brokerMetrics.unassigned.activeDeals} active • {formatCurrencyValue(brokerMetrics.unassigned.pipelineValue)}
          </p>
        </div>
        {brokerMetrics.noData.length > 0 ? (
          <div className="rounded-[20px] border border-white/10 bg-[#071A2D]/80 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">No Deal Data Yet</p>
            <p className="mt-2 text-sm text-slate-300">{brokerMetrics.noData.map((broker) => broker.name).join(", ")}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
