import type { InquiryRecord } from "@/lib/inquiry-helpers";
import { normalizeStatusValue, statusOptions, parseCurrencyValue } from "@/lib/inquiry-helpers";
import { projectStageOptions, normalizeProjectStage } from "@/lib/project-helpers";
import { CLOSED_CONTRACT_STATUSES } from "@/lib/contract-helpers";
import type { ProjectRecord, BrokerRecord, CompanyRecord, ContractRecord } from "@/lib/supabase-server";

export type FunnelStage = { value: string; label: string; count: number; value_total: number; percent: number };

export const computePipelineFunnel = (projects: ProjectRecord[]): FunnelStage[] => {
  const total = projects.length || 1;
  return projectStageOptions.map((option) => {
    const stageProjects = projects.filter((project) => normalizeProjectStage(project.stage) === option.value);
    const value_total = stageProjects.reduce((sum, project) => sum + parseCurrencyValue(project.estimated_value), 0);
    return {
      value: option.value,
      label: option.label,
      count: stageProjects.length,
      value_total,
      percent: Math.round((stageProjects.length / total) * 100),
    };
  });
};

export const computeConversionMetrics = (projects: ProjectRecord[]) => {
  const won = projects.filter((project) => normalizeProjectStage(project.stage) === "closed_won").length;
  const lost = projects.filter((project) => normalizeProjectStage(project.stage) === "closed_lost").length;
  const closed = won + lost;
  const winRate = closed > 0 ? Math.round((won / closed) * 100) : 0;
  return { won, lost, closed, winRate };
};

export type BrokerLeaderboardRow = {
  id: string;
  name: string;
  activeDeals: number;
  wonDeals: number;
  lostDeals: number;
  winRate: number;
  pipelineValue: number;
};

export const computeBrokerLeaderboard = (projects: ProjectRecord[], brokers: BrokerRecord[]): BrokerLeaderboardRow[] => {
  return brokers
    .map((broker) => {
      const brokerProjects = projects.filter((project) => project.broker_id === broker.id);
      const wonDeals = brokerProjects.filter((project) => normalizeProjectStage(project.stage) === "closed_won").length;
      const lostDeals = brokerProjects.filter((project) => normalizeProjectStage(project.stage) === "closed_lost").length;
      const activeDeals = brokerProjects.length - wonDeals - lostDeals;
      const closed = wonDeals + lostDeals;
      const pipelineValue = brokerProjects.reduce((sum, project) => sum + parseCurrencyValue(project.estimated_value), 0);
      return {
        id: broker.id,
        name: broker.name,
        activeDeals,
        wonDeals,
        lostDeals,
        winRate: closed > 0 ? Math.round((wonDeals / closed) * 100) : 0,
        pipelineValue,
      };
    })
    .sort((a, b) => b.pipelineValue - a.pipelineValue);
};

export type CompanyLeaderboardRow = {
  id: string;
  name: string;
  projectCount: number;
  activeContractValue: number;
};

export const computeCompanyLeaderboard = (
  companies: CompanyRecord[],
  projects: ProjectRecord[],
  contracts: ContractRecord[],
): CompanyLeaderboardRow[] => {
  return companies
    .map((company) => {
      const companyProjects = projects.filter((project) => project.company_id === company.id);
      const companyContracts = contracts.filter((contract) => contract.company_id === company.id);
      const activeContractValue = companyContracts
        .filter((contract) => !CLOSED_CONTRACT_STATUSES.has(contract.status))
        .reduce((sum, contract) => sum + parseCurrencyValue(contract.contract_value), 0);
      return {
        id: company.id,
        name: company.name,
        projectCount: companyProjects.length,
        activeContractValue,
      };
    })
    .sort((a, b) => b.activeContractValue - a.activeContractValue);
};

export type StatusBreakdownRow = { value: string; label: string; count: number; percent: number };

export const computeInquiryStatusBreakdown = (inquiries: InquiryRecord[]): StatusBreakdownRow[] => {
  const total = inquiries.length || 1;
  return statusOptions.map((option) => {
    const count = inquiries.filter((inquiry) => normalizeStatusValue(inquiry.status) === option.value).length;
    return { value: option.value, label: option.label, count, percent: Math.round((count / total) * 100) };
  });
};

export type MonthlyTrendPoint = { key: string; label: string; count: number };

export const computeMonthlyInquiryTrend = (inquiries: InquiryRecord[], now: Date, months = 6): MonthlyTrendPoint[] => {
  const buckets: MonthlyTrendPoint[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const bucketDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${bucketDate.getFullYear()}-${String(bucketDate.getMonth() + 1).padStart(2, "0")}`;
    const label = bucketDate.toLocaleDateString("en", { month: "short", year: "2-digit" });
    buckets.push({ key, label, count: 0 });
  }

  const bucketByKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const inquiry of inquiries) {
    if (!inquiry.created_at) continue;
    const created = new Date(inquiry.created_at);
    if (Number.isNaN(created.getTime())) continue;
    const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
    const bucket = bucketByKey.get(key);
    if (bucket) bucket.count += 1;
  }

  return buckets;
};
