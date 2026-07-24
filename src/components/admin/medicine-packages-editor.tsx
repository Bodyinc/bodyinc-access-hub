import { useState } from "react";
import {
  useFieldArray,
  Controller,
  type Control,
  type UseFormRegister,
} from "react-hook-form";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MAX_PACKAGES_PER_MEDICINE, type MedicineFormValues } from "@/lib/medicines.schema";

type Props = {
  control: Control<MedicineFormValues>;
  register: UseFormRegister<MedicineFormValues>;
  // Base field-array path, e.g. "packages" or `variants.0.packages`.
  name: string;
  // Error slice for this packages array (errors.packages or errors.variants[i].packages).
  packageErrors?: any;
  submitting?: boolean;
  // Embedded inside a variant card — render without the outer Card chrome.
  embedded?: boolean;
};

const inputClass =
  "h-[44px] sm:h-[53px] px-4 !rounded-[6px] border border-[#EAE6FA] bg-white text-[#2E00AB] placeholder:text-[#2E00AB]/40 focus-visible:ring-1 focus-visible:ring-[#2E00AB] text-[16px] font-normal leading-[100%] shadow-none";

const textareaClass =
  "min-h-[70px] px-4 py-3 !rounded-[6px] border border-[#EAE6FA] bg-white text-[#2E00AB] placeholder:text-[#2E00AB]/40 focus-visible:ring-1 focus-visible:ring-[#2E00AB] text-[16px] font-normal leading-[140%] resize-none shadow-none";

export function MedicinePackagesEditor({
  control,
  register,
  name,
  packageErrors,
  submitting,
  embedded,
}: Props) {
  const { fields, append, remove } = useFieldArray({ control, name: name as any });
  const atMax = fields.length >= MAX_PACKAGES_PER_MEDICINE;

  const body = (
    <div className="w-full min-w-0 max-w-full space-y-4">
      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground font-medium py-1">
          No packages yet. Add at least one so this {embedded ? "variant" : "medicine"} has a price
          and can be purchased.
        </p>
      )}

      {fields.length > 0 && (
        <div className="hidden min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 px-1 text-[12px] font-medium text-[#2E00AB]/70 md:grid">
          <span>Duration (months)</span>
          <span>Original price ($)</span>
          <span>Sale price ($)</span>
          <span className="w-11" />
        </div>
      )}

      {fields.map((field, index) => (
        <PackageRow
          key={field.id}
          control={control}
          register={register}
          name={name}
          rowErrors={packageErrors?.[index]}
          index={index}
          submitting={submitting}
          onRemove={() => remove(index)}
        />
      ))}

      <Button
        type="button"
        variant="outline"
        disabled={submitting || atMax}
        onClick={() =>
          append({
            duration_months: fields.length === 0 ? 1 : 3,
            original_price: 0,
            price: 0,
            is_most_popular: false,
            is_active: true,
            features: [],
            clinical_note: "",
          } as any)
        }
        className="h-[44px] rounded-[6px] border border-[#EAE6FA] px-4 text-[14px] font-semibold text-[#2E00AB] transition-colors hover:bg-[#F9F8FF] sm:h-11"
      >
        <Plus className="mr-1.5 h-4 w-4" /> Add package
      </Button>
      {atMax && (
        <p className="text-[12px] font-medium text-[#6B5AE0]/60">
          Maximum of {MAX_PACKAGES_PER_MEDICINE} packages reached.
        </p>
      )}
    </div>
  );

  if (embedded) return body;

  return (
    <Card className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-[#EAE6FA] bg-white shadow-sm">
      <CardHeader className="border-b border-[#EAE6FA] bg-white p-4 sm:p-6">
        <CardTitle className="text-[20px] font-semibold leading-[100%] text-[#2E00AB]">
          Pricing packages
        </CardTitle>
        <CardDescription className="text-[16px] font-normal leading-[100%] text-[#2E00AB]/80">
          Duration-based plans patients can buy — up to {MAX_PACKAGES_PER_MEDICINE} per medicine. The
          lowest per-month price is shown as the medicine&apos;s &ldquo;from&rdquo; price.
        </CardDescription>
      </CardHeader>
      <CardContent className="min-w-0 p-4 sm:p-6">{body}</CardContent>
    </Card>
  );
}

