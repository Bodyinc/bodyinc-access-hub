import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { F as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as useQueryClient, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { t as FormSkeleton } from "./form-skeleton-SmoCN7_U.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as useServerFn } from "./createSsrRpc-NTk29FAB.mjs";
import { t as createQuestion } from "./questions.functions-CgcgEHZL.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.questions.new-i5_IVjDa.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var QuestionForm = (0, import_react.lazy)(() => import("./question-form-CRFW3iZY.mjs").then((m) => ({ default: m.QuestionForm })));
var QuestionPreview = (0, import_react.lazy)(() => import("./question-preview-BMZmZSrE.mjs").then((m) => ({ default: m.QuestionPreview })));
function NewQuestionPage() {
	const navigate = useNavigate();
	const qc = useQueryClient();
	const create = useServerFn(createQuestion);
	const [previewValues, setPreviewValues] = (0, import_react.useState)({
		prompt: "",
		description: "",
		question_type: "short_text",
		sort_order: 0,
		is_required: true,
		is_active: true,
		options: []
	});
	const mutation = useMutation({
		mutationFn: (values) => create({ data: values }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["questions"] });
			toast.success("Question created");
			navigate({ to: "/admin/questions" });
		},
		onError: (e) => toast.error(e.message)
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mx-auto max-w-5xl",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-6 lg:grid-cols-2 lg:items-start",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
				fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSkeleton, {}),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuestionForm, {
					mode: "create",
					submitting: mutation.isPending,
					onSubmit: (values) => mutation.mutate(values),
					onCancel: () => navigate({ to: "/admin/questions" }),
					onValuesChange: setPreviewValues
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "lg:sticky lg:top-20",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
					fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSkeleton, {}),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuestionPreview, {
						prompt: previewValues.prompt,
						description: previewValues.description,
						question_type: previewValues.question_type,
						options: previewValues.options,
						is_required: previewValues.is_required
					})
				})
			})]
		})
	});
}
//#endregion
export { NewQuestionPage as component };
