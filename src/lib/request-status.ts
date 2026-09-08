// Shared labels + ordering for medication-order (request) statuses, used by the admin/provider
// review panel and the request list. The patient tracking timeline (patient portal) mirrors this.

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  payment_completed: "Payment received",
  provider_assigned: "Practitioner assigned",
  pending_review: "Under review",
  awaiting_additional_payment: "Additional payment required",
  approved: "Ready to prescribe",
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

/** Practitioner-facing labels: no payment / price / refund wording. */
const CLINICAL_STATUS_LABELS: Record<string, string> = {
  payment_completed: "New order",
  awaiting_additional_payment: "Waiting on patient",
};

export function clinicalStatusLabel(status: string): string {
  return CLINICAL_STATUS_LABELS[status] ?? requestStatusLabel(status);
}

/** Strip dollar amounts and billing phrases from timeline notes shown to practitioners. */
export function clinicalEventNote(note: string | null | undefined): string | null {
  if (!note) return null;
  const cleaned = note
    .replace(/;\s*additional\s+\$[\d,.]+ due\.?/gi, ".")
    .replace(/;\s*\$[\d,.]+ credited next cycle\.?/gi, ".")
    .replace(/Additional payment received\.?/gi, "Patient confirmed the plan change.")
    .replace(/\$[\d,.]+/g, "")
    .replace(/price difference[^.]*\.?/gi, "")
    .replace(/\s+/g, " ")
    .replace(/\s+\./g, ".")
    .trim();
  return cleaned || null;
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
  progress: "bg-[#D5DEDD] text-[#3B4759] hover:bg-[#D5DEDD]",
  success: "bg-[#6A9B9C] text-white hover:bg-[#6A9B9C]",
  danger: "bg-[#F6E4DA] text-[#8F4A33] hover:bg-[#F6E4DA]",
  muted: "bg-[#E8EEED] text-[#3B4759]/70 hover:bg-[#E8EEED]",
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
