import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-BkEeRci-.mjs";
import { t as Input } from "./input-B8Q2ztVi.mjs";
import { F as useNavigate, g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { O as Ellipsis, o as Search, s as Plus } from "../_libs/lucide-react.mjs";
import { a as useQueryClient, r as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CtX3ithx.mjs";
import { a as deleteMedicine, d as medicinesQueryOptions, f as setMedicineActive, n as MEDICINE_STATUS_LABELS, o as formatPrice, t as MEDICINE_STATUSES, u as medicinesQueryKey } from "./medicines-8zD_oRw1.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-Dg1urBTx.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { _ as TableHead, a as AlertDialogDescription, c as AlertDialogTitle, d as DropdownMenuItem, f as DropdownMenuSeparator, g as TableCell, h as TableBody, i as AlertDialogContent, l as DropdownMenu, m as Table, n as AlertDialogAction, o as AlertDialogFooter, p as DropdownMenuTrigger, r as AlertDialogCancel, s as AlertDialogHeader, t as AlertDialog, u as DropdownMenuContent, v as TableHeader, y as TableRow } from "./alert-dialog-0o8t1Tzn.mjs";
import { t as LocalStorageBanner } from "./local-storage-banner-D_Ruc4d4.mjs";
import { i as packagesQueryKey } from "./packages-C9A6ec8R.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.medicines.index-B9LwghtK.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function truncate(text, max = 60) {
	return text.length > max ? `${text.slice(0, max)}…` : text;
}
function formatUpdated(iso) {
	return new Date(iso).toLocaleDateString(void 0, {
		month: "short",
		day: "numeric",
		year: "numeric"
	});
}
function statusVariant(status) {
	if (status === "active") return "default";
	if (status === "draft") return "outline";
	return "secondary";
}
function MedicinesListPage() {
	const navigate = useNavigate();
	const qc = useQueryClient();
	const [search, setSearch] = (0, import_react.useState)("");
	const [status, setStatus] = (0, import_react.useState)("all");
	const [confirmDelete, setConfirmDelete] = (0, import_react.useState)(null);
	const query = useQuery(medicinesQueryOptions());
	const allRows = query.data ?? [];
	const rows = allRows.filter((m) => {
		if (status !== "all" && m.status !== status) return false;
		if (!search) return true;
		const q = search.toLowerCase();
		return m.name.toLowerCase().includes(q) || m.short_description.toLowerCase().includes(q) || (m.long_description?.toLowerCase().includes(q) ?? false);
	});
	const statusMut = useMutation({
		mutationFn: (vars) => setMedicineActive(vars.id, vars.status),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: medicinesQueryKey });
			toast.success("Status updated");
		},
		onError: (e) => toast.error(e.message)
	});
	const deleteMut = useMutation({
		mutationFn: (id) => deleteMedicine(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: medicinesQueryKey });
			qc.invalidateQueries({ queryKey: packagesQueryKey });
			toast.success("Medicine deleted");
			setConfirmDelete(null);
		},
		onError: (e) => toast.error(e.message)
	});
	const isEmpty = !query.isLoading && allRows.length === 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LocalStorageBanner, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-lg font-semibold",
					children: "Medicines"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "Manage the medication catalog shown to patients during onboarding."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					onClick: () => navigate({ to: "/admin/medicines/new" }),
					className: "shrink-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "mr-1.5 h-4 w-4" }), " Add New Medicine"]
				})]
			}),
			!isEmpty && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-3 sm:flex-row sm:items-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative min-w-[200px] max-w-sm flex-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: search,
						onChange: (e) => setSearch(e.target.value),
						placeholder: "Search medicines",
						className: "pl-8"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
					value: status,
					onValueChange: (v) => setStatus(v),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
						className: "w-40",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
						value: "all",
						children: "All statuses"
					}), MEDICINE_STATUSES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
						value: s,
						children: MEDICINE_STATUS_LABELS[s]
					}, s))] })]
				})]
			}),
			isEmpty ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "border-dashed",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
					className: "text-center",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "No medicines yet" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Add your first medicine to build the patient medication catalog." })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
					className: "flex justify-center pb-8",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						onClick: () => navigate({ to: "/admin/medicines/new" }),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "mr-1.5 h-4 w-4" }), " Add your first medicine"]
					})
				})]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Name" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Description" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Price" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Status" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Updated" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { className: "w-12" })
			] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableBody, { children: [query.isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableRow, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
				colSpan: 6,
				className: "py-8 text-center text-muted-foreground",
				children: "Loading…"
			}) }), rows.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, {
				className: "cursor-pointer",
				onClick: () => navigate({
					to: "/admin/medicines/$medicineId",
					params: { medicineId: m.id }
				}),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
						className: "font-medium",
						children: m.name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
						className: "max-w-xs text-muted-foreground",
						children: truncate(m.short_description)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableCell, { children: [formatPrice(m.price_monthly), "/mo"] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						variant: statusVariant(m.status),
						children: MEDICINE_STATUS_LABELS[m.status]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
						className: "text-muted-foreground",
						children: formatUpdated(m.updated_at)
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
										to: "/admin/medicines/$medicineId",
										params: { medicineId: m.id },
										children: "Edit"
									})
								}),
								m.status !== "active" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
									onClick: () => statusMut.mutate({
										id: m.id,
										status: "active"
									}),
									children: "Set active"
								}),
								m.status === "active" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
									onClick: () => statusMut.mutate({
										id: m.id,
										status: "inactive"
									}),
									children: "Set inactive"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuSeparator, {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
									className: "text-destructive focus:text-destructive",
									onClick: () => setConfirmDelete({
										id: m.id,
										name: m.name
									}),
									children: "Delete"
								})
							]
						})] })
					})
				]
			}, m.id))] })] }) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
				open: !!confirmDelete,
				onOpenChange: (o) => !o && setConfirmDelete(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTitle, { children: "Delete medicine?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogDescription, { children: [
					"This permanently removes “",
					confirmDelete?.name,
					"”. Linked packages will remain but may show an unknown medicine name."
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
export { MedicinesListPage as component };
