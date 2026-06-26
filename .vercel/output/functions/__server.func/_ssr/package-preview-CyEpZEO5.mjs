import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { S as Check } from "../_libs/lucide-react.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CtX3ithx.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { n as computeSavings, r as formatPrice } from "./packages.schema-BaPUIpzc.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/package-preview-CyEpZEO5.js
var import_jsx_runtime = require_jsx_runtime();
function PackagePreview({ medicine_name = "", name = "", duration_months = 1, original_price = 0, price = 0, is_most_popular = false, features = [], clinical_note = "" }) {
	const displayName = name.trim() || "Plan name";
	const displayMedicine = medicine_name.trim() || "Medicine";
	const filledFeatures = (features ?? []).map((f) => f.text?.trim()).filter(Boolean);
	const savings = computeSavings(original_price ?? 0, price ?? 0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		className: "border-dashed",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
			className: "pb-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
				className: "text-base",
				children: "Patient preview"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Recommended medications plan card." })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
			className: "space-y-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs font-medium uppercase tracking-wide text-muted-foreground",
					children: ["Recommended for ", displayMedicine]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 text-sm text-muted-foreground",
					children: [duration_months, "-month plan"]
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative rounded-xl border-2 border-primary/20 bg-background p-5 shadow-sm",
					children: [
						is_most_popular && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							className: "absolute -top-2.5 left-4",
							children: "Most Popular"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "font-semibold",
							children: displayName
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 flex items-baseline gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-2xl font-bold",
								children: formatPrice(price)
							}), original_price > price && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sm text-muted-foreground line-through",
								children: formatPrice(original_price)
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-xs text-muted-foreground",
							children: [
								"Total for ",
								duration_months,
								" month",
								duration_months === 1 ? "" : "s"
							]
						}),
						savings > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
							variant: "secondary",
							className: "mt-2 font-normal",
							children: ["Save ", formatPrice(savings)]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "mt-4 space-y-2",
							children: (filledFeatures.length > 0 ? filledFeatures : ["Feature one", "Feature two"]).map((text, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "flex items-start gap-2 text-sm",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "mt-0.5 h-4 w-4 shrink-0 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: text })]
							}, i))
						})
					]
				}),
				clinical_note?.trim() && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted-foreground",
					children: clinical_note.trim()
				})
			]
		})]
	});
}
//#endregion
export { PackagePreview };
