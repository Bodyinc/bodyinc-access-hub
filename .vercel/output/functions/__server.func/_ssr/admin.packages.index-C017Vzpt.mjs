import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-BkEeRci-.mjs";
import { t as Input } from "./input-B8Q2ztVi.mjs";
import { F as useNavigate, g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { O as Ellipsis, o as Search, s as Plus } from "../_libs/lucide-react.mjs";
import { a as useQueryClient, r as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CtX3ithx.mjs";
import { d as medicinesQueryOptions } from "./medicines-8zD_oRw1.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-Dg1urBTx.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { _ as TableHead, a as AlertDialogDescription, c as AlertDialogTitle, d as DropdownMenuItem, f as DropdownMenuSeparator, g as TableCell, h as TableBody, i as AlertDialogContent, l as DropdownMenu, m as Table, n as AlertDialogAction, o as AlertDialogFooter, p as DropdownMenuTrigger, r as AlertDialogCancel, s as AlertDialogHeader, t as AlertDialog, u as DropdownMenuContent, v as TableHeader, y as TableRow } from "./alert-dialog-0o8t1Tzn.mjs";
import { t as LocalStorageBanner } from "./local-storage-banner-D_Ruc4d4.mjs";
import { a as packagesQueryOptions, i as packagesQueryKey, n as deletePackage, o as setPackageActive } from "./packages-C9A6ec8R.mjs";
import { r as formatPrice } from "./packages.schema-BaPUIpzc.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.packages.index-C017Vzpt.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function PackagesListPage() {
	const navigate = useNavigate();
	const qc = useQueryClient();
	const [search, setSearch] = (0, import_react.useState)("");
	const [medicineId, setMedicineId] = (0, import_react.useState)("all");
	const [status, setStatus] = (0, import_react.useState)("all");
	const [confirmDelete, setConfirmDelete] = (0, import_react.useState)(null);
	const medicinesQuery = useQuery(medicinesQueryOptions());
	const query = useQuery(packagesQueryOptions());
	const allRows = query.data ?? [];
	const rows = allRows.filter((p) => {
		if (medicineId !== "all" && p.medicine_id !== medicineId) return false;
		if (status === "active" && !p.is_active) return false;
		if (status === "inactive" && p.is_active) return false;
		if (!search) return true;
		const q = search.toLowerCase();
		return p.name.toLowerCase().includes(q) || p.medicine_name.toLowerCase().includes(q);
	});
	const activeMut = useMutation({
		mutationFn: (vars) => setPackageActive(vars.id, vars.is_active),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: packagesQueryKey });
			toast.success("Updated");
		},
		onError: (e) => toast.error(e.message)
	});
	const deleteMut = useMutation({
		mutationFn: (id) => deletePackage(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: packagesQueryKey });
			toast.success("Package deleted");
			setConfirmDelete(null);
		},
		onError: (e) => toast.error(e.message)
	});
	const medicines = medicinesQuery.data ?? [];
	const isEmpty = !query.isLoading && allRows.length === 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LocalStorageBanner, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-lg font-semibold",
					children: "Packages"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "Pricing plans linked to medicines — 1-month, 3-month, and custom durations."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					onClick: () => navigate({ to: "/admin/packages/new" }),
					className: "shrink-0",
					disabled: medicines.length === 0,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "mr-1.5 h-4 w-4" }), " Add Package"]
				})]
			}),
			!isEmpty && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-3 sm:flex-row sm:items-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative min-w-[200px] max-w-sm flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: search,
							onChange: (e) => setSearch(e.target.value),
							placeholder: "Search packages",
							className: "pl-8"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
						value: medicineId,
						onValueChange: setMedicineId,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
							className: "w-48",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "All medicines" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
							value: "all",
							children: "All medicines"
						}), medicines.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
							value: m.id,
							children: m.name
						}, m.id))] })]
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
			}),
			isEmpty ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "border-dashed",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
					className: "text-center",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "No packages yet" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: medicines.length === 0 ? "Add a medicine first, then create pricing packages for it." : "Create your first package to offer patients duration-based plans." })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
					className: "flex justify-center pb-8",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						onClick: () => navigate({ to: "/admin/packages/new" }),
						disabled: medicines.length === 0,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "mr-1.5 h-4 w-4" }), " Add your first package"]
					})
				})]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Medicine" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Plan" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Duration" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Original" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Sale" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Savings" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Popular" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Status" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { className: "w-12" })
			] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableBody, { children: [query.isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableRow, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
				colSpan: 9,
				className: "py-8 text-center text-muted-foreground",
				children: "Loading…"
			}) }), rows.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, {
				className: "cursor-pointer",
				onClick: () => navigate({
					to: "/admin/packages/$packageId",
					params: { packageId: p.id }
				}),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
						className: "font-medium",
						children: p.medicine_name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: p.name }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableCell, { children: [p.duration_months, " mo"] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
						className: "text-muted-foreground line-through",
						children: formatPrice(p.original_price)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: formatPrice(p.price) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: p.savings > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-green-600 dark:text-green-400",
						children: formatPrice(p.savings)
					}) : "—" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: p.is_most_popular ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, { children: "Most Popular" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-muted-foreground",
						children: "—"
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						variant: p.is_active ? "default" : "secondary",
						children: p.is_active ? "Active" : "Inactive"
					}) }),
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
										to: "/admin/packages/$packageId",
										params: { packageId: p.id },
										children: "Edit"
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
									onClick: () => activeMut.mutate({
										id: p.id,
										is_active: !p.is_active
									}),
									children: p.is_active ? "Deactivate" : "Activate"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuSeparator, {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
									className: "text-destructive focus:text-destructive",
									onClick: () => setConfirmDelete({
										id: p.id,
										name: p.name
									}),
									children: "Delete"
								})
							]
						})] })
					})
				]
			}, p.id))] })] }) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
				open: !!confirmDelete,
				onOpenChange: (o) => !o && setConfirmDelete(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTitle, { children: "Delete package?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogDescription, { children: [
					"This permanently removes “",
					confirmDelete?.name,
					"”."
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
export { PackagesListPage as component };
