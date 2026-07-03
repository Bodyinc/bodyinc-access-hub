import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, lazy, Suspense } from "react";
import { toast } from "sonner";
import { FormSkeleton } from "@/components/admin/form-skeleton";
import { medicinesQueryOptions } from "@/lib/query-options/medicines";
import { packageQueryOptions, packagesQueryKey } from "@/lib/query-options/packages";
import { updatePackage, type StoredPackage } from "@/lib/packages.store";
import { syncPackageToStripe } from "@/lib/packages.functions";
import type { PackageFormValues } from "@/lib/packages.schema";

const PackageForm = lazy(() =>
  import("@/components/admin/package-form").then((m) => ({ default: m.PackageForm })),
);
const PackagePreview = lazy(() =>
  import("@/components/admin/package-preview").then((m) => ({ default: m.PackagePreview })),
);

export const Route = createFileRoute("/_authenticated/admin/packages/$packageId")({
  component: EditPackagePage,
});

function toFormValues(p: StoredPackage): PackageFormValues {
  return {
    medicine_id: p.medicine_id,
    name: p.name,
    duration_months: p.duration_months,
    original_price: p.original_price,
    price: p.price,
    is_most_popular: p.is_most_popular,
    features: p.features.map((text) => ({ text })),
    clinical_note: p.clinical_note ?? "",
    sort_order: p.sort_order,
    is_active: p.is_active,
  };
}

function EditPackagePage() {
  const { packageId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const medicinesQuery = useQuery(medicinesQueryOptions());
  const packageQuery = useQuery(packageQueryOptions(packageId));
  const syncPackage = useServerFn(syncPackageToStripe);

  const [previewValues, setPreviewValues] = useState<PackageFormValues | null>(null);

  const mutation = useMutation({
    mutationFn: async (values: PackageFormValues) => {
      await updatePackage(packageId, values);
      try {
        await syncPackage({ data: { packageId } });
        return { synced: true as const };
      } catch (e) {
        return { synced: false as const, syncError: (e as Error).message };
      }
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: packagesQueryKey });
      qc.invalidateQueries({ queryKey: ["package", packageId] });
      if (result.synced) {
        toast.success("Package updated and synced to Stripe");
      } else {
        toast.warning(`Package updated, but Stripe sync failed: ${result.syncError}`);
      }
      navigate({ to: "/admin/packages" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pkg = packageQuery.data;
  const medicines = medicinesQuery.data ?? [];

  if ((packageQuery.isLoading && !pkg) || (medicinesQuery.isLoading && medicines.length === 0)) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!pkg) {
    return (
      <p className="text-sm text-destructive">
        Package not found.{" "}
        <button
          type="button"
          className="underline"
          onClick={() => navigate({ to: "/admin/packages" })}
        >
          Back to list
        </button>
      </p>
    );
  }

  const formDefaults = toFormValues(pkg);
  const preview = previewValues ?? formDefaults;
  const selectedMedicine = medicines.find((m) => m.id === preview.medicine_id);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Suspense fallback={<FormSkeleton />}>
          <PackageForm
            key={packageId}
            mode="edit"
            medicines={medicines}
            defaultValues={formDefaults}
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
              name={preview.name}
              duration_months={preview.duration_months}
              original_price={preview.original_price}
              price={preview.price}
              is_most_popular={preview.is_most_popular}
              features={preview.features}
              clinical_note={preview.clinical_note}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
