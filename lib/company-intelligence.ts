// Company Intelligence — deterministic health scoring and executive
// briefing (Phase 5.3, Stage 5.3.1A). Pure, UI-independent functions: plain
// data in, plain structured objects out. No JSX, no framework imports, no
// AI/LLM calls, no randomness — every output is derived from explicit
// business rules over real CRM data, following the exact pattern already
// established by lib/executive-alerts.ts and lib/executive-analytics.ts.
//
// This module is a data layer only. It introduces no new UI, no new routes,
// and no new database tables — Stage 5.3.1B wires this into the company
// profile page.

import type { InquiryRecord } from "@/lib/inquiry-helpers";
import { CLOSED_STATUSES, normalizeStatusValue } from "@/lib/inquiry-helpers";
import { normalizeProjectStage, CLOSED_PROJECT_STAGES } from "@/lib/project-helpers";
import { CLOSED_CONTRACT_STATUSES } from "@/lib/contract-helpers";
import { CLOSED_SUPPORT_STATUSES } from "@/lib/support-request-helpers";
import type { AlertSeverity } from "@/lib/executive-alerts";
import type {
  CompanyRecord,
  CompanyContactRecord,
  ProjectRecord,
  ContractRecord,
  SupportRequestRecord,
  ReminderRecord,
  DocumentRecord,
  EmailRecord,
  DealMatchRecord,
} from "@/lib/supabase-server";

// ─── Configuration ──────────────────────────────────────────────────────────
// Every numeric threshold used by the health rules lives here — nothing
// below is hard-coded inline, so tuning behavior means changing one object.

export const COMPANY_HEALTH_RULES = {
  urgentSupportHours: 24,
  waitingClientDays: 7,
  inactivityDays: 30,
  reminderGraceDays: 1,
};

export type CompanyHealthRules = typeof COMPANY_HEALTH_RULES;

// ─── Input shape ────────────────────────────────────────────────────────────
// Callers are responsible for fetching and passing in company-scoped data —
// this module never queries the database itself. inquiries is fuzzy-matched
// by company_name today (see matchInquiriesToCompany below) because
// public.inquiries has no company_id column yet.

export type CompanyIntelligenceInput = {
  company: CompanyRecord;
  contacts: CompanyContactRecord[];
  inquiries: InquiryRecord[];
  projects: ProjectRecord[];
  contracts: ContractRecord[];
  supportRequests: SupportRequestRecord[];
  reminders: ReminderRecord[];
  documents: DocumentRecord[];
  emails: EmailRecord[];
  dealMatches: DealMatchRecord[];
};

// Mirrors the fuzzy company_name matching already used inline in
// app/admin/companies/[id]/page.tsx (case-insensitive, trimmed equality).
// Extracted here so this module — and any future caller — shares one
// implementation instead of re-deriving it. Does not replace or modify the
// existing inline filter in that page.
export function matchInquiriesToCompany(inquiries: InquiryRecord[], company: CompanyRecord): InquiryRecord[] {
  const normalizedName = company.name.trim().toLowerCase();
  return inquiries.filter((inquiry) => (inquiry.company_name ?? "").trim().toLowerCase() === normalizedName);
}

// ─── Shared date-math helpers ───────────────────────────────────────────────
// Small, local, and intentionally not shared with executive-alerts.ts /
// executive-analytics.ts — those modules define their own private
// equivalents rather than exporting one, and this module follows the same
// established convention.

const hoursSince = (iso: string | null | undefined, nowMs: number): number => {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, (nowMs - t) / 3600000);
};

const daysSince = (iso: string | null | undefined, nowMs: number): number => {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, (nowMs - t) / 86400000);
};

// ─── Health types ───────────────────────────────────────────────────────────

export type CompanyHealthLevel = "healthy" | "attention_needed" | "at_risk";

// Mirrors the ExecutiveAlert shape in lib/executive-alerts.ts (severity,
// reason, recommendedAction, href, entity context) — the brief requires
// every triggered rule to carry these fields for explainability.
export type CompanyHealthFlag = {
  id: string;
  type: string;
  severity: AlertSeverity;
  level: Exclude<CompanyHealthLevel, "healthy">;
  reason: string;
  recommendedAction: string;
  entityType: "company" | "contact" | "support_request" | "reminder";
  entityId: string;
  entityLabel: string;
  href: string;
};

