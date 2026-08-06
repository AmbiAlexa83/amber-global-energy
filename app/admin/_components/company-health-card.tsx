import { getRelativeTime } from "@/lib/inquiry-helpers";
import type { CompanyHealthReport } from "@/lib/company-intelligence";
import CompanyHealthBadge from "./company-health-badge";

// Presentation only — every value rendered here comes directly from
// computeCompanyHealth()'s output (lib/company-intelligence.ts). This
// component performs no business-rule evaluation of its own: no threshold
// checks, no status comparisons, no re-derivation of level/reasons/flags.
// Server-rendered (no "use client") — read-only, no local state.
//
// The level badge moved to CompanyHealthBadge in Stage 5.3.3 when the company
// directory needed the same mapping; the rendered markup is unchanged.

// Matches the severityStyles convention already used in
// app/admin/_components/executive-alerts-panel.tsx for ExecutiveAlert —
// CompanyHealthFlag.severity is the same AlertSeverity type.
const severityStyles: Record<CompanyHealthReport["flags"][number]["severity"], string> = {
  critical: "border-red-500/40 bg-red-500/15 text-red-200",
  high: "border-rose-400/35 bg-rose-400/12 text-rose-200",
  medium: "border-[#C8A24D]/35 bg-[#C8A24D]/12 text-[#F0D38A]",
  low: "border-emerald-400/35 bg-emerald-400/12 text-emerald-200",
};

const interactionTypeLabels: Record<NonNullable<CompanyHealthReport["metrics"]["lastInteractionType"]>, string> = {
  email: "Email",
  support_request: "Support Update",
  document: "Document",
};

export default function CompanyHealthCard({ health }: { health: CompanyHealthReport }) {
  const { level, reasons, flags, metrics } = health;

  const metricTiles: Array<{ label: string; value: string }> = [
    { label: "Active Inquiries", value: String(metrics.activeInquiries) },
    { label: "Active Projects", value: String(metrics.activeProjects) },
    { label: "Active Contracts", value: String(metrics.activeContracts) },
    {
      label: "Open Support Requests",
      value:
        metrics.urgentSupportRequests > 0
          ? `${metrics.openSupportRequests} (${metrics.urgentSupportRequests} urgent)`
          : String(metrics.openSupportRequests),
    },
    { label: "Upcoming Reminders", value: String(metrics.upcomingReminders) },
    { label: "Overdue Reminders", value: String(metrics.overdueReminders) },
    { label: "Primary Contact", value: metrics.hasPrimaryContact ? "Assigned" : "Not Assigned" },
    {
      label: "Last Interaction",
      value: metrics.lastInteractionAt
        ? `${getRelativeTime(metrics.lastInteractionAt)} · ${interactionTypeLabels[metrics.lastInteractionType!]}`
        : "No activity recorded",
    },
  ];

  return (
    <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Company Health</p>
        <CompanyHealthBadge level={level} className="px-3 py-1.5 text-xs font-semibold" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metricTiles.map((tile) => (
          <div key={tile.label} className="rounded-2xl border border-white/10 bg-[#050B16]/70 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{tile.label}</p>
            <p className="mt-1 text-lg font-semibold text-white">{tile.value}</p>
          </div>
        ))}
      </div>

      {flags.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">{reasons[0]}</p>
      ) : (
        <div className="mt-4 space-y-2">
          {flags.map((flag) => (
            <div key={flag.id} className="rounded-2xl border border-white/10 bg-[#050B16]/70 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-white">{flag.reason}</p>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${severityStyles[flag.severity]}`}
                >
                  {flag.severity}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Recommended: {flag.recommendedAction}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
