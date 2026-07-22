import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Search, AlertTriangle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { medicinesQueryKey, medicinesQueryOptions } from "@/lib/query-options/medicines";
import { packagesQueryKey } from "@/lib/query-options/packages";
import { RefreshButton } from "@/components/admin/refresh-button";
import { setMedicineActive, type StoredMedicine } from "@/lib/medicines.store";
import { syncUnpricedPackages } from "@/lib/packages.functions";
import { deleteMedicineSafely, getMedicineDeletionImpact } from "@/lib/medicines.functions";
import {
  formatFromPrice,
  MEDICINE_STATUSES,
  MEDICINE_STATUS_LABELS,
  type MedicineStatus,
} from "@/lib/medicines.schema";

export const Route = createFileRoute("/_authenticated/admin/medicines/")({
  component: MedicinesListPage,
});

function truncate(text: string, max = 60) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function formatUpdated(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// A package with no stripe_price_id has no Stripe price, so checkout rejects it with
// "This plan is not available for purchase yet" — the plan looks fine here but cannot be sold.
function unsyncedPackages(m: StoredMedicine) {
  return [...m.packages, ...m.variants.flatMap((v) => v.packages)].filter(
    (p) => !p.stripe_price_id,
  );
}

function MedicinesListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | MedicineStatus>("all");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const query = useQuery(medicinesQueryOptions());
  const allRows = query.data ?? [];
  const rows = allRows.filter((m) => {
    if (status !== "all" && m.status !== status) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.short_description.toLowerCase().includes(q) ||
      (m.long_description?.toLowerCase().includes(q) ?? false)
    );
  });

  const statusMut = useMutation({
    mutationFn: (vars: { id: string; status: MedicineStatus }) => setMedicineActive(vars.id, vars.status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: medicinesQueryKey });
      toast.success("Status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Server-side guard + Stripe archive + delete, in one call so the checks cannot be skipped.
  const deleteSafely = useServerFn(deleteMedicineSafely);
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSafely({ data: { medicineId: id } }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: medicinesQueryKey });
      qc.invalidateQueries({ queryKey: packagesQueryKey });
      if (result.archiveFailed.length > 0) {
        toast.warning(
          `Medicine deleted, but ${result.archiveFailed.length} Stripe object${result.archiveFailed.length === 1 ? "" : "s"} could not be archived and may still appear in Stripe.`,
          { duration: 12000 },
        );
      } else {
        toast.success("Medicine deleted");
      }
      setConfirmDelete(null);
    },
    onError: (e: Error) => toast.error(e.message, { duration: 15000 }),
  });

  const impactQuery = useQuery({
    queryKey: ["medicine-deletion-impact", confirmDelete?.id],
    queryFn: () => measureImpact({ data: { medicineId: confirmDelete!.id } }),
    enabled: !!confirmDelete,
  });
  const impact = impactQuery.data;

  const syncPrices = useServerFn(syncUnpricedPackages);
  const measureImpact = useServerFn(getMedicineDeletionImpact);
  const syncMut = useMutation({
    mutationFn: (vars: { medicineId?: string }) =>
      syncPrices({ data: vars.medicineId ? { medicineId: vars.medicineId } : {} }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: medicinesQueryKey });
      qc.invalidateQueries({ queryKey: packagesQueryKey });
      if (result.total === 0) {
        toast.success("Every plan already has a Stripe price");
      } else if (result.failed.length === 0) {
        toast.success(
          `${result.synced} plan${result.synced === 1 ? "" : "s"} synced to Stripe and can now be purchased`,
        );
      } else {
        toast.warning(
          `${result.synced} of ${result.total} synced. Failed: ${result.failed
            .map((f) => `${f.name} (${f.error})`)
            .join("; ")}`,
          { duration: 15000 },
        );
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalUnsynced = allRows.reduce((n, m) => n + unsyncedPackages(m).length, 0);

  const isEmpty = !query.isLoading && allRows.length === 0;

  return (
    <div className="w-full p-4 sm:p-1 space-y-6 bg-white min-h-screen">
      {/* Top Title & Primary Call-to-action bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-[26px] font-bold text-[#2A00A2] tracking-tight">Medicines</h2>
          <p className="text-[14px] text-[#6B5AE0]/80 font-medium">
            Manage the medication catalog shown to patients during onboarding.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          <RefreshButton
  onClick={() => {
    query.refetch();
  }}
  loading={query.isFetching}
/>
          <Button 
            onClick={() => navigate({ to: "/admin/medicines/new" })}
            className="bg-[#2A00A2] hover:bg-[#1F007A] text-white h-11 px-6 rounded-lg font-semibold text-[14px] gap-2 shadow-sm transition-all"
          >
            <Plus className="h-4 w-4 stroke-[3]" /> Add New Medicine
          </Button>
        </div>
      </div>

      {totalUnsynced > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="space-y-0.5">
              <p className="text-[14px] font-bold text-amber-900">
                {totalUnsynced} plan{totalUnsynced === 1 ? "" : "s"} cannot be purchased
              </p>
              <p className="text-[13px] font-medium text-amber-800">
                They have no Stripe price, so patients hit &ldquo;This plan is not available for
                purchase yet&rdquo; at checkout. Syncing creates the missing Stripe prices.
              </p>
            </div>
          </div>
          <Button
            onClick={() => syncMut.mutate({})}
            disabled={syncMut.isPending}
            className="h-11 shrink-0 rounded-lg bg-amber-600 px-6 text-[14px] font-semibold text-white shadow-sm hover:bg-amber-700"
          >
            {syncMut.isPending ? "Syncing…" : `Sync all ${totalUnsynced} to Stripe`}
          </Button>
        </div>
      )}

      {/* Filter / Inputs Controls Layer */}
      {!isEmpty && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B5AE0]/60" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by medication name or active ingredient..."
              className="pl-10 pr-4 h-12 w-full border-[#EAE6FA] bg-[#FDFDFF] text-foreground placeholder:text-[#6B5AE0]/40 rounded-xl focus-visible:ring-[#2A00A2] text-[14px] font-medium"
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="w-full sm:w-44 h-12 border-[#EAE6FA] bg-[#FDFDFF] text-[#6B5AE0] font-medium rounded-xl focus:ring-[#2A00A2] text-[14px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-[#EAE6FA] rounded-xl">
              <SelectItem value="all" className="text-[#2A00A2] font-medium focus:bg-[#F3EFFF]">All Statuses</SelectItem>
              {MEDICINE_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="text-[#2A00A2] font-medium focus:bg-[#F3EFFF]">
                  {MEDICINE_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Primary Data Display Component */}
      {isEmpty ? (
        <div className="border-2 border-dashed border-[#EAE6FA] bg-[#FDFDFF] rounded-xl p-12 text-center space-y-4">
          <p className="text-base font-semibold text-[#2A00A2]">No medicines found</p>
          <Button 
            onClick={() => navigate({ to: "/admin/medicines/new" })}
            className="bg-[#2A00A2] text-white rounded-lg px-4 h-10 font-medium"
          >
            <Plus className="h-4 w-4 mr-2" /> Add your first medicine
          </Button>
        </div>
      ) : (
        <div className="border border-[#EAE6FA] rounded-xl bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table className="border-collapse min-w-[800px]">
              <TableHeader className="bg-white">
                <TableRow className="hover:bg-transparent border-b border-[#EAE6FA]">
                  <TableHead className="h-14 text-[#2A00A2] font-bold text-[15px] px-6 border-r border-[#EAE6FA]">Medication Name</TableHead>
                  <TableHead className="h-14 text-[#2A00A2] font-bold text-[15px] px-6 border-r border-[#EAE6FA]">Description</TableHead>
                  <TableHead className="h-14 text-[#2A00A2] font-bold text-[15px] px-6 border-r border-[#EAE6FA]">Price</TableHead>
                  <TableHead className="h-14 text-[#2A00A2] font-bold text-[15px] px-6 border-r border-[#EAE6FA]">Status</TableHead>
                  <TableHead className="h-14 text-[#2A00A2] font-bold text-[15px] px-6 border-r border-[#EAE6FA]">Last Updated</TableHead>
                  <TableHead className="h-14 w-16 px-4 text-center" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-[15px] text-[#6B5AE0]/70">
                      Loading rows...
                    </TableCell>
                  </TableRow>
                )}
                
                {rows.map((m: StoredMedicine) => (
                  <TableRow
                    key={m.id}
                    className="border-b border-[#EAE6FA] bg-white hover:bg-[#F9F8FF] transition-colors cursor-pointer"
                    onClick={() =>
                      navigate({
                        to: "/admin/medicines/$medicineId",
                        params: { medicineId: m.id },
                      })
                    }
                  >
                    {/* Name column */}
                    <TableCell className="px-6 py-5 font-bold text-[15px] text-[#2A00A2] border-r border-[#EAE6FA]/60">
                      <div className="space-y-1.5">
                        <div>{m.name}</div>
                        {unsyncedPackages(m).length > 0 && (
                          <Badge className="gap-1 rounded-md border-0 bg-amber-100 px-2 py-0.5 text-[12px] font-semibold text-amber-800 shadow-none">
                            <AlertTriangle className="h-3 w-3" />
                            {unsyncedPackages(m).length} plan
                            {unsyncedPackages(m).length === 1 ? "" : "s"} not on Stripe
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Description column - Updated to match Figma color legibility */}
                    <TableCell className="px-6 py-5 text-[14px] font-medium max-w-xs text-[#5D22E8] border-r border-[#EAE6FA]/60 leading-relaxed">
                      {truncate(m.short_description)}
                    </TableCell>

                    {/* Price column */}
                    <TableCell className="px-6 py-5 text-[15px] font-bold text-[#2A00A2] border-r border-[#EAE6FA]/60">
                      {formatFromPrice(m.from_price_cents)}
                    </TableCell>

                    {/* Status column */}
                    <TableCell className="px-6 py-5 border-r border-[#EAE6FA]/60">
                      <Badge 
                        
                        className={`rounded-md px-3 py-1 text-[13px] font-semibold shadow-none border-0 ${
                          m.status === "active" 
                            ? "bg-[#F3EFFF] text-[#5D22E8]" 
                            : m.status === "draft"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {MEDICINE_STATUS_LABELS[m.status]}
                      </Badge>
                    </TableCell>

                    {/* Updated column */}
                    <TableCell className="px-6 py-5 text-[14px] font-medium text-[#6B5AE0] border-r border-[#EAE6FA]/60">
                      {formatUpdated(m.updated_at)}
                    </TableCell>

                    {/* Context menu trigger column */}
                    <TableCell className="px-4 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-[#6B5AE0] hover:bg-[#F3EFFF]">
                            <MoreHorizontal className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36 rounded-lg shadow-lg border border-[#EAE6FA] bg-white p-1">
                          <DropdownMenuItem asChild className="rounded-md cursor-pointer font-medium text-[14px] text-[#2A00A2] focus:bg-[#F3EFFF]">
                            <Link to="/admin/medicines/$medicineId" params={{ medicineId: m.id }}>
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          {m.status !== "active" && (
                            <DropdownMenuItem
                              className="rounded-md cursor-pointer font-medium text-[14px] text-[#2A00A2] focus:bg-[#F3EFFF]"
                              onClick={() => statusMut.mutate({ id: m.id, status: "active" })}
                            >
                              Set active
                            </DropdownMenuItem>
                          )}
                          {m.status === "active" && (
                            <DropdownMenuItem
                              className="rounded-md cursor-pointer font-medium text-[14px] text-[#2A00A2] focus:bg-[#F3EFFF]"
                              onClick={() => statusMut.mutate({ id: m.id, status: "inactive" })}
                            >
                              Set inactive
                            </DropdownMenuItem>
                          )}
                          {unsyncedPackages(m).length > 0 && (
                            <DropdownMenuItem
                              className="rounded-md cursor-pointer font-medium text-[14px] text-[#2A00A2] focus:bg-[#F3EFFF]"
                              onClick={() => syncMut.mutate({ medicineId: m.id })}
                            >
                              Sync to Stripe
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="bg-[#EAE6FA] my-1" />
                          <DropdownMenuItem
                            className="rounded-md cursor-pointer font-medium text-[14px] text-destructive focus:bg-red-50"
                            onClick={() => setConfirmDelete({ id: m.id, name: m.name })}
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
        </div>
      )}

      {/* Confirmation Modal Layer */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent className="rounded-xl max-w-sm p-6 bg-white border border-[#EAE6FA] shadow-xl">
          <AlertDialogHeader className="space-y-1">
            <AlertDialogTitle className="text-[18px] font-bold text-[#2A00A2]">
              {impact?.blocked ? "Cannot delete this medicine" : "Delete medicine?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#6B5AE0]/90 leading-relaxed">
              {impactQuery.isLoading
                ? "Checking what depends on this medicine…"
                : impact?.blocked
                  ? `"${confirmDelete?.name}" has records that would be lost or left stranded.`
                  : `This permanently removes "${confirmDelete?.name}" and its ${impact?.packages ?? 0} plan${impact?.packages === 1 ? "" : "s"}. Their Stripe prices will be archived.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {impact?.blocked && (
            <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-3">
              {impact.billingSubscriptions > 0 && (
                <p className="text-[13px] leading-relaxed text-red-900">
                  <span className="font-bold">
                    {impact.billingSubscriptions} patient
                    {impact.billingSubscriptions === 1 ? " is" : "s are"} still being billed.
                  </span>{" "}
                  Deleting will <span className="font-bold">not</span> stop those charges — Stripe
                  keeps collecting — and the subscription records would lose all trace of what they
                  are for. Cancel or migrate them in Stripe first.
                </p>
              )}
              {impact.shopOrderRefs > 0 && (
                <p className="text-[13px] leading-relaxed text-red-900">
                  <span className="font-bold">
                    Referenced by {impact.shopOrderRefs} shop order
                    {impact.shopOrderRefs === 1 ? "" : "s"}.
                  </span>{" "}
                  Deleting would destroy that order history.
                </p>
              )}
              <p className="text-[13px] font-medium text-red-800">
                Set the medicine inactive instead — patients stop seeing it and every record stays
                intact.
              </p>
            </div>
          )}

          {!impact?.blocked && (impact?.totalSubscriptions ?? 0) > 0 && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[13px] leading-relaxed text-amber-900">
              {impact!.totalSubscriptions} past subscription
              {impact!.totalSubscriptions === 1 ? "" : "s"} reference this medicine. They will be
              kept but will no longer show which medicine they were for.
            </p>
          )}

          <AlertDialogFooter className="mt-5 gap-2">
            <AlertDialogCancel className="rounded-lg border border-[#EAE6FA] text-[#6B5AE0] hover:bg-[#F9F8FF]">
              {impact?.blocked ? "Close" : "Cancel"}
            </AlertDialogCancel>
            {confirmDelete && !impact?.blocked && (
              <>
                <Button
                  variant="outline"
                  disabled={statusMut.isPending}
                  onClick={() => {
                    statusMut.mutate({ id: confirmDelete.id, status: "inactive" });
                    setConfirmDelete(null);
                  }}
                  className="rounded-lg border-[#EAE6FA] text-[#6B5AE0] hover:bg-[#F9F8FF]"
                >
                  Set inactive instead
                </Button>
                <AlertDialogAction
                  disabled={impactQuery.isLoading || deleteMut.isPending}
                  onClick={(e) => {
                    e.preventDefault();
                    deleteMut.mutate(confirmDelete.id);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-none"
                >
                  {deleteMut.isPending ? "Deleting…" : "Delete"}
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}