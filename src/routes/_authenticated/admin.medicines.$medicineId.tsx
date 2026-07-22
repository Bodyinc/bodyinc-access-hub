import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useState, lazy, Suspense } from "react";
import { toast } from "sonner";
import { FormSkeleton } from "@/components/admin/form-skeleton";
import { medicineQueryOptions, medicinesQueryKey } from "@/lib/query-options/medicines";
import {
  updateMedicine,
  type StoredMedicine,
  type StoredMedicinePackage,
} from "@/lib/medicines.store";
import { syncMedicineToStripe } from "@/lib/medicines.functions";
import {
  archiveStripeObjects,
  syncPackageToStripe,
  syncUnpricedPackages,
} from "@/lib/packages.functions";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { computeMedicineFromPriceCents, type MedicineFormValues } from "@/lib/medicines.schema";

const MedicineForm = lazy(() =>
  import("@/components/admin/medicine-form").then((m) => ({ default: m.MedicineForm })),
);
const MedicinePreview = lazy(() =>
  import("@/components/admin/medicine-preview").then((m) => ({ default: m.MedicinePreview })),
);

export const Route = createFileRoute("/_authenticated/admin/medicines/$medicineId")({
  component: EditMedicinePage,
});

function normalizeBullets(info: unknown): MedicineFormValues["important_info"] {
  if (!Array.isArray(info)) return [];
  return info.map((item) => {
    if (typeof item === "string") return { text: item };
    if (item && typeof item === "object" && "text" in item) {
      return { text: String((item as { text: unknown }).text ?? "") };
    }
    return { text: "" };
  });
}

function packageToForm(p: StoredMedicinePackage) {
  return {
    id: p.id,
    name: p.name,
    duration_months: p.duration_months,
    original_price: p.original_price,
    price: p.price,
    is_most_popular: p.is_most_popular,
    is_active: p.is_active,
    features: p.features.map((text) => ({ text })),
    clinical_note: p.clinical_note ?? "",
  };
}

function toFormValues(m: StoredMedicine): MedicineFormValues {
  return {
    name: m.name,
    short_description: m.short_description,
    long_description: m.long_description ?? "",
    image_url: m.image_url ?? "",
    packages: m.packages.map(packageToForm),
    variants: m.variants.map((v) => ({
      id: v.id,
      name: v.name,
      is_active: v.is_active,
      packages: v.packages.map(packageToForm),
    })),
    status: m.status,
    important_info: normalizeBullets(m.important_info),
    notice_text: m.notice_text ?? "",
    sort_order: m.sort_order,
    requires_questionnaire: m.requires_questionnaire,
    category_ids: m.category_ids,
  };
}

