// Deterministic, rule-based Deal Matching engine (Phase 5.1). Pure functions
// only — no formatting, no JSX, no framework imports, no I/O. Every score is
// explainable back to the inputs that produced it via `componentScores`,
// which lib/match-explanations.ts turns into strengths/conflicts/missing
// information/recommended next actions for the always-visible explanation
// panel. This module never mutates an inquiry, sends anything, or decides an
// introduction — it only ranks candidate pairs for human review.

import {
  type InquiryRecord,
  CLOSED_STATUSES,
  normalizeStatusValue,
  getGeographicRisk,
  computeTrustProfile,
} from "@/lib/inquiry-helpers";
import {
  COMPATIBILITY_WEIGHTS,
  OPPORTUNITY_WEIGHTS,
  MAX_RISK_PENALTY,
  CONFIDENCE_THRESHOLDS,
  LOW_COMPATIBILITY_FLOOR,
  BUYER_INQUIRY_TYPES,
  SELLER_INQUIRY_TYPES,
  BUYER_ROLE_TYPES,
  SELLER_ROLE_TYPES,
  UNIT_TO_MT,
  getProductCategory,
  getPaymentInstrumentClass,
  getCountryRegion,
  type Confidence,
} from "@/lib/deal-matching-rules";

// The public intake form (and Customer Detail edits) capture several fields
// that InquiryRecord doesn't declare — extended here the same way
// lib/executive-analytics.ts extends it for role_type.
export type MatchInquiryRecord = InquiryRecord & {
  id: string;
  role_type?: string | null;
  delivery_frequency?: string | null;
  contract_length?: string | null;
  currency?: string | null;
  shipping_method?: string | null;
  verification_status?: string | null;
};

export type MatchSide = "buyer" | "seller" | "unknown";

// inquiry_type is the primary signal (explicit intent on the intake form);
// role_type is the fallback for the ambiguous "Need Broker" inquiry_type or
// when inquiry_type is missing. See lib/deal-matching-rules.ts for the
// documented heuristics and their limitations.
export const getInquirySide = (inquiry: MatchInquiryRecord): MatchSide => {
  const inquiryType = (inquiry.inquiry_type ?? "").trim();
  if (BUYER_INQUIRY_TYPES.has(inquiryType)) return "buyer";
  if (SELLER_INQUIRY_TYPES.has(inquiryType)) return "seller";

  const roleType = (inquiry.role_type ?? "").trim();
  if (BUYER_ROLE_TYPES.has(roleType)) return "buyer";
  if (SELLER_ROLE_TYPES.has(roleType)) return "seller";

  return "unknown";
};

export type EligibilityResult = {
  eligible: boolean;
  reasons: string[];
};

// Buyer/seller role compatibility is a hard eligibility filter, not a scored
// component — a buyer-to-buyer or seller-to-seller pairing is never a deal
// candidate, regardless of how well product/geography/terms line up.
export const checkEligibility = (buyer: MatchInquiryRecord, seller: MatchInquiryRecord): EligibilityResult => {
  const reasons: string[] = [];

  if (buyer.id === seller.id) {
    reasons.push("Cannot match an inquiry against itself.");
  }
  if (getInquirySide(buyer) !== "buyer") {
    reasons.push("Buyer-side inquiry does not have a recognized buyer role or inquiry type.");
  }
  if (getInquirySide(seller) !== "seller") {
    reasons.push("Seller-side inquiry does not have a recognized seller role or inquiry type.");
  }
  if (CLOSED_STATUSES.has(normalizeStatusValue(buyer.status))) {
    reasons.push("Buyer-side inquiry is closed.");
  }
  if (CLOSED_STATUSES.has(normalizeStatusValue(seller.status))) {
    reasons.push("Seller-side inquiry is closed.");
  }

  return { eligible: reasons.length === 0, reasons };
};

export type ComponentStatus = "match" | "partial" | "conflict" | "missing";

export type ComponentScore = {
  score: number;
  status: ComponentStatus;
  detail: string;
};

const normalizeText = (value: string | null | undefined): string => (value ?? "").trim().toLowerCase();

export const scoreProduct = (buyer: MatchInquiryRecord, seller: MatchInquiryRecord): ComponentScore => {
  const buyerProduct = buyer.product?.trim();
  const sellerProduct = seller.product?.trim();
  if (!buyerProduct || !sellerProduct) {
    return { score: 50, status: "missing", detail: "Product is not specified on one or both inquiries." };
  }
  if (normalizeText(buyerProduct) === normalizeText(sellerProduct)) {
    return { score: 100, status: "match", detail: `Both sides specify ${buyerProduct}.` };
  }
  const buyerCategory = getProductCategory(buyerProduct);
  const sellerCategory = getProductCategory(sellerProduct);
  if (buyerCategory && buyerCategory === sellerCategory) {
    return { score: 65, status: "partial", detail: `${buyerProduct} and ${sellerProduct} are both ${buyerCategory.toLowerCase()} products, not an exact match.` };
  }
  return { score: 15, status: "conflict", detail: `Buyer wants ${buyerProduct}; seller offers ${sellerProduct}.` };
};