function PackageRow({
  control,
  register,
  name,
  rowErrors,
  index,
  submitting,
  onRemove,
}: {
  control: Control<MedicineFormValues>;
  register: UseFormRegister<MedicineFormValues>;
  name: string;
  rowErrors?: any;
  index: number;
  submitting?: boolean;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { fields, append, remove } = useFieldArray({
    control,
    name: `${name}.${index}.features` as any,
  });

  return (
    <div className="min-w-0 space-y-3 rounded-[10px] border border-[#EAE6FA] bg-[#FDFDFF] p-4">
      <div className="grid min-w-0 grid-cols-1 items-start gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <div className="min-w-0 space-y-1">
          <Label className="text-[12px] font-medium text-[#2E00AB] md:hidden">
            Duration (months)
          </Label>
          <Input
            type="number"
            min={1}
            step={1}
            {...register(`${name}.${index}.duration_months` as any)}
            disabled={submitting}
            className={inputClass}
          />
          {rowErrors?.duration_months?.message && (
            <p className="text-xs text-destructive">{rowErrors.duration_months.message}</p>
          )}
        </div>
        <div className="min-w-0 space-y-1">
          <Label className="text-[12px] font-medium text-[#2E00AB]/70 md:hidden">
            Original price ($)
          </Label>
          <Input
            type="number"
            step="0.01"
            min={0}
            {...register(`${name}.${index}.original_price` as any)}
            disabled={submitting}
            className={inputClass}
          />
          {rowErrors?.original_price?.message && (
            <p className="text-xs text-destructive">{rowErrors.original_price.message}</p>
          )}
        </div>
        <div className="min-w-0 space-y-1">
          <Label className="text-[12px] font-medium text-[#2E00AB]/70 md:hidden">
            Sale price ($)
          </Label>
          <Input
            type="number"
            step="0.01"
            min={0}
            {...register(`${name}.${index}.price` as any)}
            disabled={submitting}
            className={inputClass}
          />
          {rowErrors?.price?.message && (
            <p className="text-xs text-destructive">{rowErrors.price.message}</p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-[44px] w-[44px] shrink-0 justify-self-end rounded-[6px] text-[#2E00AB]/60 hover:bg-destructive/5 hover:text-destructive sm:h-11 sm:w-11"
          disabled={submitting}
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid min-w-0 grid-cols-1 items-center gap-x-4 gap-y-3 md:grid-cols-[minmax(0,1fr)_auto] md:flex md:flex-wrap md:gap-x-6">
        <Controller
          control={control}
          name={`${name}.${index}.is_most_popular` as any}
          render={({ field }) => (
            <div className="flex min-w-0 items-center gap-2.5">
              <Switch
                checked={!!field.value}
                onCheckedChange={field.onChange}
                disabled={submitting}
                
              />
              <span className="text-[14px] font-normal text-[#2E00AB]">Most popular</span>
            </div>
          )}
        />
        <Controller
          control={control}
          name={`${name}.${index}.is_active` as any}
          render={({ field }) => (
            <div className="flex min-w-0 items-center gap-2.5">
              <Switch
                checked={field.value ?? true}
                onCheckedChange={field.onChange}
                disabled={submitting}
                
              />
              <span className="text-[14px] font-normal text-[#2E00AB]">Active</span>
            </div>
          )}
        />
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="col-span-1 flex min-w-0 items-center justify-start gap-1 text-[14px] font-medium text-[#2E00AB] transition-colors hover:text-[#25008A] md:col-span-1 md:ml-auto md:justify-end"
        >
          Features &amp; clinical note
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      {expanded && (
        <div className="space-y-3 border-t border-[#EAE6FA] pt-3">
          <div className="space-y-2">
            <Label className="text-[12px] font-medium text-[#2E00AB]/70">Included features</Label>
            {fields.map((f, fi) => (
              <div key={f.id} className="flex min-w-0 items-center gap-2.5">
                <Input
                  {...register(`${name}.${index}.features.${fi}.text` as any)}
                  placeholder={`Feature ${fi + 1}`}
                  disabled={submitting}
                  className={inputClass}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-[44px] w-[44px] shrink-0 rounded-[6px] text-[#2E00AB]/60 hover:bg-destructive/5 hover:text-destructive sm:h-11 sm:w-11"
                  disabled={submitting}
                  onClick={() => remove(fi)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => append({ text: "" } as any)}
              className="h-10 rounded-[6px] border border-[#EAE6FA] px-4 text-[14px] font-semibold text-[#2E00AB] transition-colors hover:bg-[#F9F8FF]"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add feature
            </Button>
          </div>
          <div className="space-y-2">
            <Label className="text-[12px] font-medium text-[#2E00AB]/70">Clinical note</Label>
            <Textarea
              {...register(`${name}.${index}.clinical_note` as any)}
              rows={2}
              placeholder="Optional disclaimer shown with this plan"
              disabled={submitting}
              className={textareaClass}
            />
          </div>
        </div>
      )}
    </div>
  );
}
