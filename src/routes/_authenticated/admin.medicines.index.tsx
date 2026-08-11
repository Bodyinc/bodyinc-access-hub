import { toastError } from "@/lib/toast-message";
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
  head: () => ({
    meta: [
      { title: "Medicines · Body Inc Admin" },
      { name: "description", content: "Medicines — Admin area of the Body Inc portal." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MedicinesListPage,
});

function truncate(text: string, max = 60) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function formatUpdated(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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
    mutationFn: (vars: { id: string; status: MedicineStatus }) =>
      setMedicineActive(vars.id, vars.status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: medicinesQueryKey });
      toast.success("Status updated.");
    },
    onError: (e: Error) => toast.error(toastError(e)),
  });

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
        toast.success("Medicine deleted.");
      }
      setConfirmDelete(null);
    },
    onError: (e: Error) => toast.error(toastError(e), { duration: 15000 }),
  });

  const syncPrices = useServerFn(syncUnpricedPackages);
  const measureImpact = useServerFn(getMedicineDeletionImpact);

  const impactQuery = useQuery({
    queryKey: ["medicine-deletion-impact", confirmDelete?.id],
    queryFn: () => measureImpact({ data: { medicineId: confirmDelete!.id } }),
    enabled: !!confirmDelete,
  });
  const impact = impactQuery.data;

  const syncMut = useMutation({
    mutationFn: (vars: { medicineId?: string }) =>
      syncPrices({ data: vars.medicineId ? { medicineId: vars.medicineId } : {} }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: medicinesQueryKey });
      qc.invalidateQueries({ queryKey: packagesQueryKey });
      if (result.total === 0) {
        toast.success("Every plan already has a Stripe price.");
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
    onError: (e: Error) => toast.error(toastError(e)),
  });

  const totalUnsynced = allRows.reduce((n, m) => n + unsyncedPackages(m).length, 0);
  const isEmpty = !query.isLoading && allRows.length === 0;

  return (
    <div className="admin-page-shell space-y-5 sm:space-y-6">
      {/* Top Header Bar */}
      <div className="admin-page-header">
        <div className="min-w-0 space-y-2 sm:space-y-4">
          <h1 className="text-[24px] font-semibold leading-tight tracking-normal text-[#152A51] sm:text-[28px] lg:text-[32px]">
            Medicines
          </h1>
          <p className="text-base font-normal leading-snug text-[#3B4759]/70 sm:text-lg lg:text-[20px]">
            Manage the medication catalog shown to patients during onboarding.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3 self-start sm:self-auto">
          <RefreshButton
            onClick={() => {
              query.refetch();
            }}
            loading={query.isFetching}
          />
          <Button
            onClick={() => navigate({ to: "/admin/medicines/new" })}
            className="h-[34px] cursor-pointer gap-2 rounded-full border border-[#152A51]/20 bg-[#152A51] px-5 text-[14px] font-medium text-white shadow-none transition-colors hover:bg-[#152A51]/90 hover:text-white"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" /> Add New Medicine
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

      {/* Search / filter — Figma: 460×44, radius 8, border #D9DEE3 */}
      {!isEmpty && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-[460px] sm:max-w-full">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3B4759]/40" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by medication name or active ingredient…"
              className="h-[44px] w-full rounded-[8px] border border-[#D9DEE3] bg-white py-3 pl-11 pr-4 text-[14px] font-normal text-[#152A51] shadow-none placeholder:text-[#3B4759]/40 focus-visible:ring-1 focus-visible:ring-[#152A51]/30"
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="h-[44px] w-full rounded-[8px] border border-[#D9DEE3] bg-white px-4 text-[14px] font-medium text-[#152A51] shadow-none focus:ring-1 focus:ring-[#152A51]/30 sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-[8px] border border-[#E8EEED]">
              <SelectItem value="all" className="text-[#152A51] font-medium focus:bg-[#F2F7F6]">
                All Statuses
              </SelectItem>
              {MEDICINE_STATUSES.map((s) => (
                <SelectItem
                  key={s}
                  value={s}
                  className="text-[#152A51] font-medium focus:bg-[#F2F7F6]"
                >
                  {MEDICINE_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Main Table Display Component */}
      {isEmpty ? (
        <div className="space-y-4 rounded-2xl border border-dashed border-[#E8EEED] bg-[#F2F7F6] p-12 text-center">
          <p className="text-base font-semibold text-[#152A51]">No medicines found</p>
          <Button
            onClick={() => navigate({ to: "/admin/medicines/new" })}
            className="h-[34px] rounded-full border border-[#152A51]/20 bg-[#152A51] px-5 text-[14px] font-medium text-white shadow-none hover:bg-[#152A51]/90 hover:text-white"
          >
            <Plus className="mr-2 h-4 w-4 stroke-[2.5]" /> Add your first medicine
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#E8EEED] bg-white shadow-none">
          <div className="admin-table-scroll">
            <Table className="min-w-[800px] border-collapse">
              <TableHeader className="bg-[#F2F7F6]">
                <TableRow className="border-b border-[#E8EEED] hover:bg-transparent">
                  <TableHead className="h-12 px-5 text-[12px] font-medium uppercase tracking-[0.04em] text-[#3B4759]/70 sm:h-14 sm:px-5 sm:text-[13px]">
                    Medication Name
                  </TableHead>
                  <TableHead className="h-12 px-5 text-[12px] font-medium uppercase tracking-[0.04em] text-[#3B4759]/70 sm:h-14 sm:px-5 sm:text-[13px]">
                    Description
                  </TableHead>
                  <TableHead className="h-12 px-5 text-[12px] font-medium uppercase tracking-[0.04em] text-[#3B4759]/70 sm:h-14 sm:px-5 sm:text-[13px]">
                    Monthly Price
                  </TableHead>
                  <TableHead className="h-12 px-5 text-[12px] font-medium uppercase tracking-[0.04em] text-[#3B4759]/70 sm:h-14 sm:px-5 sm:text-[13px]">
                    Status
                  </TableHead>
                  <TableHead className="h-12 px-5 text-[12px] font-medium uppercase tracking-[0.04em] text-[#3B4759]/70 sm:h-14 sm:px-5 sm:text-[13px]">
                    Last Updated
                  </TableHead>
                  <TableHead className="h-12 w-16 px-4 text-center sm:h-14" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-12 text-center text-[15px] text-[#3B4759]/60"
                    >
                      Loading rows...
                    </TableCell>
                  </TableRow>
                )}

                {rows.map((m: StoredMedicine) => (
                  <TableRow
                    key={m.id}
                    className="cursor-pointer border-b border-[#E8EEED] bg-white transition-colors hover:bg-[#F8F9FB]"
                    onClick={() =>
                      navigate({
                        to: "/admin/medicines/$medicineId",
                        params: { medicineId: m.id },
                      })
                    }
                  >
                    {/* Name column — Figma row: py 14px, px 20px */}
                    <TableCell className="px-5 py-[14px] text-[15px] font-semibold text-[#152A51]">
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

                    <TableCell className="max-w-xs px-5 py-[14px] text-[13px] font-normal leading-relaxed text-[#3B4759]/80">
                      {truncate(m.short_description)}
                    </TableCell>

                    <TableCell className="px-5 py-[14px] text-[15px] font-semibold text-[#152A51]">
                      {formatFromPrice(m.from_price_cents)}
                    </TableCell>

                    <TableCell className="px-5 py-[14px]">
                      <Badge
                        className={`rounded-full border-0 px-2.5 py-[3px] text-[12px] font-medium shadow-none hover:bg-inherit ${
                          m.status === "active"
                            ? "bg-[#D1FAE5] text-[#065F46] hover:bg-[#D1FAE5]"
                            : m.status === "draft"
                              ? "bg-amber-50 text-amber-700 hover:bg-amber-50"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-100"
                        }`}
                      >
                        {MEDICINE_STATUS_LABELS[m.status]}
                      </Badge>
                    </TableCell>

                    <TableCell className="px-5 py-[14px] text-[14px] font-normal text-[#3B4759]/70">
                      {formatUpdated(m.updated_at)}
                    </TableCell>

                    <TableCell
                      className="px-4 py-[14px] text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-[#3B4759]/70 hover:bg-[#F2F7F6] hover:text-[#152A51]"
                          >
                            <MoreHorizontal className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-36 rounded-lg border border-[#E8EEED] bg-white p-1 shadow-lg"
                        >
                          <DropdownMenuItem
                            asChild
                            className="cursor-pointer rounded-md text-[14px] font-medium text-[#152A51] focus:bg-[#F2F7F6]"
                          >
                            <Link to="/admin/medicines/$medicineId" params={{ medicineId: m.id }}>
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          {m.status !== "active" && (
                            <DropdownMenuItem
                              className="cursor-pointer rounded-md text-[14px] font-medium text-[#152A51] focus:bg-[#F2F7F6]"
                              onClick={() => statusMut.mutate({ id: m.id, status: "active" })}
                            >
                              Set active
                            </DropdownMenuItem>
                          )}
                          {m.status === "active" && (
                            <DropdownMenuItem
                              className="cursor-pointer rounded-md text-[14px] font-medium text-[#152A51] focus:bg-[#F2F7F6]"
                              onClick={() => statusMut.mutate({ id: m.id, status: "inactive" })}
                            >
                              Set inactive
                            </DropdownMenuItem>
                          )}
                          {unsyncedPackages(m).length > 0 && (
                            <DropdownMenuItem
                              className="cursor-pointer rounded-md text-[14px] font-medium text-[#152A51] focus:bg-[#F2F7F6]"
                              onClick={() => syncMut.mutate({ medicineId: m.id })}
                            >
                              Sync to Stripe
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="my-1 bg-[#E8EEED]" />
                          <DropdownMenuItem
                            className="cursor-pointer rounded-md text-[14px] font-medium text-[#152A51] focus:bg-[#F2F7F6]"
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

      {/* Confirmation Modal */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent className="rounded-xl max-w-sm p-6 bg-white border border-[#6A9B9C]/20 shadow-xl">
          <AlertDialogHeader className="space-y-1">
            <AlertDialogTitle className="text-[18px] font-bold text-[#3B4759]">
              {impact?.blocked ? "Cannot delete this medicine" : "Delete medicine?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#3B4759]/80 leading-relaxed">
              {impactQuery.isLoading
                ? "Checking what depends on this medicine…"
                : impact?.blocked
                  ? `"${confirmDelete?.name}" has records that would be lost or left stranded.`
                  : `This permanently removes "${confirmDelete?.name}" and its ${impact?.packages ?? 0} plan${
                      impact?.packages === 1 ? "" : "s"
                    }. Their Stripe prices will be archived.`}
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
            <AlertDialogCancel className="rounded-lg border border-[#6A9B9C]/20 text-[#3B4759] hover:bg-[#F2F7F6]">
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
                  className="rounded-lg border-[#6A9B9C]/20 text-[#3B4759] hover:bg-[#F2F7F6]"
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