const parseQuantityToMt = (quantity: string | null | undefined, unit: string | null | undefined): number | null => {
  if (!quantity || !unit) return null;
  const numeric = Number(quantity.replace(/[^0-9.]+/g, ""));
  if (!numeric || Number.isNaN(numeric)) return null;
  const factor = UNIT_TO_MT[unit.trim()];
  if (!factor) return null;
  return numeric * factor;
};

export const scoreQuantity = (buyer: MatchInquiryRecord, seller: MatchInquiryRecord): ComponentScore => {
  const buyerMt = parseQuantityToMt(buyer.quantity, buyer.unit);
  const sellerMt = parseQuantityToMt(seller.quantity, seller.unit);
  if (buyerMt === null || sellerMt === null) {
    return { score: 50, status: "missing", detail: "Quantity or unit is missing or unrecognized on one or both inquiries." };
  }
  if (sellerMt >= buyerMt) {
    return { score: 100, status: "match", detail: `Seller volume (~${Math.round(sellerMt)} MT equiv.) covers buyer demand (~${Math.round(buyerMt)} MT equiv.).` };
  }
  if (sellerMt >= buyerMt * 0.5) {
    return { score: 60, status: "partial", detail: `Seller volume (~${Math.round(sellerMt)} MT equiv.) partially covers buyer demand (~${Math.round(buyerMt)} MT equiv.).` };
  }
  return { score: 20, status: "conflict", detail: `Seller volume (~${Math.round(sellerMt)} MT equiv.) falls well short of buyer demand (~${Math.round(buyerMt)} MT equiv.).` };
};

export const scoreGeography = (buyer: MatchInquiryRecord, seller: MatchInquiryRecord): ComponentScore => {
  const buyerCountry = (buyer.destination_country || buyer.country || "").trim();
  const sellerCountry = (seller.origin_country || seller.country || "").trim();
  if (!buyerCountry || !sellerCountry) {
    return { score: 50, status: "missing", detail: "Destination or origin country is not specified on one or both inquiries." };
  }
  if (normalizeText(buyerCountry) === normalizeText(sellerCountry)) {
    return { score: 100, status: "match", detail: `Buyer destination and seller origin are both ${buyerCountry}.` };
  }
  const buyerRegion = getCountryRegion(buyerCountry);
  const sellerRegion = getCountryRegion(sellerCountry);
  if (buyerRegion && buyerRegion === sellerRegion) {
    return { score: 75, status: "partial", detail: `Buyer (${buyerCountry}) and seller (${sellerCountry}) are both in ${buyerRegion}.` };
  }
  return { score: 35, status: "conflict", detail: `Buyer destination (${buyerCountry}) and seller origin (${sellerCountry}) are in different regions.` };
};

export const scoreIncoterms = (buyer: MatchInquiryRecord, seller: MatchInquiryRecord): ComponentScore => {
  const buyerTerms = buyer.incoterms?.trim();
  const sellerTerms = seller.incoterms?.trim();
  if (!buyerTerms || !sellerTerms) {
    return { score: 50, status: "missing", detail: "Incoterms are not specified on one or both inquiries." };
  }
  if (normalizeText(buyerTerms) === normalizeText(sellerTerms)) {
    return { score: 100, status: "match", detail: `Both sides specify ${buyerTerms}.` };
  }
  return { score: 65, status: "partial", detail: `Buyer requests ${buyerTerms}; seller offers ${sellerTerms} — negotiable, not a hard conflict.` };
};

export const scorePaymentTerms = (buyer: MatchInquiryRecord, seller: MatchInquiryRecord): ComponentScore => {
  const buyerMethod = buyer.payment_method?.trim();
  const sellerMethod = seller.payment_method?.trim();
  if (!buyerMethod || !sellerMethod) {
    return { score: 50, status: "missing", detail: "Payment method is not specified on one or both inquiries." };
  }
  if (normalizeText(buyerMethod) === normalizeText(sellerMethod)) {
    return { score: 100, status: "match", detail: `Both sides specify ${buyerMethod}.` };
  }
  const buyerClass = getPaymentInstrumentClass(buyerMethod);
  const sellerClass = getPaymentInstrumentClass(sellerMethod);
  if (buyerClass && buyerClass === sellerClass) {
    return { score: 75, status: "partial", detail: `${buyerMethod} and ${sellerMethod} are comparable payment instruments.` };
  }
  return { score: 30, status: "conflict", detail: `Buyer proposes ${buyerMethod}; seller requires ${sellerMethod} — a materially different instrument.` };
};

