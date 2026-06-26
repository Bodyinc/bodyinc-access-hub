import { i as __toESM } from "../_runtime.mjs";
import { n as supabase } from "./client-G-x0iJHV.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-BkEeRci-.mjs";
import { t as Input } from "./input-B8Q2ztVi.mjs";
import { D as LoaderCircle, i as Trash2, m as ImagePlus, r as Upload, s as Plus } from "../_libs/lucide-react.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CtX3ithx.mjs";
import { c as medicineFormSchema, n as MEDICINE_STATUS_LABELS, t as MEDICINE_STATUSES } from "./medicines-8zD_oRw1.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-Dg1urBTx.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { t as Textarea } from "./textarea-kko37XEX.mjs";
import { n as useFieldArray, r as useForm, t as u } from "../_libs/@hookform/resolvers+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/medicine-form-v23mzxJp.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var BUCKET = "medicine-images";
var MAX_BYTES = 5 * 1024 * 1024;
var ALLOWED_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp"
];
async function uploadMedicineImage(file) {
	if (!ALLOWED_TYPES.includes(file.type)) throw new Error("Only JPG, PNG, or WebP images are allowed.");
	if (file.size > MAX_BYTES) throw new Error("Image must be 5MB or smaller.");
	const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
	const path = `${crypto.randomUUID()}.${ext}`;
	const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
		cacheControl: "3600",
		upsert: false
	});
	if (error) throw new Error(error.message);
	const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
	return data.publicUrl;
}
var EMPTY = {
	name: "",
	short_description: "",
	long_description: "",
	image_url: "",
	price_monthly: 0,
	status: "draft",
	important_info: [],
	notice_text: "",
	sort_order: 0
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
function MedicineForm({ defaultValues, mode, submitting, onSubmit, onCancel, onValuesChange }) {
	const fileRef = (0, import_react.useRef)(null);
	const [uploading, setUploading] = (0, import_react.useState)(false);
	const [uploadError, setUploadError] = (0, import_react.useState)(null);
	const { register, handleSubmit, watch, setValue, control, formState } = useForm({
		resolver: u(medicineFormSchema),
		defaultValues: {
			...EMPTY,
			...defaultValues
		}
	});
	const errors = formState.errors;
	const status = watch("status");
	const imageUrl = watch("image_url");
	const { fields, append, remove } = useFieldArray({
		control,
		name: "important_info"
	});
	(0, import_react.useEffect)(() => {
		if (!onValuesChange) return;
		const subscription = watch((formValues) => {
			onValuesChange(formValues);
		});
		return () => subscription.unsubscribe();
	}, [watch, onValuesChange]);
	async function handleImageSelect(file) {
		setUploadError(null);
		setUploading(true);
		try {
			setValue("image_url", await uploadMedicineImage(file), { shouldValidate: true });
		} catch (e) {
			setUploadError(e.message);
		} finally {
			setUploading(false);
		}
	}
	function onFileChange(e) {
		const file = e.target.files?.[0];
		if (file) handleImageSelect(file);
		e.target.value = "";
	}
	function onDrop(e) {
		e.preventDefault();
		const file = e.dataTransfer.files?.[0];
		if (file) handleImageSelect(file);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: handleSubmit(onSubmit),
		className: "space-y-6",
		noValidate: true,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: mode === "create" ? "Add medicine" : "Edit medicine" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Product image and details shown to patients." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Product image",
						error: errors.image_url?.message ?? uploadError ?? void 0,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/30 p-6 transition-colors hover:bg-muted/50",
							onDragOver: (e) => e.preventDefault(),
							onDrop,
							children: [
								imageUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: imageUrl,
									alt: "Medicine preview",
									className: "h-40 w-auto max-w-full rounded-md object-contain"
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex h-32 w-24 items-center justify-center rounded-md bg-muted",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ImagePlus, { className: "h-8 w-8 text-muted-foreground" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									ref: fileRef,
									type: "file",
									accept: "image/jpeg,image/png,image/webp",
									className: "hidden",
									onChange: onFileChange,
									disabled: submitting || uploading
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									type: "button",
									variant: "outline",
									size: "sm",
									disabled: submitting || uploading,
									onClick: () => fileRef.current?.click(),
									children: [uploading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-1.5 h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "mr-1.5 h-4 w-4" }), uploading ? "Uploading…" : imageUrl ? "Replace image" : "Upload image"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground",
									children: "JPG, PNG, or WebP · Max 5MB"
								})
							]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Medicine name",
						error: errors.name?.message,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							...register("name"),
							placeholder: "e.g. GLP-1 Compound",
							disabled: submitting
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Short description",
						error: errors.short_description?.message,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							...register("short_description"),
							placeholder: "Shown on the medication card",
							disabled: submitting
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Long description",
						error: errors.long_description?.message,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
							...register("long_description"),
							rows: 4,
							placeholder: "Full description in the Learn More modal",
							disabled: submitting
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-4 sm:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Price per month ($)",
							error: errors.price_monthly?.message,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "number",
								step: "0.01",
								min: 0,
								...register("price_monthly"),
								disabled: submitting
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Status",
							error: errors.status?.message,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								value: status,
								onValueChange: (v) => setValue("status", v),
								disabled: submitting,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: MEDICINE_STATUSES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: s,
									children: MEDICINE_STATUS_LABELS[s]
								}, s)) })]
							})
						})]
					})
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
				className: "text-base",
				children: "Important information"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Bullet points shown in the Learn More modal." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "space-y-3",
				children: [fields.map((field, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						...register(`important_info.${index}.text`),
						placeholder: `Bullet ${index + 1}`,
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
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "mr-1.5 h-4 w-4" }), " Add bullet"]
				})]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
				className: "text-base",
				children: "Notice"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Optional footer disclaimer in the modal." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
				...register("notice_text"),
				rows: 2,
				placeholder: "e.g. Individual results may vary…",
				disabled: submitting
			}) })] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					disabled: submitting || uploading,
					children: submitting ? "Saving…" : mode === "create" ? "Create medicine" : "Save changes"
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
export { MedicineForm };
