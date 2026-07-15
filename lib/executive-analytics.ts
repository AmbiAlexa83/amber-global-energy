// Pure, UI-independent executive analytics: KPIs, pipeline stage intelligence,
// broker performance, and geographic intelligence. Every function here takes
// plain data and returns plain structured objects — no formatting, no JSX,
// no framework imports. This is the reusable service layer other consumers
// (REST endpoints, scheduled jobs, future AI services) can call directly.

import {
  type InquiryRecord,
  parseCurrencyValue,
  normalizeStatusValue,
  isHighPriority,
  getMissingDocumentCount,
  getReadinessScore,
  CLOSED_STATUSES,
} from "@/lib/inquiry-helpers";
import { normalizeProjectStage, CLOSED_PROJECT_STAGES, projectStageOptions } from "@/lib/project-helpers";
import { CLOSED_CONTRACT_STATUSES } from "@/lib/contract-helpers";
import { computeRevenueForecast, getStageProbability, type RevenueForecast } from "@/lib/pipeline-forecast";
import { generateExecutiveAlerts, type ExecutiveAlert } from "@/lib/executive-alerts";
import type { BrokerRecord, CompanyRecord, ProjectRecord, ContractRecord, ReminderRecord } from "@/lib/supabase-server";

// The full-column inquiry shape used by executive analytics — extends the
// shared InquiryRecord with role_type, which exists in the database
// (see supabase/schema.sql) but isn't part of the lighter-weight InquiryRecord
// type most of the app uses. Additive only; InquiryRecord itself is untouched.
export type AnalyticsInquiryRecord = InquiryRecord & { role_type?: string | null };

// ─── Shared helpers ────────────────────────────────────────────────────────

const hoursBetween = (startIso: string | null | undefined, endIso: string | null | undefined): number | null => {
  if (!startIso || !endIso) return null;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.max(0, end - start) / 3600000;
};

export const computeAverageResponseTimeHours = (inquiries: InquiryRecord[]): number | null => {
  const samples = inquiries
    .map((inquiry) => hoursBetween(inquiry.created_at, inquiry.updated_at ?? inquiry.created_at))
    .filter((value): value is number => value !== null);
  if (samples.length === 0) return null;
  return Math.round((samples.reduce((sum, value) => sum + value, 0) / samples.length) * 10) / 10;
};

// A project is "stalled" when it's still open and hasn't been touched
// (updated_at, auto-stamped on every row change) within the threshold.
export const isProjectStalled = (project: ProjectRecord, thresholdDays: number, nowMs: number): boolean => {
  if (CLOSED_PROJECT_STAGES.has(normalizeProjectStage(project.stage))) return false;
  const updated = project.updated_at ? new Date(project.updated_at).getTime() : null;
  if (updated === null || Number.isNaN(updated)) return false;
  return (nowMs - updated) / 86400000 >= thresholdDays;
};

const daysSince = (iso: string | null | undefined, nowMs: number): number => {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.round((nowMs - t) / 86400000);
};

// ─── KPIs ──────────────────────────────────────────────────────────────────

export type ExecutiveKpis = {
  totalPipelineValue: number;
  weightedPipelineValue: number;
  activeProjects: number;
  openContracts: number;
  closedWonValue: number;
  closedLostValue: number;
  averageDealSize: number;
  winRate: number;
  averageResponseTimeHours: number | null;
  dealsAwaitingDocuments: number;
  highPriorityOpportunities: number;
  dealsReadyForIntroduction: number;
};