export const scoreTiming = (buyer: MatchInquiryRecord, seller: MatchInquiryRecord): ComponentScore => {
  const fields: Array<keyof MatchInquiryRecord> = ["delivery_frequency", "contract_length"];
  const presentPairs = fields.filter((field) => buyer[field] && seller[field]);
  if (presentPairs.length === 0) {
    return { score: 50, status: "missing", detail: "Delivery frequency and contract length are not specified on one or both inquiries." };
  }
  const matches = presentPairs.filter((field) => normalizeText(buyer[field] as string) === normalizeText(seller[field] as string));
  if (matches.length === presentPairs.length) {
    return { score: 100, status: "match", detail: "Delivery frequency and contract length align." };
  }
  if (matches.length > 0) {
    return { score: 65, status: "partial", detail: "Delivery frequency and contract length partially align." };
  }
  return { score: 35, status: "conflict", detail: `Buyer expects ${buyer.delivery_frequency ?? "—"} / ${buyer.contract_length ?? "—"}; seller offers ${seller.delivery_frequency ?? "—"} / ${seller.contract_length ?? "—"}.` };
};

export const scoreDocumentReadiness = (buyer: MatchInquiryRecord, seller: MatchInquiryRecord): ComponentScore => {
  const buyerScore = computeTrustProfile(buyer).documentCompleteness.score;
  const sellerScore = computeTrustProfile(seller).documentCompleteness.score;
  const score = Math.round((buyerScore + sellerScore) / 2);
  const status: ComponentStatus = score >= 70 ? "match" : score >= 40 ? "partial" : "missing";
  return { score, status, detail: `Buyer documents ${buyerScore}% complete; seller documents ${sellerScore}% complete.` };
};

export const scoreTrust = (buyer: MatchInquiryRecord, seller: MatchInquiryRecord): ComponentScore => {
  const buyerProfile = computeTrustProfile(buyer);
  const sellerProfile = computeTrustProfile(seller);
  const score = Math.round((buyerProfile.score + sellerProfile.score) / 2);
  const status: ComponentStatus = score >= 70 ? "match" : score >= 40 ? "partial" : "conflict";
  return { score, status, detail: `Buyer trust score ${buyerProfile.score} (${buyerProfile.risk}); seller trust score ${sellerProfile.score} (${sellerProfile.risk}).` };
};

export type RiskAssessment = {
  penalty: number;
  reasons: string[];
};

export const computeRiskPenalty = (buyer: MatchInquiryRecord, seller: MatchInquiryRecord): RiskAssessment => {
  const reasons: string[] = [];
  let penalty = 0;

  const buyerGeoRisk = getGeographicRisk(buyer.destination_country || buyer.country);
  const sellerGeoRisk = getGeographicRisk(seller.origin_country || seller.country);
  if (buyerGeoRisk.label === "Elevated") { penalty += 15; reasons.push("Buyer counterparty jurisdiction is flagged as elevated risk."); }
  else if (buyerGeoRisk.label === "Monitor") { penalty += 7; reasons.push("Buyer counterparty jurisdiction is flagged for monitoring."); }
  if (sellerGeoRisk.label === "Elevated") { penalty += 15; reasons.push("Seller counterparty jurisdiction is flagged as elevated risk."); }
  else if (sellerGeoRisk.label === "Monitor") { penalty += 7; reasons.push("Seller counterparty jurisdiction is flagged for monitoring."); }

  const buyerTrust = computeTrustProfile(buyer);
  const sellerTrust = computeTrustProfile(seller);
  if (buyerTrust.risk === "High Risk") { penalty += 10; reasons.push("Buyer trust profile is High Risk."); }
  if (sellerTrust.risk === "High Risk") { penalty += 10; reasons.push("Seller trust profile is High Risk."); }

  return { penalty: Math.min(MAX_RISK_PENALTY, penalty), reasons };
};

export type ComponentScores = {
  product: ComponentScore;
  quantity: ComponentScore;
  geography: ComponentScore;
  incoterms: ComponentScore;
  paymentTerms: ComponentScore;
  timing: ComponentScore;
  documentReadiness: ComponentScore;
  trust: ComponentScore;
};

export type DealMatchResult = {
  buyerInquiryId: string;
  sellerInquiryId: string;
  compatibilityScore: number;
  opportunityScore: number;
  confidence: Confidence;
  matchVersion: "v1";
  componentScores: ComponentScores;
  riskPenalty: number;
  riskReasons: string[];
};

