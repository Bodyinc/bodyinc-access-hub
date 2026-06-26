import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { F as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as useQueryClient, r as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { l as medicineQueryOptions, p as updateMedicine, u as medicinesQueryKey } from "./medicines-8zD_oRw1.mjs";
import { t as Route } from "./admin.medicines._medicineId-bCSwU20u.mjs";
import { t as FormSkeleton } from "./form-skeleton-SmoCN7_U.mjs";
import { n as toast } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.medicines._medicineId-ZptWltRe.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var MedicineForm = (0, import_react.lazy)(() => import("./medicine-form-v23mzxJp.mjs").then((m) => ({ default: m.MedicineForm })));
var MedicinePreview = (0, import_react.lazy)(() => import("./medicine-preview-CAeimfn4.mjs").then((m) => ({ default: m.MedicinePreview })));
function normalizeBullets(info) {
	if (!Array.isArray(info)) return [];
	return info.map((item) => {
		if (typeof item === "string") return { text: item };
		if (item && typeof item === "object" && "text" in item) return { text: String(item.text ?? "") };
		return { text: "" };
	});
}
function toFormValues(m) {
	return {
		name: m.name,
		short_description: m.short_description,
		long_description: m.long_description ?? "",
		image_url: m.image_url ?? "",
		price_monthly: m.price_monthly,
		status: m.status,
		important_info: normalizeBullets(m.important_info),
		notice_text: m.notice_text ?? "",
		sort_order: m.sort_order
	};
}
function EditMedicinePage() {
	const { medicineId } = Route.useParams();
	const navigate = useNavigate();
	const qc = useQueryClient();
	const medicineQuery = useQuery(medicineQueryOptions(medicineId));
	const [previewValues, setPreviewValues] = (0, import_react.useState)(null);
	const handlePreviewChange = (0, import_react.useCallback)((values) => {
		setPreviewValues(values);
	}, []);
	const mutation = useMutation({
		mutationFn: (values) => updateMedicine(medicineId, values),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: medicinesQueryKey });
			qc.invalidateQueries({ queryKey: ["medicine", medicineId] });
			toast.success("Medicine updated");
			navigate({ to: "/admin/medicines" });
		},
		onError: (e) => toast.error(e.message)
	});
	if (medicineQuery.isLoading && !medicineQuery.data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-muted-foreground",
		children: "Loading…"
	});
	const medicine = medicineQuery.data;
	if (!medicine) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
		className: "text-sm text-destructive",
		children: [
			"Medicine not found.",
			" ",
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "underline",
				onClick: () => navigate({ to: "/admin/medicines" }),
				children: "Back to list"
			})
		]
	});
	const formDefaults = toFormValues(medicine);
	const preview = previewValues ?? formDefaults;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mx-auto max-w-5xl",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-6 lg:grid-cols-2 lg:items-start",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
				fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSkeleton, {}),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MedicineForm, {
					mode: "edit",
					defaultValues: formDefaults,
					submitting: mutation.isPending,
					onSubmit: (values) => mutation.mutate(values),
					onCancel: () => navigate({ to: "/admin/medicines" }),
					onValuesChange: handlePreviewChange
				}, medicineId)
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "lg:sticky lg:top-20",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
					fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSkeleton, {}),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MedicinePreview, {
						name: preview.name,
						short_description: preview.short_description,
						long_description: preview.long_description,
						image_url: preview.image_url,
						price_monthly: preview.price_monthly,
						important_info: preview.important_info,
						notice_text: preview.notice_text
					})
				})
			})]
		})
	});
}
//#endregion
export { EditMedicinePage as component };
