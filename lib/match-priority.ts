// Priority Score — ranks suggested matches for broker attention. Pure,
// deterministic, and intentionally separate from Compatibility Score and
// Opportunity Score (see lib/deal-matching-rules.ts's PRIORITY_WEIGHTS for
// why). Used solely for ranking the "suggested" queue — it never feeds back
// into compatibility_score, opportunity_score, or confidence.

import { parseCurrencyValue, isHighPriority, getDealVelocity } from "@/lib/inquiry-helpers";
import { PRIORITY_WEIGHTS, PRIORITY_HIGH_VALUE_THRESHOLD, CONFIDENCE_SCORE_MAP, type Confidence } from "@/lib/deal-matching-rules";
import type { MatchInquiryRecord } from "@/lib/deal-matching";

// Decoupled from the full DealMatchResult/DealMatchRecord shape so this can
// be computed equally well at match-compute time or later at read time from
// a persisted row — both only need the two fields below.
export type PriorityMatchInput = {
  opportunityScore: number;
  confidence: Confidence | string;
};

const estimateDealValue = (buyer: MatchInquiryRecord, seller: MatchInquiryRecord): number =>
  Math.max(parseCurrencyValue(buyer.target_price), parseCurrencyValue(seller.target_price));

// A deal that has gone quiet (low deal-velocity score) is more urgent to
// resurface for broker attention, not less — staleness is blended in
// alongside the explicit priority flag rather than replacing it.
const estimateUrgency = (buyer: MatchInquiryRecord, seller: MatchInquiryRecord): number => {
  const priorityFlagScore = ((isHighPriority(buyer) ? 100 : 40) + (isHighPriority(seller) ? 100 : 40)) / 2;
  const stalenessBoost = 100 - Math.min(getDealVelocity(buyer).score, getDealVelocity(seller).score);
  return Math.round(priorityFlagScore * 0.7 + stalenessBoost * 0.3);
};

export const computePriorityScore = (
  buyer: MatchInquiryRecord,
  seller: MatchInquiryRecord,
  match: PriorityMatchInput,
): number => {
  const dealValueScore = Math.min(100, Math.round((estimateDealValue(buyer, seller) / PRIORITY_HIGH_VALUE_THRESHOLD) * 100));
  const urgencyScore = Math.max(0, Math.min(100, estimateUrgency(buyer, seller)));
  const confidenceScore = CONFIDENCE_SCORE_MAP[match.confidence as Confidence] ?? 0;

  const weighted =
    match.opportunityScore * PRIORITY_WEIGHTS.opportunity +
    dealValueScore * PRIORITY_WEIGHTS.dealValue +
    urgencyScore * PRIORITY_WEIGHTS.urgency +
    confidenceScore * PRIORITY_WEIGHTS.confidence;

  return Math.round(Math.max(0, Math.min(100, weighted / 100)));
};
