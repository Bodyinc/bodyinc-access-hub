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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Packages</h2>
          <p className="text-sm text-muted-foreground">
            Pricing plans linked to medicines — 1-month, 3-month, and custom durations.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <RefreshButton onClick={() => query.refetch()} loading={query.isFetching} />
          <Button
            onClick={() => navigate({ to: "/admin/packages/new" })}
            disabled={medicines.length === 0}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add Package
          </Button>
        </div>
      </div>

      {!isEmpty && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-[200px] max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search packages"
              className="pl-8"
            />
          </div>
          <Select value={medicineId} onValueChange={setMedicineId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All medicines" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All medicines</SelectItem>
              {medicines.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {isEmpty ? (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <CardTitle>No packages yet</CardTitle>
            <CardDescription>
              {medicines.length === 0
                ? "Add a medicine first, then create pricing packages for it."
                : "Create your first package to offer patients duration-based plans."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Button
              onClick={() => navigate({ to: "/admin/packages/new" })}
              disabled={medicines.length === 0}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add your first package
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Original</TableHead>
                <TableHead>Sale</TableHead>
                <TableHead>Savings</TableHead>
                <TableHead>Popular</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading && (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {rows.map((p: ListPackageRow) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer"
                  onClick={() =>
                    navigate({
                      to: "/admin/packages/$packageId",
                      params: { packageId: p.id },
                    })
                  }
                >
                  <TableCell className="font-medium">{p.medicine_name}</TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.duration_months} mo</TableCell>
                  <TableCell className="text-muted-foreground line-through">
                    {formatPrice(p.original_price)}
                  </TableCell>
                  <TableCell>{formatPrice(p.price)}</TableCell>
                  <TableCell>
                    {p.savings > 0 ? (
                      <span className="text-green-600 dark:text-green-400">
                        {formatPrice(p.savings)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {p.is_most_popular ? (
                      <Badge>Most Popular</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.is_active ? "default" : "secondary"}>
                      {p.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to="/admin/packages/$packageId" params={{ packageId: p.id }}>
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            activeMut.mutate({ id: p.id, is_active: !p.is_active })
                          }
                        >
                          {p.is_active ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
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
        </Card>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete package?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes &ldquo;{confirmDelete?.name}&rdquo;.
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
