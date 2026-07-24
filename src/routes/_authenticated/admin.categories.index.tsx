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
    <div className="admin-page-shell space-y-5 sm:space-y-6 font-['DM_Sans']">
      {/* Header Section */}
      <div className="admin-page-header">
        <div className="min-w-0 space-y-2 sm:space-y-4">
          <h2 className="text-[24px] font-bold leading-tight tracking-tight text-[#2E00AB] sm:text-[28px] lg:text-[32px]">
            Categories (Goals)
          </h2>
          <p className="text-base font-normal text-[#2E00AB]/80 sm:text-lg lg:text-[20px]">
            Medication categories shown to patients as goals during intake.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 self-start sm:self-auto">
          <RefreshButton
            onClick={() => {
              query.refetch();
            }}
            loading={query.isFetching}
          />
          <Button 
            onClick={() => navigate({ to: "/admin/categories/new" })}
            className="bg-[#2E00AB] hover:bg-[#220080] text-white h-11 px-6 rounded-[6px] font-semibold text-[14px] gap-2 shadow-none cursor-pointer transition-colors"
          >
            <Plus className="h-4 w-4 stroke-[3]" /> Add Category
          </Button>
        </div>
      </div>

      {isEmpty ? (
        <div className="border border-dashed border-[#E0D4FF] bg-[#F9F8FF] rounded-2xl p-12 text-center space-y-4">
          <p className="text-base font-semibold text-[#2E00AB]">No categories found</p>
          <Button 
            onClick={() => navigate({ to: "/admin/categories/new" })}
            className="bg-[#2E00AB] text-white rounded-[6px] px-4 h-10 font-semibold text-[14px]"
          >
            <Plus className="h-4 w-4 mr-2" /> Add category
          </Button>
        </div>
      ) : (
        /* Table Frame Container */
        <div className="max-w-full overflow-hidden rounded-2xl border border-[#E0D4FF] bg-white shadow-none">
          <div className="admin-table-scroll">
            <Table className="w-full min-w-[700px] border-collapse">
              <TableHeader className="bg-[#F9F8FF]">
  <TableRow className="border-b border-[#E0D4FF] hover:bg-transparent">
    <TableHead className="h-12 min-w-[140px] border-r border-[#E0D4FF] px-4 text-base font-medium text-[#2E00AB] sm:h-14 sm:px-6 sm:text-lg lg:text-[20px]">
      Name
    </TableHead>
    <TableHead className="h-12 min-w-[120px] border-r border-[#E0D4FF] px-4 text-base font-medium text-[#2E00AB] sm:h-14 sm:px-6 sm:text-lg lg:text-[20px]">
      Slug
    </TableHead>
    <TableHead className="h-12 min-w-[140px] border-r border-[#E0D4FF] px-4 text-base font-medium text-[#2E00AB] sm:h-14 sm:px-6 sm:text-lg lg:text-[20px]">
      BMI rule
    </TableHead>
    <TableHead className="h-12 min-w-[110px] border-r border-[#E0D4FF] px-4 text-base font-medium text-[#2E00AB] sm:h-14 sm:px-6 sm:text-lg lg:text-[20px]">
      Sex rule
    </TableHead>
    <TableHead className="h-12 min-w-[90px] border-r border-[#E0D4FF] px-4 text-base font-medium text-[#2E00AB] sm:h-14 sm:px-6 sm:text-lg lg:text-[20px]">
      Image
    </TableHead>
    <TableHead className="h-12 min-w-[100px] border-r border-[#E0D4FF] px-4 text-base font-medium text-[#2E00AB] sm:h-14 sm:px-6 sm:text-lg lg:text-[20px]">
      Status
    </TableHead>
    <TableHead className="h-12 w-14 px-2 text-center sm:h-14 sm:px-4" />
  </TableRow>
</TableHeader>
              <TableBody>
                {query.isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-[16px] text-[#2E00AB]/70">
                      Loading rows...
                    </TableCell>
                  </TableRow>
                )}
                
                {rows.map((c) => {
                  return (
                    <TableRow
                      key={c.id}
                      className="border-b border-[#E0D4FF] transition-all cursor-pointer select-none bg-white hover:bg-[#F9F8FF]"
                      onClick={() =>
                        navigate({ to: "/admin/categories/$categoryId", params: { categoryId: c.id } })
                      }
                    >
                      {/* Name column */}
                      <TableCell className="border-r border-[#E0D4FF] px-4 py-4 text-base font-medium text-[#2E00AB] sm:px-6 sm:text-lg">
                        {c.name}
                      </TableCell>

                      {/* Slug column */}
                      <TableCell className="border-r border-[#E0D4FF] px-4 py-4 text-base font-normal text-[#2E00AB]/80 sm:px-6 sm:text-lg">
                        {c.slug}
                      </TableCell>

                      {/* BMI Rule column */}
                      <TableCell className="border-r border-[#E0D4FF] px-4 py-4 text-base font-normal text-[#2E00AB]/80 sm:px-6 sm:text-lg">
                        {c.eligibility_rules?.bmi_bands?.length ? c.eligibility_rules.bmi_bands.join(", ") : "No Restriction"}
                      </TableCell>

                      {/* Sex Rule column */}
                      <TableCell className="border-r border-[#E0D4FF] px-4 py-4 text-base font-normal text-[#2E00AB]/80 sm:px-6 sm:text-lg">
                        {c.eligibility_rules?.sex?.length ? c.eligibility_rules.sex.join(", ") : "All"}
                      </TableCell>

                      {/* Image column */}
                      <TableCell className="border-r border-[#E0D4FF] px-4 py-4 sm:px-6">
                        {c.image_url ? (
                          <img
                            src={c.image_url}
                            alt={c.name}
                            className="h-10 w-10 rounded-[6px] object-cover border border-[#E0D4FF]"
                          />
                        ) : (
                          <span className="text-[16px] text-[#2E00AB]/40">—</span>
                        )}
                      </TableCell>

                      {/* Status Badge column */}
                      <TableCell className="border-r border-[#E0D4FF] px-4 py-4 sm:px-6">
                        <Badge 
                          variant="secondary"
                          className={`rounded-[6px] px-3 py-1 text-[13px] font-semibold shadow-none border-0 ${
                            c.is_active
                            ? "bg-[#F3EFFF] text-[#2E00AB]"
                            : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {c.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>

                      {/* Actions Menu button column */}
                      <TableCell className="px-2 py-4 text-center sm:px-4" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-[6px] text-[#2E00AB] transition-all hover:bg-[#F3EFFF]"
                            >
                              <MoreHorizontal className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36 rounded-lg shadow-lg border border-[#E0D4FF] bg-white p-1 font-['DM_Sans']">
                            <DropdownMenuItem asChild className="rounded-[6px] cursor-pointer font-medium text-[14px] text-[#2E00AB] focus:bg-[#F3EFFF]">
                              <Link to="/admin/categories/$categoryId" params={{ categoryId: c.id }}>
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="rounded-[6px] cursor-pointer font-medium text-[14px] text-[#2E00AB] focus:bg-[#F3EFFF]"
                              onClick={() => toggleMut.mutate({ id: c.id, is_active: !c.is_active })}
                            >
                              {c.is_active ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-[#E0D4FF] my-1" />
                            <DropdownMenuItem
                              className="rounded-[6px] cursor-pointer font-medium text-[14px] text-[#2E00AB] focus:bg-[#F3EFFF]"
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
        </div>
      )}

      {/* Confirmation Modal */}
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm p-6 bg-white border border-[#E0D4FF] shadow-xl font-['DM_Sans']">
          <AlertDialogHeader className="space-y-1">
            <AlertDialogTitle className="text-[18px] font-bold text-[#2E00AB]">Delete category?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#2E00AB]/80">
              This removes &ldquo;{confirm?.name}&rdquo; and unlinks its assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 gap-2">
            <AlertDialogCancel className="rounded-[6px] border border-[#E0D4FF] text-[#2E00AB] hover:bg-[#F9F8FF]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white rounded-[6px] shadow-none"
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