// Pure, UI-independent revenue forecasting for the project pipeline.
// No formatting, no JSX, no framework imports — safe to reuse from a REST
// endpoint, a scheduled job, or a future AI service without modification.

import { parseCurrencyValue } from "@/lib/inquiry-helpers";
import { projectStageOptions, normalizeProjectStage, CLOSED_PROJECT_STAGES } from "@/lib/project-helpers";
import type { ProjectRecord } from "@/lib/supabase-server";

// Centralized, easy-to-modify probability-of-close per pipeline stage.
// Adjust these percentages as the desk's historical close rates become
// clearer — every forecast figure in this module derives from this table.
export const STAGE_PROBABILITIES: Record<string, number> = {
  prospecting: 10,
  qualification: 25,
  negotiation: 50,
  contracting: 75,
  closed_won: 100,
  closed_lost: 0,
};

// Stages counted toward the "commit" forecast — high-confidence, late-stage
// deals a desk would responsibly commit to in a revenue plan.
export const COMMIT_STAGES = new Set(["contracting", "closed_won"]);

export const getStageProbability = (stage?: string | null): number => {
  const normalized = normalizeProjectStage(stage);
  return STAGE_PROBABILITIES[normalized] ?? 0;
};

export type StageForecast = {
  stage: string;
  count: number;
  value: number;
  probability: number;
  weightedValue: number;
};

export type RevenueForecast = {
  currentPipelineValue: number;
  weightedForecast: number;
  bestCase: number;
  commitForecast: number;
  closedWonRevenue: number;
  closedLostValue: number;
  next30: number;
  next60: number;
  next90: number;
  byStage: StageForecast[];
};

const sumValue = (projects: ProjectRecord[]): number =>
  projects.reduce((sum, project) => sum + parseCurrencyValue(project.estimated_value), 0);

const weightedSumValue = (projects: ProjectRecord[]): number =>
  projects.reduce((sum, project) => sum + parseCurrencyValue(project.estimated_value) * (getStageProbability(project.stage) / 100), 0);

const isWithinDays = (dateStr: string | null | undefined, days: number, nowMs: number): boolean => {
  if (!dateStr) return false;
  const target = new Date(dateStr).getTime();
  if (Number.isNaN(target)) return false;
  const diffDays = (target - nowMs) / 86400000;
  return diffDays >= 0 && diffDays <= days;
};

// Expected close value for a rolling window: the weighted (probability-adjusted)
// value of open deals whose expected_close_date falls within the window. Deals
// with no expected_close_date are excluded (they cannot be forecast to a date).
const expectedCloseWithinDays = (openProjects: ProjectRecord[], days: number, nowMs: number): number =>
  weightedSumValue(openProjects.filter((project) => isWithinDays(project.expected_close_date, days, nowMs)));

export const computeRevenueForecast = (projects: ProjectRecord[], now: Date = new Date()): RevenueForecast => {
  const nowMs = now.getTime();

  const openProjects = projects.filter((project) => !CLOSED_PROJECT_STAGES.has(normalizeProjectStage(project.stage)));
  const wonProjects = projects.filter((project) => normalizeProjectStage(project.stage) === "closed_won");
  const lostProjects = projects.filter((project) => normalizeProjectStage(project.stage) === "closed_lost");

  const currentPipelineValue = sumValue(openProjects);
  const weightedForecast = weightedSumValue(openProjects);
  // Best case: every open deal closes at full value — the optimistic ceiling.
  const bestCase = currentPipelineValue;
  const commitForecast = sumValue(openProjects.filter((project) => COMMIT_STAGES.has(normalizeProjectStage(project.stage))));
  const closedWonRevenue = sumValue(wonProjects);
  const closedLostValue = sumValue(lostProjects);

  const byStage: StageForecast[] = projectStageOptions.map((option) => {
    const stageProjects = projects.filter((project) => normalizeProjectStage(project.stage) === option.value);
    const value = sumValue(stageProjects);
    const probability = getStageProbability(option.value);
    return {
      stage: option.value,
      count: stageProjects.length,
      value,
      probability,
      weightedValue: Math.round(value * (probability / 100)),
    };
  });

  return {
    currentPipelineValue,
    weightedForecast: Math.round(weightedForecast),
    bestCase,
    commitForecast,
    closedWonRevenue,
    closedLostValue,
    next30: Math.round(expectedCloseWithinDays(openProjects, 30, nowMs)),
    next60: Math.round(expectedCloseWithinDays(openProjects, 60, nowMs)),
    next90: Math.round(expectedCloseWithinDays(openProjects, 90, nowMs)),
    byStage,
  };
};
