import { i as __toESM } from "../_runtime.mjs";
import { n as supabase } from "./client-G-x0iJHV.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-BkEeRci-.mjs";
import { t as Input } from "./input-B8Q2ztVi.mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CtX3ithx.mjs";
import { c as stringType, s as objectType } from "../_libs/zod.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { a as markPasswordRecoveryPending } from "./password-recovery-Cu2AAm3X.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/forgot-password-BXje6tgm.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var schema = objectType({ email: stringType().trim().email().max(255) });
function ForgotPasswordPage() {
	const [email, setEmail] = (0, import_react.useState)("");
	const [submitting, setSubmitting] = (0, import_react.useState)(false);
	const [sent, setSent] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	async function onSubmit(e) {
		e.preventDefault();
		setError(null);
		const parsed = schema.safeParse({ email });
		if (!parsed.success) {
			setError("Enter a valid email.");
			return;
		}
		setSubmitting(true);
		try {
			const { error: err } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${window.location.origin}/reset-password` });
			if (err) {
				toast.error(err.message);
				return;
			}
			markPasswordRecoveryPending();
			setSent(true);
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
					children: "Forgot your password?"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Enter your email and we'll send you a reset link." })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: sent ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-4 text-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted-foreground",
					children: [
						"If an account exists for ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: email }),
						", a reset link is on its way."
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/auth",
					className: "text-sm underline-offset-4 hover:underline",
					children: "Back to sign in"
				})]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit,
				className: "space-y-4",
				noValidate: true,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "email",
								children: "Email"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "email",
								type: "email",
								autoComplete: "email",
								value: email,
								onChange: (e) => setEmail(e.target.value),
								disabled: submitting,
								required: true
							}),
							error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-destructive",
								children: error
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						className: "w-full",
						disabled: submitting,
						children: submitting ? "Sending…" : "Send reset link"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-center text-sm",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/auth",
							className: "text-muted-foreground hover:text-foreground underline-offset-4 hover:underline",
							children: "Back to sign in"
						})
					})
				]
			}) })]
		})
	});
}
//#endregion
export { ForgotPasswordPage as component };
