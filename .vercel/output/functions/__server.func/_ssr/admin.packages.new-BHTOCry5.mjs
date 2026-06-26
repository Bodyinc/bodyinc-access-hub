import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { F as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as useQueryClient, r as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { d as medicinesQueryOptions } from "./medicines-8zD_oRw1.mjs";
import { t as FormSkeleton } from "./form-skeleton-SmoCN7_U.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { i as packagesQueryKey, t as createPackage } from "./packages-C9A6ec8R.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.packages.new-BHTOCry5.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var PackageForm = (0, import_react.lazy)(() => import("./package-form-tGtv67nA.mjs").then((m) => ({ default: m.PackageForm })));
var PackagePreview = (0, import_react.lazy)(() => import("./package-preview-CyEpZEO5.mjs").then((m) => ({ default: m.PackagePreview })));
function NewPackagePage() {
	const navigate = useNavigate();
	const qc = useQueryClient();
	const medicinesQuery = useQuery(medicinesQueryOptions());
	const [previewValues, setPreviewValues] = (0, import_react.useState)({
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
	});
	const mutation = useMutation({
		mutationFn: (values) => createPackage(values),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: packagesQueryKey });
			toast.success("Package created");
			navigate({ to: "/admin/packages" });
		},
		onError: (e) => toast.error(e.message)
	});
	const medicines = medicinesQuery.data ?? [];
	const selectedMedicine = medicines.find((m) => m.id === previewValues.medicine_id);
	if (medicinesQuery.isLoading && !medicinesQuery.data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-muted-foreground",
		children: "Loading…"
	});
	if (medicines.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
		className: "text-sm text-muted-foreground",
		children: [
			"Add a medicine before creating packages.",
			" ",
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "underline",
				onClick: () => navigate({ to: "/admin/medicines/new" }),
				children: "Add medicine"
			})
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mx-auto max-w-5xl",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-6 lg:grid-cols-2 lg:items-start",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
				fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSkeleton, {}),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PackageForm, {
					mode: "create",
					medicines,
					defaultValues: { medicine_id: medicines[0]?.id },
					submitting: mutation.isPending,
					onSubmit: (values) => mutation.mutate(values),
					onCancel: () => navigate({ to: "/admin/packages" }),
					onValuesChange: setPreviewValues
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "lg:sticky lg:top-20",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
					fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSkeleton, {}),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PackagePreview, {
						medicine_name: selectedMedicine?.name,
						name: previewValues.name,
						duration_months: previewValues.duration_months,
						original_price: previewValues.original_price,
						price: previewValues.price,
						is_most_popular: previewValues.is_most_popular,
						features: previewValues.features,
						clinical_note: previewValues.clinical_note
					})
				})
			})]
		})
	});
}
//#endregion
export { NewPackagePage as component };
