//#region node_modules/.nitro/vite/services/ssr/assets/password-recovery-Cu2AAm3X.js
var PENDING_KEY = "bi_pending_password_reset";
function markPasswordRecoveryPending() {
	try {
		sessionStorage.setItem(PENDING_KEY, "1");
	} catch {}
}
function clearPasswordRecoveryPending() {
	try {
		sessionStorage.removeItem(PENDING_KEY);
	} catch {}
}
function isPasswordRecoveryPending() {
	try {
		return sessionStorage.getItem(PENDING_KEY) === "1";
	} catch {
		return false;
	}
}
/** True when the current URL carries password-recovery auth params. */
function isPasswordRecoveryUrl(href = typeof window !== "undefined" ? window.location.href : "") {
	if (!href) return false;
	const url = new URL(href);
	if (url.pathname === "/reset-password") return false;
	if (url.searchParams.get("type") === "recovery") return true;
	if (url.searchParams.has("token_hash") && url.searchParams.get("type") === "recovery") return true;
	if (url.hash.includes("type=recovery")) return true;
	if (url.searchParams.has("code") && isPasswordRecoveryPending()) return true;
	return false;
}
function buildPasswordRecoveryUrl(fromHref = window.location.href) {
	const from = new URL(fromHref);
	const target = new URL("/reset-password", from.origin);
	from.searchParams.forEach((value, key) => target.searchParams.set(key, value));
	target.hash = from.hash;
	return `${target.pathname}${target.search}${target.hash}`;
}
/** Redirect target when recovery auth landed on the wrong route, or null if already correct. */
function getPasswordRecoveryRedirectUrl(href = typeof window !== "undefined" ? window.location.href : "") {
	if (!href) return null;
	if (new URL(href).pathname === "/reset-password") return null;
	if (isPasswordRecoveryUrl(href)) return buildPasswordRecoveryUrl(href);
	return null;
}
/** Block route navigation while a hard redirect to /reset-password is in progress. */
async function haltForPasswordRecoveryRedirect() {
	await new Promise(() => {});
}
//#endregion
export { markPasswordRecoveryPending as a, isPasswordRecoveryPending as i, getPasswordRecoveryRedirectUrl as n, haltForPasswordRecoveryRedirect as r, clearPasswordRecoveryPending as t };
