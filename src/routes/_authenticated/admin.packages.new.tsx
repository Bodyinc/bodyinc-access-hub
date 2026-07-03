import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, lazy, Suspense } from "react";
import { toast } from "sonner";
import { FormSkeleton } from "@/components/admin/form-skeleton";
import { medicinesQueryOptions } from "@/lib/query-options/medicines";
import { packagesQueryKey } from "@/lib/query-options/packages";
import { createPackage } from "@/lib/packages.store";
import { syncPackageToStripe } from "@/lib/packages.functions";
import type { PackageFormValues } from "@/lib/packages.schema";

const PackageForm = lazy(() =>
  import("@/components/admin/package-form").then((m) => ({ default: m.PackageForm })),
);
const PackagePreview = lazy(() =>
  import("@/components/admin/package-preview").then((m) => ({ default: m.PackagePreview })),
);

export const Route = createFileRoute("/_authenticated/admin/packages/new")({
  component: NewPackagePage,
});

function NewPackagePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const syncPackage = useServerFn(syncPackageToStripe);
  const medicinesQuery = useQuery(medicinesQueryOptions());

  const [previewValues, setPreviewValues] = useState<PackageFormValues>({
    medicine_id: "",
    name: "",
    duration_months: 1,
    original_price: 0,
    price: 0,
    is_most_popular: false,
    features: [],
    clinical_note: "",
    sort_order: 0,
    is_active: true,
  });

  const mutation = useMutation({
    mutationFn: async (values: PackageFormValues) => {
      const { id } = await createPackage(values);
      try {
        await syncPackage({ data: { packageId: id } });
        return { id, synced: true as const };
      } catch (e) {
        return { id, synced: false as const, syncError: (e as Error).message };
      }
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: packagesQueryKey });
      if (result.synced) {
        toast.success("Package created and synced to Stripe");
      } else {
        toast.warning(`Package created, but Stripe sync failed: ${result.syncError}`);
      }
      navigate({ to: "/admin/packages" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const medicines = medicinesQuery.data ?? [];
  const selectedMedicine = medicines.find((m) => m.id === previewValues.medicine_id);

  if (medicinesQuery.isLoading && !medicinesQuery.data) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (medicines.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add a medicine before creating packages.{" "}
        <button
          type="button"
          className="underline"
          onClick={() => navigate({ to: "/admin/medicines/new" })}
        >
          Add medicine
        </button>
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Suspense fallback={<FormSkeleton />}>
          <PackageForm
            mode="create"
            medicines={medicines}
            defaultValues={{ medicine_id: medicines[0]?.id }}
            submitting={mutation.isPending}
            onSubmit={(values) => mutation.mutate(values)}
            onCancel={() => navigate({ to: "/admin/packages" })}
            onValuesChange={setPreviewValues}
          />
        </Suspense>
        <div className="lg:sticky lg:top-20">
          <Suspense fallback={<FormSkeleton />}>
            <PackagePreview
              medicine_name={selectedMedicine?.name}
              name={previewValues.name}
              duration_months={previewValues.duration_months}
              original_price={previewValues.original_price}
              price={previewValues.price}
              is_most_popular={previewValues.is_most_popular}
              features={previewValues.features}
              clinical_note={previewValues.clinical_note}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