export default function EditMedicinePage() {
  const { medicineId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const medicineQuery = useQuery(medicineQueryOptions(medicineId));
  const syncMedicine = useServerFn(syncMedicineToStripe);
  const syncPackage = useServerFn(syncPackageToStripe);
  const syncPrices = useServerFn(syncUnpricedPackages);
  const archiveStripe = useServerFn(archiveStripeObjects);

  const syncMut = useMutation({
    mutationFn: () => syncPrices({ data: { medicineId } }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: medicinesQueryKey });
      qc.invalidateQueries({ queryKey: ["medicine", medicineId] });
      if (result.failed.length === 0) {
        toast.success(
          `${result.synced} plan${result.synced === 1 ? "" : "s"} synced to Stripe and can now be purchased`,
        );
      } else {
        toast.warning(
          `${result.synced} of ${result.total} synced. Failed: ${result.failed
            .map((f) => `${f.name} (${f.error})`)
            .join("; ")}`,
          { duration: 15000 },
        );
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [previewValues, setPreviewValues] = useState<MedicineFormValues | null>(null);
  const handlePreviewChange = useCallback((values: MedicineFormValues) => {
    setPreviewValues(values);
  }, []);

  const mutation = useMutation({
    mutationFn: async (values: MedicineFormValues) => {
      const { syncTargets, orphanedPriceIds, orphanedProductIds } = await updateMedicine(
        medicineId,
        values,
      );
      try {
        await syncMedicine({ data: { medicineId } });
      } catch {
        // Product sync is best-effort; package sync will also ensure the product exists.
      }
      // Plans/variants removed by this save leave live Stripe objects behind — deactivate them so
      // they cannot back a new subscription. Existing subscribers are unaffected.
      if (orphanedPriceIds.length > 0 || orphanedProductIds.length > 0) {
        try {
          await archiveStripe({ data: { priceIds: orphanedPriceIds, productIds: orphanedProductIds } });
        } catch {
          // Non-fatal: the rows are already gone and the stale Stripe objects are unreachable
          // from the catalogue, so a failure here cannot sell anything by accident.
        }
      }
      // A plan with no Stripe price cannot be bought, so a swallowed failure here surfaces
      // later as "This plan is not available for purchase yet" at the patient's checkout.
      // Save still succeeds — the row is persisted — but the admin has to be told.
      const failedSyncs: string[] = [];
      for (const target of syncTargets) {
        try {
          await syncPackage({ data: { packageId: target.id } });
        } catch {
          failedSyncs.push(target.name);
        }
      }
      return { failedSyncs };
    },
    onSuccess: ({ failedSyncs }) => {
      qc.invalidateQueries({ queryKey: medicinesQueryKey });
      qc.invalidateQueries({ queryKey: ["medicine", medicineId] });
      if (failedSyncs.length > 0) {
        toast.warning(
          `Saved, but ${failedSyncs.length} plan${failedSyncs.length > 1 ? "s" : ""} could not sync to Stripe and cannot be purchased yet: ${failedSyncs.join(", ")}. Re-save to retry.`,
          { duration: 12000 },
        );
      } else {
        toast.success("Medicine updated");
      }
      navigate({ to: "/admin/medicines" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (medicineQuery.isLoading && !medicineQuery.data) {
    return <p className="text-sm text-muted-foreground p-6">Loading…</p>;
  }

  const medicine = medicineQuery.data;
  if (!medicine) {
    return (
      <p className="text-sm text-destructive p-6">
        Medicine not found.{" "}
        <button
          type="button"
          className="underline"
          onClick={() => navigate({ to: "/admin/medicines" })}
        >
          Back to list
        </button>
      </p>
    );
  }

  const formDefaults = toFormValues(medicine);
  const preview = previewValues ?? formDefaults;
  const unsyncedCount = [
    ...medicine.packages,
    ...medicine.variants.flatMap((v) => v.packages),
  ].filter((p) => !p.stripe_price_id).length;

  return (
    <div className="w-full bg-white px-4 sm:px-6 xl:pl-8 xl:pr-12 py-6">
      <div className="flex flex-col xl:flex-row items-start gap-6 xl:gap-12 w-full">

        {/* Left Form Panel */}
        <div className="flex-1 w-full min-w-0">
          {unsyncedCount > 0 && (
            <div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div className="space-y-0.5">
                  <p className="text-[14px] font-bold text-amber-900">
                    {unsyncedCount} plan{unsyncedCount === 1 ? "" : "s"} have no Stripe price
                  </p>
                  <p className="text-[13px] font-medium text-amber-800">
                    Patients cannot buy them until they are synced.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => syncMut.mutate()}
                disabled={syncMut.isPending}
                className="h-11 shrink-0 rounded-lg bg-amber-600 px-6 text-[14px] font-semibold text-white shadow-sm hover:bg-amber-700"
              >
                {syncMut.isPending ? "Syncing…" : "Sync to Stripe"}
              </Button>
            </div>
          )}
          <Suspense fallback={<FormSkeleton />}>
            <MedicineForm
              key={medicineId}
              mode="edit"
              defaultValues={formDefaults}
              submitting={mutation.isPending}
              onSubmit={(values) => mutation.mutate(values)}
              onCancel={() => navigate({ to: "/admin/medicines" })}
              onValuesChange={handlePreviewChange}
            />
          </Suspense>
        </div>

        {/* Right Patient Preview Panel */}
        <div className="w-full xl:w-[440px] xl:sticky xl:top-6 shrink-0 xl:mt-[44px]">
          <Suspense fallback={<FormSkeleton />}>
            <MedicinePreview
              name={preview.name}
              short_description={preview.short_description}
              long_description={preview.long_description}
              image_url={preview.image_url}
              from_price_cents={computeMedicineFromPriceCents(preview)}
              important_info={preview.important_info}
              notice_text={preview.notice_text}
            />
          </Suspense>
        </div>

      </div>
    </div>
  );
}