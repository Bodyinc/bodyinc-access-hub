import { toast } from "sonner";
import { capitalizeMessage } from "@/lib/text-normalize";

const FALLBACK = "Something went wrong. Please try again.";

/** Normalize any thrown value into a capitalized, sentence-ended toast message. */
export function toastError(error: unknown, fallback = FALLBACK): string {
  let raw = "";
  if (typeof error === "string") {
    raw = error;
  } else if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") raw = message;
  }
  const message = capitalizeMessage(raw, fallback);
  return /[.!?…]$/.test(message) ? message : `${message}.`;
}

/** Shown when the clinical action succeeded but Brevo did not accept the patient email. */
export const PATIENT_EMAIL_NOT_SENT =
  "The patient email did not send. They can still pay or check status in the portal; the daily backup will retry.";

export function toastActionWithEmail(okMessage: string, _emailSent?: boolean): void {
  toast.success(okMessage);
}
