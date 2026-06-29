import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { F as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as useQueryClient, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { t as FormSkeleton } from "./form-skeleton-SmoCN7_U.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as useServerFn } from "./createSsrRpc-NTk29FAB.mjs";
import { t as createProvider } from "./providers.functions-s8Doq1Xz.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.providers.new-gOILcotN.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var ProviderForm = (0, import_react.lazy)(() => import("./provider-form-B5-_FnaJ.mjs").then((m) => ({ default: m.ProviderForm })));
function NewProviderPage() {
	const navigate = useNavigate();
	const qc = useQueryClient();
	const create = useServerFn(createProvider);
	const mutation = useMutation({
		mutationFn: (values) => create({ data: {
			...values,
			redirect_to: `${window.location.origin}/reset-password`
		} }),
		onSuccess: (res) => {
			qc.invalidateQueries({ queryKey: ["providers"] });
			toast.success(res.invite_sent ? "Provider created — invite sent" : "Provider created");
			navigate({ to: "/admin/providers" });
		},
		onError: (e) => toast.error(e.message)
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mx-auto max-w-4xl",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
			fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSkeleton, {}),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProviderForm, {
				mode: "create",
				submitting: mutation.isPending,
				onSubmit: (values) => mutation.mutate(values),
				onCancel: () => navigate({ to: "/admin/providers" })
			})
		})
	});
}
//#endregion
export { NewProviderPage as component };