export type CompanyHealthMetrics = {
  activeInquiries: number;
  activeProjects: number;
  activeContracts: number;
  openSupportRequests: number;
  urgentSupportRequests: number;
  upcomingReminders: number;
  overdueReminders: number;
  hasPrimaryContact: boolean;
  activeContactCount: number;
  lastInteractionAt: string | null;
  lastInteractionType: "email" | "support_request" | "document" | null;
};

export type CompanyHealthReport = {
  level: CompanyHealthLevel;
  reasons: string[];
  flags: CompanyHealthFlag[];
  metrics: CompanyHealthMetrics;
};

// ─── Metrics ────────────────────────────────────────────────────────────────

type InteractionCandidate = { at: string; type: CompanyHealthMetrics["lastInteractionType"] };

const INTERACTION_TYPE_LABELS: Record<NonNullable<CompanyHealthMetrics["lastInteractionType"]>, string> = {
  email: "an email was logged",
  support_request: "a support-status update",
  document: "a document was uploaded",
};

const findLastInteraction = (
  emails: EmailRecord[],
  supportRequests: SupportRequestRecord[],
  documents: DocumentRecord[],
): InteractionCandidate | null => {
  const candidates: InteractionCandidate[] = [
    ...emails.filter((email) => email.sent_at).map((email) => ({ at: email.sent_at, type: "email" as const })),
    ...supportRequests
      .filter((request) => request.updated_at)
      .map((request) => ({ at: request.updated_at, type: "support_request" as const })),
    ...documents.filter((document) => document.created_at).map((document) => ({ at: document.created_at, type: "document" as const })),
  ];

  if (candidates.length === 0) return null;

  return candidates.reduce((latest, current) =>
    new Date(current.at).getTime() > new Date(latest.at).getTime() ? current : latest,
  );
};

const computeMetrics = (input: CompanyIntelligenceInput, nowMs: number): CompanyHealthMetrics => {
  const activeInquiries = input.inquiries.filter((inquiry) => !CLOSED_STATUSES.has(normalizeStatusValue(inquiry.status))).length;
  const activeProjects = input.projects.filter((project) => !CLOSED_PROJECT_STAGES.has(normalizeProjectStage(project.stage))).length;
  const activeContracts = input.contracts.filter((contract) => !CLOSED_CONTRACT_STATUSES.has(contract.status)).length;
  const openSupportRequests = input.supportRequests.filter((request) => !CLOSED_SUPPORT_STATUSES.has(request.status)).length;
  const urgentSupportRequests = input.supportRequests.filter(
    (request) => request.priority === "urgent" && !CLOSED_SUPPORT_STATUSES.has(request.status),
  ).length;

  const pendingReminders = input.reminders.filter((reminder) => reminder.status === "pending");
  const upcomingReminders = pendingReminders.filter((reminder) => new Date(reminder.due_at).getTime() >= nowMs).length;
  const overdueReminders = pendingReminders.filter((reminder) => new Date(reminder.due_at).getTime() < nowMs).length;

  const activeContacts = input.contacts.filter((contact) => contact.status === "active");
  const hasPrimaryContact = activeContacts.some((contact) => contact.is_primary);

  const lastInteraction = findLastInteraction(input.emails, input.supportRequests, input.documents);

  return {
    activeInquiries,
    activeProjects,
    activeContracts,
    openSupportRequests,
    urgentSupportRequests,
    upcomingReminders,
    overdueReminders,
    hasPrimaryContact,
    activeContactCount: activeContacts.length,
    lastInteractionAt: lastInteraction?.at ?? null,
    lastInteractionType: lastInteraction?.type ?? null,
  };
};

// ─── Health rules ───────────────────────────────────────────────────────────
// Each rule is self-contained, reads only from COMPANY_HEALTH_RULES for its
// thresholds, and explicitly states which health level it drives — the
// mapping from rule to level is authored per-rule, not inferred from
// severity, so it stays auditable.

