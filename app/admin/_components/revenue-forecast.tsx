import { formatCurrencyValue } from "@/lib/inquiry-helpers";
import type { RevenueForecast as RevenueForecastData } from "@/lib/pipeline-forecast";

export default function RevenueForecast({ forecast }: { forecast: RevenueForecastData }) {
  const cards: Array<{ label: string; value: string; tone: string }> = [
    { label: "Current Pipeline", value: formatCurrencyValue(forecast.currentPipelineValue), tone: "text-white" },
    { label: "Weighted Forecast", value: formatCurrencyValue(forecast.weightedForecast), tone: "text-[#F0D38A]" },
    { label: "Best Case", value: formatCurrencyValue(forecast.bestCase), tone: "text-emerald-200" },
    { label: "Commit Forecast", value: formatCurrencyValue(forecast.commitForecast), tone: "text-sky-200" },
    { label: "Closed-Won Revenue", value: formatCurrencyValue(forecast.closedWonRevenue), tone: "text-emerald-200" },
    { label: "Next 30 Days", value: formatCurrencyValue(forecast.next30), tone: "text-white" },
    { label: "Next 60 Days", value: formatCurrencyValue(forecast.next60), tone: "text-white" },
    { label: "Next 90 Days", value: formatCurrencyValue(forecast.next90), tone: "text-white" },
  ];

  return (
    <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
      <h2 className="text-xl font-semibold text-white">Revenue Forecast</h2>
      <p className="mt-1 text-sm text-slate-400">Probability-weighted forecast using centralized, configurable stage probabilities.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-[20px] border border-white/10 bg-[#071A2D]/80 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{card.label}</p>
            <p className={`mt-2 text-xl font-semibold ${card.tone}`}>{card.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
