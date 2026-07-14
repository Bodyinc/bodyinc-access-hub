import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, lazy, Suspense } from "react";
import { toast } from "sonner";
import { FormSkeleton } from "@/components/admin/form-skeleton";
import { medicinesQueryKey } from "@/lib/query-options/medicines";
import { createMedicine } from "@/lib/medicines.store";
import { syncMedicineToStripe } from "@/lib/medicines.functions";
import type { MedicineFormValues } from "@/lib/medicines.schema";

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
  const [previewValues, setPreviewValues] = useState<MedicineFormValues>({
    name: "",
    short_description: "",
    long_description: "",
    image_url: "",
    price_monthly: 0,
    status: "draft",
    important_info: [],
    notice_text: "",
    sort_order: 0,
    requires_questionnaire: false,
    category_ids: [],
  });

  const mutation = useMutation({
    mutationFn: async (values: MedicineFormValues) => {
      const id = await createMedicine(values);
      try {
        await syncMedicine({ data: { medicineId: id } });
      } catch {
        // Product sync is best-effort here; the package sync will also ensure it exists.
      }
      return { id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: medicinesQueryKey });
      toast.success("Medicine created");
      navigate({ to: "/admin/medicines" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    /* FIXED: Removed mx-auto and max-w-5xl, changed to match left alignment structure */
    <div className="w-full bg-white pl-8 pr-12 py-6">
      <div className="flex flex-col lg:flex-row items-start gap-12 w-full">
        <div className="flex-1 w-full shrink-0 max-w-5xl">
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
        <div className="w-full lg:w-[440px] lg:sticky lg:top-6 shrink-0 mt-[44px]">
          <Suspense fallback={<FormSkeleton />}>
            <MedicinePreview
              name={previewValues.name}
              short_description={previewValues.short_description}
              long_description={previewValues.long_description}
              image_url={previewValues.image_url}
              price_monthly={previewValues.price_monthly}
              important_info={previewValues.important_info}
              notice_text={previewValues.notice_text}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}