import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CtX3ithx.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.index-CU-4b93x.js
var import_jsx_runtime = require_jsx_runtime();
function AdminDashboard() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "text-2xl font-semibold",
			children: "Welcome, Administrator"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-muted-foreground",
			children: "Overview of platform activity will appear here."
		})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid gap-4 md:grid-cols-2 lg:grid-cols-4",
			children: [
				"Patients",
				"Providers",
				"Consultations",
				"Orders"
			].map((label) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
				className: "pb-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
					className: "text-3xl",
					children: "—"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "text-xs text-muted-foreground",
				children: "Coming soon"
			})] }, label))
		})]
	});
}
//#endregion
export { AdminDashboard as component };
