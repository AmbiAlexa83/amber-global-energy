import type { CompanyHealthLevel } from "@/lib/company-intelligence";

// The single home for the health-level → badge mapping, shared by
// CompanyHealthCard (company profile) and CompanyRoster (company directory)
// so the two surfaces can never drift apart in colour or wording. The values
// below are lifted verbatim from CompanyHealthCard, which owned them before
// Stage 5.3.3 gave them a second caller.
//
// Presentation only, and no framework imports beyond the type — usable from
// both server and client components (the directory roster is a client
// component; the profile card is server-rendered).
//
// Size and weight utilities are deliberately left to the caller via
// className: the profile card's badge is a card-level heading affordance,
// while the roster's sits in a table row alongside the existing verification
// and status badges and has to match their smaller scale.

export const companyHealthLevelStyles: Record<CompanyHealthLevel, string> = {
  healthy: "border-emerald-400/35 bg-emerald-400/12 text-emerald-200",
  attention_needed: "border-[#C8A24D]/35 bg-[#C8A24D]/12 text-[#F0D38A]",
  at_risk: "border-rose-400/35 bg-rose-400/12 text-rose-200",
};

export const companyHealthLevelLabels: Record<CompanyHealthLevel, string> = {
  healthy: "Healthy",
  attention_needed: "Attention Needed",
  at_risk: "At Risk",
};

export default function CompanyHealthBadge({
  level,
  className = "",
  title,
}: {
  level: CompanyHealthLevel;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-2 rounded-full border uppercase tracking-[0.2em] ${companyHealthLevelStyles[level]} ${className}`}
    >
      {companyHealthLevelLabels[level]}
    </span>
  );
}
