import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { LocalStorageBanner } from "@/components/admin/local-storage-banner";
import { medicinesQueryKey, medicinesQueryOptions } from "@/lib/query-options/medicines";
import { packagesQueryKey } from "@/lib/query-options/packages";
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

function statusVariant(status: MedicineStatus) {
  if (status === "active") return "default" as const;
  if (status === "draft") return "outline" as const;
  return "secondary" as const;
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
    <div className="space-y-4">
      <LocalStorageBanner />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Medicines</h2>
          <p className="text-sm text-muted-foreground">
            Manage the medication catalog shown to patients during onboarding.
          </p>
        </div>
        <Button onClick={() => navigate({ to: "/admin/medicines/new" })} className="shrink-0">
          <Plus className="mr-1.5 h-4 w-4" /> Add New Medicine
        </Button>
      </div>

      {!isEmpty && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-[200px] max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search medicines"
              className="pl-8"
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {MEDICINE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {MEDICINE_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isEmpty ? (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <CardTitle>No medicines yet</CardTitle>
            <CardDescription>
              Add your first medicine to build the patient medication catalog.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Button onClick={() => navigate({ to: "/admin/medicines/new" })}>
              <Plus className="mr-1.5 h-4 w-4" /> Add your first medicine
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {rows.map((m: StoredMedicine) => (
                <TableRow
                  key={m.id}
                  className="cursor-pointer"
                  onClick={() =>
                    navigate({
                      to: "/admin/medicines/$medicineId",
                      params: { medicineId: m.id },
                    })
                  }
                >
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="max-w-xs text-muted-foreground">
                    {truncate(m.short_description)}
                  </TableCell>
                  <TableCell>{formatPrice(m.price_monthly)}/mo</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(m.status)}>{MEDICINE_STATUS_LABELS[m.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatUpdated(m.updated_at)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to="/admin/medicines/$medicineId" params={{ medicineId: m.id }}>
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        {m.status !== "active" && (
                          <DropdownMenuItem
                            onClick={() => statusMut.mutate({ id: m.id, status: "active" })}
                          >
                            Set active
                          </DropdownMenuItem>
                        )}
                        {m.status === "active" && (
                          <DropdownMenuItem
                            onClick={() => statusMut.mutate({ id: m.id, status: "inactive" })}
                          >
                            Set inactive
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
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
        </Card>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete medicine?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes &ldquo;{confirmDelete?.name}&rdquo;. Linked packages will
              remain but may show an unknown medicine name.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
