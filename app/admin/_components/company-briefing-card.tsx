import type { CompanyBriefing } from "@/lib/company-intelligence";

// Presentation only — every word rendered here is produced by the existing
// computeCompanyBriefing() (lib/company-intelligence.ts, built in Stage
// 5.3.1A and unmodified here). This component composes no prose of its own:
// no sentence assembly, no pluralization, no threshold checks, no
// re-derivation of the health level. Server-rendered (no "use client") —
// read-only, no local state.
//
// Card chrome and the nested #050B16/70 row background mirror
// CompanyHealthCard exactly, so this reads as one more card in the existing
// company-profile stack rather than a new visual treatment. Highlights are
// deliberately rendered as small subordinate chips: they restate facts the
// summary sentence and the health card above already carry, so they support
// the prose at a glance instead of competing with it.

export default function CompanyBriefingCard({ briefing }: { briefing: CompanyBriefing }) {
  const { summary, highlights } = briefing;

  return (
    <div className="rounded-[24px] border border-white/10 bg-[#071A2D]/90 p-4">
      <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Executive Briefing</p>

      <div className="mt-3 rounded-2xl border border-white/10 bg-[#050B16]/70 px-4 py-3">
        <p className="text-sm leading-7 text-slate-200">{summary}</p>
      </div>

      {highlights.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {highlights.map((highlight, index) => (
            <span
              key={`${index}-${highlight}`}
              className="rounded-full border border-white/10 bg-[#050B16]/70 px-3 py-1 text-xs text-slate-400"
            >
              {highlight}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
