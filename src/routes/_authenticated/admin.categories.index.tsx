import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { categoriesQueryKey, categoriesQueryOptions } from "@/lib/query-options/categories";
import { RefreshButton } from "@/components/admin/refresh-button";
import { deleteCategory, setCategoryActive } from "@/lib/categories.store";

export const Route = createFileRoute("/_authenticated/admin/categories/")({
  component: CategoriesListPage,
});

function CategoriesListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null);
  const query = useQuery(categoriesQueryOptions());
  const rows = query.data ?? [];

  const toggleMut = useMutation({
    mutationFn: (vars: { id: string; is_active: boolean }) => setCategoryActive(vars.id, vars.is_active),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoriesQueryKey });
      toast.success("Updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoriesQueryKey });
      toast.success("Deleted");
      setConfirm(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isEmpty = !query.isLoading && rows.length === 0;

  return (
    <div className="w-full p-8 space-y-6 bg-white min-h-screen">
      {/* Top Header matching Figma title sizing and custom button */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-[26px] font-bold text-brand tracking-tight">Categories (Goals)</h2>
          <p className="text-[14px] text-brand-strong/80 font-medium">
            Medication categories shown to patients as goals during intake.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <RefreshButton
  onClick={() => {
    query.refetch();
  }}
  loading={query.isFetching}
/>
          <Button 
            onClick={() => navigate({ to: "/admin/categories/new" })}
            className="bg-brand hover:bg-brand text-white h-11 px-6 rounded-lg font-semibold text-[14px] gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4 stroke-[3]" /> Add Category
          </Button>
        </div>
      </div>

      {isEmpty ? (
        <div className="border-2 border-dashed border-brand-border bg-white rounded-xl p-12 text-center space-y-4">
          <p className="text-base font-semibold text-brand">No categories found</p>
          <Button 
            onClick={() => navigate({ to: "/admin/categories/new" })}
            className="bg-brand text-white rounded-lg px-4 h-10 font-medium"
          >
            <Plus className="h-4 w-4 mr-2" /> Add category
          </Button>
        </div>
      ) : (
        /* Figma Table Frame Style */
        <div className="border border-brand-border rounded-xl bg-white overflow-hidden shadow-sm">
          <Table className="border-collapse">
            <TableHeader className="bg-white">
              <TableRow className="hover:bg-transparent border-b border-brand-border">
                <TableHead className="h-14 text-brand font-bold text-[15px] px-6 border-r border-brand-border">Name</TableHead>
                <TableHead className="h-14 text-brand font-bold text-[15px] px-6 border-r border-brand-border">Slug</TableHead>
                <TableHead className="h-14 text-brand font-bold text-[15px] px-6 border-r border-brand-border">BMI rule</TableHead>
                <TableHead className="h-14 text-brand font-bold text-[15px] px-6 border-r border-brand-border">Sex rule</TableHead>
                <TableHead className="h-14 text-brand font-bold text-[15px] px-6 border-r border-brand-border">Medicines</TableHead>
                <TableHead className="h-14 text-brand font-bold text-[15px] px-6 border-r border-brand-border">Status</TableHead>
                <TableHead className="h-14 w-16 px-4 text-center" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-[15px] text-brand-strong/70">
                    Loading rows...
                  </TableCell>
                </TableRow>
              )}
              
              {rows.map((c) => {
                // To visually match Figma perfectly, let's make the second row active/selected style
               

                return (
                  <TableRow
                    key={c.id}
                    className="border-b border-brand-border transition-all cursor-pointer group select-none bg-white hover:bg-brand-surface"
                    onClick={() =>
                      navigate({ to: "/admin/categories/$categoryId", params: { categoryId: c.id } })
                    }
                  >
                    {/* Name column */}
                    <TableCell className="px-6 py-5 font-semibold text-[15px] text-brand border-r border-brand-border/60">
                      {c.name}
                    </TableCell>

                    {/* Slug column */}
                    <TableCell className="px-6 py-5 text-[14px] font-medium text-brand-strong border-r border-brand-border/60">
                      {c.slug}
                    </TableCell>

                    {/* BMI Rule column */}
                    <TableCell className="px-6 py-5 text-[14px] font-medium text-brand-strong border-r border-brand-border/60">
                      {c.eligibility_rules.bmi_bands.length ? c.eligibility_rules.bmi_bands.join(", ") : "No Restriction"}
                    </TableCell>

                    {/* Sex Rule column */}
                    <TableCell className="px-6 py-5 text-[14px] font-medium text-brand-strong border-r border-brand-border/60">
                      {c.eligibility_rules.sex.length ? c.eligibility_rules.sex.join(", ") : "All"}
                    </TableCell>

                    {/* Medicines count column */}
                    <TableCell className="px-6 py-5 text-[15px] font-bold text-brand border-r border-brand-border/60">
                      {c.medicine_ids.length}
                    </TableCell>

                    {/* Status Badge column */}
                    <TableCell className="px-6 py-5 border-r border-brand-border/60 group-hover:border-r-transparent">
                      <Badge 
                        variant="secondary"
                        className={`rounded-md px-3 py-1 text-[13px] font-semibold shadow-none border-0 ${
                          c.is_active
                          ? "bg-brand-surface text-brand-strong"
                          : "bg-gray-100 text-gray-500"
                             
                        }`}
                      >
                        {c.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>

                    {/* Actions Menu button column */}
                    <TableCell className="px-4 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-md text-brand-strong transition-all hover:bg-brand-surface"
                          >
                            <MoreHorizontal className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36 rounded-lg shadow-lg border border-brand-border bg-white p-1">
                          <DropdownMenuItem asChild className="rounded-md cursor-pointer font-medium text-[14px] text-brand focus:bg-brand-surface">
                            <Link to="/admin/categories/$categoryId" params={{ categoryId: c.id }}>
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="rounded-md cursor-pointer font-medium text-[14px] text-brand focus:bg-brand-surface"
                            onClick={() => toggleMut.mutate({ id: c.id, is_active: !c.is_active })}
                          >
                            {c.is_active ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-brand-border my-1" />
                          <DropdownMenuItem
                            className="rounded-md cursor-pointer font-medium text-[14px] text-destructive focus:bg-red-50"
                            onClick={() => setConfirm({ id: c.id, name: c.name })}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Confirmation Modal layer layout updates */}
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="rounded-xl max-w-sm p-6 bg-white border border-brand-border shadow-xl">
          <AlertDialogHeader className="space-y-1">
            <AlertDialogTitle className="text-[18px] font-bold text-brand">Delete category?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-brand-strong/90">
              This removes &ldquo;{confirm?.name}&rdquo; and unlinks its assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 gap-2">
            <AlertDialogCancel className="rounded-lg border border-brand-border text-brand-strong hover:bg-brand-surface">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-none"
              onClick={() => confirm && deleteMut.mutate(confirm.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}