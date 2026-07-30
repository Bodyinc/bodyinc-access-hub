import { capitalizeMessage } from "@/lib/text-normalize";

const FALLBACK = "Something went wrong. Please try again.";

/** Normalize any thrown value into a capitalized, sentence-ended toast message. */
export function toastError(error: unknown, fallback = FALLBACK): string {
  const raw =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const message = capitalizeMessage(raw, fallback);
  return /[.!?…]$/.test(message) ? message : `${message}.`;
}
