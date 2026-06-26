import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-BkEeRci-.mjs";
import { t as Input } from "./input-B8Q2ztVi.mjs";
import { T as SquareCheckBig, i as Trash2, s as Plus, v as CircleDot, w as TextAlignStart } from "../_libs/lucide-react.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CtX3ithx.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { a as isMcqType, i as QUESTION_TYPE_LABELS, o as optionLetter, r as QUESTION_TYPE_HELPERS, s as questionFormSchema, t as QUESTION_TYPES } from "./questions.schema-C_UYXgFv.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { t as Textarea } from "./textarea-kko37XEX.mjs";
import { n as useFieldArray, r as useForm, t as u } from "../_libs/@hookform/resolvers+[...].mjs";
import { t as Switch } from "./switch-Cn1w-cIH.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/question-form-CRFW3iZY.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var EMPTY = {
	prompt: "",
	description: "",
	question_type: "short_text",
	sort_order: 0,
	is_required: true,
	is_active: true,
	options: []
};
var TYPE_ICONS = {
	short_text: TextAlignStart,
	mcq_single: CircleDot,
	mcq_multi: SquareCheckBig
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
function QuestionForm({ defaultValues, mode, questionPosition, submitting, onSubmit, onCancel, onValuesChange }) {
	const { register, handleSubmit, watch, setValue, control, formState } = useForm({
		resolver: u(questionFormSchema),
		defaultValues: {
			...EMPTY,
			...defaultValues
		}
	});
	const errors = formState.errors;
	const values = watch();
	const questionType = values.question_type;
	const showOptions = isMcqType(questionType);
	const { fields, append, remove, replace } = useFieldArray({
		control,
		name: "options"
	});
	(0, import_react.useEffect)(() => {
		if (showOptions && fields.length === 0) replace([{ label: "" }, { label: "" }]);
		if (!showOptions && fields.length > 0) replace([]);
	}, [
		showOptions,
		fields.length,
		replace
	]);
	(0, import_react.useEffect)(() => {
		onValuesChange?.(values);
	}, [values, onValuesChange]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: handleSubmit(onSubmit),
		className: "space-y-6",
		noValidate: true,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: mode === "create" ? "Add question" : "Edit question" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Question details" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Question",
						error: errors.prompt?.message,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
							...register("prompt"),
							rows: 3,
							placeholder: "Enter the question patients will see",
							disabled: submitting
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Field, {
						label: "Short description",
						error: errors.description?.message,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
							...register("description"),
							rows: 2,
							placeholder: "Optional helper text shown below the question (e.g. what to include)",
							disabled: submitting
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted-foreground",
							children: "Optional. Helps patients understand what you're asking."
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Question type" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "grid gap-2 sm:grid-cols-1",
								children: QUESTION_TYPES.map((type) => {
									const Icon = TYPE_ICONS[type];
									const selected = questionType === type;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										disabled: submitting,
										onClick: () => setValue("question_type", type),
										className: `flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-muted-foreground/40 hover:bg-muted/40"}`,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: `mt-0.5 h-4 w-4 shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-sm font-medium",
											children: QUESTION_TYPE_LABELS[type]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs text-muted-foreground",
											children: QUESTION_TYPE_HELPERS[type]
										})] })]
									}, type);
								})
							}),
							errors.question_type?.message && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-destructive",
								children: errors.question_type.message
							})
						]
					}),
					showOptions && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Answer options" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									type: "button",
									variant: "outline",
									size: "sm",
									disabled: submitting || fields.length >= 10,
									onClick: () => append({ label: "" }),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "mr-1.5 h-4 w-4" }), " Add option"]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground",
								children: "At least 2 options required."
							}),
							fields.map((field, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										variant: "outline",
										className: "mt-2 shrink-0 font-mono",
										children: optionLetter(index)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										...register(`options.${index}.label`),
										placeholder: `Option ${index + 1}`,
										disabled: submitting,
										className: "flex-1"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										type: "button",
										variant: "ghost",
										size: "icon",
										className: "shrink-0 text-destructive hover:text-destructive",
										disabled: submitting || fields.length <= 2,
										onClick: () => remove(index),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
									})
								]
							}, field.id)),
							errors.options?.message && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-destructive",
								children: errors.options.message
							}),
							errors.options?.root?.message && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-destructive",
								children: errors.options.root.message
							})
						]
					})
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
				className: "text-base",
				children: "Settings"
			}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "space-y-4",
				children: [
					mode === "edit" && questionPosition != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center gap-3 rounded-md border p-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
							variant: "secondary",
							children: [
								"Question #",
								questionPosition,
								" in quiz"
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "sort_order",
								className: "text-xs text-muted-foreground whitespace-nowrap",
								children: "Sort order"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "sort_order",
								type: "number",
								min: 0,
								className: "h-8 w-20",
								...register("sort_order"),
								disabled: submitting
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between rounded-md border p-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-medium",
							children: "Required"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted-foreground",
							children: "Patients must answer this question"
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
							checked: values.is_required,
							onCheckedChange: (v) => setValue("is_required", v),
							disabled: submitting
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between rounded-md border p-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-medium",
							children: "Active"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted-foreground",
							children: "Show this question in the intake quiz"
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
							checked: values.is_active,
							onCheckedChange: (v) => setValue("is_active", v),
							disabled: submitting
						})]
					})
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex justify-end gap-2",
				children: [onCancel && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					variant: "outline",
					onClick: onCancel,
					disabled: submitting,
					children: "Cancel"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					disabled: submitting,
					children: submitting ? "Saving…" : mode === "create" ? "Create question" : "Save changes"
				})]
			})
		]
	});
}
//#endregion
export { QuestionForm };
