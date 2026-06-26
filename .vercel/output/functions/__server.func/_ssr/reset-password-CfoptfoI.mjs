import { i as __toESM } from "../_runtime.mjs";
import { n as supabase } from "./client-G-x0iJHV.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-BkEeRci-.mjs";
import { t as Input } from "./input-B8Q2ztVi.mjs";
import { F as useNavigate, I as useRouter, g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CtX3ithx.mjs";
import { c as stringType, s as objectType } from "../_libs/zod.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { t as clearPasswordRecoveryPending } from "./password-recovery-Cu2AAm3X.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/reset-password-CfoptfoI.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var schema = objectType({
	password: stringType().min(8, "Must be at least 8 characters").max(128),
	confirm: stringType()
}).refine((v) => v.password === v.confirm, {
	message: "Passwords do not match",
	path: ["confirm"]
});
function ResetPasswordPage() {
	const navigate = useNavigate();
	const router = useRouter();
	const [password, setPassword] = (0, import_react.useState)("");
	const [confirm, setConfirm] = (0, import_react.useState)("");
	const [submitting, setSubmitting] = (0, import_react.useState)(false);
	const [ready, setReady] = (0, import_react.useState)(false);
	const [linkError, setLinkError] = (0, import_react.useState)(null);
	const [errors, setErrors] = (0, import_react.useState)({});
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		const { data: sub } = supabase.auth.onAuthStateChange((event) => {
			if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
		});
		(async () => {
			const url = new URL(window.location.href);
			const code = url.searchParams.get("code");
			const tokenHash = url.searchParams.get("token_hash");
			const type = url.searchParams.get("type");
			const errorDesc = url.searchParams.get("error_description") || url.hash.match(/error_description=([^&]+)/)?.[1];
			if (errorDesc) {
				if (!cancelled) setLinkError(decodeURIComponent(errorDesc));
				return;
			}
			if (tokenHash) {
				const { error } = await supabase.auth.verifyOtp({
					type: type || "recovery",
					token_hash: tokenHash
				});
				if (!cancelled) if (error) setLinkError("This reset link is invalid or has expired. Please request a new one.");
				else {
					setReady(true);
					window.history.replaceState({}, "", url.pathname);
				}
				return;
			}
			if (code) {
				const { error } = await supabase.auth.exchangeCodeForSession(code);
				if (!cancelled) if (error) setLinkError("This reset link is invalid or has expired. Please request a new one.");
				else {
					setReady(true);
					window.history.replaceState({}, "", url.pathname);
				}
				return;
			}
			const { data } = await supabase.auth.getSession();
			if (!cancelled) {
				if (data.session) {
					setReady(true);
					if (window.location.hash) window.history.replaceState({}, "", url.pathname);
				} else if (!window.location.hash) setLinkError("This reset link is invalid or has expired. Please request a new one.");
			}
		})();
		return () => {
			cancelled = true;
			sub.subscription.unsubscribe();
		};
	}, []);
	async function onSubmit(e) {
		e.preventDefault();
		setErrors({});
		const parsed = schema.safeParse({
			password,
			confirm
		});
		if (!parsed.success) {
			const errs = {};
			for (const issue of parsed.error.issues) {
				const k = issue.path[0];
				if (!errs[k]) errs[k] = issue.message;
			}
			setErrors(errs);
			return;
		}
		setSubmitting(true);
		try {
			const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
			if (error) {
				toast.error(error.message);
				return;
			}
			clearPasswordRecoveryPending();
			toast.success("Password updated. Signing you in…");
			const { data: { user } } = await supabase.auth.getUser();
			if (user) {
				const { data: role } = await supabase.rpc("get_user_portal", { _user_id: user.id });
				if (role === "admin" || role === "provider") {
					try {
						sessionStorage.setItem(`bi_portal_role:${user.id}`, role);
					} catch {}
					await router.invalidate();
					navigate({
						to: role === "admin" ? "/admin" : "/dashboard",
						replace: true
					});
					return;
				}
			}
			await supabase.auth.signOut();
			toast.error("Your account does not have portal access.");
			navigate({
				to: "/auth",
				replace: true
			});
		} finally {
			setSubmitting(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4 py-12",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "w-full max-w-md",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
				className: "space-y-2 text-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
					className: "text-2xl",
					children: "Set a new password"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: linkError ? linkError : ready ? "Choose a new password for your practitioner account." : "Verifying your reset link…" })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: linkError ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3 text-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/forgot-password",
					className: "inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90",
					children: "Request a new link"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/auth",
					className: "text-sm text-muted-foreground underline-offset-4 hover:underline",
					children: "Back to sign in"
				}) })]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit,
				className: "space-y-4",
				noValidate: true,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "password",
								children: "New password"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "password",
								type: "password",
								autoComplete: "new-password",
								value: password,
								onChange: (e) => setPassword(e.target.value),
								disabled: submitting || !ready,
								required: true
							}),
							errors.password && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-destructive",
								children: errors.password
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "confirm",
								children: "Confirm password"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "confirm",
								type: "password",
								autoComplete: "new-password",
								value: confirm,
								onChange: (e) => setConfirm(e.target.value),
								disabled: submitting || !ready,
								required: true
							}),
							errors.confirm && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-destructive",
								children: errors.confirm
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						className: "w-full",
						disabled: submitting || !ready,
						children: submitting ? "Saving…" : "Save new password"
					})
				]
			}) })]
		})
	});
}
//#endregion
export { ResetPasswordPage as component };
