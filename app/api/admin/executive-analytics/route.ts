import { NextRequest, NextResponse } from "next/server";
import {
  getInquiriesForAnalyticsServer,
  getBrokersServer,
  getCompaniesServer,
  getProjectsServer,
  getContractsServer,
  getAllRemindersServer,
} from "@/lib/supabase-server";
import { computeExecutiveIntelligence, type AnalyticsInquiryRecord } from "@/lib/executive-analytics";

// Read-only — no mutation, so no RBAC permission check is needed (consistent
// with every other GET route in this app; only POST/PATCH/DELETE check
// checkPermission()). Protected by the existing Basic Auth proxy matcher.
export async function GET(request: NextRequest) {
  try {
    const stalledParam = request.nextUrl.searchParams.get("stalledThresholdDays");
    const stalledThresholdDays = stalledParam ? Number(stalledParam) : undefined;

    const [inquiries, brokers, companies, projects, contracts, reminders] = await Promise.all([
      getInquiriesForAnalyticsServer(),
      getBrokersServer().catch(() => []),
      getCompaniesServer().catch(() => []),
      getProjectsServer().catch(() => []),
      getContractsServer().catch(() => []),
      getAllRemindersServer().catch(() => []),
    ]);

    const report = computeExecutiveIntelligence({
      inquiries: inquiries as AnalyticsInquiryRecord[],
      brokers,
      companies,
      projects,
      contracts,
      reminders,
      stalledThresholdDays: Number.isFinite(stalledThresholdDays) ? stalledThresholdDays : undefined,
    });

    return NextResponse.json({ data: report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to compute executive analytics.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
