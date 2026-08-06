import { NextRequest, NextResponse } from "next/server";
import {
  getInquiriesForAnalyticsServer,
  getBrokersServer,
  getCompaniesServer,
  getProjectsServer,
  getContractsServer,
  getAllRemindersServer,
  getAllCompanyContactsServer,
  getSupportRequestsServer,
  getAllDocumentsServer,
  getAllEmailsServer,
  getDealMatchesServer,
} from "@/lib/supabase-server";
import { computeExecutiveIntelligence, type AnalyticsInquiryRecord } from "@/lib/executive-analytics";
import {
  computeCompanyPortfolioHealth,
  flattenPortfolioHealthFlags,
  type CompanyHealthFlag,
} from "@/lib/company-intelligence";

// Read-only — no mutation, so no RBAC permission check is needed (consistent
// with every other GET route in this app; only POST/PATCH/DELETE check
// checkPermission()). Protected by the existing Basic Auth proxy matcher.
export async function GET(request: NextRequest) {
  try {
    const stalledParam = request.nextUrl.searchParams.get("stalledThresholdDays");
    const stalledThresholdDays = stalledParam ? Number(stalledParam) : undefined;

    // The five additions below are the inputs company health scoring needs
    // that deal analytics did not already fetch. Still one query per entity
    // type for the whole desk — company health is scored from these same
    // arrays, never with a per-company follow-up query.
    const [inquiries, brokers, companies, projects, contracts, reminders, contacts, supportRequests, documents, emails, dealMatches] =
      await Promise.all([
        getInquiriesForAnalyticsServer(),
        getBrokersServer().catch(() => []),
        getCompaniesServer().catch(() => []),
        getProjectsServer().catch(() => []),
        getContractsServer().catch(() => []),
        getAllRemindersServer().catch(() => []),
        getAllCompanyContactsServer().catch(() => []),
        getSupportRequestsServer().catch(() => []),
        getAllDocumentsServer().catch(() => []),
        getAllEmailsServer().catch(() => []),
        getDealMatchesServer().catch(() => []),
      ]);

    // One instant shared by company scoring and the analytics report, so every
    // time-based rule in this response is evaluated against the same clock.
    const now = new Date();

    // Reuses the Stage 5.3.3 rollup as-is: no company rules are evaluated
    // here, and the arrays above are passed through rather than re-fetched.
    // AnalyticsInquiryRecord is InquiryRecord plus role_type, so the analytics
    // inquiry fetch satisfies the rollup's inquiry input directly.
    // Individually caught: a failure in company scoring must degrade to the
    // previous deal-only alert set rather than 500 the whole dashboard.
    let companyHealthFlags: CompanyHealthFlag[];
    try {
      companyHealthFlags = flattenPortfolioHealthFlags(
        computeCompanyPortfolioHealth(
          {
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
          },
          undefined,
          now,
        ),
      );
    } catch {
      companyHealthFlags = [];
    }

    const report = computeExecutiveIntelligence({
      inquiries: inquiries as AnalyticsInquiryRecord[],
      brokers,
      companies,
      projects,
      contracts,
      reminders,
      companyHealthFlags,
      now,
      stalledThresholdDays: Number.isFinite(stalledThresholdDays) ? stalledThresholdDays : undefined,
    });

    return NextResponse.json({ data: report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to compute executive analytics.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
