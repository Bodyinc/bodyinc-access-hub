import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-BkEeRci-.mjs";
import { t as Input } from "./input-B8Q2ztVi.mjs";
import { i as Trash2, s as Plus } from "../_libs/lucide-react.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CtX3ithx.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-Dg1urBTx.mjs";
import { i as packageFormSchema, n as computeSavings, r as formatPrice, t as DURATION_PRESETS } from "./packages.schema-BaPUIpzc.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { t as Textarea } from "./textarea-kko37XEX.mjs";
import { n as useFieldArray, r as useForm, t as u } from "../_libs/@hookform/resolvers+[...].mjs";
import { t as Switch } from "./switch-Cn1w-cIH.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/package-form-tGtv67nA.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var EMPTY = {
	medicine_id: "",
	name: "",
	duration_months: 1,
	original_price: 0,
	price: 0,
	is_most_popular: false,
	features: [],
	clinical_note: "",
	sort_order: 0,
	is_active: true
};
function Field({ label, error, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: label }),
			children,
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-destructive",
				children: error
			})
		]
	});
}
function PackageForm({ medicines, defaultValues, mode, submitting, onSubmit, onCancel, onValuesChange }) {
	const { register, handleSubmit, watch, setValue, control, formState } = useForm({
		resolver: u(packageFormSchema),
		defaultValues: {
			...EMPTY,
			...defaultValues
		}
	});
	const errors = formState.errors;
	const medicineId = watch("medicine_id");
	const originalPrice = watch("original_price");
	const price = watch("price");
	const durationMonths = watch("duration_months");
	const isMostPopular = watch("is_most_popular");
	const isActive = watch("is_active");
	const { fields, append, remove } = useFieldArray({
		control,
		name: "features"
	});
	const savings = computeSavings(Number(originalPrice) || 0, Number(price) || 0);
	const selectedMedicine = medicines.find((m) => m.id === medicineId);
	(0, import_react.useEffect)(() => {
		if (!onValuesChange) return;
		const subscription = watch((formValues) => {
			onValuesChange(formValues);
		});
		return () => subscription.unsubscribe();
	}, [watch, onValuesChange]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: handleSubmit(onSubmit),
		className: "space-y-6",
		noValidate: true,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: mode === "create" ? "Add package" : "Edit package" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Pricing plan linked to a medicine." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Medicine",
						error: errors.medicine_id?.message,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							value: medicineId || void 0,
							onValueChange: (v) => setValue("medicine_id", v, { shouldValidate: true }),
							disabled: submitting || mode === "edit",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Select a medicine" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: medicines.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: m.id,
								children: m.name
							}, m.id)) })]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Plan name",
						error: errors.name?.message,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							...register("name"),
							placeholder: "e.g. Standard Treatment Plan",
							disabled: submitting
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Duration (months)",
						error: errors.duration_months?.message,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap gap-2",
							children: [DURATION_PRESETS.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								type: "button",
								variant: durationMonths === d ? "default" : "outline",
								size: "sm",
								disabled: submitting,
								onClick: () => setValue("duration_months", d),
								children: [d, " mo"]
							}, d)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "number",
								min: 1,
								className: "w-24",
								...register("duration_months"),
								disabled: submitting
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-4 sm:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Original price ($)",
							error: errors.original_price?.message,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "number",
								step: "0.01",
								min: 0,
								...register("original_price"),
								disabled: submitting
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Sale price ($)",
							error: errors.price?.message,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "number",
								step: "0.01",
								min: 0,
								...register("price"),
								disabled: submitting
							})
						})]
					}),
					savings > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-muted-foreground",
						children: ["Patient saves ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-medium text-foreground",
							children: formatPrice(savings)
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between rounded-lg border p-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-medium",
							children: "Most popular"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted-foreground",
							children: "Only one plan per medicine can be marked most popular."
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
							checked: isMostPopular,
							onCheckedChange: (v) => setValue("is_most_popular", v),
							disabled: submitting
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between rounded-lg border p-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-medium",
							children: "Active"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted-foreground",
							children: "Visible to patients when medicine is active."
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
							checked: isActive,
							onCheckedChange: (v) => setValue("is_active", v),
							disabled: submitting
						})]
					})
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
				className: "text-base",
				children: "Included features"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Items shown on the recommended plan card." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "space-y-3",
				children: [fields.map((field, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						...register(`features.${index}.text`),
						placeholder: `Feature ${index + 1}`,
						disabled: submitting
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "ghost",
						size: "icon",
						className: "shrink-0 text-muted-foreground hover:text-destructive",
						disabled: submitting,
						onClick: () => remove(index),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
					})]
				}, field.id)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "button",
					variant: "outline",
					size: "sm",
					disabled: submitting,
					onClick: () => append({ text: "" }),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "mr-1.5 h-4 w-4" }), " Add feature"]
				})]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
				className: "text-base",
				children: "Clinical note"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Disclaimer shown below plan cards." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
				...register("clinical_note"),
				rows: 2,
				placeholder: "Optional clinical disclaimer…",
				disabled: submitting
			}) })] }),
			selectedMedicine && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-xs text-muted-foreground",
				children: ["Linked to ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-medium",
					children: selectedMedicine.name
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					disabled: submitting,
					children: submitting ? "Saving…" : mode === "create" ? "Create package" : "Save changes"
				}), onCancel && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					variant: "outline",
					onClick: onCancel,
					disabled: submitting,
					children: "Cancel"
				})]
			})
		]
	});
}
//#endregion
export { PackageForm };
