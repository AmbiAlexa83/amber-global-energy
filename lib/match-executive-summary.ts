// Executive Match Summary — a structured, deterministic (never AI-generated)
// digest of a single match, built entirely from fields already computed by
// lib/deal-matching.ts and lib/match-explanations.ts. Returns a structured
// object, not a formatted string, per the Phase 4.1 service-layer mandate —
// formatting stays in the presentational component that renders it.

export type ExecutiveMatchSummaryInput = {
  confidence: string;
  compatibilityScore: number;
  opportunityScore: number;
  priorityScore: number;
  strengths: string[];
  conflicts: string[];
  missingInformation: string[];
  recommendedNextAction: string | null;
  buyerLabel: string;
  sellerLabel: string;
};

export type ExecutiveMatchSummary = {
  headline: string;
  confidence: string;
  whyMatched: string;
  strengthsSummary: string[];
  risksSummary: string[];
  missingInformationSummary: string[];
  recommendedAction: string;
};

export const buildExecutiveMatchSummary = (input: ExecutiveMatchSummaryInput): ExecutiveMatchSummary => {
  const {
    confidence,
    compatibilityScore,
    opportunityScore,
    priorityScore,
    strengths,
    conflicts,
    missingInformation,
    recommendedNextAction,
    buyerLabel,
    sellerLabel,
  } = input;

  const headline = `${confidence} — Compatibility ${compatibilityScore}/100 • Opportunity ${opportunityScore}/100 • Priority ${priorityScore}/100`;

  const whyMatched =
    strengths.length > 0
      ? `${buyerLabel} and ${sellerLabel} were paired on ${strengths.length} aligned trade factor${strengths.length === 1 ? "" : "s"} — most notably: ${strengths[0]}`
      : `${buyerLabel} and ${sellerLabel} are an eligible buyer/seller pairing, but no strong alignment factors were found on trade terms.`;

  return {
    headline,
    confidence,
    whyMatched,
    strengthsSummary: strengths.slice(0, 3),
    risksSummary: conflicts.slice(0, 3),
    missingInformationSummary: missingInformation.slice(0, 3),
    recommendedAction: recommendedNextAction ?? "No recommended action available.",
  };
};