export const computeExecutiveKpis = (
  inquiries: InquiryRecord[],
  projects: ProjectRecord[],
  contracts: ContractRecord[],
  forecast: RevenueForecast,
): ExecutiveKpis => {
  const openInquiries = inquiries.filter((inquiry) => !CLOSED_STATUSES.has(normalizeStatusValue(inquiry.status)));
  const wonProjects = projects.filter((project) => normalizeProjectStage(project.stage) === "closed_won");
  const lostProjects = projects.filter((project) => normalizeProjectStage(project.stage) === "closed_lost");
  const activeProjects = projects.filter((project) => !CLOSED_PROJECT_STAGES.has(normalizeProjectStage(project.stage)));
  const openContracts = contracts.filter((contract) => !CLOSED_CONTRACT_STATUSES.has(contract.status));

  const closedCount = wonProjects.length + lostProjects.length;
  const winRate = closedCount > 0 ? Math.round((wonProjects.length / closedCount) * 100) : 0;

  // Average deal size: mean value of closed-won deals when any exist (the
  // standard CRM definition); falls back to the mean across all valued
  // projects so the KPI isn't zero before the desk has closed anything.
  const valuedProjects = projects.filter((project) => parseCurrencyValue(project.estimated_value) > 0);
  const averageDealSize =
    wonProjects.length > 0
      ? Math.round(forecast.closedWonRevenue / wonProjects.length)
      : valuedProjects.length > 0
        ? Math.round(valuedProjects.reduce((sum, project) => sum + parseCurrencyValue(project.estimated_value), 0) / valuedProjects.length)
        : 0;

  return {
    totalPipelineValue: forecast.currentPipelineValue,
    weightedPipelineValue: forecast.weightedForecast,
    activeProjects: activeProjects.length,
    openContracts: openContracts.length,
    closedWonValue: forecast.closedWonRevenue,
    closedLostValue: forecast.closedLostValue,
    averageDealSize,
    winRate,
    averageResponseTimeHours: computeAverageResponseTimeHours(inquiries),
    dealsAwaitingDocuments: openInquiries.filter((inquiry) => getMissingDocumentCount(inquiry) > 0).length,
    highPriorityOpportunities: openInquiries.filter((inquiry) => isHighPriority(inquiry)).length,
    dealsReadyForIntroduction: openInquiries.filter((inquiry) => getReadinessScore(inquiry) >= 90).length,
  };
};

// ─── Pipeline intelligence ─────────────────────────────────────────────────

export type PipelineStageMetric = {
  stage: string;
  count: number;
  value: number;
  weightedValue: number;
  probability: number;
  // Share of deals that reached this stage (or later) relative to the prior
  // stage, computed from the current snapshot. Not a true historical cohort
  // conversion rate — this app doesn't yet log stage-transition history
  // (only current stage + updated_at) — so this approximates funnel fill
  // from a point-in-time view. null for the first stage (no prior stage)
  // and for closed_lost (a terminal branch, not a forward funnel step).
  conversionRate: number | null;
};

export type StalledDeal = {
  projectId: string;
  name: string;
  stage: string;
  daysSinceActivity: number;
  value: number;
  href: string;
};

export type PipelineIntelligence = {
  stages: PipelineStageMetric[];
  stalledDeals: StalledDeal[];
};

const FORWARD_FUNNEL = ["prospecting", "qualification", "negotiation", "contracting", "closed_won"];

export const computePipelineIntelligence = (
  projects: ProjectRecord[],
  options: { stalledThresholdDays?: number; now?: Date } = {},
): PipelineIntelligence => {
  const now = options.now ?? new Date();
  const nowMs = now.getTime();
  const stalledThresholdDays = options.stalledThresholdDays ?? 14;

  const reachedOrLaterCount = (stageIndex: number) =>
    projects.filter((project) => {
      const stage = normalizeProjectStage(project.stage);
      if (stage === "closed_lost") return false;
      return FORWARD_FUNNEL.indexOf(stage) >= stageIndex;
    }).length;

  const stages: PipelineStageMetric[] = projectStageOptions.map((option) => {
    const stageProjects = projects.filter((project) => normalizeProjectStage(project.stage) === option.value);
    const value = stageProjects.reduce((sum, project) => sum + parseCurrencyValue(project.estimated_value), 0);
    const probability = getStageProbability(option.value);

    const funnelIndex = FORWARD_FUNNEL.indexOf(option.value);
    let conversionRate: number | null = null;
    if (funnelIndex > 0) {
      const prior = reachedOrLaterCount(funnelIndex - 1);
      const current = reachedOrLaterCount(funnelIndex);
      conversionRate = prior > 0 ? Math.round((current / prior) * 100) : null;
    }

    return {
      stage: option.value,
      count: stageProjects.length,
      value,
      weightedValue: Math.round(value * (probability / 100)),
      probability,
      conversionRate,
    };
  });

  const stalledDeals: StalledDeal[] = projects
    .filter((project) => isProjectStalled(project, stalledThresholdDays, nowMs))
    .map((project) => ({
      projectId: project.id,
      name: project.name,
      stage: normalizeProjectStage(project.stage),
      daysSinceActivity: daysSince(project.updated_at, nowMs),
      value: parseCurrencyValue(project.estimated_value),
      href: `/admin/projects/${project.id}`,
    }))
    .sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);

  return { stages, stalledDeals };
};

