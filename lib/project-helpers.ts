export const projectStageOptions = [
  { value: "prospecting", label: "Prospecting" },
  { value: "qualification", label: "Qualification" },
  { value: "negotiation", label: "Negotiation" },
  { value: "contracting", label: "Contracting" },
  { value: "closed_won", label: "Closed Won" },
  { value: "closed_lost", label: "Closed Lost" },
];

export const CLOSED_PROJECT_STAGES = new Set(["closed_won", "closed_lost"]);

export const projectStageStyles: Record<string, string> = {
  prospecting: "border-[#C8A24D]/35 bg-[#C8A24D]/12 text-[#F0D38A]",
  qualification: "border-sky-400/35 bg-sky-400/12 text-sky-200",
  negotiation: "border-violet-400/35 bg-violet-400/12 text-violet-200",
  contracting: "border-amber-400/35 bg-amber-400/12 text-amber-200",
  closed_won: "border-emerald-400/35 bg-emerald-400/12 text-emerald-200",
  closed_lost: "border-slate-400/35 bg-slate-400/12 text-slate-200",
};

export const normalizeProjectStage = (value?: string | null) => {
  const normalized = (value ?? "prospecting").trim().toLowerCase();
  return projectStageOptions.some((option) => option.value === normalized) ? normalized : "prospecting";
};

export const formatProjectStageLabel = (value?: string | null) => {
  const normalized = normalizeProjectStage(value);
  return projectStageOptions.find((option) => option.value === normalized)?.label ?? "Prospecting";
};
