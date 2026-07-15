// Pure, UI-independent rule-based alert generation. No formatting, no JSX,
// no framework imports — deterministic business rules over real CRM data,
// not a paid AI call. Reusable from a REST endpoint, a scheduled job, or a
// future AI service without modification.

import {
  type InquiryRecord,
  isHighPriority,
  normalizeStatusValue,
  CLOSED_STATUSES,
  parseCurrencyValue,
  getReadinessScore,
  getVerificationBadges,
} from "@/lib/inquiry-helpers";
import { normalizeProjectStage, CLOSED_PROJECT_STAGES } from "@/lib/project-helpers";
import { isContractExpiringSoon } from "@/lib/contract-helpers";
import type { ProjectRecord, ContractRecord } from "@/lib/supabase-server";

export type AlertSeverity = "critical" | "high" | "medium" | "low";

export type ExecutiveAlert = {
  id: string;
  severity: AlertSeverity;
  type: string;
  reason: string;
  entityType: "inquiry" | "project" | "contract";
  entityId: string;
  entityLabel: string;
  recommendedAction: string;
  href: string;
};

// Minimal shape needed for the stalled-deal alert — deliberately not imported
// from lib/executive-analytics.ts (which imports this module) to avoid a
// circular runtime dependency between the two files.
export type StalledDealInput = {
  projectId: string;
  name: string;
  daysSinceActivity: number;
  value: number;
  href: string;
};

// High-value threshold for the "opportunity requiring follow-up" rule.
// Centralized here so it's easy to tune independently of stage probabilities.
const HIGH_VALUE_THRESHOLD = 100_000;
const FOLLOW_UP_STALE_DAYS = 7;
const CONTRACT_EXPIRING_WINDOW_DAYS = 30;
const CONTRACT_EXPIRING_URGENT_DAYS = 14;

const inquiryLabel = (inquiry: InquiryRecord): string => inquiry.company_name ?? inquiry.contact_name ?? inquiry.name ?? "Unnamed inquiry";
const daysSinceIso = (iso: string | null | undefined, nowMs: number): number | null => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.round((nowMs - t) / 86400000);
};
const badgeVerified = (badges: ReturnType<typeof getVerificationBadges>, label: string): boolean =>
  badges.find((badge) => badge.label === label)?.status === "Verified";

