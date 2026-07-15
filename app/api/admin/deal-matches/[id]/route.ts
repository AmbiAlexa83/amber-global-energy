import { NextResponse } from "next/server";
import { getDealMatchByIdServer, updateDealMatchReviewServer, getInquiriesForAnalyticsServer } from "@/lib/supabase-server";
import { checkPermission, getCurrentAdminUser } from "@/lib/auth-helpers";
import { type MatchInquiryRecord, summarizeMatchInquiry } from "@/lib/deal-matching";
import { computePriorityScore } from "@/lib/match-priority";
import { buildExecutiveMatchSummary } from "@/lib/match-executive-summary";

const VALID_MATCH_STATUSES = new Set([
  "suggested",
  "under_review",
  "approved",
  "rejected",
  "needs_information",
  "introduced",
  "archived",
]);

const VALID_BROKER_DECISIONS = new Set(["approved", "rejected", "needs_information"]);

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const match = await getDealMatchByIdServer(id);
    if (!match) {
      return NextResponse.json({ error: "Deal match not found." }, { status: 404 });
    }

    const inquiries = (await getInquiriesForAnalyticsServer()) as MatchInquiryRecord[];
    const buyer = inquiries.find((inquiry) => String(inquiry.id) === match.buyer_inquiry_id);
    const seller = inquiries.find((inquiry) => String(inquiry.id) === match.seller_inquiry_id);

    const priorityScore = buyer && seller
      ? computePriorityScore(buyer, seller, { opportunityScore: match.opportunity_score, confidence: match.confidence })
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
      buyerLabel: buyer?.company_name ?? "Buyer",
      sellerLabel: seller?.company_name ?? "Seller",
    });

    return NextResponse.json({
      data: { ...match, buyer: summarizeMatchInquiry(buyer), seller: summarizeMatchInquiry(seller), priorityScore, executiveSummary },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load deal match.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// The only write path for an existing match: a human review decision. This
// never touches score fields and never writes to public.inquiries — approving
// a match here does not introduce the parties, change inquiry status, or
// send any communication. Those remain separate, explicitly human actions
// outside this system.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const permissionError = await checkPermission("deal_matches");
    if (permissionError) {
      return NextResponse.json({ error: permissionError }, { status: 403 });
    }

    const { id } = await params;
    const payload = await request.json().catch(() => null);
    const match_status = payload?.match_status;
    // Distinguish "omitted" (leave broker_decision unchanged) from
    // "explicitly null" (clear it) — see updateDealMatchReviewServer.
    const hasBrokerDecision = payload !== null && typeof payload === "object" && "broker_decision" in payload;
    const broker_decision = hasBrokerDecision ? payload.broker_decision : undefined;

    if (!match_status || typeof match_status !== "string" || !VALID_MATCH_STATUSES.has(match_status)) {
      return NextResponse.json({ error: `match_status must be one of: ${Array.from(VALID_MATCH_STATUSES).join(", ")}.` }, { status: 400 });
    }

    if (broker_decision !== undefined && broker_decision !== null && !VALID_BROKER_DECISIONS.has(broker_decision)) {
      return NextResponse.json({ error: `broker_decision must be one of: ${Array.from(VALID_BROKER_DECISIONS).join(", ")}.` }, { status: 400 });
    }

    const currentUser = await getCurrentAdminUser();

    const match = await updateDealMatchReviewServer(id, {
      match_status,
      broker_decision,
      reviewed_by: currentUser?.id ?? null,
    });

    return NextResponse.json({ data: match });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update deal match.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
