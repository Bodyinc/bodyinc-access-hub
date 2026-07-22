import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, lazy, Suspense } from "react";
import { toast } from "sonner";
import { FormSkeleton } from "@/components/admin/form-skeleton";
import { medicinesQueryKey } from "@/lib/query-options/medicines";
import { createMedicine } from "@/lib/medicines.store";
import { syncMedicineToStripe } from "@/lib/medicines.functions";
import { syncPackageToStripe } from "@/lib/packages.functions";
import { computeMedicineFromPriceCents, type MedicineFormValues } from "@/lib/medicines.schema";

const MedicineForm = lazy(() =>
  import("@/components/admin/medicine-form").then((m) => ({ default: m.MedicineForm })),
);
const MedicinePreview = lazy(() =>
  import("@/components/admin/medicine-preview").then((m) => ({ default: m.MedicinePreview })),
);

export const Route = createFileRoute("/_authenticated/admin/medicines/new")({
  component: NewMedicinePage,
});

function NewMedicinePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const syncMedicine = useServerFn(syncMedicineToStripe);
  const syncPackage = useServerFn(syncPackageToStripe);
  const [previewValues, setPreviewValues] = useState<MedicineFormValues>({
    name: "",
    short_description: "",
    long_description: "",
    image_url: "",
    packages: [],
    variants: [],
    status: "draft",
    important_info: [],
    notice_text: "",
    sort_order: 0,
    requires_questionnaire: false,
    category_ids: [],
  });

  const mutation = useMutation({
    mutationFn: async (values: MedicineFormValues) => {
      const { id, syncTargets } = await createMedicine(values);
      // A create has nothing pre-existing to orphan, so no archive pass is needed here.
      try {
        await syncMedicine({ data: { medicineId: id } });
      } catch {
        // Product sync is best-effort here; the package sync will also ensure it exists.
      }
      // A plan with no Stripe price cannot be bought, so a swallowed failure here surfaces
      // later as "This plan is not available for purchase yet" at the patient's checkout.
      const failedSyncs: string[] = [];
      for (const target of syncTargets) {
        try {
          await syncPackage({ data: { packageId: target.id } });
        } catch {
          failedSyncs.push(target.name);
        }
      }
      return { id, failedSyncs };
    },
    onSuccess: ({ failedSyncs }) => {
      qc.invalidateQueries({ queryKey: medicinesQueryKey });
      if (failedSyncs.length > 0) {
        toast.warning(
          `Created, but ${failedSyncs.length} plan${failedSyncs.length > 1 ? "s" : ""} could not sync to Stripe and cannot be purchased yet: ${failedSyncs.join(", ")}. Edit and re-save to retry.`,
          { duration: 12000 },
        );
      } else {
        toast.success("Medicine created");
      }
      navigate({ to: "/admin/medicines" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="w-full max-w-full overflow-x-hidden bg-white px-4 py-6">
      <div className="flex flex-col lg:flex-row items-start gap-6 w-full">
        {/* Main Form Section */}
        <div className="flex-1 w-full min-w-0">
          <Suspense fallback={<FormSkeleton />}>
            <MedicineForm
              mode="create"
              submitting={mutation.isPending}
              onSubmit={(values) => mutation.mutate(values)}
              onCancel={() => navigate({ to: "/admin/medicines" })}
              onValuesChange={setPreviewValues}
            />
          </Suspense>
        </div>

        {/* Right Preview Card Section */}
        <div className="w-full lg:w-[410px] lg:sticky lg:top-0.5 shrink-0">
          <Suspense fallback={<FormSkeleton />}>
            <MedicinePreview
              name={previewValues.name}
              short_description={previewValues.short_description}
              long_description={previewValues.long_description}
              image_url={previewValues.image_url}
              from_price_cents={computeMedicineFromPriceCents(previewValues)}
              important_info={previewValues.important_info}
              notice_text={previewValues.notice_text}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}