const evaluateHealthFlags = (
  input: CompanyIntelligenceInput,
  metrics: CompanyHealthMetrics,
  rules: CompanyHealthRules,
  nowMs: number,
): CompanyHealthFlag[] => {
  const { company } = input;
  const href = `/admin/companies/${company.id}`;
  const flags: CompanyHealthFlag[] = [];
  const hasActiveDeals = metrics.activeProjects > 0 || metrics.activeContracts > 0;

  // Rule: no active primary contact
  if (!metrics.hasPrimaryContact) {
    flags.push({
      id: "no_primary_contact",
      type: "no_primary_contact",
      severity: "medium",
      level: "attention_needed",
      reason: "No primary contact is assigned.",
      recommendedAction: "Designate an active primary contact for this company.",
      entityType: "company",
      entityId: company.id,
      entityLabel: company.name,
      href,
    });
  }

  // Rule: urgent support request open beyond the configured threshold
  const overdueUrgent = input.supportRequests.filter(
    (request) =>
      request.priority === "urgent" &&
      !CLOSED_SUPPORT_STATUSES.has(request.status) &&
      hoursSince(request.created_at, nowMs) >= rules.urgentSupportHours,
  );
  if (overdueUrgent.length > 0) {
    const oldest = overdueUrgent.reduce((a, b) => (hoursSince(a.created_at, nowMs) > hoursSince(b.created_at, nowMs) ? a : b));
    flags.push({
      id: "urgent_support_overdue",
      type: "urgent_support_overdue",
      severity: overdueUrgent.length > 1 ? "critical" : "high",
      level: "at_risk",
      reason:
        overdueUrgent.length === 1
          ? `One urgent support request has been open for more than ${rules.urgentSupportHours} hours.`
          : `${overdueUrgent.length} urgent support requests have been open for more than ${rules.urgentSupportHours} hours.`,
      recommendedAction: "Review and respond to the urgent support request(s) immediately.",
      entityType: "support_request",
      entityId: oldest.id,
      entityLabel: oldest.subject,
      href,
    });
  }

  // Rule: client response pending beyond the configured threshold
  const staleWaiting = input.supportRequests.filter(
    (request) => request.status === "waiting_for_client" && daysSince(request.updated_at, nowMs) >= rules.waitingClientDays,
  );
  if (staleWaiting.length > 0) {
    const oldest = staleWaiting.reduce((a, b) => (daysSince(a.updated_at, nowMs) > daysSince(b.updated_at, nowMs) ? a : b));
    flags.push({
      id: "waiting_for_client_stale",
      type: "waiting_for_client_stale",
      severity: "medium",
      level: "attention_needed",
      reason:
        staleWaiting.length === 1
          ? `A client response has been pending for over ${rules.waitingClientDays} days.`
          : `${staleWaiting.length} support requests have been awaiting a client response for over ${rules.waitingClientDays} days.`,
      recommendedAction: "Follow up with the client for the information needed to proceed.",
      entityType: "support_request",
      entityId: oldest.id,
      entityLabel: oldest.subject,
      href,
    });
  }

  // Rule: unverified company with active commercial activity
  if (company.verification_status !== "verified" && hasActiveDeals) {
    flags.push({
      id: "unverified_with_active_deals",
      type: "unverified_with_active_deals",
      severity: "medium",
      level: "attention_needed",
      reason: "This company has active deals but is not yet verified.",
      recommendedAction: "Complete company verification.",
      entityType: "company",
      entityId: company.id,
      entityLabel: company.name,
      href,
    });
  }

  // Rule: reminder overdue beyond the configured grace period
  const overdueReminders = input.reminders.filter(
    (reminder) => reminder.status === "pending" && daysSince(reminder.due_at, nowMs) >= rules.reminderGraceDays,
  );
  if (overdueReminders.length > 0) {
    const oldest = overdueReminders.reduce((a, b) => (daysSince(a.due_at, nowMs) > daysSince(b.due_at, nowMs) ? a : b));
    flags.push({
      id: "reminder_overdue",
      type: "reminder_overdue",
      severity: "low",
      level: "attention_needed",
      reason: overdueReminders.length === 1 ? "A reminder is overdue." : `${overdueReminders.length} reminders are overdue.`,
      recommendedAction: "Complete or reschedule the overdue reminder(s).",
      entityType: "reminder",
      entityId: oldest.id,
      entityLabel: oldest.title,
      href,
    });
  }

  // Rule: no recorded activity despite active commercial activity
  const inactiveTooLong = hasActiveDeals && (metrics.lastInteractionAt === null || daysSince(metrics.lastInteractionAt, nowMs) >= rules.inactivityDays);
  if (inactiveTooLong) {
    flags.push({
      id: "no_recent_activity",
      type: "no_recent_activity",
      severity: "high",
      level: "at_risk",
      reason: metrics.lastInteractionAt
        ? `No activity has been recorded in over ${rules.inactivityDays} days despite active deals.`
        : "No interaction has been recorded despite active deals.",
      recommendedAction: "Reach out to re-engage the client relationship.",
      entityType: "company",
      entityId: company.id,
      entityLabel: company.name,
      href,
    });
  }

  return flags;
};

