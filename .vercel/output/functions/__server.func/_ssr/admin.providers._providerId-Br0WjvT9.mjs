import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { F as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as useQueryClient, r as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { t as FormSkeleton } from "./form-skeleton-SmoCN7_U.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as useServerFn } from "./createSsrRpc-NTk29FAB.mjs";
import { t as Route } from "./admin.providers._providerId-BL_uMh_c.mjs";
import { r as getProvider, s as updateProvider } from "./providers.functions-s8Doq1Xz.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.providers._providerId-Br0WjvT9.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var ProviderForm = (0, import_react.lazy)(() => import("./provider-form-B5-_FnaJ.mjs").then((m) => ({ default: m.ProviderForm })));
function EditProviderPage() {
	const { providerId } = Route.useParams();
	const navigate = useNavigate();
	const qc = useQueryClient();
	const get = useServerFn(getProvider);
	const update = useServerFn(updateProvider);
	const query = useQuery({
		queryKey: ["providers", providerId],
		queryFn: () => get({ data: { id: providerId } })
	});
	const mutation = useMutation({
		mutationFn: (values) => update({ data: {
			id: providerId,
			...values
		} }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["providers"] });
			toast.success("Provider updated");
			navigate({ to: "/admin/providers" });
		},
		onError: (e) => toast.error(e.message)
	});
	if (query.isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "text-sm text-muted-foreground",
		children: "Loading provider…"
	});
	if (query.isError || !query.data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "text-sm text-destructive",
		children: query.error?.message ?? "Provider not found"
	});
	const d = query.data;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mx-auto max-w-4xl",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
			fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSkeleton, {}),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProviderForm, {
				mode: "edit",
				submitting: mutation.isPending,
				defaultValues: {
					email: d.email,
					full_name: d.full_name,
					phone: d.phone ?? "",
					avatar_url: d.avatar_url ?? "",
					bio: d.bio ?? "",
					credentials: d.credentials ?? void 0,
					specialty: d.specialty ?? "",
					npi: d.npi ?? "",
					dea: d.dea ?? "",
					license_number: d.license_number ?? "",
					license_states: d.license_states ?? [],
					years_experience: d.years_experience ?? void 0,
					languages: d.languages ?? [],
					consultation_types: d.consultation_types ?? [],
					practice_states: d.practice_states ?? [],
					address_line1: d.address_line1 ?? "",
					address_line2: d.address_line2 ?? "",
					city: d.city ?? "",
					state: d.state ?? void 0,
					zip: d.zip ?? "",
					country: d.country ?? "US",
					is_active: d.is_active
				},
				onSubmit: (values) => mutation.mutate(values),
				onCancel: () => navigate({ to: "/admin/providers" })
			})
		})
	});
}
//#endregion
export { EditProviderPage as component };