// ─── Broker intelligence ───────────────────────────────────────────────────

export type BrokerMetric = {
  brokerId: string;
  name: string;
  activeDeals: number;
  totalPipelineValue: number;
  weightedPipelineValue: number;
  closedWonCount: number;
  closedWonValue: number;
  closedLostCount: number;
  closedLostValue: number;
  averageResponseTimeHours: number | null;
  followUpCompletionRate: number | null;
  highPriorityWorkload: number;
  dealsAwaitingDocuments: number;
};

export type BrokerIntelligence = {
  ranked: BrokerMetric[];
  // Brokers with zero linked deals — listed, but deliberately not ranked
  // alongside brokers who have real performance data.
  noData: Array<{ brokerId: string; name: string }>;
  unassigned: { activeDeals: number; pipelineValue: number };
};

const matchesBroker = (brokerName: string, assignedBroker?: string | null): boolean =>
  (assignedBroker ?? "").trim().toLowerCase() === brokerName.trim().toLowerCase();

export const computeBrokerIntelligence = (
  brokers: BrokerRecord[],
  projects: ProjectRecord[],
  inquiries: InquiryRecord[],
  reminders: ReminderRecord[],
  options: { now?: Date } = {},
): BrokerIntelligence => {
  const nowMs = (options.now ?? new Date()).getTime();

  const ranked: BrokerMetric[] = [];
  const noData: Array<{ brokerId: string; name: string }> = [];

  for (const broker of brokers) {
    const brokerProjects = projects.filter((project) => project.broker_id === broker.id);
    const brokerInquiries = inquiries.filter((inquiry) => matchesBroker(broker.name, inquiry.assigned_broker));

    if (brokerProjects.length === 0 && brokerInquiries.length === 0) {
      noData.push({ brokerId: broker.id, name: broker.name });
      continue;
    }

    const activeProjects = brokerProjects.filter((project) => !CLOSED_PROJECT_STAGES.has(normalizeProjectStage(project.stage)));
    const wonProjects = brokerProjects.filter((project) => normalizeProjectStage(project.stage) === "closed_won");
    const lostProjects = brokerProjects.filter((project) => normalizeProjectStage(project.stage) === "closed_lost");

    const totalPipelineValue = activeProjects.reduce((sum, project) => sum + parseCurrencyValue(project.estimated_value), 0);
    const weightedPipelineValue = activeProjects.reduce(
      (sum, project) => sum + parseCurrencyValue(project.estimated_value) * (getStageProbability(project.stage) / 100),
      0,
    );

    const projectIds = new Set(brokerProjects.map((project) => project.id));
    const inquiryIds = new Set(brokerInquiries.map((inquiry) => String(inquiry.id)));
    const relevantReminders = reminders.filter(
      (reminder) =>
        (reminder.project_id && projectIds.has(reminder.project_id)) ||
        (reminder.inquiry_id && inquiryIds.has(reminder.inquiry_id)),
    );
    const resolvedReminders = relevantReminders.filter((reminder) => {
      if (reminder.status !== "pending") return true;
      const due = new Date(reminder.due_at).getTime();
      return !Number.isNaN(due) && due < nowMs; // overdue-and-still-pending counts as resolved-unfavorably
    });
    const completedReminders = resolvedReminders.filter((reminder) => reminder.status === "completed");
    const followUpCompletionRate =
      resolvedReminders.length > 0 ? Math.round((completedReminders.length / resolvedReminders.length) * 100) : null;

    const openBrokerInquiries = brokerInquiries.filter((inquiry) => !CLOSED_STATUSES.has(normalizeStatusValue(inquiry.status)));

    ranked.push({
      brokerId: broker.id,
      name: broker.name,
      activeDeals: activeProjects.length,
      totalPipelineValue,
      weightedPipelineValue: Math.round(weightedPipelineValue),
      closedWonCount: wonProjects.length,
      closedWonValue: wonProjects.reduce((sum, project) => sum + parseCurrencyValue(project.estimated_value), 0),
      closedLostCount: lostProjects.length,
      closedLostValue: lostProjects.reduce((sum, project) => sum + parseCurrencyValue(project.estimated_value), 0),
      averageResponseTimeHours: computeAverageResponseTimeHours(brokerInquiries),
      followUpCompletionRate,
      highPriorityWorkload: openBrokerInquiries.filter((inquiry) => isHighPriority(inquiry)).length,
      dealsAwaitingDocuments: openBrokerInquiries.filter((inquiry) => getMissingDocumentCount(inquiry) > 0).length,
    });
  }

  ranked.sort((a, b) => b.totalPipelineValue - a.totalPipelineValue);

  const unassignedActive = projects.filter(
    (project) => !project.broker_id && !CLOSED_PROJECT_STAGES.has(normalizeProjectStage(project.stage)),
  );

  return {
    ranked,
    noData,
    unassigned: {
      activeDeals: unassignedActive.length,
      pipelineValue: unassignedActive.reduce((sum, project) => sum + parseCurrencyValue(project.estimated_value), 0),
    },
  };
};