export const generateExecutiveAlerts = (input: {
  inquiries: InquiryRecord[];
  projects: ProjectRecord[];
  contracts: ContractRecord[];
  stalledDeals: StalledDealInput[];
  now?: Date;
}): ExecutiveAlert[] => {
  const nowMs = (input.now ?? new Date()).getTime();
  const alerts: ExecutiveAlert[] = [];

  const openInquiries = input.inquiries.filter((inquiry) => !CLOSED_STATUSES.has(normalizeStatusValue(inquiry.status)));

  for (const inquiry of openInquiries) {
    const id = String(inquiry.id ?? "");
    if (!id) continue;
    const label = inquiryLabel(inquiry);
    const href = `/admin/customers/${id}`;
    const badges = getVerificationBadges(inquiry);

    // 1. High-value opportunity requiring follow-up
    const value = parseCurrencyValue(inquiry.target_price);
    const lastContactDays = daysSinceIso(inquiry.last_contacted_at, nowMs);
    if (value >= HIGH_VALUE_THRESHOLD && (lastContactDays === null || lastContactDays >= FOLLOW_UP_STALE_DAYS)) {
      alerts.push({
        id: `high_value_follow_up-${id}`,
        severity: "high",
        type: "high_value_follow_up",
        reason: `High-value inquiry (est. ${value.toLocaleString("en-US")}) has not been contacted in ${lastContactDays ?? "an unknown number of"} day(s).`,
        entityType: "inquiry",
        entityId: id,
        entityLabel: label,
        recommendedAction: "Reach out to the customer and log contact.",
        href,
      });
    }

    // 2. Missing LOI
    if (!badgeVerified(badges, "LOI Uploaded")) {
      alerts.push({
        id: `missing_loi-${id}`,
        severity: "high",
        type: "missing_loi",
        reason: "Letter of Intent has not been submitted.",
        entityType: "inquiry",
        entityId: id,
        entityLabel: label,
        recommendedAction: "Request the LOI from the customer.",
        href,
      });
    }

    // 3. Missing ICPO
    if (!badgeVerified(badges, "ICPO Uploaded")) {
      alerts.push({
        id: `missing_icpo-${id}`,
        severity: "high",
        type: "missing_icpo",
        reason: "ICPO has not been submitted.",
        entityType: "inquiry",
        entityId: id,
        entityLabel: label,
        recommendedAction: "Request the ICPO from the customer.",
        href,
      });
    }

    // 4. Missing passport or company documents
    const missingPassport = !badgeVerified(badges, "Passport Uploaded");
    const missingCompanyDocs = !badgeVerified(badges, "Company Registered");
    if (missingPassport || missingCompanyDocs) {
      alerts.push({
        id: `missing_identity_docs-${id}`,
        severity: "medium",
        type: "missing_identity_docs",
        reason: missingPassport && missingCompanyDocs
          ? "Passport and company registration documents are both missing."
          : missingPassport
            ? "Passport document is missing."
            : "Company registration document is missing.",
        entityType: "inquiry",
        entityId: id,
        entityLabel: label,
        recommendedAction: "Request identity/company verification documents.",
        href,
      });
    }

    // 7. High-priority inquiry without an assigned broker
    if (isHighPriority(inquiry) && !inquiry.assigned_broker) {
      alerts.push({
        id: `high_priority_unassigned-${id}`,
        severity: "critical",
        type: "high_priority_unassigned",
        reason: "High-priority inquiry has no broker assigned.",
        entityType: "inquiry",
        entityId: id,
        entityLabel: label,
        recommendedAction: "Assign a broker immediately.",
        href,
      });
    }

    // 9. Deal ready for buyer or seller introduction
    if (getReadinessScore(inquiry) >= 90) {
      alerts.push({
        id: `ready_for_introduction-${id}`,
        severity: "low",
        type: "ready_for_introduction",
        reason: "Deal readiness score has reached the introduction threshold.",
        entityType: "inquiry",
        entityId: id,
        entityLabel: label,
        recommendedAction: "Proceed to buyer/seller introduction.",
        href,
      });
    }
  }

  // 6. Project overdue
  for (const project of input.projects) {
    if (CLOSED_PROJECT_STAGES.has(normalizeProjectStage(project.stage))) continue;
    if (!project.expected_close_date) continue;
    const dueMs = new Date(project.expected_close_date).getTime();
    if (Number.isNaN(dueMs) || dueMs >= nowMs) continue;

    alerts.push({
      id: `project_overdue-${project.id}`,
      severity: "high",
      type: "project_overdue",
      reason: `Expected close date (${project.expected_close_date}) has passed.`,
      entityType: "project",
      entityId: project.id,
      entityLabel: project.name,
      recommendedAction: "Update the expected close date or move the deal forward.",
      href: `/admin/projects/${project.id}`,
    });
  }

  // 5. Contract expiring soon
  for (const contract of input.contracts) {
    if (contract.status !== "active") continue;
    if (!isContractExpiringSoon(contract.end_date, CONTRACT_EXPIRING_WINDOW_DAYS)) continue;
    const daysLeft = daysSinceIso(contract.end_date, nowMs);
    const urgentDaysLeft = daysLeft !== null ? -daysLeft : null; // daysSinceIso is negative for future dates

    alerts.push({
      id: `contract_expiring-${contract.id}`,
      severity: urgentDaysLeft !== null && urgentDaysLeft <= CONTRACT_EXPIRING_URGENT_DAYS ? "high" : "medium",
      type: "contract_expiring",
      reason: `Contract expires ${contract.end_date}.`,
      entityType: "contract",
      entityId: contract.id,
      entityLabel: contract.title,
      recommendedAction: "Review for renewal or extension.",
      href: `/admin/contracts/${contract.id}`,
    });
  }

  // 8. Deal stalled with no recent activity
  for (const stalled of input.stalledDeals) {
    alerts.push({
      id: `deal_stalled-${stalled.projectId}`,
      severity: "medium",
      type: "deal_stalled",
      reason: `No activity in ${stalled.daysSinceActivity} day(s).`,
      entityType: "project",
      entityId: stalled.projectId,
      entityLabel: stalled.name,
      recommendedAction: "Re-engage the customer or update the project status.",
      href: stalled.href,
    });
  }

  const severityRank: Record<AlertSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return alerts.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
};
