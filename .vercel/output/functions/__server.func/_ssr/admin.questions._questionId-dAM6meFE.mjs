import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { F as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as useQueryClient, r as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { t as FormSkeleton } from "./form-skeleton-SmoCN7_U.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as useServerFn } from "./createSsrRpc-NTk29FAB.mjs";
import { t as Route } from "./admin.questions._questionId-BNKl9P90.mjs";
import { r as getQuestion, s as updateQuestion } from "./questions.functions-CgcgEHZL.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.questions._questionId-dAM6meFE.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var QuestionForm = (0, import_react.lazy)(() => import("./question-form-CRFW3iZY.mjs").then((m) => ({ default: m.QuestionForm })));
var QuestionPreview = (0, import_react.lazy)(() => import("./question-preview-BMZmZSrE.mjs").then((m) => ({ default: m.QuestionPreview })));
function EditQuestionPage() {
	const { questionId } = Route.useParams();
	const navigate = useNavigate();
	const qc = useQueryClient();
	const get = useServerFn(getQuestion);
	const update = useServerFn(updateQuestion);
	const [previewValues, setPreviewValues] = (0, import_react.useState)(null);
	const query = useQuery({
		queryKey: ["questions", questionId],
		queryFn: () => get({ data: { id: questionId } })
	});
	const mutation = useMutation({
		mutationFn: (values) => update({ data: {
			id: questionId,
			...values
		} }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["questions"] });
			toast.success("Question updated");
			navigate({ to: "/admin/questions" });
		},
		onError: (e) => toast.error(e.message)
	});
	if (query.isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "text-sm text-muted-foreground",
		children: "Loading question…"
	});
	if (query.isError || !query.data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "text-sm text-destructive",
		children: query.error?.message ?? "Question not found"
	});
	const d = query.data;
	const defaultValues = {
		prompt: d.prompt,
		description: d.description ?? "",
		question_type: d.question_type,
		sort_order: d.sort_order,
		is_required: d.is_required,
		is_active: d.is_active,
		options: (d.intake_question_options ?? []).map((opt) => ({
			label: opt.label,
			sort_order: opt.sort_order
		}))
	};
	const preview = previewValues ?? defaultValues;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mx-auto max-w-5xl",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-6 lg:grid-cols-2 lg:items-start",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
				fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSkeleton, {}),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuestionForm, {
					mode: "edit",
					questionPosition: d.position ?? null,
					submitting: mutation.isPending,
					defaultValues,
					onSubmit: (values) => mutation.mutate(values),
					onCancel: () => navigate({ to: "/admin/questions" }),
					onValuesChange: setPreviewValues
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "lg:sticky lg:top-20",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
					fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormSkeleton, {}),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuestionPreview, {
						prompt: preview.prompt,
						description: preview.description,
						question_type: preview.question_type,
						options: preview.options,
						is_required: preview.is_required
					})
				})
			})]
		})
	});
}
//#endregion
export { EditQuestionPage as component };
