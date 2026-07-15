// Turns a DealMatchResult's component scores into the always-visible,
// human-readable explanation panel content (strengths / conflicts / missing
// information / recommended next action). Pure, deterministic — no free-text
// generation, no AI. Every sentence traces back to a specific component
// score computed in lib/deal-matching.ts.

import type { ComponentScores, DealMatchResult } from "@/lib/deal-matching";

export type MatchExplanation = {
  strengths: string[];
  conflicts: string[];
  missingInformation: string[];
  recommendedNextAction: string;
};

const COMPONENT_LABELS: Record<keyof ComponentScores, string> = {
  product: "Product",
  quantity: "Quantity",
  geography: "Geography",
  incoterms: "Incoterms",
  paymentTerms: "Payment Terms",
  timing: "Timing",
  documentReadiness: "Document Readiness",
  trust: "Trust & Verification",
};

export const buildMatchExplanation = (match: DealMatchResult): MatchExplanation => {
  const strengths: string[] = [];
  const conflicts: string[] = [];
  const missingInformation: string[] = [];

  (Object.keys(match.componentScores) as Array<keyof ComponentScores>).forEach((key) => {
    const component = match.componentScores[key];
    const label = COMPONENT_LABELS[key];
    const line = `${label}: ${component.detail}`;

    if (component.status === "missing") {
      missingInformation.push(line);
    } else if (component.status === "conflict") {
      conflicts.push(line);
    } else if (component.status === "match") {
      strengths.push(line);
    } else {
      // "partial" — a soft positive if the score leans favorable, otherwise a soft conflict.
      if (component.score >= 60) strengths.push(line);
      else conflicts.push(line);
    }
  });

  match.riskReasons.forEach((reason) => conflicts.push(`Risk: ${reason}`));

  let recommendedNextAction: string;
  if (match.confidence === "Not Compatible") {
    recommendedNextAction = "Do not pursue — core trade terms conflict (product, quantity, or geography).";
  } else if (missingInformation.length > 0) {
    recommendedNextAction = `Collect missing information before proceeding: ${missingInformation.slice(0, 2).map((line) => line.split(":")[0]).join(", ")}.`;
  } else if (match.confidence === "High Risk") {
    recommendedNextAction = "Escalate to compliance and a senior broker before any further action — elevated risk factors present.";
  } else if (match.confidence === "Strong Match") {
    recommendedNextAction = "Ready for broker review — recommend advancing to a human-approved introduction.";
  } else if (match.confidence === "Potential Match") {
    recommendedNextAction = "Broker review recommended to resolve remaining conflicts before introduction.";
  } else {
    recommendedNextAction = "Gather additional information from both parties before advancing this match.";
  }

  return { strengths, conflicts, missingInformation, recommendedNextAction };
};
