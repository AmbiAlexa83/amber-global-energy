import { NextRequest, NextResponse } from "next/server";
import {
  getDealMatchesServer,
  getInquiriesForAnalyticsServer,
  getCompaniesServer,
  upsertDealMatchServer,
  type DealMatchRecord,
} from "@/lib/supabase-server";
import { checkPermission } from "@/lib/auth-helpers";
import { CLOSED_STATUSES, normalizeStatusValue } from "@/lib/inquiry-helpers";
import { computeDealMatch, getInquirySide, type MatchInquiryRecord } from "@/lib/deal-matching";
import { buildMatchExplanation } from "@/lib/match-explanations";
import { computePriorityScore } from "@/lib/match-priority";
import { buildExecutiveMatchSummary } from "@/lib/match-executive-summary";

// Non-confidential summary only — no email/phone/whatsapp. The match list
// and comparison views must never surface contact details before a human
// has reviewed and approved the match.
const summarizeInquiry = (inquiry: MatchInquiryRecord | undefined) => {
  if (!inquiry) return null;
  return {
    id: String(inquiry.id),
    companyName: inquiry.company_name ?? null,
    product: inquiry.product ?? null,
    quantity: inquiry.quantity ?? null,
    unit: inquiry.unit ?? null,
    country: inquiry.country ?? null,
    originCountry: inquiry.origin_country ?? null,
    destinationCountry: inquiry.destination_country ?? null,
    status: inquiry.status ?? null,
  };
};

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const status = params.get("status");
    const inquiryId = params.get("inquiryId");

    const [matches, inquiries] = await Promise.all([
      getDealMatchesServer({ status, inquiryId }),
      getInquiriesForAnalyticsServer(),
    ]);

    const inquiryById = new Map<string, MatchInquiryRecord>(
      (inquiries as MatchInquiryRecord[]).map((inquiry) => [String(inquiry.id), inquiry]),
    );

    const enriched = matches.map((match: DealMatchRecord) => {
      const buyerInquiry = inquiryById.get(match.buyer_inquiry_id);
      const sellerInquiry = inquiryById.get(match.seller_inquiry_id);

      // Priority Score and Executive Match Summary are derived, not stored —
      // both are pure functions of the persisted match row plus the current
      // inquiry data, so they're always computed fresh at read time rather
      // than risking drift from a stale cached copy.
      const priorityScore = buyerInquiry && sellerInquiry
        ? computePriorityScore(buyerInquiry, sellerInquiry, { opportunityScore: match.opportunity_score, confidence: match.confidence })
        : 0;

      const executiveSummary = buildExecutiveMatchSummary({
        confidence: match.confidence,
        compatibilityScore: match.compatibility_score,
        opportunityScore: match.opportunity_score,
        priorityScore,
        strengths: match.strengths,
        conflicts: match.conflicts,
        missingInformation: match.missing_information,
        recommendedNextAction: match.recommended_next_action,
        buyerLabel: buyerInquiry?.company_name ?? "Buyer",
        sellerLabel: sellerInquiry?.company_name ?? "Seller",
      });

      return {
        ...match,
        buyer: summarizeInquiry(buyerInquiry),
        seller: summarizeInquiry(sellerInquiry),
        priorityScore,
        executiveSummary,
      };
    });

    return NextResponse.json({ data: enriched });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load deal matches.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Computes (or recomputes) match candidates and persists them for review.
// This is the only place scores are calculated — GET only ever reads what
// was already computed here. Never creates introductions, changes inquiry
// status, or sends anything; it only writes rows to deal_matches.
export async function POST(request: Request) {
  try {
    const permissionError = await checkPermission("deal_matches");
    if (permissionError) {
      return NextResponse.json({ error: permissionError }, { status: 403 });
    }

    const payload = await request.json().catch(() => ({}));
    const inquiryId: string | undefined = payload?.inquiryId || undefined;

    const [allInquiries, companies] = await Promise.all([getInquiriesForAnalyticsServer(), getCompaniesServer()]);
    const inquiries = (allInquiries as MatchInquiryRecord[]).filter(
      (inquiry) => !CLOSED_STATUSES.has(normalizeStatusValue(inquiry.status)),
    );

    const companyIdByName = new Map(companies.map((company) => [company.name.trim().toLowerCase(), company.id]));
    const resolveCompanyId = (companyName: string | null | undefined) =>
      companyName ? companyIdByName.get(companyName.trim().toLowerCase()) ?? null : null;

    let buyers = inquiries.filter((inquiry) => getInquirySide(inquiry) === "buyer");
    let sellers = inquiries.filter((inquiry) => getInquirySide(inquiry) === "seller");

    if (inquiryId) {
      const target = inquiries.find((inquiry) => String(inquiry.id) === inquiryId);
      if (!target) {
        return NextResponse.json({ error: "Inquiry not found or is closed." }, { status: 404 });
      }
      const side = getInquirySide(target);
      if (side === "buyer") { buyers = [target]; }
      else if (side === "seller") { sellers = [target]; }
      else {
        return NextResponse.json({ error: "Inquiry does not have a recognized buyer or seller role — cannot compute matches." }, { status: 400 });
      }
    }

    const persisted = [];
    for (const buyer of buyers) {
      for (const seller of sellers) {
        const match = computeDealMatch(buyer, seller);
        if (!match) continue;

        const explanation = buildMatchExplanation(match);
        const saved = await upsertDealMatchServer({
          buyer_inquiry_id: match.buyerInquiryId,
          seller_inquiry_id: match.sellerInquiryId,
          buyer_company_id: resolveCompanyId(buyer.company_name),
          seller_company_id: resolveCompanyId(seller.company_name),
          compatibility_score: match.compatibilityScore,
          opportunity_score: match.opportunityScore,
          confidence: match.confidence,
          match_version: match.matchVersion,
          product_score: match.componentScores.product.score,
          quantity_score: match.componentScores.quantity.score,
          geography_score: match.componentScores.geography.score,
          incoterms_score: match.componentScores.incoterms.score,
          payment_terms_score: match.componentScores.paymentTerms.score,
          timing_score: match.componentScores.timing.score,
          document_readiness_score: match.componentScores.documentReadiness.score,
          trust_score: match.componentScores.trust.score,
          risk_penalty: match.riskPenalty,
          explanation: { componentScores: match.componentScores, riskReasons: match.riskReasons },
          strengths: explanation.strengths,
          conflicts: explanation.conflicts,
          missing_information: explanation.missingInformation,
          recommended_next_action: explanation.recommendedNextAction,
        });
        persisted.push(saved);
      }
    }

    return NextResponse.json({ data: persisted, computed: persisted.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to compute deal matches.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
