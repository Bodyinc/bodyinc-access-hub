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
import { MedicinePackagesEditor } from "@/components/admin/medicine-packages-editor";
import type { MedicineFormValues } from "@/lib/medicines.schema";
import {
  CardDivider,
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

function LifeFileProductIdField({
  register,
  name,
  error,
  submitting,
}: {
  register: UseFormRegister<MedicineFormValues>;
  name: "lf_product_id" | `variants.${number}.lf_product_id`;
  error?: string;
  submitting?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <Label className="text-[12px] font-medium text-[#3B4759]/70">Life File product ID</Label>
      <Input
        {...register(name)}
        inputMode="numeric"
        placeholder="e.g. 201539236"
        disabled={submitting}
        className={medicineInput}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-[12px] font-normal text-[#3B4759]/60">
        From your MPS pricing sheet — one ID per strength/SKU.
      </p>
    </div>
  );
}

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
    const medLfId = getValues("lf_product_id") ?? "";
    variantsArray.append({
      name: "",
      is_active: true,
      lf_product_id: medLfId,
      packages: current,
    } as any);
    setValue("packages", []);
    if (medLfId) setValue("lf_product_id", "");
  }

  if (!hasVariants) {
    return (
      <div className="space-y-4">
        <LifeFileProductIdField
          register={register}
          name="lf_product_id"
          error={errors.lf_product_id?.message}
          submitting={submitting}
        />
        <MedicinePackagesEditor
          control={control}
          register={register}
          setValue={setValue}
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
    <div className="min-w-0 space-y-5">
      <div className="space-y-2">
        <h3 className={medicineCardTitle}>Variants</h3>
        <p className="text-[16px] font-normal text-[#3B4759]/70">
          Dose or strength options (e.g. 2mg/0.5ml, 4mg/0.5ml). Each variant needs its own Life
          File product ID and packages (up to 2). Patients pick a variant in the shop.
        </p>
        <CardDivider />
      </div>

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
                  placeholder="e.g. 2mg/0.5ml (2mL Vial)"
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

            <LifeFileProductIdField
              register={register}
              name={`variants.${vIndex}.lf_product_id`}
              error={errors.variants?.[vIndex]?.lf_product_id?.message}
              submitting={submitting}
            />

            <MedicinePackagesEditor
              control={control}
              register={register}
              setValue={setValue}
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
        onClick={() =>
          variantsArray.append({
            name: "",
            is_active: true,
            lf_product_id: "",
            packages: [],
          } as any)
        }
        className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#152A51] transition-colors hover:text-[#152A51]/70 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" /> Add variant
      </button>
    </div>
  );
}
