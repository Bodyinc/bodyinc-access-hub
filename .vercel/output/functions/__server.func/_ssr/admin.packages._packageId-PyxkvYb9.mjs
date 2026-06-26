import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { F as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as useQueryClient, r as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { d as medicinesQueryOptions } from "./medicines-8zD_oRw1.mjs";
import { t as FormSkeleton } from "./form-skeleton-SmoCN7_U.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { i as packagesQueryKey, r as packageQueryOptions, s as updatePackage } from "./packages-C9A6ec8R.mjs";
import { t as Route } from "./admin.packages._packageId-CdF1JV7R.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.packages._packageId-PyxkvYb9.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var PackageForm = (0, import_react.lazy)(() => import("./package-form-tGtv67nA.mjs").then((m) => ({ default: m.PackageForm })));
var PackagePreview = (0, import_react.lazy)(() => import("./package-preview-CyEpZEO5.mjs").then((m) => ({ default: m.PackagePreview })));
function toFormValues(p) {
	return {
		medicine_id: p.medicine_id,
		name: p.name,
		duration_months: p.duration_months,
		original_price: p.original_price,
		price: p.price,
		is_most_popular: p.is_most_popular,
		features: p.features.map((text) => ({ text })),
		clinical_note: p.clinical_note ?? "",
		sort_order: p.sort_order,
		is_active: p.is_active
	};
}
function EditPackagePage() {
	const { packageId } = Route.useParams();
	const navigate = useNavigate();
	const qc = useQueryClient();
	const medicinesQuery = useQuery(medicinesQueryOptions());
	const packageQuery = useQuery(packageQueryOptions(packageId));
	const [previewValues, setPreviewValues] = (0, import_react.useState)(null);
	const mutation = useMutation({
		mutationFn: (values) => updatePackage(packageId, values),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: packagesQueryKey });
			qc.invalidateQueries({ queryKey: ["package", packageId] });
			toast.success("Package updated");
			navigate({ to: "/admin/packages" });
		},
		onError: (e) => toast.error(e.message)
	});
	const pkg = packageQuery.data;
	const medicines = medicinesQuery.data ?? [];
	if (packageQuery.isLoading && !pkg || medicinesQuery.isLoading && medicines.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-muted-foreground",
		children: "Loading…"
	});
	if (!pkg) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
		className: "text-sm text-destructive",
		children: [
			"Package not found.",
			" ",
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "underline",
				onClick: () => navigate({ to: "/admin/packages" }),
				children: "Back to list"
			})
		]
	});
	const formDefaults = toFormValues(pkg);
	const preview = previewValues ?? formDefaults;
	const selectedMedicine = medicines.find((m) => m.id === preview.medicine_id);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mx-auto max-w-5xl",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-6 lg:grid-cols-2 lg:items-start",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
				fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSkeleton, {}),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PackageForm, {
					mode: "edit",
					medicines,
					defaultValues: formDefaults,
					submitting: mutation.isPending,
					onSubmit: (values) => mutation.mutate(values),
					onCancel: () => navigate({ to: "/admin/packages" }),
					onValuesChange: setPreviewValues
				}, packageId)
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "lg:sticky lg:top-20",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
					fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSkeleton, {}),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PackagePreview, {
						medicine_name: selectedMedicine?.name,
						name: preview.name,
						duration_months: preview.duration_months,
						original_price: preview.original_price,
						price: preview.price,
						is_most_popular: preview.is_most_popular,
						features: preview.features,
						clinical_note: preview.clinical_note
					})
				})
			})]
		})
	});
}
//#endregion
export { EditPackagePage as component };