// ─── Geographic intelligence ───────────────────────────────────────────────

export type CountryProductMetric = { product: string; count: number };

export type CountryMetric = {
  country: string;
  inquiryCount: number;
  pipelineValue: number;
  topProducts: CountryProductMetric[];
  buyerCount: number;
  sellerCount: number;
};

export type GeographicIntelligence = {
  byCountry: CountryMetric[];
  topDestinations: CountryMetric[];
};

const classifyRole = (roleType?: string | null): "buyer" | "seller" | null => {
  const normalized = (roleType ?? "").trim().toLowerCase();
  if (normalized.includes("buy")) return "buyer";
  if (normalized.includes("sell")) return "seller";
  return null;
};

const buildCountryMetrics = (
  inquiries: AnalyticsInquiryRecord[],
  projects: ProjectRecord[],
  companies: CompanyRecord[],
  countryOf: (inquiry: AnalyticsInquiryRecord) => string | null | undefined,
): CountryMetric[] => {
  const byCountry = new Map<string, AnalyticsInquiryRecord[]>();
  for (const inquiry of inquiries) {
    const country = countryOf(inquiry)?.trim();
    if (!country) continue;
    if (!byCountry.has(country)) byCountry.set(country, []);
    byCountry.get(country)!.push(inquiry);
  }

  const companyById = new Map(companies.map((company) => [company.id, company]));
  const pipelineValueByCountry = new Map<string, number>();
  for (const project of projects) {
    const company = project.company_id ? companyById.get(project.company_id) : undefined;
    const country = company?.country?.trim();
    if (!country) continue;
    pipelineValueByCountry.set(country, (pipelineValueByCountry.get(country) ?? 0) + parseCurrencyValue(project.estimated_value));
  }

  const metrics: CountryMetric[] = [];
  for (const [country, countryInquiries] of byCountry.entries()) {
    const productCounts = new Map<string, number>();
    let buyerCount = 0;
    let sellerCount = 0;

    for (const inquiry of countryInquiries) {
      const product = inquiry.product?.trim();
      if (product) productCounts.set(product, (productCounts.get(product) ?? 0) + 1);
      const role = classifyRole(inquiry.role_type);
      if (role === "buyer") buyerCount += 1;
      if (role === "seller") sellerCount += 1;
    }

    const topProducts = [...productCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([product, count]) => ({ product, count }));

    metrics.push({
      country,
      inquiryCount: countryInquiries.length,
      pipelineValue: pipelineValueByCountry.get(country) ?? 0,
      topProducts,
      buyerCount,
      sellerCount,
    });
  }

  return metrics.sort((a, b) => b.inquiryCount - a.inquiryCount);
};

