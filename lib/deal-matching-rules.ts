// Configurable scoring rules for the Deal Matching engine (Phase 5.1). No
// scoring math lives here — only the tunable inputs (weights, taxonomies,
// thresholds) that lib/deal-matching.ts reads. Kept separate so the desk can
// evolve the model (e.g. re-weight geography vs. payment terms) without
// touching the scoring logic itself, mirroring lib/pipeline-forecast.ts's
// STAGE_PROBABILITIES pattern.

// ── Compatibility score (0-100): are the trade mechanics compatible? ──
// Must sum to 100.
export const COMPATIBILITY_WEIGHTS = {
  product: 25,
  quantity: 15,
  geography: 15,
  incoterms: 15,
  paymentTerms: 15,
  timing: 15,
} as const;

// ── Opportunity score (0-100): compatibility folded in with readiness and
// risk. compatibility + trust + documentReadiness must sum to 100; riskPenalty
// is subtracted afterward, not part of the 100. ──
export const OPPORTUNITY_WEIGHTS = {
  compatibility: 60,
  trust: 25,
  documentReadiness: 15,
} as const;

// Maximum points subtracted from the opportunity score for risk factors
// (elevated-geography counterparties, missing critical documents, etc.).
export const MAX_RISK_PENALTY = 30;

// ── Confidence bands, evaluated top-down against the opportunity score,
// then overridden by hard-stop conditions below. ──
export const CONFIDENCE_THRESHOLDS = {
  strongMatch: 80,
  potentialMatch: 60,
  needsInformation: 40,
} as const;

export type Confidence = "Strong Match" | "Potential Match" | "Needs Information" | "High Risk" | "Not Compatible";

// A compatibility score at or below this floor means the trade mechanics
// themselves conflict badly enough to cap confidence regardless of opportunity score.
export const LOW_COMPATIBILITY_FLOOR = 35;

// ── Role/side detection. inquiry_type is the primary signal (most explicit
// on the public intake form); role_type is the fallback when inquiry_type is
// "Need Broker" or missing. Both lists are heuristics, not certainties —
// e.g. "Refinery" is treated as a seller of refined product by default,
// though a refinery could equally be a crude buyer. Flagged for desk review. ──
export const BUYER_INQUIRY_TYPES = new Set(["Buy Fuel", "Looking for Supplier"]);
export const SELLER_INQUIRY_TYPES = new Set(["Sell Fuel", "Looking for Buyer"]);

export const BUYER_ROLE_TYPES = new Set(["Buyer", "Buyer Mandate", "End Buyer", "Distributor"]);
export const SELLER_ROLE_TYPES = new Set(["Seller", "Seller Mandate", "Refinery"]);
// "Government Agency" (and anything else outside both sets above) falls
// through getInquirySide() as "unknown" — no reliable buyer/seller signal on
// its own, so it's excluded from matching rather than guessed at.

// ── Product taxonomy — used for category-level partial credit when the
// exact product string doesn't match. ──
export const PRODUCT_CATEGORIES: Record<string, string> = {
  "Crude Oil": "Crude",
  "Jet A1": "Refined",
  "EN590 Diesel": "Refined",
  D6: "Refined",
  Gasoline: "Refined",
  "Aviation Fuel": "Refined",
  Bitumen: "Refined",
  LNG: "Gas",
  LPG: "Gas",
};

// ── Unit conversion to metric tons, for comparing buyer/seller quantities
// expressed in different units. Approximate, crude-oil-equivalent factors —
// adequate for a compatibility signal, not a custody-transfer calculation. ──
export const UNIT_TO_MT: Record<string, number> = {
  MT: 1,
  BBL: 1 / 7.33,
  Barrels: 1 / 7.33,
  Gallons: 1 / 316,
  Liters: 1 / 1184,
};

// ── Payment instrument classes — instruments in the same class are treated
// as broadly compatible even when not an exact string match. ──
export const PAYMENT_INSTRUMENT_CLASSES: Record<string, string> = {
  SBLC: "secured",
  LC: "secured",
  DLC: "secured",
  MT103: "bank-transfer",
  Wire: "bank-transfer",
  Escrow: "secured",
  Open: "open",
};

// ── Coarse region map for geography scoring — same region is treated as a
// meaningfully easier logistics fit than cross-region, without modeling
// actual shipping lanes/costs. ──
export const COUNTRY_REGIONS: Record<string, string> = {
  "united states": "Americas",
  usa: "Americas",
  canada: "Americas",
  mexico: "Americas",
  brazil: "Americas",
  venezuela: "Americas",
  "united kingdom": "Europe",
  netherlands: "Europe",
  germany: "Europe",
  france: "Europe",
  spain: "Europe",
  italy: "Europe",
  greece: "Europe",
  turkey: "Europe",
  russia: "Europe",
  "united arab emirates": "Middle East",
  uae: "Middle East",
  "saudi arabia": "Middle East",
  qatar: "Middle East",
  kuwait: "Middle East",
  iraq: "Middle East",
  iran: "Middle East",
  oman: "Middle East",
  nigeria: "Africa",
  angola: "Africa",
  libya: "Africa",
  algeria: "Africa",
  egypt: "Africa",
  "south africa": "Africa",
  china: "Asia-Pacific",
  japan: "Asia-Pacific",
  "south korea": "Asia-Pacific",
  singapore: "Asia-Pacific",
  india: "Asia-Pacific",
  indonesia: "Asia-Pacific",
  malaysia: "Asia-Pacific",
  australia: "Asia-Pacific",
};

// ── Priority Score (0-100) — ranks suggested matches for broker attention.
// Deliberately independent of Compatibility Score (trade-mechanics fit) and
// Opportunity Score (compatibility + readiness − risk): a mediocre-fit match
// can still be urgent to review today (high value, flagged urgent, going
// stale), and a strong match can be low-priority if it's small and unhurried.
// Must sum to 100. ──
export const PRIORITY_WEIGHTS = {
  opportunity: 50,
  dealValue: 25,
  urgency: 15,
  confidence: 10,
} as const;

// Deal value (USD, from whichever side stated a target_price) at or above
// this is scored as maximally high-value for priority ranking. Kept separate
// from lib/executive-alerts.ts's HIGH_VALUE_THRESHOLD so the two modules stay
// independent, mirroring the existing precedent of not cross-importing
// between analytics and alerts.
export const PRIORITY_HIGH_VALUE_THRESHOLD = 100_000;

export const CONFIDENCE_SCORE_MAP: Record<Confidence, number> = {
  "Strong Match": 100,
  "Potential Match": 70,
  "Needs Information": 40,
  "High Risk": 20,
  "Not Compatible": 0,
};

export const getProductCategory = (product: string | null | undefined): string | null => {
  if (!product) return null;
  return PRODUCT_CATEGORIES[product] ?? null;
};

export const getPaymentInstrumentClass = (method: string | null | undefined): string | null => {
  if (!method) return null;
  return PAYMENT_INSTRUMENT_CLASSES[method] ?? null;
};

export const getCountryRegion = (country: string | null | undefined): string | null => {
  if (!country) return null;
  return COUNTRY_REGIONS[country.trim().toLowerCase()] ?? null;
};
