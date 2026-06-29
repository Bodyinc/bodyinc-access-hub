import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { F as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as useQueryClient, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { i as createMedicine, u as medicinesQueryKey } from "./medicines-LJTZ9Z5B.mjs";
import { t as FormSkeleton } from "./form-skeleton-SmoCN7_U.mjs";
import { n as toast } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.medicines.new-BnyGz6Uc.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var MedicineForm = (0, import_react.lazy)(() => import("./medicine-form-B0yVPZ0L.mjs").then((m) => ({ default: m.MedicineForm })));
var MedicinePreview = (0, import_react.lazy)(() => import("./medicine-preview-M3ZXtljN.mjs").then((m) => ({ default: m.MedicinePreview })));
function NewMedicinePage() {
	const navigate = useNavigate();
	const qc = useQueryClient();
	const [previewValues, setPreviewValues] = (0, import_react.useState)({
		name: "",
		short_description: "",
		long_description: "",
		image_url: "",
		price_monthly: 0,
		status: "draft",
		important_info: [],
		notice_text: "",
		sort_order: 0
	});
	const mutation = useMutation({
		mutationFn: (values) => createMedicine(values),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: medicinesQueryKey });
			toast.success("Medicine created");
			navigate({ to: "/admin/medicines" });
		},
		onError: (e) => toast.error(e.message)
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mx-auto max-w-5xl",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-6 lg:grid-cols-2 lg:items-start",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
				fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSkeleton, {}),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MedicineForm, {
					mode: "create",
					submitting: mutation.isPending,
					onSubmit: (values) => mutation.mutate(values),
					onCancel: () => navigate({ to: "/admin/medicines" }),
					onValuesChange: setPreviewValues
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "lg:sticky lg:top-20",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
					fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSkeleton, {}),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MedicinePreview, {
						name: previewValues.name,
						short_description: previewValues.short_description,
						long_description: previewValues.long_description,
						image_url: previewValues.image_url,
						price_monthly: previewValues.price_monthly,
						important_info: previewValues.important_info,
						notice_text: previewValues.notice_text
					})
				})
			})]
		})
	});
}
//#endregion
export { NewMedicinePage as component };
