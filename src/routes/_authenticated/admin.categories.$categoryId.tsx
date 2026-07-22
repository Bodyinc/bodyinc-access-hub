import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CategoryForm } from "@/components/admin/category-form";
import { updateCategory } from "@/lib/categories.store";
import { categoriesQueryKey, categoryQueryOptions } from "@/lib/query-options/categories";
import type { CategoryFormValues } from "@/lib/categories.schema";

export const Route = createFileRoute("/_authenticated/admin/categories/$categoryId")({
  component: EditCategoryPage,
});

function EditCategoryPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { categoryId } = Route.useParams();
  const catQ = useQuery(categoryQueryOptions(categoryId));
  const mut = useMutation({
    mutationFn: (v: CategoryFormValues) => updateCategory(categoryId, v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoriesQueryKey });
      qc.invalidateQueries({ queryKey: ["category", categoryId] });
      toast.success("Category updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (catQ.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!catQ.data) return <p className="text-sm text-destructive">Not found</p>;

  const c = catQ.data;
  return (
    <CategoryForm
      mode="edit"
      submitting={mut.isPending}
      defaultValues={{
        slug: c.slug,
        name: c.name,
        tagline: c.tagline ?? "",
        image_url: c.image_url ?? "",
        sort_order: c.sort_order,
        is_active: c.is_active,
        eligibility_rules: c.eligibility_rules,
      }}
      onSubmit={(v) => mut.mutate(v)}
      onCancel={() => navigate({ to: "/admin/categories" })}
    />
  );
}