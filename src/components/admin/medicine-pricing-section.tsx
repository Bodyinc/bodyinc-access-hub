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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MedicinePackagesEditor } from "@/components/admin/medicine-packages-editor";
import type { MedicineFormValues } from "@/lib/medicines.schema";

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
    // Move any medicine-level packages into the first variant, keeping their ids so the
    // reconcile reparents the existing rows (preserving order history + Stripe prices).
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
        <Button
          type="button"
          variant="outline"
          disabled={submitting}
          onClick={addFirstVariant}
          className="h-[44px] rounded-[6px] border border-[#EAE6FA] px-6 text-[14px] font-semibold text-[#2E00AB] transition-colors hover:bg-[#F9F8FF] sm:h-11"
        >
          <Layers className="mr-1.5 h-4 w-4" /> Add variants (e.g. dosages)
        </Button>
      </div>
    );
  }

  return (
    <Card className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-[#EAE6FA] bg-white shadow-sm">
      <CardHeader className="border-b border-[#EAE6FA] bg-white p-4 sm:p-6">
        <CardTitle className="text-[16px] font-bold text-[#2A00A2]">Variants</CardTitle>
        <CardDescription className="text-[13px] text-[#2A00A2]/80 font-medium">
          Dose or strength options (e.g. 50mg, 100mg). Each variant has its own packages (up to 2)
          and pricing; patients pick a variant in the shop. The medicine&apos;s &ldquo;from&rdquo;
          price is the cheapest across variants.
        </CardDescription>
      </CardHeader>
      <CardContent className="min-w-0 space-y-5 p-4 sm:p-6">
        {variantsArray.fields.map((field, vIndex) => (
          <div
            key={field.id}
            className="min-w-0 space-y-4 rounded-xl border border-[#E2DCFA] bg-[#FBFAFF] p-4 sm:p-5"
          >
            <div className="grid grid-cols-1 items-start gap-3 min-[480px]:grid-cols-[minmax(0,1fr)_auto_auto]">
              <div className="min-w-0 space-y-1">
                <Label className="text-[16px] font-medium text-[#2E00AB]">Variant name</Label>
                <Input
                  {...register(`variants.${vIndex}.name`)}
                  placeholder="e.g. 50mg"
                  disabled={submitting}
                  className="h-[44px] rounded-[6px] border border-[#EAE6FA] bg-white px-4 text-[16px] font-normal text-[#2E00AB] shadow-none focus-visible:ring-1 focus-visible:ring-[#2E00AB] sm:h-[53px]"
                />
                {errors.variants?.[vIndex]?.name?.message && (
                  <p className="text-xs text-destructive">{errors.variants[vIndex]!.name!.message}</p>
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
                      className="data-[state=checked]:bg-[#2A00A2]"
                    />
                    <span className="text-[11px] font-semibold text-[#6B5AE0]/70">Active</span>
                  </div>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-0 h-[44px] w-[44px] rounded-[6px] text-[#2E00AB]/60 hover:bg-destructive/5 hover:text-destructive min-[480px]:mt-6 sm:h-11 sm:w-11"
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

        <Button
          type="button"
          variant="outline"
          disabled={submitting}
          onClick={() =>
            variantsArray.append({ name: "", is_active: true, packages: [] } as any)
          }
          className="h-[44px] rounded-[6px] border border-[#EAE6FA] px-6 text-[14px] font-semibold text-[#2E00AB] transition-colors hover:bg-[#F9F8FF] sm:h-11"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add variant
        </Button>
      </CardContent>
    </Card>
  );
}
