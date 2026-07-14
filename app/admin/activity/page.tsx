import Link from "next/link";
import {
  getInquiriesServer,
  getRecentInquiryHistoryServer,
  getBrokersServer,
  getCompaniesServer,
  getProjectsServer,
  getContractsServer,
  getRecentDocumentsServer,
  getRecentEmailsServer,
  getAdminUsersServer,
} from "@/lib/supabase-server";
import { getRelativeTime, formatDate } from "@/lib/inquiry-helpers";
import { buildActivityFeed } from "@/lib/activity-helpers";

// Live cross-entity activity must never be statically prerendered at build
// time — this route has no dynamic segment to force it, the same reasoning
// as every other /admin/* dashboard route.
export const dynamic = "force-dynamic";

const FEED_LIMIT = 60;

export default async function ActivityPage() {
  const [inquiries, inquiryHistory, brokers, companies, projects, contracts, documents, emails, adminUsers] = await Promise.all([
    getInquiriesServer(),
    getRecentInquiryHistoryServer().catch(() => []),
    getBrokersServer().catch(() => []),
    getCompaniesServer().catch(() => []),
    getProjectsServer().catch(() => []),
    getContractsServer().catch(() => []),
    getRecentDocumentsServer().catch(() => []),
    getRecentEmailsServer().catch(() => []),
    getAdminUsersServer().catch(() => []),
  ]);

  const allEvents = buildActivityFeed({
    inquiries,
    inquiryHistory,
    brokers,
    companies,
    projects,
    contracts,
    documents,
    emails,
    adminUsers,
  });

  const events = allEvents.slice(0, FEED_LIMIT);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(200,162,77,0.13),_transparent_28%),linear-gradient(135deg,_#03070D_0%,_#071A2D_65%,_#02060D_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
          >
            ← Back to dashboard
          </Link>
        </div>

        <header className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.5)] backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-[#C8A24D]">Amber Global Energy</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Activity Feed</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
            Every inquiry, broker, company, project, contract, document, and email event across the desk, in one timeline.
          </p>
        </header>

        <section className="rounded-[28px] border border-white/10 bg-[#050B16]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">
          {allEvents.length > FEED_LIMIT ? (
            <p className="mb-4 text-xs uppercase tracking-[0.2em] text-slate-500">
              Showing the most recent {FEED_LIMIT} of {allEvents.length} events.
            </p>
          ) : null}

          {events.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#071A2D]/70 px-5 py-10 text-center text-slate-400">
              No activity recorded yet.
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((event) => {
                const row = (
                  <div className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-[#071A2D]/80 px-4 py-3 transition hover:border-[#C8A24D]/40">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 text-lg">{event.icon}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">{event.title}</p>
                        <p className="mt-0.5 truncate text-sm text-slate-400">{event.detail}</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs uppercase tracking-[0.2em] text-slate-500" title={formatDate(event.timestamp)}>
                      {getRelativeTime(event.timestamp)}
                    </span>
                  </div>
                );

                return event.href ? (
                  <Link key={event.id} href={event.href} className="block">
                    {row}
                  </Link>
                ) : (
                  <div key={event.id}>{row}</div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
