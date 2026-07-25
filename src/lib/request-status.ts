// Shared labels + ordering for medication-order (request) statuses, used by the admin/provider
// review panel and the request list. The patient tracking timeline (patient portal) mirrors this.

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  payment_completed: "Payment received",
  provider_assigned: "Practitioner assigned",
  pending_review: "Under review",
  awaiting_additional_payment: "Additional payment required",
  approved: "Approved",
  prescribed: "Prescription generated",
  sent_to_pharmacy: "Sent to pharmacy",
  dispatched: "Dispatched",
  delivered: "Delivered",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export function requestStatusLabel(status: string): string {
  return REQUEST_STATUS_LABELS[status] ?? status;
}

type Tone = "attention" | "progress" | "success" | "danger" | "muted";

export function requestStatusTone(status: string): Tone {
  switch (status) {
    case "pending_review":
    case "awaiting_additional_payment":
      return "attention";
    case "approved":
    case "prescribed":
    case "sent_to_pharmacy":
    case "dispatched":
      return "progress";
    case "delivered":
      return "success";
    case "rejected":
    case "cancelled":
      return "danger";
    default:
      return "muted";
  }
}

export const REQUEST_STATUS_BADGE: Record<Tone, string> = {
  attention: "bg-[#FFF4E5] text-[#B45309] hover:bg-[#FFF4E5]",
  progress: "bg-[#EAE6FA] text-[#2E00AB] hover:bg-[#EAE6FA]",
  success: "bg-[#2E00AB] text-white hover:bg-[#2E00AB]",
  danger: "bg-[#FDE7EC] text-[#C1123B] hover:bg-[#FDE7EC]",
  muted: "bg-[#F1EEFB] text-[#2E00AB]/70 hover:bg-[#F1EEFB]",
};

// The manual fulfillment step an order can advance to next (after prescription), and its label.
export function nextFulfillmentStep(
  status: string,
): { status: "sent_to_pharmacy" | "dispatched" | "delivered"; label: string } | null {
  switch (status) {
    case "prescribed":
      return { status: "sent_to_pharmacy", label: "Mark sent to pharmacy" };
    case "sent_to_pharmacy":
      return { status: "dispatched", label: "Mark dispatched" };
    case "dispatched":
      return { status: "delivered", label: "Mark delivered" };
    default:
      return null;
  }
}
