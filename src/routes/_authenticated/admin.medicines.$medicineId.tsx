import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState, lazy, Suspense } from "react";
import { toast } from "sonner";
import { FormSkeleton } from "@/components/admin/form-skeleton";
import { medicineQueryOptions, medicinesQueryKey } from "@/lib/query-options/medicines";
import { updateMedicine, type StoredMedicine } from "@/lib/medicines.store";
import type { MedicineFormValues } from "@/lib/medicines.schema";

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

function toFormValues(m: StoredMedicine): MedicineFormValues {
  return {
    name: m.name,
    short_description: m.short_description,
    long_description: m.long_description ?? "",
    image_url: m.image_url ?? "",
    price_monthly: m.price_monthly,
    status: m.status,
    important_info: normalizeBullets(m.important_info),
    notice_text: m.notice_text ?? "",
    sort_order: m.sort_order,
  };
}

function EditMedicinePage() {
  const { medicineId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const medicineQuery = useQuery(medicineQueryOptions(medicineId));

  const [previewValues, setPreviewValues] = useState<MedicineFormValues | null>(null);
  const handlePreviewChange = useCallback((values: MedicineFormValues) => {
    setPreviewValues(values);
  }, []);

  const mutation = useMutation({
    mutationFn: (values: MedicineFormValues) => updateMedicine(medicineId, values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: medicinesQueryKey });
      qc.invalidateQueries({ queryKey: ["medicine", medicineId] });
      toast.success("Medicine updated");
      navigate({ to: "/admin/medicines" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (medicineQuery.isLoading && !medicineQuery.data) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const medicine = medicineQuery.data;
  if (!medicine) {
    return (
      <p className="text-sm text-destructive">
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

  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
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
        <div className="lg:sticky lg:top-20">
          <Suspense fallback={<FormSkeleton />}>
            <MedicinePreview
              name={preview.name}
              short_description={preview.short_description}
              long_description={preview.long_description}
              image_url={preview.image_url}
              price_monthly={preview.price_monthly}
              important_info={preview.important_info}
              notice_text={preview.notice_text}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
