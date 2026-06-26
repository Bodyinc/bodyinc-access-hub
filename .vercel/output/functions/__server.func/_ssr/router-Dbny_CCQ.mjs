import { i as __toESM } from "../_runtime.mjs";
import { n as supabase } from "./client-G-x0iJHV.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { I as useRouter, c as HeadContent, d as createRouter, f as Outlet, g as Link, h as createRootRouteWithContext, k as redirect, m as createFileRoute, p as lazyRouteComponent, s as Scripts } from "../_libs/@tanstack/react-router+[...].mjs";
import { D as LoaderCircle } from "../_libs/lucide-react.mjs";
import { n as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { i as QueryClientProvider } from "../_libs/tanstack__react-query.mjs";
import { t as Route$24 } from "./admin.medicines._medicineId-bCSwU20u.mjs";
import { t as Route$25 } from "./admin.packages._packageId-CdF1JV7R.mjs";
import { t as Route$26 } from "./admin.providers._providerId-CvDYBTy9.mjs";
import { t as Route$27 } from "./admin.questions._questionId-mVtjRhH8.mjs";
import { i as isPasswordRecoveryPending, n as getPasswordRecoveryRedirectUrl, r as haltForPasswordRecoveryRedirect, t as clearPasswordRecoveryPending } from "./password-recovery-Cu2AAm3X.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-Dbny_CCQ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var styles_default = "/assets/styles-_ieOJ1qQ.css";
function reportLovableError(error, context = {}) {
	if (typeof window === "undefined") return;
	window.__lovableEvents?.captureException?.(error, {
		source: "react_error_boundary",
		route: window.location.pathname,
		...context
	}, {
		mechanism: "react_error_boundary",
		handled: false,
		severity: "error"
	});
}
var LazyToaster = (0, import_react.lazy)(() => import("./sonner-CuWp3DKI.mjs").then((m) => ({ default: m.Toaster })));
function NotFoundComponent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-7xl font-bold text-foreground",
					children: "404"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-4 text-xl font-semibold text-foreground",
					children: "Page not found"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "The page you're looking for doesn't exist or has been moved."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Go home"
					})
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		reportLovableError(error, { boundary: "tanstack_root_error_component" });
	}, [error]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl font-semibold tracking-tight text-foreground",
					children: "This page didn't load"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Something went wrong on our end. You can try refreshing or head back home."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Try again"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/",
						className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
						children: "Go home"
					})]
				})
			]
		})
	});
}
var Route$23 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "Lovable App" },
			{
				name: "description",
				content: "Lovable Generated Project"
			},
			{
				name: "author",
				content: "Lovable"
			},
			{
				property: "og:title",
				content: "Lovable App"
			},
			{
				property: "og:description",
				content: "Lovable Generated Project"
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary"
			},
			{
				name: "twitter:site",
				content: "@Lovable"
			}
		],
		links: [{
			rel: "stylesheet",
			href: styles_default
		}]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$23.useRouteContext();
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		const recoveryRedirect = getPasswordRecoveryRedirectUrl();
		if (recoveryRedirect) {
			window.location.replace(recoveryRedirect);
			return;
		}
		const { data: sub } = supabase.auth.onAuthStateChange((event) => {
			if (event === "PASSWORD_RECOVERY") {
				const redirectUrl = getPasswordRecoveryRedirectUrl();
				if (redirectUrl) {
					window.location.replace(redirectUrl);
					return;
				}
				if (window.location.pathname !== "/reset-password") window.location.replace("/reset-password");
				return;
			}
			if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
			if (event === "SIGNED_IN") {
				const redirectUrl = getPasswordRecoveryRedirectUrl();
				if (redirectUrl) {
					window.location.replace(redirectUrl);
					return;
				}
				if (typeof window !== "undefined" && (window.location.pathname === "/reset-password" || isPasswordRecoveryPending())) return;
			}
			if (event === "SIGNED_OUT") {
				clearPasswordRecoveryPending();
				try {
					for (const k of Object.keys(sessionStorage)) if (k.startsWith("bi_portal_role:")) sessionStorage.removeItem(k);
				} catch {}
			}
			router.invalidate();
		});
		return () => sub.subscription.unsubscribe();
	}, [router]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(QueryClientProvider, {
		client: queryClient,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
			fallback: null,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LazyToaster, {})
		})]
	});
}
var $$splitComponentImporter$22 = () => import("./reset-password-CfoptfoI.mjs");
var Route$22 = createFileRoute("/reset-password")({
	ssr: false,
	head: () => ({ meta: [{ title: "Set New Password — Body Inc Practitioners" }, {
		name: "robots",
		content: "noindex"
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$22, "component")
});
var $$splitComponentImporter$21 = () => import("./forgot-password-BXje6tgm.mjs");
var Route$21 = createFileRoute("/forgot-password")({
	head: () => ({ meta: [
		{ title: "Reset Password — Body Inc Practitioners" },
		{
			name: "description",
			content: "Request a password reset link for your practitioner account."
		},
		{
			name: "robots",
			content: "noindex"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$21, "component")
});
var $$splitComponentImporter$20 = () => import("./auth-DF_2QL-2.mjs");
var Route$20 = createFileRoute("/auth")({
	head: () => ({ meta: [
		{ title: "Sign In — Body Inc" },
		{
			name: "description",
			content: "Sign in to the Body Inc portal."
		},
		{
			name: "robots",
			content: "noindex"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$20, "component")
});
function RoutePending({ label = "Loading…" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
			className: "h-8 w-8 animate-spin text-primary",
			"aria-hidden": true
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm",
			children: label
		})]
	});
}
var $$splitComponentImporter$19 = () => import("./route-Di7iQBCH.mjs");
var Route$19 = createFileRoute("/_authenticated")({
	ssr: false,
	pendingComponent: () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RoutePending, {}),
	beforeLoad: async () => {
		if (typeof window !== "undefined") {
			const recoveryRedirect = getPasswordRecoveryRedirectUrl();
			if (recoveryRedirect) {
				window.location.replace(recoveryRedirect);
				await haltForPasswordRecoveryRedirect();
			}
		}
		const { data, error } = await supabase.auth.getSession();
		if (error || !data.session?.user) throw redirect({ to: "/auth" });
		if (typeof window !== "undefined" && isPasswordRecoveryPending() && window.location.pathname !== "/reset-password") {
			window.location.replace("/reset-password");
			await haltForPasswordRecoveryRedirect();
		}
		const user = data.session.user;
		const cacheKey = `bi_portal_role:${user.id}`;
		let role = null;
		try {
			role = sessionStorage.getItem(cacheKey);
		} catch {}
		if (!role) {
			const { data: fetched, error: roleError } = await supabase.rpc("get_user_portal", { _user_id: user.id });
			if (roleError) throw redirect({ to: "/auth" });
			role = fetched ?? null;
			if (role) try {
				sessionStorage.setItem(cacheKey, role);
			} catch {}
		}
		if (role !== "provider" && role !== "admin") {
			await supabase.auth.signOut();
			throw redirect({ to: "/auth" });
		}
		return {
			user,
			role
		};
	},
	component: lazyRouteComponent($$splitComponentImporter$19, "component")
});
var $$splitComponentImporter$18 = () => import("./routes-DTEZEvkE.mjs");
var Route$18 = createFileRoute("/")({
	ssr: false,
	pendingComponent: () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RoutePending, {}),
	beforeLoad: async () => {
		if (typeof window !== "undefined") {
			const recoveryRedirect = getPasswordRecoveryRedirectUrl();
			if (recoveryRedirect) {
				window.location.replace(recoveryRedirect);
				await haltForPasswordRecoveryRedirect();
			}
		}
		const { supabase } = await import("./client-G-x0iJHV.mjs").then((n) => n.t).then((n) => n.t);
		const { data } = await supabase.auth.getSession();
		const user = data.session?.user;
		if (user && typeof window !== "undefined" && isPasswordRecoveryPending() && window.location.pathname !== "/reset-password") {
			window.location.replace("/reset-password");
			await haltForPasswordRecoveryRedirect();
		}
		if (!user) throw redirect({ to: "/auth" });
		const cacheKey = `bi_portal_role:${user.id}`;
		let role = null;
		try {
			role = sessionStorage.getItem(cacheKey);
		} catch {}
		if (!role) {
			const { data: fetched } = await supabase.rpc("get_user_portal", { _user_id: user.id });
			role = fetched ?? null;
			if (role) try {
				sessionStorage.setItem(cacheKey, role);
			} catch {}
		}
		if (role === "admin") throw redirect({ to: "/admin" });
		if (role === "provider") throw redirect({ to: "/dashboard" });
		await supabase.auth.signOut();
		throw redirect({ to: "/auth" });
	},
	head: () => ({ meta: [
		{ title: "Body Inc Practitioner Portal" },
		{
			name: "description",
			content: "Practitioner portal for Body Inc."
		},
		{
			name: "robots",
			content: "noindex"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$18, "component")
});
var $$splitComponentImporter$17 = () => import("./dashboard-CS1jd9Mw.mjs");
var Route$17 = createFileRoute("/_authenticated/dashboard")({
	head: () => ({ meta: [{ title: "Practitioner Dashboard — Body Inc" }, {
		name: "robots",
		content: "noindex"
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$17, "component")
});
var $$splitComponentImporter$16 = () => import("./admin-BOr8jK2Y.mjs");
var Route$16 = createFileRoute("/_authenticated/admin")({
	head: () => ({ meta: [{ title: "Admin — Body Inc" }, {
		name: "robots",
		content: "noindex"
	}] }),
	pendingComponent: () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RoutePending, {}),
	beforeLoad: ({ context }) => {
		if (context.role !== "admin") throw redirect({ to: "/dashboard" });
	},
	component: lazyRouteComponent($$splitComponentImporter$16, "component")
});
var $$splitComponentImporter$15 = () => import("./admin.index-CU-4b93x.mjs");
var Route$15 = createFileRoute("/_authenticated/admin/")({ component: lazyRouteComponent($$splitComponentImporter$15, "component") });
var $$splitComponentImporter$14 = () => import("./admin.slots-m1jaWk__.mjs");
var Route$14 = createFileRoute("/_authenticated/admin/slots")({ component: lazyRouteComponent($$splitComponentImporter$14, "component") });
var $$splitComponentImporter$13 = () => import("./admin.questions-DK69jiwI.mjs");
var Route$13 = createFileRoute("/_authenticated/admin/questions")({ component: lazyRouteComponent($$splitComponentImporter$13, "component") });
var $$splitComponentImporter$12 = () => import("./admin.providers-CduBSKtZ.mjs");
var Route$12 = createFileRoute("/_authenticated/admin/providers")({ component: lazyRouteComponent($$splitComponentImporter$12, "component") });
var $$splitComponentImporter$11 = () => import("./admin.patients-BhkvMNeV.mjs");
var Route$11 = createFileRoute("/_authenticated/admin/patients")({ component: lazyRouteComponent($$splitComponentImporter$11, "component") });
var $$splitComponentImporter$10 = () => import("./admin.packages-7oAq17Zh.mjs");
var Route$10 = createFileRoute("/_authenticated/admin/packages")({ component: lazyRouteComponent($$splitComponentImporter$10, "component") });
var $$splitComponentImporter$9 = () => import("./admin.medicines-BYH7EI_2.mjs");
var Route$9 = createFileRoute("/_authenticated/admin/medicines")({ component: lazyRouteComponent($$splitComponentImporter$9, "component") });
var $$splitComponentImporter$8 = () => import("./admin.intake-form-T8WIVsWt.mjs");
var Route$8 = createFileRoute("/_authenticated/admin/intake-form")({ component: lazyRouteComponent($$splitComponentImporter$8, "component") });
var $$splitComponentImporter$7 = () => import("./admin.questions.index-vHCaeyl-.mjs");
var Route$7 = createFileRoute("/_authenticated/admin/questions/")({ component: lazyRouteComponent($$splitComponentImporter$7, "component") });
var $$splitComponentImporter$6 = () => import("./admin.providers.index-AaapIX9Y.mjs");
var Route$6 = createFileRoute("/_authenticated/admin/providers/")({ component: lazyRouteComponent($$splitComponentImporter$6, "component") });
var $$splitComponentImporter$5 = () => import("./admin.packages.index-C017Vzpt.mjs");
var Route$5 = createFileRoute("/_authenticated/admin/packages/")({ component: lazyRouteComponent($$splitComponentImporter$5, "component") });
var $$splitComponentImporter$4 = () => import("./admin.medicines.index-B9LwghtK.mjs");
var Route$4 = createFileRoute("/_authenticated/admin/medicines/")({ component: lazyRouteComponent($$splitComponentImporter$4, "component") });
var $$splitComponentImporter$3 = () => import("./admin.questions.new-B2Qzj3kM.mjs");
var Route$3 = createFileRoute("/_authenticated/admin/questions/new")({ component: lazyRouteComponent($$splitComponentImporter$3, "component") });
var $$splitComponentImporter$2 = () => import("./admin.providers.new-C8QCHj3V.mjs");
var Route$2 = createFileRoute("/_authenticated/admin/providers/new")({ component: lazyRouteComponent($$splitComponentImporter$2, "component") });
var $$splitComponentImporter$1 = () => import("./admin.packages.new-BHTOCry5.mjs");
var Route$1 = createFileRoute("/_authenticated/admin/packages/new")({ component: lazyRouteComponent($$splitComponentImporter$1, "component") });
var $$splitComponentImporter = () => import("./admin.medicines.new-DrV15L_g.mjs");
var Route = createFileRoute("/_authenticated/admin/medicines/new")({ component: lazyRouteComponent($$splitComponentImporter, "component") });
var ResetPasswordRoute = Route$22.update({
	id: "/reset-password",
	path: "/reset-password",
	getParentRoute: () => Route$23
});
var ForgotPasswordRoute = Route$21.update({
	id: "/forgot-password",
	path: "/forgot-password",
	getParentRoute: () => Route$23
});
var AuthRoute = Route$20.update({
	id: "/auth",
	path: "/auth",
	getParentRoute: () => Route$23
});
var AuthenticatedRouteRoute = Route$19.update({
	id: "/_authenticated",
	getParentRoute: () => Route$23
});
var IndexRoute = Route$18.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$23
});
var AuthenticatedDashboardRoute = Route$17.update({
	id: "/dashboard",
	path: "/dashboard",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedAdminRoute = Route$16.update({
	id: "/admin",
	path: "/admin",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedAdminIndexRoute = Route$15.update({
	id: "/",
	path: "/",
	getParentRoute: () => AuthenticatedAdminRoute
});
var AuthenticatedAdminSlotsRoute = Route$14.update({
	id: "/slots",
	path: "/slots",
	getParentRoute: () => AuthenticatedAdminRoute
});
var AuthenticatedAdminQuestionsRoute = Route$13.update({
	id: "/questions",
	path: "/questions",
	getParentRoute: () => AuthenticatedAdminRoute
});
var AuthenticatedAdminProvidersRoute = Route$12.update({
	id: "/providers",
	path: "/providers",
	getParentRoute: () => AuthenticatedAdminRoute
});
var AuthenticatedAdminPatientsRoute = Route$11.update({
	id: "/patients",
	path: "/patients",
	getParentRoute: () => AuthenticatedAdminRoute
});
var AuthenticatedAdminPackagesRoute = Route$10.update({
	id: "/packages",
	path: "/packages",
	getParentRoute: () => AuthenticatedAdminRoute
});
var AuthenticatedAdminMedicinesRoute = Route$9.update({
	id: "/medicines",
	path: "/medicines",
	getParentRoute: () => AuthenticatedAdminRoute
});
var AuthenticatedAdminIntakeFormRoute = Route$8.update({
	id: "/intake-form",
	path: "/intake-form",
	getParentRoute: () => AuthenticatedAdminRoute
});
var AuthenticatedAdminQuestionsIndexRoute = Route$7.update({
	id: "/",
	path: "/",
	getParentRoute: () => AuthenticatedAdminQuestionsRoute
});
var AuthenticatedAdminProvidersIndexRoute = Route$6.update({
	id: "/",
	path: "/",
	getParentRoute: () => AuthenticatedAdminProvidersRoute
});
var AuthenticatedAdminPackagesIndexRoute = Route$5.update({
	id: "/",
	path: "/",
	getParentRoute: () => AuthenticatedAdminPackagesRoute
});
var AuthenticatedAdminMedicinesIndexRoute = Route$4.update({
	id: "/",
	path: "/",
	getParentRoute: () => AuthenticatedAdminMedicinesRoute
});
var AuthenticatedAdminQuestionsNewRoute = Route$3.update({
	id: "/new",
	path: "/new",
	getParentRoute: () => AuthenticatedAdminQuestionsRoute
});
var AuthenticatedAdminQuestionsQuestionIdRoute = Route$27.update({
	id: "/$questionId",
	path: "/$questionId",
	getParentRoute: () => AuthenticatedAdminQuestionsRoute
});
var AuthenticatedAdminProvidersNewRoute = Route$2.update({
	id: "/new",
	path: "/new",
	getParentRoute: () => AuthenticatedAdminProvidersRoute
});
var AuthenticatedAdminProvidersProviderIdRoute = Route$26.update({
	id: "/$providerId",
	path: "/$providerId",
	getParentRoute: () => AuthenticatedAdminProvidersRoute
});
var AuthenticatedAdminPackagesNewRoute = Route$1.update({
	id: "/new",
	path: "/new",
	getParentRoute: () => AuthenticatedAdminPackagesRoute
});
var AuthenticatedAdminPackagesPackageIdRoute = Route$25.update({
	id: "/$packageId",
	path: "/$packageId",
	getParentRoute: () => AuthenticatedAdminPackagesRoute
});
var AuthenticatedAdminMedicinesNewRoute = Route.update({
	id: "/new",
	path: "/new",
	getParentRoute: () => AuthenticatedAdminMedicinesRoute
});
var AuthenticatedAdminMedicinesRouteChildren = {
	AuthenticatedAdminMedicinesMedicineIdRoute: Route$24.update({
		id: "/$medicineId",
		path: "/$medicineId",
		getParentRoute: () => AuthenticatedAdminMedicinesRoute
	}),
	AuthenticatedAdminMedicinesNewRoute,
	AuthenticatedAdminMedicinesIndexRoute
};
var AuthenticatedAdminMedicinesRouteWithChildren = AuthenticatedAdminMedicinesRoute._addFileChildren(AuthenticatedAdminMedicinesRouteChildren);
var AuthenticatedAdminPackagesRouteChildren = {
	AuthenticatedAdminPackagesPackageIdRoute,
	AuthenticatedAdminPackagesNewRoute,
	AuthenticatedAdminPackagesIndexRoute
};
var AuthenticatedAdminPackagesRouteWithChildren = AuthenticatedAdminPackagesRoute._addFileChildren(AuthenticatedAdminPackagesRouteChildren);
var AuthenticatedAdminProvidersRouteChildren = {
	AuthenticatedAdminProvidersProviderIdRoute,
	AuthenticatedAdminProvidersNewRoute,
	AuthenticatedAdminProvidersIndexRoute
};
var AuthenticatedAdminProvidersRouteWithChildren = AuthenticatedAdminProvidersRoute._addFileChildren(AuthenticatedAdminProvidersRouteChildren);
var AuthenticatedAdminQuestionsRouteChildren = {
	AuthenticatedAdminQuestionsQuestionIdRoute,
	AuthenticatedAdminQuestionsNewRoute,
	AuthenticatedAdminQuestionsIndexRoute
};
var AuthenticatedAdminRouteChildren = {
	AuthenticatedAdminIntakeFormRoute,
	AuthenticatedAdminMedicinesRoute: AuthenticatedAdminMedicinesRouteWithChildren,
	AuthenticatedAdminPackagesRoute: AuthenticatedAdminPackagesRouteWithChildren,
	AuthenticatedAdminPatientsRoute,
	AuthenticatedAdminProvidersRoute: AuthenticatedAdminProvidersRouteWithChildren,
	AuthenticatedAdminQuestionsRoute: AuthenticatedAdminQuestionsRoute._addFileChildren(AuthenticatedAdminQuestionsRouteChildren),
	AuthenticatedAdminSlotsRoute,
	AuthenticatedAdminIndexRoute
};
var AuthenticatedRouteRouteChildren = {
	AuthenticatedAdminRoute: AuthenticatedAdminRoute._addFileChildren(AuthenticatedAdminRouteChildren),
	AuthenticatedDashboardRoute
};
var rootRouteChildren = {
	IndexRoute,
	AuthenticatedRouteRoute: AuthenticatedRouteRoute._addFileChildren(AuthenticatedRouteRouteChildren),
	AuthRoute,
	ForgotPasswordRoute,
	ResetPasswordRoute
};
var routeTree = Route$23._addFileChildren(rootRouteChildren)._addFileTypes();
var getRouter = () => {
	return createRouter({
		routeTree,
		context: { queryClient: new QueryClient({ defaultOptions: { queries: {
			staleTime: 6e4,
			gcTime: 5 * 6e4,
			refetchOnWindowFocus: false,
			retry: 1
		} } }) },
		scrollRestoration: true,
		defaultPreloadStaleTime: 3e4
	});
};
//#endregion
export { getRouter };
