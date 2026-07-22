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
          className="border-[#EAE6FA] hover:bg-[#F9F8FF] text-[#6B5AE0] h-11 px-6 rounded-xl font-semibold text-[14px] transition-colors"
        >
          <Layers className="mr-1.5 h-4 w-4" /> Add variants (e.g. dosages)
        </Button>
      </div>
    );
  }

  return (
    <Card className="border border-[#EAE6FA] bg-white rounded-xl shadow-sm overflow-hidden">
      <CardHeader className="border-b border-[#EAE6FA] bg-white p-6">
        <CardTitle className="text-[16px] font-bold text-[#2A00A2]">Variants</CardTitle>
        <CardDescription className="text-[13px] text-[#2A00A2]/80 font-medium">
          Dose or strength options (e.g. 50mg, 100mg). Each variant has its own packages (up to 2)
          and pricing; patients pick a variant in the shop. The medicine&apos;s &ldquo;from&rdquo;
          price is the cheapest across variants.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-5">
        {variantsArray.fields.map((field, vIndex) => (
          <div
            key={field.id}
            className="rounded-xl border border-[#E2DCFA] bg-[#FBFAFF] p-5 space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-[13px] font-bold text-[#2A00A2]">Variant name</Label>
                <Input
                  {...register(`variants.${vIndex}.name`)}
                  placeholder="e.g. 50mg"
                  disabled={submitting}
                  className="h-11 border-[#EAE6FA] bg-white text-foreground rounded-xl focus-visible:ring-[#2A00A2] text-[14px] font-medium"
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
                className="h-11 w-11 rounded-xl text-[#6B5AE0]/60 hover:text-destructive hover:bg-destructive/5 mt-6"
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
          className="border-[#EAE6FA] hover:bg-[#F9F8FF] text-[#2A00A2] h-11 px-6 rounded-xl font-semibold text-[14px] transition-colors"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add variant
        </Button>
      </CardContent>
    </Card>
  );
}
