import Link from "next/link";
import { notFound } from "next/navigation";
import { getDealMatchByIdServer, getInquiriesForAnalyticsServer } from "@/lib/supabase-server";
import { type MatchInquiryRecord, summarizeMatchInquiry } from "@/lib/deal-matching";
import { computePriorityScore } from "@/lib/match-priority";
import { buildExecutiveMatchSummary } from "@/lib/match-executive-summary";
import MatchComparison from "@/app/admin/_components/match-comparison";
import MatchExecutiveSummary from "@/app/admin/_components/match-executive-summary";
import MatchExplanationPanel from "@/app/admin/_components/match-explanation-panel";
import MatchScoreBreakdown from "@/app/admin/_components/match-score-breakdown";
import { confidenceStyles } from "@/app/admin/_components/match-score-card";
import MatchReviewPanel from "./match-review-panel";

export const dynamic = "force-dynamic";

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getDealMatchByIdServer(id);
  if (!match) notFound();

  const inquiries = (await getInquiriesForAnalyticsServer().catch(() => [])) as MatchInquiryRecord[];
  const buyerInquiry = inquiries.find((inquiry) => String(inquiry.id) === match.buyer_inquiry_id);
  const sellerInquiry = inquiries.find((inquiry) => String(inquiry.id) === match.seller_inquiry_id);
  const buyer = summarizeMatchInquiry(buyerInquiry);
  const seller = summarizeMatchInquiry(sellerInquiry);

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
    buyerLabel: buyer?.companyName ?? "Buyer",
    sellerLabel: seller?.companyName ?? "Seller",
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(200,162,77,0.13),_transparent_28%),linear-gradient(135deg,_#03070D_0%,_#071A2D_65%,_#02060D_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div>
          <Link href="/admin/matches" className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white">
            ← Back to matches
          </Link>
        </div>

        <header className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.5)] backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-[#C8A24D]">Deal Match</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {buyer?.companyName ?? "Buyer"} ↔ {seller?.companyName ?? "Seller"}
            </h1>
            <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${confidenceStyles[match.confidence] ?? confidenceStyles["Needs Information"]}`}>
              {match.confidence}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-300">
            <span>Compatibility Score: <strong className="text-white">{match.compatibility_score}</strong></span>
            <span>Opportunity Score: <strong className="text-white">{match.opportunity_score}</strong></span>
            <span>Priority Score: <strong className="text-white">{priorityScore}</strong></span>
            <span>Match Version: <strong className="text-white">{match.match_version}</strong></span>
          </div>
        </header>

        <MatchComparison buyer={buyer} seller={seller} />

        <MatchExecutiveSummary summary={executiveSummary} />

        <MatchExplanationPanel
          strengths={match.strengths}
          conflicts={match.conflicts}
          missingInformation={match.missing_information}
          recommendedNextAction={match.recommended_next_action}
        />

        <MatchScoreBreakdown
          scores={{
            product_score: match.product_score,
            quantity_score: match.quantity_score,
            geography_score: match.geography_score,
            incoterms_score: match.incoterms_score,
            payment_terms_score: match.payment_terms_score,
            timing_score: match.timing_score,
            document_readiness_score: match.document_readiness_score,
            trust_score: match.trust_score,
          }}
          riskPenalty={match.risk_penalty}
        />

        <MatchReviewPanel match={match} />
      </div>
    </main>
  );
}