export const computeGeographicIntelligence = (
  inquiries: AnalyticsInquiryRecord[],
  projects: ProjectRecord[],
  companies: CompanyRecord[],
): GeographicIntelligence => {
  return {
    byCountry: buildCountryMetrics(inquiries, projects, companies, (inquiry) => inquiry.country),
    topDestinations: buildCountryMetrics(inquiries, projects, companies, (inquiry) => inquiry.destination_country),
  };
};

// ─── Executive summary ─────────────────────────────────────────────────────

export type ExecutiveSummary = {
  pipelineHealth: { status: "strong" | "steady" | "at_risk"; note: string };
  topRisks: Array<{ alertId: string; note: string }>;
  nearTermOpportunities: Array<{ entityId: string; entityLabel: string; note: string }>;
  documentBottlenecks: { count: number; note: string };
  brokerWorkload: Array<{ brokerId: string; name: string; note: string }>;
  recommendedActions: Array<{ priority: "high" | "medium" | "low"; action: string; relatedEntityId?: string }>;
};

const generateExecutiveSummary = (
  kpis: ExecutiveKpis,
  pipeline: PipelineIntelligence,
  brokerIntelligence: BrokerIntelligence,
  alerts: ExecutiveAlert[],
): ExecutiveSummary => {
  const criticalAndHigh = alerts.filter((alert) => alert.severity === "critical" || alert.severity === "high");
  const stalledShare = kpis.activeProjects > 0 ? pipeline.stalledDeals.length / kpis.activeProjects : 0;

  let status: ExecutiveSummary["pipelineHealth"]["status"] = "steady";
  if (stalledShare > 0.3 || criticalAndHigh.length >= 5) status = "at_risk";
  else if (kpis.winRate >= 50 && stalledShare < 0.15) status = "strong";

  const pipelineHealth = {
    status,
    note:
      status === "at_risk"
        ? `${pipeline.stalledDeals.length} of ${kpis.activeProjects} active projects are stalled and ${criticalAndHigh.length} high-severity alerts are open — the pipeline needs management attention.`
        : status === "strong"
          ? `Win rate is ${kpis.winRate}% with only ${pipeline.stalledDeals.length} stalled deal(s) — the pipeline is moving well.`
          : `Pipeline is steady: ${kpis.activeProjects} active projects, ${pipeline.stalledDeals.length} stalled, ${kpis.winRate}% win rate.`,
  };

  const topRisks = criticalAndHigh
    .slice(0, 5)
    .map((alert) => ({ alertId: alert.id, note: `${alert.reason} (${alert.entityLabel})` }));

  const nearTermOpportunities = alerts
    .filter((alert) => alert.type === "ready_for_introduction")
    .slice(0, 5)
    .map((alert) => ({ entityId: alert.entityId, entityLabel: alert.entityLabel, note: alert.reason }));

  const documentBottlenecks = {
    count: kpis.dealsAwaitingDocuments,
    note:
      kpis.dealsAwaitingDocuments > 0
        ? `${kpis.dealsAwaitingDocuments} open inquiries are missing required documentation.`
        : "No open inquiries are missing documentation.",
  };

  const brokerWorkload = brokerIntelligence.ranked
    .filter((broker) => broker.highPriorityWorkload > 0 || broker.activeDeals > 0)
    .sort((a, b) => b.highPriorityWorkload - a.highPriorityWorkload || b.activeDeals - a.activeDeals)
    .slice(0, 5)
    .map((broker) => ({
      brokerId: broker.brokerId,
      name: broker.name,
      note: `${broker.activeDeals} active deal(s), ${broker.highPriorityWorkload} high-priority.`,
    }));

  const recommendedActions: ExecutiveSummary["recommendedActions"] = [];
  if (pipeline.stalledDeals.length > 0) {
    recommendedActions.push({ priority: "high", action: `Review ${pipeline.stalledDeals.length} stalled project(s) with no recent activity.` });
  }
  const unassignedHighPriorityAlerts = alerts.filter((alert) => alert.type === "high_priority_unassigned");
  if (unassignedHighPriorityAlerts.length > 0) {
    recommendedActions.push({ priority: "high", action: `Assign a broker to ${unassignedHighPriorityAlerts.length} high-priority inquiry(ies) with no broker.` });
  }
  if (kpis.dealsAwaitingDocuments > 0) {
    recommendedActions.push({ priority: "medium", action: `Chase outstanding documents on ${kpis.dealsAwaitingDocuments} inquiry(ies).` });
  }
  if (brokerIntelligence.unassigned.activeDeals > 0) {
    recommendedActions.push({ priority: "medium", action: `${brokerIntelligence.unassigned.activeDeals} active project(s) have no broker assigned.` });
  }
  const expiringContracts = alerts.filter((alert) => alert.type === "contract_expiring");
  if (expiringContracts.length > 0) {
    recommendedActions.push({ priority: "medium", action: `${expiringContracts.length} contract(s) are expiring soon and may need renewal.` });
  }
  if (recommendedActions.length === 0) {
    recommendedActions.push({ priority: "low", action: "No urgent management actions — pipeline is in a healthy state." });
  }

  return { pipelineHealth, topRisks, nearTermOpportunities, documentBottlenecks, brokerWorkload, recommendedActions };
};