export const computeCompatibilityScore = (componentScores: Pick<ComponentScores, "product" | "quantity" | "geography" | "incoterms" | "paymentTerms" | "timing">): number => {
  const weighted =
    componentScores.product.score * COMPATIBILITY_WEIGHTS.product +
    componentScores.quantity.score * COMPATIBILITY_WEIGHTS.quantity +
    componentScores.geography.score * COMPATIBILITY_WEIGHTS.geography +
    componentScores.incoterms.score * COMPATIBILITY_WEIGHTS.incoterms +
    componentScores.paymentTerms.score * COMPATIBILITY_WEIGHTS.paymentTerms +
    componentScores.timing.score * COMPATIBILITY_WEIGHTS.timing;
  return Math.round(weighted / 100);
};

export const computeOpportunityScore = (
  compatibilityScore: number,
  trustScore: number,
  documentReadinessScore: number,
  riskPenalty: number,
): number => {
  const weighted =
    compatibilityScore * OPPORTUNITY_WEIGHTS.compatibility +
    trustScore * OPPORTUNITY_WEIGHTS.trust +
    documentReadinessScore * OPPORTUNITY_WEIGHTS.documentReadiness;
  const base = weighted / 100;
  return Math.round(Math.max(0, Math.min(100, base - riskPenalty)));
};

export const getConfidence = (compatibilityScore: number, opportunityScore: number, riskPenalty: number): Confidence => {
  if (compatibilityScore <= LOW_COMPATIBILITY_FLOOR) return "Not Compatible";
  if (riskPenalty >= MAX_RISK_PENALTY * (2 / 3)) return "High Risk";
  if (opportunityScore >= CONFIDENCE_THRESHOLDS.strongMatch) return "Strong Match";
  if (opportunityScore >= CONFIDENCE_THRESHOLDS.potentialMatch) return "Potential Match";
  return "Needs Information";
};

// Returns null when the pair is not eligible (see checkEligibility) — callers
// should treat null as "no match candidate," not "a zero-score match."
export const computeDealMatch = (buyer: MatchInquiryRecord, seller: MatchInquiryRecord): DealMatchResult | null => {
  const eligibility = checkEligibility(buyer, seller);
  if (!eligibility.eligible) return null;

  const componentScores: ComponentScores = {
    product: scoreProduct(buyer, seller),
    quantity: scoreQuantity(buyer, seller),
    geography: scoreGeography(buyer, seller),
    incoterms: scoreIncoterms(buyer, seller),
    paymentTerms: scorePaymentTerms(buyer, seller),
    timing: scoreTiming(buyer, seller),
    documentReadiness: scoreDocumentReadiness(buyer, seller),
    trust: scoreTrust(buyer, seller),
  };

  const compatibilityScore = computeCompatibilityScore(componentScores);
  const { penalty: riskPenalty, reasons: riskReasons } = computeRiskPenalty(buyer, seller);
  const opportunityScore = computeOpportunityScore(
    compatibilityScore,
    componentScores.trust.score,
    componentScores.documentReadiness.score,
    riskPenalty,
  );
  const confidence = getConfidence(compatibilityScore, opportunityScore, riskPenalty);

  return {
    buyerInquiryId: String(buyer.id),
    sellerInquiryId: String(seller.id),
    compatibilityScore,
    opportunityScore,
    confidence,
    matchVersion: "v1",
    componentScores,
    riskPenalty,
    riskReasons,
  };
};

export type MatchInquirySummary = {
  id: string;
  companyName: string | null;
  product: string | null;
  quantity: string | null;
  unit: string | null;
  incoterms: string | null;
  paymentMethod: string | null;
  country: string | null;
  originCountry: string | null;
  destinationCountry: string | null;
  status: string | null;
  documentsAvailable: string | null;
};

// Non-confidential detail-view summary — company/product/quantity/geography
// only, no email/phone/whatsapp. Shared by the match detail API route and
// the match detail page so the confidential-field exclusion lives in exactly
// one place rather than two copies that could silently drift apart.
export const summarizeMatchInquiry = (inquiry: MatchInquiryRecord | undefined): MatchInquirySummary | null => {
  if (!inquiry) return null;
  return {
    id: String(inquiry.id),
    companyName: inquiry.company_name ?? null,
    product: inquiry.product ?? null,
    quantity: inquiry.quantity ?? null,
    unit: inquiry.unit ?? null,
    incoterms: inquiry.incoterms ?? null,
    paymentMethod: inquiry.payment_method ?? null,
    country: inquiry.country ?? null,
    originCountry: inquiry.origin_country ?? null,
    destinationCountry: inquiry.destination_country ?? null,
    status: inquiry.status ?? null,
    documentsAvailable: inquiry.documents_available ?? null,
  };
};
