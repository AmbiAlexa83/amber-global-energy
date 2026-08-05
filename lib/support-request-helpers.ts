export const supportCategoryOptions = [
  { value: "technical_problem", label: "Technical Problem" },
  { value: "brokerage_inquiry", label: "Brokerage Inquiry" },
  { value: "account_question", label: "Account Question" },
  { value: "suggestion", label: "Suggestion" },
  { value: "general_feedback", label: "General Feedback" },
  { value: "report_bug", label: "Report Bug" },
];

export const supportPriorityOptions = [
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const supportStatusOptions = [
  { value: "new", label: "New" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_for_client", label: "Waiting for Client" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export const CLOSED_SUPPORT_STATUSES = new Set(["resolved", "closed"]);

export const supportPriorityStyles: Record<string, string> = {
  normal: "border-slate-400/35 bg-slate-400/12 text-slate-300",
  high: "border-[#C8A24D]/35 bg-[#C8A24D]/12 text-[#F0D38A]",
  urgent: "border-rose-400/35 bg-rose-400/12 text-rose-200",
};

export const supportStatusStyles: Record<string, string> = {
  new: "border-sky-400/35 bg-sky-400/12 text-sky-200",
  open: "border-[#C8A24D]/35 bg-[#C8A24D]/12 text-[#F0D38A]",
  in_progress: "border-[#C8A24D]/35 bg-[#C8A24D]/12 text-[#F0D38A]",
  waiting_for_client: "border-slate-400/35 bg-slate-400/12 text-slate-300",
  resolved: "border-emerald-400/35 bg-emerald-400/12 text-emerald-200",
  closed: "border-slate-400/35 bg-slate-400/12 text-slate-300",
};

export const formatSupportCategoryLabel = (value?: string | null) =>
  supportCategoryOptions.find((option) => option.value === value)?.label ?? "General Feedback";

export const formatSupportPriorityLabel = (value?: string | null) => {
  const normalized = (value ?? "normal").trim().toLowerCase();
  return supportPriorityOptions.find((option) => option.value === normalized)?.label ?? "Normal";
};

export const formatSupportStatusLabel = (value?: string | null) => {
  const normalized = (value ?? "new").trim().toLowerCase();
  return supportStatusOptions.find((option) => option.value === normalized)?.label ?? "New";
};

// ─── Notification delivery (Phase 5.2, Stage 5.2.3) ──────────────────────

export const notificationDeliveryOptions = [
  { value: "pending", label: "Pending" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
  { value: "skipped", label: "Skipped" },
];

export const notificationDeliveryStyles: Record<string, string> = {
  pending: "border-sky-400/35 bg-sky-400/12 text-sky-200",
  sent: "border-emerald-400/35 bg-emerald-400/12 text-emerald-200",
  failed: "border-rose-400/35 bg-rose-400/12 text-rose-200",
  skipped: "border-slate-400/35 bg-slate-400/12 text-slate-300",
};

export const formatNotificationDeliveryLabel = (value?: string | null) => {
  const normalized = (value ?? "pending").trim().toLowerCase();
  return notificationDeliveryOptions.find((option) => option.value === normalized)?.label ?? "Pending";
};
