import { formatCurrencyValue } from "@/lib/inquiry-helpers";
import type { ExecutiveKpis } from "@/lib/executive-analytics";

// Presentational only — all figures arrive as plain numbers from
// ExecutiveKpis; currency/percentage formatting happens here, not in the
// analytics service layer.
export default function KpiGrid({ kpis }: { kpis: ExecutiveKpis }) {
  const cards: Array<{ label: string; value: string; tone: string }> = [
    { label: "Total Pipeline Value", value: formatCurrencyValue(kpis.totalPipelineValue), tone: "text-white" },
    { label: "Weighted Pipeline Value", value: formatCurrencyValue(kpis.weightedPipelineValue), tone: "text-[#F0D38A]" },
    { label: "Active Projects", value: String(kpis.activeProjects), tone: "text-sky-200" },
    { label: "Open Contracts", value: String(kpis.openContracts), tone: "text-sky-200" },
    { label: "Closed-Won Value", value: formatCurrencyValue(kpis.closedWonValue), tone: "text-emerald-200" },
    { label: "Closed-Lost Value", value: formatCurrencyValue(kpis.closedLostValue), tone: "text-rose-200" },
    { label: "Average Deal Size", value: formatCurrencyValue(kpis.averageDealSize), tone: "text-white" },
    { label: "Win Rate", value: `${kpis.winRate}%`, tone: "text-emerald-200" },
    {
      label: "Average Response Time",
      value: kpis.averageResponseTimeHours !== null ? `${kpis.averageResponseTimeHours}h` : "—",
      tone: "text-[#F0D38A]",
    },
    { label: "Deals Awaiting Documents", value: String(kpis.dealsAwaitingDocuments), tone: "text-amber-200" },
    { label: "High-Priority Opportunities", value: String(kpis.highPriorityOpportunities), tone: "text-rose-200" },
    { label: "Ready for Introduction", value: String(kpis.dealsReadyForIntroduction), tone: "text-emerald-200" },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.32)]">
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">{card.label}</p>
          <p className={`mt-3 text-2xl font-semibold sm:text-3xl ${card.tone}`}>{card.value}</p>
        </div>
      ))}
    </section>
  );
}
