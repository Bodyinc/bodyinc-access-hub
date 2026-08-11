import { useFieldArray, Controller } from "react-hook-form";
import type {
  Control,
  UseFormRegister,
  UseFormGetValues,
  UseFormSetValue,
  FieldErrors,
} from "react-hook-form";
import { Layers, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { MedicinePackagesEditor } from "@/components/admin/medicine-packages-editor";
import type { MedicineFormValues } from "@/lib/medicines.schema";
import {
  CardDivider,
  medicineCard,
  medicineCardTitle,
  medicineInput,
} from "@/components/admin/medicine-form-styles";

type Props = {
  control: Control<MedicineFormValues>;
  register: UseFormRegister<MedicineFormValues>;
  getValues: UseFormGetValues<MedicineFormValues>;
  setValue: UseFormSetValue<MedicineFormValues>;
  errors: FieldErrors<MedicineFormValues>;
  submitting?: boolean;
};

export function MedicinePricingSection({
  control,
  register,
  getValues,
  setValue,
  errors,
  submitting,
}: Props) {
  const variantsArray = useFieldArray({ control, name: "variants" });
  const hasVariants = variantsArray.fields.length > 0;

  function addFirstVariant() {
    const current = getValues("packages") ?? [];
    variantsArray.append({ name: "", is_active: true, packages: current } as any);
    setValue("packages", []);
  }

  if (!hasVariants) {
    return (
      <div className="space-y-3">
        <MedicinePackagesEditor
          control={control}
          register={register}
          name="packages"
          packageErrors={errors.packages}
          submitting={submitting}
        />
        <button
          type="button"
          disabled={submitting}
          onClick={addFirstVariant}
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#152A51] transition-colors hover:text-[#152A51]/70 disabled:opacity-50"
        >
          <Layers className="h-4 w-4" /> Add variants (e.g. dosages)
        </button>
      </div>
    );
  }

  return (
    <Card className={`w-full min-w-0 max-w-full overflow-hidden p-4 sm:p-6 ${medicineCard}`}>
      <div className="mb-5 space-y-2 sm:mb-6">
        <h2 className={medicineCardTitle}>Variants</h2>
        <p className="text-[16px] font-normal text-[#3B4759]/70">
          Dose or strength options (e.g. 50mg, 100mg). Each variant has its own packages (up to 2)
          and pricing; patients pick a variant in the shop. The medicine&apos;s &ldquo;from&rdquo;
          price is the cheapest across variants.
        </p>
        <CardDivider />
      </div>

      <CardContent className="min-w-0 space-y-5 p-0">
        {variantsArray.fields.map((field, vIndex) => (
          <div
            key={field.id}
            className="min-w-0 space-y-4 rounded-[14px] border border-[#E8EEED] bg-white p-4 sm:p-5"
          >
            <div className="grid grid-cols-1 items-start gap-3 min-[480px]:grid-cols-[minmax(0,1fr)_auto_auto]">
              <div className="min-w-0 space-y-1">
                <Label className="text-[16px] font-medium text-[#152A51]">Variant name</Label>
                <Input
                  {...register(`variants.${vIndex}.name`)}
                  placeholder="e.g. 50mg"
                  disabled={submitting}
                  className={medicineInput}
                />
                {errors.variants?.[vIndex]?.name?.message && (
                  <p className="text-xs text-destructive">
                    {errors.variants[vIndex]!.name!.message}
                  </p>
                )}
              </div>
              <Controller
                control={control}
                name={`variants.${vIndex}.is_active`}
                render={({ field: sw }) => (
                  <div className="flex flex-col items-center gap-1.5 pt-6">
                    <Switch
                      checked={sw.value ?? true}
                      onCheckedChange={sw.onChange}
                      disabled={submitting}
                    />
                    <span className="text-[11px] font-semibold text-[#3B4759]/70">Active</span>
                  </div>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-0 h-[45px] w-[45px] rounded-[14px] text-[#3B4759]/60 hover:bg-destructive/5 hover:text-destructive min-[480px]:mt-6"
                disabled={submitting}
                onClick={() => variantsArray.remove(vIndex)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <MedicinePackagesEditor
              control={control}
              register={register}
              name={`variants.${vIndex}.packages`}
              packageErrors={errors.variants?.[vIndex]?.packages}
              submitting={submitting}
              embedded
            />
          </div>
        ))}

        <button
          type="button"
          disabled={submitting}
          onClick={() => variantsArray.append({ name: "", is_active: true, packages: [] } as any)}
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#152A51] transition-colors hover:text-[#152A51]/70 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Add variant
        </button>
      </CardContent>
    </Card>
  );
}
