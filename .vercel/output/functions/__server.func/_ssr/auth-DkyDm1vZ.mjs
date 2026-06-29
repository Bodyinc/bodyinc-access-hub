import { i as __toESM } from "../_runtime.mjs";
import { n as supabase } from "./client-G-x0iJHV.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-BkEeRci-.mjs";
import { t as Input } from "./input-B8Q2ztVi.mjs";
import { F as useNavigate, I as useRouter, g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { u as Minus } from "../_libs/lucide-react.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CtX3ithx.mjs";
import { c as stringType, s as objectType } from "../_libs/zod.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { l as createServerFn } from "./esm-9EjmF9OT.mjs";
import { n as useServerFn, t as createSsrRpc } from "./createSsrRpc-NTk29FAB.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-Dpn8S0gM.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { t as clearPasswordRecoveryPending } from "./password-recovery-Cu2AAm3X.mjs";
import { i as Trigger, n as List, r as Root2, t as Content } from "../_libs/radix-ui__react-tabs.mjs";
import { n as jt, t as Lt } from "../_libs/input-otp.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auth-DkyDm1vZ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Tabs = Root2;
var TabsList = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(List, {
	ref,
	className: cn("inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground", className),
	...props
}));
TabsList.displayName = List.displayName;
var TabsTrigger = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trigger, {
	ref,
	className: cn("inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow", className),
	...props
}));
TabsTrigger.displayName = Trigger.displayName;
var TabsContent = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content, {
	ref,
	className: cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className),
	...props
}));
TabsContent.displayName = Content.displayName;
var InputOTP = import_react.forwardRef(({ className, containerClassName, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lt, {
	ref,
	containerClassName: cn("flex items-center gap-2 has-[:disabled]:opacity-50", containerClassName),
	className: cn("disabled:cursor-not-allowed", className),
	...props
}));
InputOTP.displayName = "InputOTP";
var InputOTPGroup = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	ref,
	className: cn("flex items-center", className),
	...props
}));
InputOTPGroup.displayName = "InputOTPGroup";
var InputOTPSlot = import_react.forwardRef(({ index, className, ...props }, ref) => {
	const { char, hasFakeCaret, isActive } = import_react.useContext(jt).slots[index];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		ref,
		className: cn("relative flex h-9 w-9 items-center justify-center border-y border-r border-input text-sm shadow-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md", isActive && "z-10 ring-1 ring-ring", className),
		...props,
		children: [char, hasFakeCaret && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "pointer-events-none absolute inset-0 flex items-center justify-center",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-4 w-px animate-caret-blink bg-foreground duration-1000" })
		})]
	});
});
InputOTPSlot.displayName = "InputOTPSlot";
var InputOTPSeparator = import_react.forwardRef(({ ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	ref,
	role: "separator",
	...props,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, {})
}));
InputOTPSeparator.displayName = "InputOTPSeparator";
var credentialsSchema = objectType({
	email: stringType().trim().email().max(255),
	password: stringType().min(8).max(128)
});
var emailSchema = objectType({ email: stringType().trim().email().max(255) });
var verifyOtpSchema = objectType({
	email: stringType().trim().email().max(255),
	token: stringType().trim().regex(/^\d{8}$/u, "Enter the 8-digit code")
});
var signInWithPassword = createServerFn({ method: "POST" }).inputValidator((input) => credentialsSchema.parse(input)).handler(createSsrRpc("a85d6e8a98d921cd24e92784db8760ac4aa50f9b85f80d538fce3f1eb91cb724"));
var sendLoginOtp = createServerFn({ method: "POST" }).inputValidator((input) => emailSchema.parse(input)).handler(createSsrRpc("57505b8c97052c9077dab9f2fa824623b159232a718ef56e3567adfbe4564f93"));
var verifyLoginOtp = createServerFn({ method: "POST" }).inputValidator((input) => verifyOtpSchema.parse(input)).handler(createSsrRpc("e3d516e987e1c730e53dec6111b5a437acce773e8990f82a103b2fee544f2cc9"));
createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("e4b04772036c1add2f7ab095b0c1ea65d3072d89c63246a9b8fdb44d2a2212d7"));
var passwordSchema = objectType({
	email: stringType().trim().email("Enter a valid email").max(255),
	password: stringType().min(8, "Password must be at least 8 characters").max(128)
});
var emailOnlySchema = objectType({ email: stringType().trim().email("Enter a valid email").max(255) });
function AuthPage() {
	const navigate = useNavigate();
	const router = useRouter();
	const signInPw = useServerFn(signInWithPassword);
	const sendOtp = useServerFn(sendLoginOtp);
	const verifyOtp = useServerFn(verifyLoginOtp);
	const [portalError, setPortalError] = (0, import_react.useState)(null);
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [pwSubmitting, setPwSubmitting] = (0, import_react.useState)(false);
	const [pwErrors, setPwErrors] = (0, import_react.useState)({});
	const [otpEmail, setOtpEmail] = (0, import_react.useState)("");
	const [otpCode, setOtpCode] = (0, import_react.useState)("");
	const [otpStage, setOtpStage] = (0, import_react.useState)("request");
	const [otpSubmitting, setOtpSubmitting] = (0, import_react.useState)(false);
	const [otpEmailError, setOtpEmailError] = (0, import_react.useState)();
	async function handleSession(result) {
		if (!result.ok) {
			if (result.error === "wrong_portal" || result.error === "no_access") setPortalError({
				message: result.message,
				redirectUrl: result.redirectUrl
			});
			else toast.error(result.message);
			return;
		}
		const { error } = await supabase.auth.setSession({
			access_token: result.session.access_token,
			refresh_token: result.session.refresh_token
		});
		if (error) {
			toast.error("Could not start your session. Please try again.");
			return;
		}
		clearPasswordRecoveryPending();
		await router.invalidate();
		navigate({ to: result.role === "admin" ? "/admin" : "/dashboard" });
	}
	async function onPasswordSubmit(e) {
		e.preventDefault();
		setPwErrors({});
		setPortalError(null);
		const parsed = passwordSchema.safeParse({
			email,
			password
		});
		if (!parsed.success) {
			const errs = {};
			for (const issue of parsed.error.issues) {
				const k = issue.path[0];
				if (!errs[k]) errs[k] = issue.message;
			}
			setPwErrors(errs);
			return;
		}
		setPwSubmitting(true);
		try {
			await handleSession(await signInPw({ data: parsed.data }));
		} catch (err) {
			console.error(err);
			toast.error("Something went wrong. Please try again.");
		} finally {
			setPwSubmitting(false);
		}
	}
	async function onSendOtp(e) {
		e.preventDefault();
		setOtpEmailError(void 0);
		setPortalError(null);
		const parsed = emailOnlySchema.safeParse({ email: otpEmail });
		if (!parsed.success) {
			setOtpEmailError(parsed.error.issues[0]?.message ?? "Enter a valid email");
			return;
		}
		setOtpSubmitting(true);
		try {
			await sendOtp({ data: parsed.data });
			setOtpStage("verify");
			toast.success("If an account exists, an 8-digit code was sent.");
		} catch (err) {
			console.error(err);
			toast.error("Could not send code. Please try again.");
		} finally {
			setOtpSubmitting(false);
		}
	}
	async function onVerifyOtp(e) {
		e.preventDefault();
		setPortalError(null);
		if (otpCode.length !== 8) {
			toast.error("Enter the 8-digit code.");
			return;
		}
		setOtpSubmitting(true);
		try {
			await handleSession(await verifyOtp({ data: {
				email: otpEmail,
				token: otpCode
			} }));
		} catch (err) {
			console.error(err);
			toast.error("Something went wrong. Please try again.");
		} finally {
			setOtpSubmitting(false);
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
					children: "Sign In"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Body Inc — Practitioner & Admin portal" })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs, {
				defaultValue: "password",
				className: "w-full",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, {
						className: "grid w-full grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
							value: "password",
							children: "Password"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
							value: "otp",
							children: "Email OTP"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "password",
						className: "mt-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							onSubmit: onPasswordSubmit,
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
											disabled: pwSubmitting,
											required: true
										}),
										pwErrors.email && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-sm text-destructive",
											children: pwErrors.email
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
												htmlFor: "password",
												children: "Password"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
												to: "/forgot-password",
												className: "text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline",
												children: "Forgot password?"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											id: "password",
											type: "password",
											autoComplete: "current-password",
											value: password,
											onChange: (e) => setPassword(e.target.value),
											disabled: pwSubmitting,
											required: true
										}),
										pwErrors.password && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-sm text-destructive",
											children: pwErrors.password
										})
									]
								}),
								portalError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PortalErrorBox, { error: portalError }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "submit",
									className: "w-full",
									disabled: pwSubmitting,
									children: pwSubmitting ? "Signing in…" : "Sign in"
								})
							]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "otp",
						className: "mt-4",
						children: otpStage === "request" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							onSubmit: onSendOtp,
							className: "space-y-4",
							noValidate: true,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											htmlFor: "otp-email",
											children: "Email"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											id: "otp-email",
											type: "email",
											autoComplete: "email",
											value: otpEmail,
											onChange: (e) => setOtpEmail(e.target.value),
											disabled: otpSubmitting,
											required: true
										}),
										otpEmailError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-sm text-destructive",
											children: otpEmailError
										})
									]
								}),
								portalError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PortalErrorBox, { error: portalError }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "submit",
									className: "w-full",
									disabled: otpSubmitting,
									children: otpSubmitting ? "Sending…" : "Send code"
								})
							]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							onSubmit: onVerifyOtp,
							className: "space-y-4",
							noValidate: true,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, { children: ["Enter the 8-digit code sent to ", otpEmail] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "flex justify-center",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InputOTP, {
											maxLength: 8,
											value: otpCode,
											onChange: (v) => setOtpCode(v),
											disabled: otpSubmitting,
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(InputOTPGroup, { children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InputOTPSlot, { index: 0 }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InputOTPSlot, { index: 1 }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InputOTPSlot, { index: 2 }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InputOTPSlot, { index: 3 }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InputOTPSlot, { index: 4 }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InputOTPSlot, { index: 5 }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InputOTPSlot, { index: 6 }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InputOTPSlot, { index: 7 })
											] })
										})
									})]
								}),
								portalError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PortalErrorBox, { error: portalError }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "submit",
									className: "w-full",
									disabled: otpSubmitting,
									children: otpSubmitting ? "Verifying…" : "Verify & sign in"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => {
										setOtpStage("request");
										setOtpCode("");
										setPortalError(null);
									},
									className: "block w-full text-center text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline",
									children: "Use a different email"
								})
							]
						})
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-6 text-center text-xs text-muted-foreground",
				children: "Accounts are created by your administrator."
			})] })]
		})
	});
}
function PortalErrorBox({ error }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-foreground",
			children: error.message
		}), error.redirectUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
			href: error.redirectUrl,
			className: "mt-2 inline-block font-medium text-destructive underline-offset-4 hover:underline",
			children: "Go to the correct portal →"
		})]
	});
}
//#endregion
export { AuthPage as component };