const deriveLevel = (flags: CompanyHealthFlag[]): CompanyHealthLevel => {
  if (flags.some((flag) => flag.level === "at_risk")) return "at_risk";
  if (flags.some((flag) => flag.level === "attention_needed")) return "attention_needed";
  return "healthy";
};

export function computeCompanyHealth(
  input: CompanyIntelligenceInput,
  rules: CompanyHealthRules = COMPANY_HEALTH_RULES,
  now: Date = new Date(),
): CompanyHealthReport {
  const nowMs = now.getTime();
  const metrics = computeMetrics(input, nowMs);
  const flags = evaluateHealthFlags(input, metrics, rules, nowMs);
  const level = deriveLevel(flags);
  const reasons = flags.length > 0 ? flags.map((flag) => flag.reason) : ["No open risk indicators."];

  return { level, reasons, flags, metrics };
}

// ─── Executive briefing ─────────────────────────────────────────────────────
// Deterministic, template-based prose built only from computeCompanyHealth's
// output and fields already on CompanyRecord. Never generative, never
// speculative — every clause traces back to a specific fact or rule above.

export type CompanyBriefing = {
  summary: string;
  highlights: string[];
};

const HEALTH_LEVEL_LABELS: Record<CompanyHealthLevel, string> = {
  healthy: "Healthy",
  attention_needed: "Attention Needed",
  at_risk: "At Risk",
};

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

const numberWord = (value: number): string => (value >= 0 && value < NUMBER_WORDS.length ? NUMBER_WORDS[value] : String(value));

const pluralize = (count: number, singular: string, plural: string = `${singular}s`): string =>
  `${numberWord(count)} ${count === 1 ? singular : plural}`;

const joinWithAnd = (parts: string[]): string => {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
};

export function computeCompanyBriefing(input: CompanyIntelligenceInput, health: CompanyHealthReport): CompanyBriefing {
  const { company } = input;
  const { metrics } = health;

  const activityParts: string[] = [];
  if (metrics.activeContracts > 0) activityParts.push(pluralize(metrics.activeContracts, "active contract"));
  if (metrics.activeProjects > 0) activityParts.push(pluralize(metrics.activeProjects, "active project"));
  if (metrics.openSupportRequests > 0) {
    activityParts.push(
      metrics.urgentSupportRequests > 0
        ? `${pluralize(metrics.openSupportRequests, "open support request")} (${pluralize(metrics.urgentSupportRequests, "urgent")})`
        : pluralize(metrics.openSupportRequests, "open support request"),
    );
  }
  if (metrics.upcomingReminders > 0) activityParts.push(pluralize(metrics.upcomingReminders, "upcoming reminder"));

  const activitySentence =
    activityParts.length > 0
      ? `${company.name} currently has ${joinWithAnd(activityParts)}.`
      : `${company.name} has no active contracts, projects, open support requests, or upcoming reminders on file.`;

  const verificationClause =
    company.verification_status === "verified"
      ? "Company verification is complete"
      : company.verification_status === "pending"
        ? "Company verification is pending"
        : "Company verification has not been completed";
  const contactClause = metrics.hasPrimaryContact ? "a primary contact is assigned" : "no primary contact is currently assigned";
  const statusSentence = `${verificationClause} and ${contactClause}.`;

  const interactionSentence = metrics.lastInteractionAt
    ? `The last recorded interaction was ${INTERACTION_TYPE_LABELS[metrics.lastInteractionType!]}.`
    : "No recent interaction has been recorded.";

  // The triggering reason is appended verbatim as its own sentence rather
  // than grafted into a "due to ..." subordinate clause — reasons are
  // authored as complete sentences (see evaluateHealthFlags above), and
  // forcing them into a noun-phrase-shaped clause produces broken grammar
  // for reason text that isn't itself a noun phrase.
  const healthSentence =
    health.level === "healthy"
      ? `Overall relationship health is ${HEALTH_LEVEL_LABELS[health.level]}.`
      : `Overall relationship health is ${HEALTH_LEVEL_LABELS[health.level]}. ${health.reasons[0]}`;

  const summary = [activitySentence, statusSentence, interactionSentence, healthSentence].join(" ");

  const highlights = [
    ...activityParts,
    metrics.hasPrimaryContact ? "Primary contact assigned" : "No primary contact assigned",
    ...health.reasons,
  ];

  return { summary, highlights };
}
