import Link from "next/link";
import type { ExecutiveAlert } from "@/lib/executive-alerts";

const severityStyles: Record<ExecutiveAlert["severity"], string> = {
  critical: "border-red-500/40 bg-red-500/15 text-red-200",
  high: "border-rose-400/35 bg-rose-400/12 text-rose-200",
  medium: "border-[#C8A24D]/35 bg-[#C8A24D]/12 text-[#F0D38A]",
  low: "border-emerald-400/35 bg-emerald-400/12 text-emerald-200",
};

export default function ExecutiveAlertsPanel({ alerts }: { alerts: ExecutiveAlert[] }) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
      <h2 className="text-xl font-semibold text-white">Executive Alerts ({alerts.length})</h2>
      <p className="mt-1 text-sm text-slate-400">Rule-based alerts generated from live CRM data, ranked by severity.</p>

      {alerts.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No alerts — nothing requires executive attention right now.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {alerts.map((alert) => (
            <Link
              key={alert.id}
              href={alert.href}
              className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-[#071A2D]/80 px-4 py-3 transition hover:border-[#C8A24D]/40"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{alert.entityLabel}</p>
                <p className="mt-0.5 text-sm text-slate-300">{alert.reason}</p>
                <p className="mt-1 text-xs text-slate-500">Recommended: {alert.recommendedAction}</p>
              </div>
              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${severityStyles[alert.severity]}`}>
                {alert.severity}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
