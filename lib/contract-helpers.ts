export const contractStatusOptions = [
  { value: "draft", label: "Draft" },
  { value: "pending_signature", label: "Pending Signature" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "terminated", label: "Terminated" },
  { value: "expired", label: "Expired" },
];

export const CLOSED_CONTRACT_STATUSES = new Set(["completed", "terminated", "expired"]);

export const contractStatusStyles: Record<string, string> = {
  draft: "border-slate-400/35 bg-slate-400/12 text-slate-300",
  pending_signature: "border-[#C8A24D]/35 bg-[#C8A24D]/12 text-[#F0D38A]",
  active: "border-emerald-400/35 bg-emerald-400/12 text-emerald-200",
  completed: "border-sky-400/35 bg-sky-400/12 text-sky-200",
  terminated: "border-rose-400/35 bg-rose-400/12 text-rose-200",
  expired: "border-slate-400/35 bg-slate-400/12 text-slate-300",
};

export const normalizeContractStatus = (value?: string | null) => {
  const normalized = (value ?? "draft").trim().toLowerCase();
  return contractStatusOptions.some((option) => option.value === normalized) ? normalized : "draft";
};

export const formatContractStatusLabel = (value?: string | null) => {
  const normalized = normalizeContractStatus(value);
  return contractStatusOptions.find((option) => option.value === normalized)?.label ?? "Draft";
};

export const isContractExpiringSoon = (endDate: string | null | undefined, withinDays = 30) => {
  if (!endDate) return false;
  const end = new Date(endDate).getTime();
  if (Number.isNaN(end)) return false;
  const diffDays = (end - Date.now()) / 86400000;
  return diffDays >= 0 && diffDays <= withinDays;
};
