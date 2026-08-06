import Link from "next/link";
import {
  getCompaniesServer,
  getInquiriesServer,
  getAllCompanyContactsServer,
  getProjectsServer,
  getContractsServer,
  getSupportRequestsServer,
  getAllRemindersServer,
  getAllDocumentsServer,
  getAllEmailsServer,
  getDealMatchesServer,
} from "@/lib/supabase-server";
import { normalizeStatusValue, CLOSED_STATUSES } from "@/lib/inquiry-helpers";
import { computeCompanyPortfolioHealth } from "@/lib/company-intelligence";
import CompanyRoster, { type CompanyHealthSummary } from "./company-roster";

// Live admin data (company directory + inquiry counts) must never be
// statically prerendered at build time — this route has no dynamic segment
// to force it, the same reasoning as /admin/brokers.
export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  // One query per entity type for the whole desk — never one per company.
  // computeCompanyPortfolioHealth() groups these in memory, so adding a
  // company adds no queries. The health inputs are individually try/caught:
  // the directory is a working CRM screen first, so a failure in one health
  // input degrades that column rather than taking the roster down with it.
  const [companies, inquiries, contacts, projects, contracts, supportRequests, reminders, documents, emails, dealMatches] =
    await Promise.all([
      getCompaniesServer(),
      getInquiriesServer(),
      getAllCompanyContactsServer().catch(() => []),
      getProjectsServer().catch(() => []),
      getContractsServer().catch(() => []),
      getSupportRequestsServer().catch(() => []),
      getAllRemindersServer().catch(() => []),
      getAllDocumentsServer().catch(() => []),
      getAllEmailsServer().catch(() => []),
      getDealMatchesServer().catch(() => []),
    ]);

  // Same defensive posture as /admin/activity's buildActivityFeed() call —
  // a surprise in one row's shape must not 500 the whole directory.
  let healthByCompanyId: Record<string, CompanyHealthSummary> = {};
  try {
    const reports = computeCompanyPortfolioHealth({
      companies,
      contacts,
      inquiries,
      projects,
      contracts,
      supportRequests,
      reminders,
      documents,
      emails,
      dealMatches,
    });

    // Only the level and the leading reason cross to the client component —
    // the full reports carry every flag and metric for all companies, which
    // the directory never renders. The profile page remains the place that
    // shows the whole report.
    healthByCompanyId = Object.fromEntries(
      Object.entries(reports).map(([companyId, report]) => [companyId, { level: report.level, reason: report.reasons[0] }]),
    );
  } catch {
    healthByCompanyId = {};
  }

  const inquiryCounts: Record<string, { active: number; total: number }> = {};
  for (const inquiry of inquiries) {
    const companyName = inquiry.company_name?.trim().toLowerCase();
    if (!companyName) continue;
    if (!inquiryCounts[companyName]) inquiryCounts[companyName] = { active: 0, total: 0 };
    inquiryCounts[companyName].total += 1;
    if (!CLOSED_STATUSES.has(normalizeStatusValue(inquiry.status))) {
      inquiryCounts[companyName].active += 1;
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(200,162,77,0.13),_transparent_28%),linear-gradient(135deg,_#03070D_0%,_#071A2D_65%,_#02060D_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
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
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Company Management</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
            Maintain a master directory of counterparties and see every open inquiry tied to each company.
          </p>
        </header>

        <CompanyRoster initialCompanies={companies} inquiryCounts={inquiryCounts} healthByCompanyId={healthByCompanyId} />
      </div>
    </main>
  );
}
