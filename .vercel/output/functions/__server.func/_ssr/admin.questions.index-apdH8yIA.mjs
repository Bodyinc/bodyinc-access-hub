import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-BkEeRci-.mjs";
import { t as Input } from "./input-B8Q2ztVi.mjs";
import { F as useNavigate, g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { O as Ellipsis, o as Search, s as Plus, x as ChevronDown, y as ChevronUp } from "../_libs/lucide-react.mjs";
import { a as useQueryClient, r as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CtX3ithx.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-Dg1urBTx.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { _ as TableHead, a as AlertDialogDescription, c as AlertDialogTitle, d as DropdownMenuItem, f as DropdownMenuSeparator, g as TableCell, h as TableBody, i as AlertDialogContent, l as DropdownMenu, m as Table, n as AlertDialogAction, o as AlertDialogFooter, p as DropdownMenuTrigger, r as AlertDialogCancel, s as AlertDialogHeader, t as AlertDialog, u as DropdownMenuContent, v as TableHeader, y as TableRow } from "./alert-dialog-0o8t1Tzn.mjs";
import { n as useServerFn } from "./createSsrRpc-NTk29FAB.mjs";
import { t as useDebouncedValue } from "./use-debounced-value-D8kc3Vfw.mjs";
import { a as isMcqType, i as QUESTION_TYPE_LABELS, n as QUESTION_TYPE_BADGE_LABELS, t as QUESTION_TYPES } from "./questions.schema-C_UYXgFv.mjs";
import { a as moveQuestion, i as listQuestions, n as deleteQuestion, o as setQuestionActive } from "./questions.functions-CgcgEHZL.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.questions.index-apdH8yIA.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function truncate(text, max = 80) {
	return text.length > max ? `${text.slice(0, max)}…` : text;
}
function QuestionsListPage() {
	const navigate = useNavigate();
	const qc = useQueryClient();
	const list = useServerFn(listQuestions);
	const setActive = useServerFn(setQuestionActive);
	const del = useServerFn(deleteQuestion);
	const move = useServerFn(moveQuestion);
	const [search, setSearch] = (0, import_react.useState)("");
	const debouncedSearch = useDebouncedValue(search);
	const [type, setType] = (0, import_react.useState)("all");
	const [status, setStatus] = (0, import_react.useState)("all");
	const [confirmDelete, setConfirmDelete] = (0, import_react.useState)(null);
	const query = useQuery({
		queryKey: ["questions", {
			search: debouncedSearch,
			type,
			status
		}],
		queryFn: () => list({ data: {
			search: debouncedSearch || void 0,
			type,
			status
		} })
	});
	const activeMut = useMutation({
		mutationFn: (vars) => setActive({ data: vars }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["questions"] });
			toast.success("Updated");
		},
		onError: (e) => toast.error(e.message)
	});
	const deleteMut = useMutation({
		mutationFn: (id) => del({ data: { id } }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["questions"] });
			toast.success("Question deleted");
			setConfirmDelete(null);
		},
		onError: (e) => toast.error(e.message)
	});
	const moveMut = useMutation({
		mutationFn: (vars) => move({ data: vars }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["questions"] });
		},
		onError: (e) => toast.error(e.message)
	});
	const rows = query.data ?? [];
	const isEmpty = !query.isLoading && !query.isError && rows.length === 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-lg font-semibold",
					children: "Intake Questions"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "Build the screening quiz shown to first-time visitors before they sign up."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					onClick: () => navigate({ to: "/admin/questions/new" }),
					className: "shrink-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "mr-1.5 h-4 w-4" }), " Add Question"]
				})]
			}),
			!isEmpty && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-col gap-3 sm:flex-row sm:items-center",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-1 flex-wrap items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative min-w-[200px] max-w-sm flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: search,
								onChange: (e) => setSearch(e.target.value),
								placeholder: "Search questions",
								className: "pl-8"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							value: type,
							onValueChange: (v) => setType(v),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
								className: "w-44",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "all",
								children: "All types"
							}), QUESTION_TYPES.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: t,
								children: QUESTION_TYPE_LABELS[t]
							}, t))] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							value: status,
							onValueChange: (v) => setStatus(v),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
								className: "w-36",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: "all",
									children: "All"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: "active",
									children: "Active"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: "inactive",
									children: "Inactive"
								})
							] })]
						})
					]
				})
			}),
			query.isError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "border-destructive/40",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "py-6 text-center text-sm text-destructive",
					children: [query.error.message, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs text-muted-foreground",
						children: "Ensure the intake questions migration has been applied in Supabase."
					})]
				})
			}),
			isEmpty ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "border-dashed",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
					className: "text-center",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "No questions yet" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Add your first intake question to start building the patient screening quiz." })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
					className: "flex justify-center pb-8",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						onClick: () => navigate({ to: "/admin/questions/new" }),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "mr-1.5 h-4 w-4" }), " Add your first question"]
					})
				})]
			}) : !query.isError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
					className: "w-16",
					children: "#"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Question" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Type" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Required" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Status" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
					className: "w-24",
					children: "Order"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { className: "w-12" })
			] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableBody, { children: [query.isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableRow, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
				colSpan: 7,
				className: "py-8 text-center text-muted-foreground",
				children: "Loading…"
			}) }), rows.map((q, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, {
				className: "cursor-pointer",
				onClick: () => navigate({
					to: "/admin/questions/$questionId",
					params: { questionId: q.id }
				}),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
						className: "text-muted-foreground",
						children: index + 1
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableCell, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "font-medium",
							children: truncate(q.prompt)
						}),
						q.description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs text-muted-foreground",
							children: truncate(q.description, 60)
						}),
						isMcqType(q.question_type) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-xs text-muted-foreground",
							children: [
								q.option_count,
								" option",
								q.option_count === 1 ? "" : "s"
							]
						})
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						variant: "outline",
						children: QUESTION_TYPE_BADGE_LABELS[q.question_type]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: q.is_required ? "Yes" : "No" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						variant: q.is_active ? "default" : "secondary",
						children: q.is_active ? "Active" : "Inactive"
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
						onClick: (e) => e.stopPropagation(),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-0.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "icon",
								className: "h-7 w-7",
								disabled: index === 0 || moveMut.isPending,
								onClick: () => moveMut.mutate({
									id: q.id,
									direction: "up"
								}),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, { className: "h-4 w-4" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "icon",
								className: "h-7 w-7",
								disabled: index === rows.length - 1 || moveMut.isPending,
								onClick: () => moveMut.mutate({
									id: q.id,
									direction: "down"
								}),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-4 w-4" })
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
						onClick: (e) => e.stopPropagation(),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenu, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuTrigger, {
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "icon",
								className: "h-8 w-8",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ellipsis, { className: "h-4 w-4" })
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuContent, {
							align: "end",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
									asChild: true,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
										to: "/admin/questions/$questionId",
										params: { questionId: q.id },
										children: "Edit"
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
									onClick: () => activeMut.mutate({
										id: q.id,
										is_active: !q.is_active
									}),
									children: q.is_active ? "Deactivate" : "Activate"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuSeparator, {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
									className: "text-destructive focus:text-destructive",
									onClick: () => setConfirmDelete({
										id: q.id,
										prompt: truncate(q.prompt, 60)
									}),
									children: "Delete"
								})
							]
						})] })
					})
				]
			}, q.id))] })] }) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
				open: !!confirmDelete,
				onOpenChange: (o) => !o && setConfirmDelete(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTitle, { children: "Delete question?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogDescription, { children: [
					"This permanently removes “",
					confirmDelete?.prompt,
					"”. This cannot be undone."
				] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, { children: "Cancel" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
					onClick: () => confirmDelete && deleteMut.mutate(confirmDelete.id),
					className: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
					children: "Delete"
				})] })] })
			})
		]
	});
}
//#endregion
export { QuestionsListPage as component };
