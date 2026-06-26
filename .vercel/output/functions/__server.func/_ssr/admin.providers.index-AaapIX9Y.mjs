import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-BkEeRci-.mjs";
import { t as Input } from "./input-B8Q2ztVi.mjs";
import { F as useNavigate, g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { O as Ellipsis, d as Mail, o as Search, s as Plus } from "../_libs/lucide-react.mjs";
import { a as useQueryClient, r as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { t as Card } from "./card-CtX3ithx.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-Dg1urBTx.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { _ as TableHead, a as AlertDialogDescription, c as AlertDialogTitle, d as DropdownMenuItem, f as DropdownMenuSeparator, g as TableCell, h as TableBody, i as AlertDialogContent, l as DropdownMenu, m as Table, n as AlertDialogAction, o as AlertDialogFooter, p as DropdownMenuTrigger, r as AlertDialogCancel, s as AlertDialogHeader, t as AlertDialog, u as DropdownMenuContent, v as TableHeader, y as TableRow } from "./alert-dialog-0o8t1Tzn.mjs";
import { n as useServerFn } from "./createSsrRpc-BhRQvxHi.mjs";
import { a as resendInvite, i as listProviders, n as deleteProvider, o as setProviderActive } from "./providers.functions-DdPup0sL.mjs";
import { t as useDebouncedValue } from "./use-debounced-value-D8kc3Vfw.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.providers.index-AaapIX9Y.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ProvidersListPage() {
	const navigate = useNavigate();
	const qc = useQueryClient();
	const list = useServerFn(listProviders);
	const resend = useServerFn(resendInvite);
	const setActive = useServerFn(setProviderActive);
	const del = useServerFn(deleteProvider);
	const [search, setSearch] = (0, import_react.useState)("");
	const debouncedSearch = useDebouncedValue(search);
	const [status, setStatus] = (0, import_react.useState)("all");
	const [confirmDelete, setConfirmDelete] = (0, import_react.useState)(null);
	const query = useQuery({
		queryKey: ["providers", {
			search: debouncedSearch,
			status
		}],
		queryFn: () => list({ data: {
			search: debouncedSearch || void 0,
			status
		} })
	});
	const resendMut = useMutation({
		mutationFn: (id) => resend({ data: {
			id,
			redirect_to: `${window.location.origin}/reset-password`
		} }),
		onSuccess: () => toast.success("Invite link sent"),
		onError: (e) => toast.error(e.message)
	});
	const activeMut = useMutation({
		mutationFn: (vars) => setActive({ data: vars }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["providers"] });
			toast.success("Updated");
		},
		onError: (e) => toast.error(e.message)
	});
	const deleteMut = useMutation({
		mutationFn: (id) => del({ data: { id } }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["providers"] });
			toast.success("Provider deleted");
			setConfirmDelete(null);
		},
		onError: (e) => toast.error(e.message)
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-1 items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative max-w-sm flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: search,
							onChange: (e) => setSearch(e.target.value),
							placeholder: "Search by name, email, specialty",
							className: "pl-8"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
						value: status,
						onValueChange: (v) => setStatus(v),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
							className: "w-40",
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
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					onClick: () => navigate({ to: "/admin/providers/new" }),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "mr-1.5 h-4 w-4" }), " Add Provider"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Name" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Email" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Specialty" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Credentials" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Status" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { className: "w-12" })
			] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableBody, { children: [
				query.isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableRow, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
					colSpan: 6,
					className: "text-center text-muted-foreground py-8",
					children: "Loading…"
				}) }),
				query.isError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableRow, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
					colSpan: 6,
					className: "text-center text-destructive py-8",
					children: query.error.message
				}) }),
				!query.isLoading && query.data?.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableRow, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
					colSpan: 6,
					className: "text-center text-muted-foreground py-8",
					children: "No providers yet."
				}) }),
				query.data?.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, {
					className: "cursor-pointer",
					onClick: () => navigate({
						to: "/admin/providers/$providerId",
						params: { providerId: p.id }
					}),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
							className: "font-medium",
							children: p.full_name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: p.email }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: p.specialty ?? "—" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: p.credentials ?? "—" }),
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
											to: "/admin/providers/$providerId",
											params: { providerId: p.id },
											children: "Edit"
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuItem, {
										onClick: () => resendMut.mutate(p.id),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "mr-2 h-4 w-4" }), " Resend invite"]
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
											name: p.full_name
										}),
										children: "Delete"
									})
								]
							})] })
						})
					]
				}, p.id))
			] })] }) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
				open: !!confirmDelete,
				onOpenChange: (o) => !o && setConfirmDelete(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTitle, { children: "Delete provider?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogDescription, { children: [
					"This permanently removes ",
					confirmDelete?.name,
					"'s account and access. This cannot be undone."
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
export { ProvidersListPage as component };
