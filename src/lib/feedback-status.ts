export const FEEDBACK_STATUSES = [
  "open",
  "in_progress",
  "needs_info",
  "awaiting_confirmation",
  "resolved",
  "closed",
] as const;

export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  open: "New",
  in_progress: "In progress",
  needs_info: "Needs patient reply",
  awaiting_confirmation: "Solution sent",
  resolved: "Resolved",
  closed: "Closed",
};

/** Statuses an admin can set. Resolved happens when the patient confirms, or after 3 days. */
export const ADMIN_SETTABLE_STATUSES: FeedbackStatus[] = [
  "in_progress",
  "needs_info",
  "awaiting_confirmation",
  "closed",
];

export const FEEDBACK_AUTO_RESOLVE_DAYS = 3;

export function isFeedbackStatus(value: string): value is FeedbackStatus {
  return (FEEDBACK_STATUSES as readonly string[]).includes(value);
}

export function feedbackStatusLabel(status: string): string {
  return isFeedbackStatus(status) ? FEEDBACK_STATUS_LABELS[status] : status;
}

export function feedbackStatusTone(status: string): string {
  switch (status) {
    case "open":
      return "bg-[#F8EDE8] text-[#3B4759]";
    case "in_progress":
      return "bg-[#E8EEED] text-[#3B4759]";
    case "needs_info":
      return "bg-[#F8FBFA] text-[#6A9B9C] border border-[#D5DEDD]";
    case "awaiting_confirmation":
      return "bg-[#E3E084]/60 text-[#3B4759]";
    case "resolved":
      return "bg-[#E8F4F0] text-[#3B4759]";
    case "closed":
      return "bg-[#F2F7F6] text-[#6A9B9C]";
    default:
      return "bg-[#F2F7F6] text-[#3B4759]";
  }
}

export function adminStatusOptions(current: FeedbackStatus): FeedbackStatus[] {
  if (current === "open") return ["open", ...ADMIN_SETTABLE_STATUSES];
  if (current === "resolved") return ["resolved", "in_progress", "closed"];
  const options: FeedbackStatus[] = [...ADMIN_SETTABLE_STATUSES];
  if (!options.includes(current)) options.unshift(current);
  return options;
}

export function isStaleAwaitingConfirmation(updatedAt: string, now = Date.now()): boolean {
  const then = new Date(updatedAt).getTime();
  if (Number.isNaN(then)) return false;
  return now - then >= FEEDBACK_AUTO_RESOLVE_DAYS * 24 * 60 * 60 * 1000;
}
