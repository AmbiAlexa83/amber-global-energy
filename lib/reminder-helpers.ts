export const reminderStatusOptions = [
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "dismissed", label: "Dismissed" },
];

export const reminderStatusStyles: Record<string, string> = {
  pending: "border-[#C8A24D]/35 bg-[#C8A24D]/12 text-[#F0D38A]",
  completed: "border-emerald-400/35 bg-emerald-400/12 text-emerald-200",
  dismissed: "border-slate-400/35 bg-slate-400/12 text-slate-300",
};

export const formatReminderStatusLabel = (value?: string | null) => {
  const normalized = (value ?? "pending").trim().toLowerCase();
  return reminderStatusOptions.find((option) => option.value === normalized)?.label ?? "Pending";
};

export const isReminderOverdue = (dueAt: string, status: string) => {
  if (status !== "pending") return false;
  const due = new Date(dueAt).getTime();
  return !Number.isNaN(due) && due < Date.now();
};

export const toDateKey = (value: string | Date) => {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
