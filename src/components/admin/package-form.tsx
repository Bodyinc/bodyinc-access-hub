import { useEffect, type ReactNode } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  packageFormSchema,
  DURATION_PRESETS,
  computeSavings,
  formatPrice,
  type PackageFormValues,
} from "@/lib/packages.schema";
import type { StoredMedicine } from "@/lib/medicines.store";

export type PackageFormProps = {
  medicines: StoredMedicine[];
  defaultValues?: Partial<PackageFormValues>;
  mode: "create" | "edit";
  submitting?: boolean;
  onSubmit: (values: PackageFormValues) => void | Promise<void>;
  onCancel?: () => void;
  onValuesChange?: (values: PackageFormValues) => void;
};

const EMPTY: PackageFormValues = {
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
};

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-[13px] font-bold text-[#4A3AFF]">{label}</Label>
      {children}
      {error && <p className="text-xs font-semibold text-[#FF4D6D]">{error}</p>}
    </div>
  );
}

export function PackageForm({
  medicines,
  defaultValues,
  mode,
  submitting,
  onSubmit,
  onCancel,
  onValuesChange,
}: PackageFormProps) {
  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageFormSchema) as any,
    defaultValues: { ...EMPTY, ...defaultValues },
  });

  const { register, handleSubmit, watch, setValue, control, formState } = form;
  const errors = formState.errors;
  const medicineId = watch("medicine_id");
  const originalPrice = watch("original_price");
  const price = watch("price");
  const durationMonths = watch("duration_months");
  const isMostPopular = watch("is_most_popular");
  const isActive = watch("is_active");

  const { fields, append, remove } = useFieldArray({
    control,
    name: "features",
  });

  const savings = computeSavings(Number(originalPrice) || 0, Number(price) || 0);
  const selectedMedicine = medicines.find((m) => m.id === medicineId);

  useEffect(() => {
    if (!onValuesChange) return;
    const subscription = watch((formValues) => {
      onValuesChange(formValues as PackageFormValues);
    });
    return () => subscription.unsubscribe();
  }, [watch, onValuesChange]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 w-full text-left" noValidate>
      {/* Dynamic Header */}
      <div>
        <h2 className="text-2xl font-black tracking-tight text-[#2A00A2]">
          {mode === "create" ? "Add package" : "Edit package"}
        </h2>
        <p className="text-[14px] text-[#6B5AE0]/70 font-medium mt-1">
          Configure pricing plans and duration terms linked to prescription tracks.
        </p>
      </div>

      {/* Main Core Plan Configuration Details Card Panel */}
      <Card className="overflow-hidden border border-[#EAE6FA] bg-white shadow-sm rounded-2xl p-2 sm:p-4">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold text-[#2A00A2]">Package Details</CardTitle>
          <CardDescription className="text-[#6B5AE0]/60 font-medium text-[13px]">
            Define treatment plan names, pricing matrix strategies, and operational visibility terms.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field label="Medicine" error={errors.medicine_id?.message}>
            <Select
              value={medicineId || undefined}
              onValueChange={(v) => setValue("medicine_id", v, { shouldValidate: true })}
              disabled={submitting || mode === "edit"}
            >
              <SelectTrigger className="h-11 rounded-xl border-[#E2DCFA] bg-white text-[#2A00A2] font-semibold text-[14px] focus:ring-1 focus:ring-[#4A3AFF] outline-none shadow-none disabled:opacity-60">
                <SelectValue placeholder="Select a medicine target link" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-[#E2DCFA]">
                {medicines.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="font-medium text-[#2A00A2]">
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Plan name" error={errors.name?.message}>
            <Input
              {...register("name")}
              placeholder="e.g. Standard Treatment Plan"
              disabled={submitting}
              className="h-11 rounded-xl border-[#E2DCFA] focus-visible:ring-[#4A3AFF] focus-visible:ring-1 text-[#2A00A2] font-semibold text-[14px] placeholder:text-[#6B5AE0]/40"
            />
          </Field>

          <Field label="Duration (months)" error={errors.duration_months?.message}>
            <div className="flex flex-wrap items-center gap-2.5">
              {DURATION_PRESETS.map((d) => {
                const isSelected = durationMonths === d;
                return (
                  <Button
                    key={d}
                    type="button"
                    disabled={submitting}
                    onClick={() => setValue("duration_months", d, { shouldValidate: true })}
                    className={`h-11 px-5 rounded-xl font-bold transition-all shadow-none border text-[14px]
                      ${isSelected 
                        ? "bg-[#2A00A2] border-[#2A00A2] hover:bg-[#1E0075] text-white" 
                        : "bg-white border-[#E2DCFA] text-[#6B5AE0] hover:bg-[#F5F3FF] hover:text-[#2A00A2]"
                      }
                    `}
                  >
                    {d} mo
                  </Button>
                );
              })}
              <Input
                type="number"
                min={1}
                {...register("duration_months", { valueAsNumber: true })}
                disabled={submitting}
                className="w-24 h-11 rounded-xl border-[#E2DCFA] focus-visible:ring-[#4A3AFF] focus-visible:ring-1 text-[#2A00A2] font-semibold text-[14px] placeholder:text-[#6B5AE0]/40"
              />
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Original price ($)" error={errors.original_price?.message}>
              <Input
                type="number"
                step="0.01"
                min={0}
                {...register("original_price")}
                disabled={submitting}
                className="h-11 rounded-xl border-[#E2DCFA] focus-visible:ring-[#4A3AFF] focus-visible:ring-1 text-[#2A00A2] font-semibold text-[14px]"
              />
            </Field>
            <Field label="Sale price ($)" error={errors.price?.message}>
              <Input
                type="number"
                step="0.01"
                min={0}
                {...register("price")}
                disabled={submitting}
                className="h-11 rounded-xl border-[#E2DCFA] focus-visible:ring-[#4A3AFF] focus-visible:ring-1 text-[#2A00A2] font-semibold text-[14px]"
              />
            </Field>
          </div>

          {savings > 0 && (
            <p className="text-[13px] font-semibold text-[#6B5AE0]/80 bg-[#F5F3FF] border border-[#E2DCFA]/40 px-3.5 py-2 rounded-xl inline-block">
              Patient saves <span className="font-bold text-[#2A00A2]">{formatPrice(savings)}</span>
            </p>
          )}

          {/* Switch Block 1: Most popular toggle */}
          <div className="flex items-center justify-between rounded-xl border border-[#E2DCFA] p-3.5 bg-[#FDFDFF]/60">
            <div className="space-y-0.5">
              <p className="text-[14px] font-bold text-[#2A00A2]">Most popular badge</p>
              <p className="text-[12px] text-[#6B5AE0]/70 font-medium">
                Highlight this plan. Note: Only one plan variant per medicine can carry this target focus layout.
              </p>
            </div>
            <Switch
              checked={isMostPopular}
              onCheckedChange={(v) => setValue("is_most_popular", v)}
              disabled={submitting}
              className="data-[state=checked]:bg-[#4A3AFF] data-[state=unchecked]:bg-[#E2DCFA]"
            />
          </div>

          {/* Switch Block 2: Active visibility track toggle */}
          <div className="flex items-center justify-between rounded-xl border border-[#E2DCFA] p-3.5 bg-[#FDFDFF]/60">
            <div className="space-y-0.5">
              <p className="text-[14px] font-bold text-[#2A00A2]">Active status visibility</p>
              <p className="text-[12px] text-[#6B5AE0]/70 font-medium">
                Make this package immediately visible during patient checkouts and plan selections.
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={(v) => setValue("is_active", v)}
              disabled={submitting}
              className="data-[state=checked]:bg-[#4A3AFF] data-[state=unchecked]:bg-[#E2DCFA]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Included Plan Features Checklist Card Section */}
      <Card className="overflow-hidden border border-[#EAE6FA] bg-white shadow-sm rounded-2xl p-2 sm:p-4">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold text-[#2A00A2]">Included features</CardTitle>
          <CardDescription className="text-[#6B5AE0]/60 font-medium text-[13px]">
            Bullet point text lines shown inside the landing recommendation pricing cards.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2.5 items-center">
              <Input
                {...register(`features.${index}.text`)}
                placeholder={`Feature attribute detail text #${index + 1}`}
                disabled={submitting}
                className="h-11 rounded-xl border-[#E2DCFA] focus-visible:ring-[#4A3AFF] focus-visible:ring-1 text-[#2A00A2] font-semibold text-[14px] placeholder:text-[#6B5AE0]/40"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={submitting}
                onClick={() => remove(index)}
                className="h-11 w-11 rounded-xl text-[#FF4D6D] hover:bg-[#FFE8EC] hover:text-[#FF4D6D] transition-colors shrink-0"
              >
                <Trash2 className="h-[18px] w-[18px]" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => append({ text: "" })}
            className="mt-1 border-[#E2DCFA] text-[#4A3AFF] hover:bg-[#F5F3FF] hover:text-[#2A00A2] font-bold rounded-xl h-10 px-4 transition-colors"
          >
            <Plus className="mr-1.5 h-4 w-4 stroke-[3]" /> Add feature item
          </Button>
        </CardContent>
      </Card>

      {/* Clinical Disclaimer Segment Panel */}
      <Card className="overflow-hidden border border-[#EAE6FA] bg-white shadow-sm rounded-2xl p-2 sm:p-4">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold text-[#2A00A2]">Clinical note</CardTitle>
          <CardDescription className="text-[#6B5AE0]/60 font-medium text-[13px]">
            Legal disclaimers, medical descriptions, or regulatory advisory texts positioned beneath plan tier cards.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            {...register("clinical_note")}
            rows={2}
            placeholder="Optional clinical verification layout guidelines or disclaimer details..."
            disabled={submitting}
            className="rounded-xl border-[#E2DCFA] focus-visible:ring-[#4A3AFF] focus-visible:ring-1 resize-none font-medium text-[14px] text-[#2A00A2] placeholder:text-[#6B5AE0]/40 p-3 min-h-[70px]"
          />
        </CardContent>
      </Card>

      {/* Footer Meta Details Anchor info */}
      {selectedMedicine && (
        <p className="text-[13px] font-medium text-[#6B5AE0]/60 px-1">
          Currently establishing package link route directly onto <span className="font-bold text-[#2A00A2]">{selectedMedicine.name}</span>
        </p>
      )}

      {/* Grid Action Footer Controls */}
      <div className="flex flex-row items-center gap-3 pt-2">
        {onCancel && (
          <Button 
            type="button" 
            variant="ghost" 
            onClick={onCancel} 
            disabled={submitting}
            className="w-32 text-[#4A3AFF] hover:bg-[#F5F3FF] hover:text-[#2A00A2] font-bold rounded-xl h-11 transition-colors border-none bg-transparent"
          >
            Cancel
          </Button>
        )}
        <Button 
          type="submit" 
          disabled={submitting}
          className="w-48 bg-[#2A00A2] hover:bg-[#1E0075] text-white font-bold rounded-xl h-11 px-5 shadow-sm transition-colors"
        >
          {submitting ? "Saving…" : mode === "create" ? "Create package" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}