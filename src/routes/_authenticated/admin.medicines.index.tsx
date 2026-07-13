import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Search } from "lucide-react";
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
import {
  deleteMedicine,
  setMedicineActive,
  type StoredMedicine,
} from "@/lib/medicines.store";
import {
  formatPrice,
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

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteMedicine(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: medicinesQueryKey });
      qc.invalidateQueries({ queryKey: packagesQueryKey });
      toast.success("Medicine deleted");
      setConfirmDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isEmpty = !query.isLoading && allRows.length === 0;

  return (
    <div className="w-full p-4 sm:p-8 space-y-6 bg-white min-h-screen">
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
                  <TableHead className="h-14 text-[#2A00A2] font-bold text-[15px] px-6 border-r border-[#EAE6FA]">Monthly Price</TableHead>
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
                      {m.name}
                    </TableCell>

                    {/* Description column - Updated to match Figma color legibility */}
                    <TableCell className="px-6 py-5 text-[14px] font-medium max-w-xs text-[#5D22E8] border-r border-[#EAE6FA]/60 leading-relaxed">
                      {truncate(m.short_description)}
                    </TableCell>

                    {/* Price column */}
                    <TableCell className="px-6 py-5 text-[15px] font-bold text-[#2A00A2] border-r border-[#EAE6FA]/60">
                      {formatPrice(m.price_monthly)}/mo
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
            <AlertDialogTitle className="text-[18px] font-bold text-[#2A00A2]">Delete medicine?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#6B5AE0]/90 leading-relaxed">
              This permanently removes &ldquo;{confirmDelete?.name}&rdquo;. Linked packages will remain but may show an unknown medicine name.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 gap-2">
            <AlertDialogCancel className="rounded-lg border border-[#EAE6FA] text-[#6B5AE0] hover:bg-[#F9F8FF]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-none"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}