// ─── Aggregator (the single service-layer entry point) ────────────────────

export type ExecutiveIntelligenceReport = {
  generatedAt: string;
  kpis: ExecutiveKpis;
  pipeline: PipelineIntelligence;
  forecast: RevenueForecast;
  brokerMetrics: BrokerIntelligence;
  geographicMetrics: GeographicIntelligence;
  executiveAlerts: ExecutiveAlert[];
  summary: ExecutiveSummary;
};

export const computeExecutiveIntelligence = (input: {
  inquiries: AnalyticsInquiryRecord[];
  brokers: BrokerRecord[];
  companies: CompanyRecord[];
  projects: ProjectRecord[];
  contracts: ContractRecord[];
  reminders: ReminderRecord[];
  now?: Date;
  stalledThresholdDays?: number;
}): ExecutiveIntelligenceReport => {
  const now = input.now ?? new Date();
  const stalledThresholdDays = input.stalledThresholdDays ?? 14;

  const forecast = computeRevenueForecast(input.projects, now);
  const kpis = computeExecutiveKpis(input.inquiries, input.projects, input.contracts, forecast);
  const pipeline = computePipelineIntelligence(input.projects, { stalledThresholdDays, now });
  const brokerMetrics = computeBrokerIntelligence(input.brokers, input.projects, input.inquiries, input.reminders, { now });
  const geographicMetrics = computeGeographicIntelligence(input.inquiries, input.projects, input.companies);
  const executiveAlerts = generateExecutiveAlerts({
    inquiries: input.inquiries,
    projects: input.projects,
    contracts: input.contracts,
    stalledDeals: pipeline.stalledDeals,
    now,
  });
  const summary = generateExecutiveSummary(kpis, pipeline, brokerMetrics, executiveAlerts);

  return {
    generatedAt: now.toISOString(),
    kpis,
    pipeline,
    forecast,
    brokerMetrics,
    geographicMetrics,
    executiveAlerts,
    summary,
  };
};
