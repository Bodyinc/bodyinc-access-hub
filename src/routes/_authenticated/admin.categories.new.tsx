import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CategoryForm } from "@/components/admin/category-form";
import { createCategory } from "@/lib/categories.store";
import { categoriesQueryKey } from "@/lib/query-options/categories";
import type { CategoryFormValues } from "@/lib/categories.schema";

export const Route = createFileRoute("/_authenticated/admin/categories/new")({
  component: NewCategoryPage,
});

function NewCategoryPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: (v: CategoryFormValues) => createCategory(v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoriesQueryKey });
      toast.success("Category created");
      navigate({ to: "/admin/categories" });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <CategoryForm
      mode="create"
      submitting={mut.isPending}
      onSubmit={(v) => mut.mutate(v)}
      onCancel={() => navigate({ to: "/admin/categories" })}
    />
  );
}