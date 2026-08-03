// Shared display formatters. These used to be copy-pasted (with subtle drift) into a
// dozen admin/practitioner screens; keep new call sites pointed here so money and dates
// render identically across the product.

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** Format a dollar amount. Nullish is treated as zero. */
export function formatDollars(value: number | string | null | undefined): string {
  return usd.format(Number(value ?? 0));
}

/** Format a dollar amount, rendering an em dash when there is no value at all. */
export function formatDollarsOrDash(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return usd.format(Number(value));
}

/** Format an integer cent amount (Stripe-style) as dollars. */
export function formatCents(cents: number | null | undefined): string {
  return usd.format(Number(cents ?? 0) / 100);
}

/** "12 Mar 2026" style — calendar date only. */
export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** "12 Mar 2026, 09:41" style — compact date and time. */
export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Locale-default full date and time, including seconds. */
export function formatDateTimeFull(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

/** Whole years between a date of birth and today. */

/**
 * Human-facing record ID label: "#BI-9A3F" (first 4 chars of the UUID, uppercased).
 * Display-only — full IDs remain in URLs and API calls.
 */
export function formatRecordId(id?: string | null): string {
  if (!id) return "—";
  return `#BI-${String(id).slice(0, 4).toUpperCase()}`;
}

/** Strip a "#BI-"/"BI-"/"#" prefix so users can paste a displayed ID into search. */
export function normalizeIdSearch(value: string): string {
  return value.trim().replace(/^#/, "").replace(/^BI-/i, "");
}

export function ageFromDob(dob: unknown): number | null {
  if (!dob) return null;
  const d = new Date(String(dob));
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

/** BMI to one decimal, or null when height/weight are missing. */
export function bmiFrom(heightCm: unknown, weightKg: unknown): number | null {
  const h = Number(heightCm ?? 0);
  const w = Number(weightKg ?? 0);
  if (!h || !w) return null;
  return Number((w / ((h / 100) * (h / 100))).toFixed(1));
}
