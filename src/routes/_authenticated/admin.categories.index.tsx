import { toastError } from "@/lib/toast-message";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { categoriesQueryKey, categoriesQueryOptions } from "@/lib/query-options/categories";
import { RefreshButton } from "@/components/admin/refresh-button";
import { deleteCategory, setCategoryActive } from "@/lib/categories.store";

export const Route = createFileRoute("/_authenticated/admin/categories/")({
  head: () => ({
    meta: [
      { title: "Categories · Body Inc Admin" },
      { name: "description", content: "Categories — Admin area of the Body Inc portal." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CategoriesListPage,
});

function CategoriesListPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null);
  const query = useQuery(categoriesQueryOptions());
  const rows = query.data ?? [];

  const toggleMut = useMutation({
    mutationFn: (vars: { id: string; is_active: boolean }) =>
      setCategoryActive(vars.id, vars.is_active),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoriesQueryKey });
      toast.success("Changes saved.");
    },
    onError: (e: Error) => toast.error(toastError(e)),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoriesQueryKey });
      toast.success("Category deleted.");
      setConfirm(null);
    },
    onError: (e: Error) => toast.error(toastError(e)),
  });

  const isEmpty = !query.isLoading && rows.length === 0;

  return (
    <div className="admin-page-shell space-y-5 sm:space-y-6 font-['DM_Sans']">
      {/* Header Section */}
      <div className="admin-page-header">
        <div className="min-w-0 space-y-2 sm:space-y-4">
          <h2 className="text-[24px] font-bold leading-tight tracking-tight text-[#152A51] sm:text-[28px] lg:text-[32px]">
            Categories (Goals)
          </h2>
          <p className="text-base font-normal text-[#3B4759]/70 sm:text-lg lg:text-[20px]">
            Medication categories shown to patients as goals during intake.
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
            onClick={() => navigate({ to: "/admin/categories/new" })}
            className="h-[34px] cursor-pointer gap-2 rounded-full border border-[#152A51]/20 bg-[#152A51] px-5 text-[14px] font-medium text-white shadow-none transition-colors hover:bg-[#152A51]/90 hover:text-white"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" /> Add Category
          </Button>
        </div>
      </div>

      {isEmpty ? (
        <div className="border border-dashed border-[#E8EEED] bg-[#F2F7F6] rounded-2xl p-12 text-center space-y-4">
          <p className="text-base font-semibold text-[#152A51]">No categories found</p>
          <Button
            onClick={() => navigate({ to: "/admin/categories/new" })}
            className="h-[34px] rounded-full border border-[#152A51]/20 bg-[#152A51] px-5 text-[14px] font-medium text-white shadow-none hover:bg-[#152A51]/90 hover:text-white"
          >
            <Plus className="h-4 w-4 mr-2 stroke-[2.5]" /> Add category
          </Button>
        </div>
      ) : (
        /* Table Frame Container */
        <div className="max-w-full overflow-hidden rounded-2xl border border-[#E8EEED] bg-white shadow-none">
          <div className="admin-table-scroll">
            <Table className="w-full min-w-[700px] border-collapse">
              <TableHeader className="bg-[#F2F7F6]">
                <TableRow className="border-b border-[#E8EEED] hover:bg-transparent">
                  <TableHead className="h-12 min-w-[140px] px-4 text-[12px] font-medium uppercase tracking-[0.04em] text-[#3B4759]/70 sm:h-14 sm:px-6 sm:text-[13px]">
                    Name
                  </TableHead>
                  <TableHead className="h-12 min-w-[140px] px-4 text-[12px] font-medium uppercase tracking-[0.04em] text-[#3B4759]/70 sm:h-14 sm:px-6 sm:text-[13px]">
                    Age rule
                  </TableHead>
                  <TableHead className="h-12 min-w-[140px] px-4 text-[12px] font-medium uppercase tracking-[0.04em] text-[#3B4759]/70 sm:h-14 sm:px-6 sm:text-[13px]">
                    BMI rule
                  </TableHead>
                  <TableHead className="h-12 min-w-[110px] px-4 text-[12px] font-medium uppercase tracking-[0.04em] text-[#3B4759]/70 sm:h-14 sm:px-6 sm:text-[13px]">
                    Sex rule
                  </TableHead>
                  <TableHead className="h-12 min-w-[90px] px-4 text-[12px] font-medium uppercase tracking-[0.04em] text-[#3B4759]/70 sm:h-14 sm:px-6 sm:text-[13px]">
                    Image
                  </TableHead>
                  <TableHead className="h-12 min-w-[100px] px-4 text-[12px] font-medium uppercase tracking-[0.04em] text-[#3B4759]/70 sm:h-14 sm:px-6 sm:text-[13px]">
                    Status
                  </TableHead>
                  <TableHead className="h-12 w-14 px-2 text-center sm:h-14 sm:px-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-12 text-center text-[16px] text-[#3B4759]/70"
                    >
                      Loading rows...
                    </TableCell>
                  </TableRow>
                )}

                {rows.map((c) => {
                  const minAge = c.eligibility_rules?.min_age;
                  const maxAge = c.eligibility_rules?.max_age;
                  const ageLabel =
                    minAge == null && maxAge == null
                      ? "No restriction"
                      : minAge != null && maxAge != null
                        ? `${minAge} - ${maxAge}`
                        : minAge != null
                          ? `${minAge}+`
                          : `Up to ${maxAge}`;

                  return (
                    <TableRow
                      key={c.id}
                      className="border-b border-[#E8EEED] transition-all cursor-pointer select-none bg-white hover:bg-[#F8F9FB]"
                      onPointerEnter={() => {
                        void router.preloadRoute({
                          to: "/admin/categories/$categoryId",
                          params: { categoryId: c.id },
                        });
                      }}
                      onClick={() =>
                        navigate({
                          to: "/admin/categories/$categoryId",
                          params: { categoryId: c.id },
                        })
                      }
                    >
                      {/* Name column */}
                      <TableCell className="px-4 py-4 text-base font-medium text-[#152A51] sm:px-6 sm:text-lg">
                        {c.name}
                      </TableCell>

                      {/* Age Rule column */}
                      <TableCell className="px-4 py-4 text-base font-normal text-[#3B4759]/80 sm:px-6 sm:text-lg">
                        {ageLabel}
                      </TableCell>

                      {/* BMI Rule column */}
                      <TableCell className="px-4 py-4 text-base font-normal text-[#3B4759]/80 sm:px-6 sm:text-lg">
                        {c.eligibility_rules?.bmi_bands?.length
                          ? c.eligibility_rules.bmi_bands.join(", ")
                          : "No restriction"}
                      </TableCell>

                      {/* Sex Rule column */}
                      <TableCell className="px-4 py-4 text-base font-normal text-[#3B4759]/80 sm:px-6 sm:text-lg">
                        {c.eligibility_rules?.sex?.length
                          ? c.eligibility_rules.sex.join(", ")
                          : "All"}
                      </TableCell>

                      {/* Image column */}
                      <TableCell className="px-4 py-4 sm:px-6">
                        {c.image_url ? (
                          <img
                            src={c.image_url}
                            alt={c.name}
                            className="h-10 w-10 rounded-[6px] object-cover border border-[#E8EEED]"
                          />
                        ) : (
                          <span className="text-[16px] text-[#3B4759]/40">—</span>
                        )}
                      </TableCell>

                      {/* Status Badge column */}
                      <TableCell className="px-4 py-4 sm:px-6">
                        <Badge
                          variant="secondary"
                          className={`rounded-full border-0 px-2.5 py-[3px] text-[12px] font-medium shadow-none hover:bg-inherit ${
                            c.is_active
                              ? "bg-[#D1FAE5] text-[#065F46] hover:bg-[#D1FAE5]"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-100"
                          }`}
                        >
                          {c.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>

                      {/* Actions Menu button column */}
                      <TableCell
                        className="px-2 py-4 text-center sm:px-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full text-[#3B4759]/70 transition-all hover:bg-[#F2F2F2] hover:text-[#152A51]"
                            >
                              <MoreHorizontal className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-36 rounded-lg shadow-lg border border-[#D5DEDD] bg-white p-1 font-['DM_Sans']"
                          >
                            <DropdownMenuItem
                              asChild
                              className="rounded-[6px] cursor-pointer font-medium text-[14px] text-[#3B4759] focus:bg-[#E8EEED]"
                            >
                              <Link
                                to="/admin/categories/$categoryId"
                                params={{ categoryId: c.id }}
                              >
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="rounded-[6px] cursor-pointer font-medium text-[14px] text-[#3B4759] focus:bg-[#E8EEED]"
                              onClick={() =>
                                toggleMut.mutate({ id: c.id, is_active: !c.is_active })
                              }
                            >
                              {c.is_active ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-[#D5DEDD] my-1" />
                            <DropdownMenuItem
                              className="rounded-[6px] cursor-pointer font-medium text-[14px] text-[#3B4759] focus:bg-[#E8EEED]"
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
        <AlertDialogContent className="rounded-2xl max-w-sm p-6 bg-white border border-[#D5DEDD] shadow-xl font-['DM_Sans']">
          <AlertDialogHeader className="space-y-1">
            <AlertDialogTitle className="text-[18px] font-bold text-[#3B4759]">
              Delete category?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#3B4759]/80">
              This removes &ldquo;{confirm?.name}&rdquo; and unlinks its assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 gap-2">
            <AlertDialogCancel className="rounded-[6px] border border-[#D5DEDD] text-[#3B4759] hover:bg-[#F2F7F6]">
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
