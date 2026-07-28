import { readSession, removeSession, writeSession } from "@/lib/safe-storage";

const PENDING_KEY = "bi_pending_password_reset";

export function markPasswordRecoveryPending() {
  writeSession(PENDING_KEY, "1");
}

export function clearPasswordRecoveryPending() {
  removeSession(PENDING_KEY);
}

export function isPasswordRecoveryPending() {
  return readSession(PENDING_KEY) === "1";
}

/** True when the current URL carries password-recovery auth params. */
export function isPasswordRecoveryUrl(
  href = typeof window !== "undefined" ? window.location.href : "",
) {
  if (!href) return false;
  const url = new URL(href);
  if (url.pathname === "/reset-password") return false;
  if (url.searchParams.get("type") === "recovery") return true;
  if (url.searchParams.has("token_hash") && url.searchParams.get("type") === "recovery")
    return true;
  if (url.hash.includes("type=recovery")) return true;
  if (url.searchParams.has("code") && isPasswordRecoveryPending()) return true;
  return false;
}

export function buildPasswordRecoveryUrl(fromHref = window.location.href) {
  const from = new URL(fromHref);
  const target = new URL("/reset-password", from.origin);
  from.searchParams.forEach((value, key) => target.searchParams.set(key, value));
  target.hash = from.hash;
  return `${target.pathname}${target.search}${target.hash}`;
}

/** Redirect target when recovery auth landed on the wrong route, or null if already correct. */
export function getPasswordRecoveryRedirectUrl(
  href = typeof window !== "undefined" ? window.location.href : "",
) {
  if (!href) return null;
  const url = new URL(href);
  if (url.pathname === "/reset-password") return null;
  if (isPasswordRecoveryUrl(href)) return buildPasswordRecoveryUrl(href);
  return null;
}

/** Block route navigation while a hard redirect to /reset-password is in progress. */
export async function haltForPasswordRecoveryRedirect() {
  await new Promise<void>(() => {});
}
