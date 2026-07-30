// Shared text normalization for form input. Applied on submit (never while typing) so the
// caret never jumps, and wired into zod schemas so server functions receive clean values.

/** Trim and collapse runs of whitespace into single spaces. */
export function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

const LOWERCASE_PARTICLES = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "in",
  "nor",
  "of",
  "on",
  "or",
  "the",
  "to",
  "vs",
  "with",
]);

function capitalizeToken(token: string, isFirst: boolean, isLast: boolean): string {
  if (!token) return token;
  // Leave deliberate acronyms and alphanumeric codes (GLP-1, MD, 5mg, B12) untouched.
  if (/\d/.test(token)) return token;
  if (token.length > 1 && token === token.toUpperCase()) return token;

  const lower = token.toLowerCase();
  if (!isFirst && !isLast && LOWERCASE_PARTICLES.has(lower)) return lower;

  // Handle hyphenated and apostrophised names: o'brien -> O'Brien, jean-luc -> Jean-Luc.
  return lower.replace(/(^|[-'’])([a-z\u00C0-\u024F])/g, (_m, sep: string, ch: string) => {
    // Don't upper-case after an apostrophe in possessives/contractions (patient's -> Patient's).
    if ((sep === "'" || sep === "’") && lower.length - lower.indexOf(sep) <= 3) return sep + ch;
    return sep + ch.toUpperCase();
  });
}

/** Title case for names of people, products, categories and plans. */
export function titleCaseName(value: string): string {
  const cleaned = collapseSpaces(value);
  if (!cleaned) return cleaned;
  const parts = cleaned.split(" ");
  return parts
    .map((token, i) => capitalizeToken(token, i === 0, i === parts.length - 1))
    .join(" ");
}

/** Capitalize the first letter of free-form prose, leaving the rest as written. */
export function sentenceCase(value: string): string {
  const cleaned = value.trim().replace(/[ \t]+/g, " ");
  if (!cleaned) return cleaned;
  return cleaned.replace(/^(\p{L})/u, (ch) => ch.toUpperCase());
}

/** Uppercase codes: state codes, promo codes, DEA numbers. */
export function upperTrim(value: string): string {
  return collapseSpaces(value).toUpperCase();
}

/** Lowercase, trimmed email. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** URL-safe lowercase slug. */
export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Capitalize the first letter of a server/error message for display. */
export function capitalizeMessage(value: string | null | undefined, fallback: string): string {
  const cleaned = (value ?? "").trim();
  if (!cleaned) return fallback;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
