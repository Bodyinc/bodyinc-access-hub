import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { medicinesQueryOptions } from "@/lib/query-options/medicines";
import { packagesQueryKey, packagesQueryOptions } from "@/lib/query-options/packages";
import { RefreshButton } from "@/components/admin/refresh-button";
import {
  deletePackage,
  setPackageActive,
  type ListPackageRow,
} from "@/lib/packages.store";
import { formatPrice } from "@/lib/packages.schema";

export const Route = createFileRoute("/_authenticated/admin/packages/")({
  component: PackagesListPage,
});

function PackagesListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [medicineId, setMedicineId] = useState<string>("all");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

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
    mutationFn: (vars: { id: string; is_active: boolean }) => setPackageActive(vars.id, vars.is_active),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: packagesQueryKey });
      toast.success("Updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePackage(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: packagesQueryKey });
      toast.success("Package deleted");
      setConfirmDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const medicines = medicinesQuery.data ?? [];
  const isEmpty = !query.isLoading && allRows.length === 0;

  return (
    // Replaced max-w and mx-auto layout rules to anchor content natively left aligned with sidebar
    <div className="space-y-6 w-full text-left">
      {/* Top Banner Context Header Area */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-brand">Packages</h2>
          <p className="text-[14px] text-brand-strong/70 font-medium mt-1">
            Pricing plans linked to medicines — 1-month, 3-month, and custom durations.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <RefreshButton onClick={() => query.refetch()} loading={query.isFetching} />
          <Button
            onClick={() => navigate({ to: "/admin/packages/new" })}
            disabled={medicines.length === 0}
            className="bg-brand hover:bg-brand text-white font-bold h-11 px-5 rounded-xl shadow-sm transition-colors shrink-0 disabled:opacity-50"
          >
            <Plus className="mr-2 h-4 w-4 stroke-[3]" /> Add Package
          </Button>
        </div>
      </div>

      {/* Filter Management Bar */}
      {!isEmpty && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-brand-strong/50" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search packages"
              className="pl-10 h-11 rounded-xl border-brand-border focus-visible:ring-brand-strong focus-visible:ring-1 text-brand font-semibold text-[14px] placeholder:text-brand-strong/40"
            />
          </div>
          
          <Select value={medicineId} onValueChange={setMedicineId}>
            <SelectTrigger className="w-52 h-11 rounded-xl border-brand-border bg-white text-brand font-semibold text-[14px] focus:ring-1 focus:ring-brand-strong outline-none shadow-none">
              <SelectValue placeholder="All medicines" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-brand-border">
              <SelectItem value="all" className="font-medium text-brand">All medicines</SelectItem>
              {medicines.map((m) => (
                <SelectItem key={m.id} value={m.id} className="font-medium text-brand">
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="w-40 h-11 rounded-xl border-brand-border bg-white text-brand font-semibold text-[14px] focus:ring-1 focus:ring-brand-strong outline-none shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-brand-border">
              <SelectItem value="all" className="font-medium text-brand">All Statuses</SelectItem>
              <SelectItem value="active" className="font-medium text-brand">Active</SelectItem>
              <SelectItem value="inactive" className="font-medium text-brand">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Empty State vs Content Block Layout panels */}
      {isEmpty ? (
        <Card className="border-dashed border-brand-border bg-white rounded-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold text-brand">No packages yet</CardTitle>
            <CardDescription className="text-brand-strong/70 font-medium">
              {medicines.length === 0
                ? "Add a medicine first, then create pricing packages for it."
                : "Create your first package to offer patients duration-based plans."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Button
              onClick={() => navigate({ to: "/admin/packages/new" })}
              disabled={medicines.length === 0}
              className="bg-brand hover:bg-brand text-white font-bold h-11 px-5 rounded-xl shadow-sm transition-colors"
            >
              <Plus className="mr-2 h-4 w-4 stroke-[3]" /> Add your first package
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border border-brand-border bg-white shadow-sm rounded-2xl">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-white border-b border-brand-border">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="h-12 font-bold text-brand text-[14px] px-6">Medicine</TableHead>
                  <TableHead className="h-12 font-bold text-brand text-[14px] px-6">Plan</TableHead>
                  <TableHead className="h-12 font-bold text-brand text-[14px] px-6">Duration</TableHead>
                  <TableHead className="h-12 font-bold text-brand text-[14px] px-6">Original</TableHead>
                  <TableHead className="h-12 font-bold text-brand text-[14px] px-6">Sale</TableHead>
                  <TableHead className="h-12 font-bold text-brand text-[14px] px-6">Savings</TableHead>
                  <TableHead className="h-12 font-bold text-brand text-[14px] px-6">Popular</TableHead>
                  <TableHead className="h-12 font-bold text-brand text-[14px] px-6">Status</TableHead>
                  <TableHead className="h-12 w-16 px-6" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center font-semibold text-brand-strong/60">
                      Loading packages list…
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((p: ListPackageRow) => (
                  <TableRow
                    key={p.id}
                    className="border-b border-brand-border/80 last:border-none hover:bg-white/50 transition-colors cursor-pointer"
                    onClick={() =>
                      navigate({
                        to: "/admin/packages/$packageId",
                        params: { packageId: p.id },
                      })
                    }
                  >
                    <TableCell className="font-bold text-brand text-[14px] py-4 px-6">
                      {p.medicine_name}
                    </TableCell>
                    <TableCell className="font-bold text-brand text-[14px] py-4 px-6">
                      {p.name}
                    </TableCell>
                    <TableCell className="font-medium text-brand-strong/80 text-[14px] py-4 px-6 whitespace-nowrap">
                      {p.duration_months} mo
                    </TableCell>
                    <TableCell className="font-medium text-brand-strong/50 line-through text-[14px] py-4 px-6">
                      {formatPrice(p.original_price)}
                    </TableCell>
                    <TableCell className="font-bold text-brand text-[14px] py-4 px-6">
                      {formatPrice(p.price)}
                    </TableCell>
                    <TableCell className="font-semibold text-[14px] py-4 px-6">
  {p.savings > 0 ? (
    <span className="text-brand">
      {formatPrice(p.savings)}
    </span>
  ) : (
    <span className="text-brand-strong/40">—</span>
  )}
</TableCell>
                    <TableCell className="py-4 px-6">
                      {p.is_most_popular ? (
                        <Badge className="bg-brand-strong hover:bg-brand-strong text-white font-bold text-[12px] px-2.5 py-0.5 rounded-lg shadow-none normal-case tracking-normal">
                          Most Popular
                        </Badge>
                      ) : (
                        <span className="text-brand-strong/40 font-medium text-[14px]">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <Badge 
                        className={`
                          px-3 py-1 rounded-xl text-[14px] font-semibold tracking-normal normal-case border shadow-none
                          ${p.is_active 
                            ? "bg-brand-surface text-brand-strong border-transparent" 
                            : "bg-white text-brand-strong/60 border-brand-border"
                          }
                        `}
                      >
                        {p.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-brand-strong hover:bg-brand-surface rounded-xl transition-colors">
                            <MoreHorizontal className="h-[18px] w-[18px]" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border-brand-border p-1 shadow-md bg-white">
                          <DropdownMenuItem asChild className="rounded-lg font-medium text-brand focus:bg-brand-surface focus:text-brand cursor-pointer">
                            <Link to="/admin/packages/$packageId" params={{ packageId: p.id }}>
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="rounded-lg font-medium text-brand focus:bg-brand-surface focus:text-brand cursor-pointer"
                            onClick={() =>
                              activeMut.mutate({ id: p.id, is_active: !p.is_active })
                            }
                          >
                            {p.is_active ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-brand-border" />
                          <DropdownMenuItem
                            className="rounded-lg font-medium text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                            onClick={() => setConfirmDelete({ id: p.id, name: p.name })}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Confirmation Deletion Modal Sheet */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent className="rounded-[24px] border-none bg-white p-6 max-w-[440px] shadow-xl sm:rounded-[24px]">
          <AlertDialogHeader className="space-y-1">
            <AlertDialogTitle className="text-[20px] font-black tracking-tight text-brand">
              Delete package?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] font-medium text-brand-strong/60">
              This permanently removes &ldquo;{confirmDelete?.name}&rdquo; from active tier paths. This action cannot be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex items-center gap-2 pt-2 w-full">
            <AlertDialogCancel className="flex-1 text-brand-strong hover:bg-brand-surface hover:text-brand font-bold rounded-xl h-11 transition-colors border-none bg-transparent shadow-none mt-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}
              className="flex-1 bg-destructive hover:bg-destructive/90 text-white font-bold rounded-xl h-11 px-5 shadow-sm transition-colors border-none"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}