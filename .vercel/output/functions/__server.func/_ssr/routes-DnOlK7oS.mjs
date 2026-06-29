import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { F as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as isPasswordRecoveryPending, n as getPasswordRecoveryRedirectUrl } from "./password-recovery-Cu2AAm3X.mjs";
import { t as RoutePending } from "./route-pending-DpX2qEjT.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DnOlK7oS.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function HomePage() {
	const navigate = useNavigate();
	(0, import_react.useEffect)(() => {
		let active = true;
		(async () => {
			const recoveryRedirect = getPasswordRecoveryRedirectUrl();
			if (recoveryRedirect) {
				window.location.replace(recoveryRedirect);
				return;
			}
			const { supabase } = await import("./client-G-x0iJHV.mjs").then((n) => n.t).then((n) => n.t);
			const { data } = await supabase.auth.getSession();
			if (!active) return;
			const user = data.session?.user;
			if (user && isPasswordRecoveryPending() && window.location.pathname !== "/reset-password") {
				window.location.replace("/reset-password");
				return;
			}
			if (!user) {
				navigate({
					to: "/auth",
					replace: true
				});
				return;
			}
			const cacheKey = `bi_portal_role:${user.id}`;
			let role = null;
			try {
				role = sessionStorage.getItem(cacheKey);
			} catch {}
			if (!role) {
				const { data: fetched, error } = await supabase.rpc("get_user_portal", { _user_id: user.id });
				if (!active) return;
				if (error) {
					console.error("[home] get_user_portal failed:", error);
					navigate({
						to: "/auth",
						replace: true
					});
					return;
				}
				role = fetched ?? null;
				if (role) try {
					sessionStorage.setItem(cacheKey, role);
				} catch {}
			}
			if (!active) return;
			if (role === "admin") navigate({
				to: "/admin",
				replace: true
			});
			else if (role === "provider") navigate({
				to: "/dashboard",
				replace: true
			});
			else {
				await supabase.auth.signOut();
				navigate({
					to: "/auth",
					replace: true
				});
			}
		})();
		return () => {
			active = false;
		};
	}, [navigate]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RoutePending, {});
}
//#endregion
export { HomePage as component };
