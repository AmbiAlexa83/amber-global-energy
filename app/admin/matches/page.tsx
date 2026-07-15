import Link from "next/link";
import { getDealMatchesServer, getInquiriesForAnalyticsServer } from "@/lib/supabase-server";
import type { MatchInquiryRecord } from "@/lib/deal-matching";
import { computePriorityScore } from "@/lib/match-priority";
import MatchesBoard from "./matches-board";

// Live cross-entity matching data must never be statically prerendered at
// build time — same reasoning as every other /admin/* dashboard route.
export const dynamic = "force-dynamic";

const summarizeInquiry = (inquiry: MatchInquiryRecord | undefined) =>
  inquiry ? { companyName: inquiry.company_name ?? null, product: inquiry.product ?? null } : null;

export default async function MatchesPage() {
  const [matches, inquiries] = await Promise.all([
    getDealMatchesServer(),
    getInquiriesForAnalyticsServer().catch(() => []),
  ]);

  const inquiryById = new Map<string, MatchInquiryRecord>(
    (inquiries as MatchInquiryRecord[]).map((inquiry) => [String(inquiry.id), inquiry]),
  );

  const enriched = matches.map((match) => {
    const buyerInquiry = inquiryById.get(match.buyer_inquiry_id);
    const sellerInquiry = inquiryById.get(match.seller_inquiry_id);
    // Priority Score ranks the suggested-match queue for brokers — derived
    // fresh at read time, never stored, and independent of compatibility/
    // opportunity scoring. See lib/match-priority.ts.
    const priorityScore = buyerInquiry && sellerInquiry
      ? computePriorityScore(buyerInquiry, sellerInquiry, { opportunityScore: match.opportunity_score, confidence: match.confidence })
      : 0;

    return {
      ...match,
      buyer: summarizeInquiry(buyerInquiry),
      seller: summarizeInquiry(sellerInquiry),
      priorityScore,
    };
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(200,162,77,0.13),_transparent_28%),linear-gradient(135deg,_#03070D_0%,_#071A2D_65%,_#02060D_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white">
            ← Back to dashboard
          </Link>
        </div>

        <header className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.5)] backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-[#C8A24D]">Amber Global Energy</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Deal Matching</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
            Decision-support only. Every match here is a ranked suggestion for a broker to review — nothing is introduced, no inquiry status changes, and no communication is sent automatically.
          </p>
        </header>

        <MatchesBoard initialMatches={enriched} />
      </div>
    </main>
  );
}
