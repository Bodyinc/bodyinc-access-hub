import { i as __toESM } from "../_runtime.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { S as Check, T as SquareCheckBig, _ as Circle, v as CircleDot, w as TextAlignStart } from "../_libs/lucide-react.mjs";
import { n as CheckboxIndicator, t as Checkbox$1 } from "../_libs/@radix-ui/react-checkbox+[...].mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CtX3ithx.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { a as isMcqType, o as optionLetter } from "./questions.schema-C_UYXgFv.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { t as Textarea } from "./textarea-kko37XEX.mjs";
import { n as RadioGroupIndicator, r as RadioGroupItem$1, t as RadioGroup$1 } from "../_libs/radix-ui__react-radio-group.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/question-preview-BMZmZSrE.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Checkbox = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox$1, {
	ref,
	className: cn("grid place-content-center peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground", className),
	...props,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckboxIndicator, {
		className: cn("grid place-content-center text-current"),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4" })
	})
}));
Checkbox.displayName = Checkbox$1.displayName;
var RadioGroup = import_react.forwardRef(({ className, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RadioGroup$1, {
		className: cn("grid gap-2", className),
		...props,
		ref
	});
});
RadioGroup.displayName = RadioGroup$1.displayName;
var RadioGroupItem = import_react.forwardRef(({ className, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RadioGroupItem$1, {
		ref,
		className: cn("aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50", className),
		...props,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RadioGroupIndicator, {
			className: "flex items-center justify-center",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Circle, { className: "h-3.5 w-3.5 fill-primary" })
		})
	});
});
RadioGroupItem.displayName = RadioGroupItem$1.displayName;
function QuestionPreview({ prompt = "", description = "", question_type = "short_text", options = [], is_required = true }) {
	const displayPrompt = prompt.trim() || "Your question will appear here";
	const displayDescription = description?.trim();
	const filledOptions = options.filter((o) => o.label?.trim());
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		className: "border-dashed",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
			className: "pb-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
				className: "text-base",
				children: "Patient preview"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "This is what patients will see in the intake quiz." })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
			className: "space-y-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-lg border bg-muted/30 p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-3 flex items-start gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex-1 space-y-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-medium leading-relaxed",
								children: displayPrompt
							}), displayDescription && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs leading-relaxed text-muted-foreground",
								children: displayDescription
							})]
						}), is_required && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							variant: "secondary",
							className: "shrink-0 text-xs",
							children: "Required"
						})]
					}),
					question_type === "short_text" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
						disabled: true,
						placeholder: "Your answer…",
						className: "resize-none bg-background",
						rows: 3
					}),
					question_type === "mcq_single" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RadioGroup, {
						disabled: true,
						className: "space-y-2",
						children: (filledOptions.length > 0 ? filledOptions : [{ label: "Option 1" }, { label: "Option 2" }]).map((opt, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 rounded-md border bg-background px-3 py-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RadioGroupItem, {
								value: `opt-${index}`,
								id: `preview-radio-${index}`,
								disabled: true
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, {
								htmlFor: `preview-radio-${index}`,
								className: "font-normal",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "mr-2 text-xs font-semibold text-muted-foreground",
									children: [optionLetter(index), "."]
								}), opt.label?.trim() || `Option ${index + 1}`]
							})]
						}, index))
					}),
					question_type === "mcq_multi" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-2",
						children: (filledOptions.length > 0 ? filledOptions : [{ label: "Option 1" }, { label: "Option 2" }]).map((opt, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 rounded-md border bg-background px-3 py-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
								id: `preview-check-${index}`,
								disabled: true
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, {
								htmlFor: `preview-check-${index}`,
								className: "font-normal",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "mr-2 text-xs font-semibold text-muted-foreground",
									children: [optionLetter(index), "."]
								}), opt.label?.trim() || `Option ${index + 1}`]
							})]
						}, index))
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2 text-xs text-muted-foreground",
				children: [
					question_type === "short_text" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextAlignStart, { className: "h-3.5 w-3.5" }),
					question_type === "mcq_single" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleDot, { className: "h-3.5 w-3.5" }),
					question_type === "mcq_multi" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, { className: "h-3.5 w-3.5" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						question_type === "short_text" && "Free-text response",
						question_type === "mcq_single" && "Pick one answer",
						question_type === "mcq_multi" && "Pick all that apply"
					] }),
					isMcqType(question_type) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						"· ",
						filledOptions.length || 2,
						" option",
						(filledOptions.length || 2) === 1 ? "" : "s"
					] })
				]
			})]
		})]
	});
}
//#endregion
export { QuestionPreview };
