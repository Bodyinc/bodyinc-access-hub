import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Categories (Goals)</h2>
          <p className="text-sm text-muted-foreground">
            Medication categories shown to patients as goals during intake.
          </p>
        </div>
        <Button onClick={() => navigate({ to: "/admin/categories/new" })}>
          <Plus className="mr-1.5 h-4 w-4" /> Add Category
        </Button>
      </div>

      {isEmpty ? (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <CardTitle>No categories yet</CardTitle>
            <CardDescription>Create your first goal category.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Button onClick={() => navigate({ to: "/admin/categories/new" })}>
              <Plus className="mr-1.5 h-4 w-4" /> Add category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>BMI rule</TableHead>
                <TableHead>Sex rule</TableHead>
                <TableHead>Medicines</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Loading…</TableCell>
                </TableRow>
              )}
              {rows.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() =>
                    navigate({ to: "/admin/categories/$categoryId", params: { categoryId: c.id } })
                  }
                >
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.slug}</TableCell>
                  <TableCell className="text-xs">
                    {c.eligibility_rules.bmi_bands.length ? c.eligibility_rules.bmi_bands.join(", ") : "Any"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {c.eligibility_rules.sex.length ? c.eligibility_rules.sex.join(", ") : "Any"}
                  </TableCell>
                  <TableCell>{c.medicine_ids.length}</TableCell>
                  <TableCell>
                    <Badge variant={c.is_active ? "default" : "secondary"}>
                      {c.is_active ? "Active" : "Inactive"}
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
                          <Link to="/admin/categories/$categoryId" params={{ categoryId: c.id }}>
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleMut.mutate({ id: c.id, is_active: !c.is_active })}
                        >
                          {c.is_active ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setConfirm({ id: c.id, name: c.name })}
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

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes &ldquo;{confirm?.name}&rdquo; and unlinks its medicine assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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