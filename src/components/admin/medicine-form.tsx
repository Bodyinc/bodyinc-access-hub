"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFieldArray, useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2, Upload, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadMedicineImage } from "@/lib/medicine-image-upload";
import { MedicinePricingSection } from "@/components/admin/medicine-pricing-section";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { categoriesQueryOptions } from "@/lib/query-options/categories";
import {
  medicineFormSchema,
  MEDICINE_STATUSES,
  MEDICINE_STATUS_LABELS,
  type MedicineFormValues,
  type MedicineStatus,
} from "@/lib/medicines.schema";

export type MedicineFormProps = {
  defaultValues?: Partial<MedicineFormValues>;
  mode: "create" | "edit";
  submitting?: boolean;
  onSubmit: (values: MedicineFormValues) => void | Promise<void>;
  onCancel?: () => void;
  onValuesChange?: (values: MedicineFormValues) => void;
};

const EMPTY: MedicineFormValues = {
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
};

const labelClass = "text-[13px] font-semibold text-[#2E00AB] tracking-normal";

const inputClass =
  "h-[53px] px-4 py-[14px] border-[#EAE6FA] bg-white text-[#2E00AB] placeholder:text-[#2E00AB]/40 rounded-[6px] focus-visible:ring-[#2E00AB] text-[14px] font-normal leading-tight font-['DM_Sans',sans-serif]";

const textareaClass =
  "min-h-[90px] px-4 py-[14px] border-[#EAE6FA] bg-white text-[#2E00AB] placeholder:text-[#2E00AB]/40 rounded-[6px] focus-visible:ring-[#2E00AB] text-[14px] font-normal leading-tight font-['DM_Sans',sans-serif] resize-none";

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
    <div className="flex w-full min-w-0 flex-col gap-2">
      <Label className={labelClass}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

export function MedicineForm({
  defaultValues,
  mode,
  submitting,
  onSubmit,
  onCancel,
  onValuesChange,
}: MedicineFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const form = useForm<MedicineFormValues>({
    resolver: zodResolver(medicineFormSchema) as any,
    defaultValues: { ...EMPTY, ...defaultValues },
  });

  const { register, handleSubmit, watch, setValue, control, formState } = form;
  const errors = formState.errors;
  const status = watch("status");
  const imageUrl = watch("image_url");
  const categoriesQ = useQuery(categoriesQueryOptions());

  const { fields, append, remove } = useFieldArray({
    control,
    name: "important_info",
  });

  useEffect(() => {
    if (!onValuesChange) return;
    const subscription = watch((formValues) => {
      onValuesChange(formValues as MedicineFormValues);
    });
    return () => subscription.unsubscribe();
  }, [watch, onValuesChange]);

  async function handleImageSelect(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const url = await uploadMedicineImage(file);
      setValue("image_url", url, { shouldValidate: true });
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleImageSelect(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void handleImageSelect(file);
  }

  return (
    <form
  onSubmit={handleSubmit(onSubmit)}
   className="font-['DM_Sans',sans-serif] m-0 w-full min-w-0 max-w-full space-y-6 p-0"
  noValidate
>
      <div className="w-full min-w-0 max-w-full space-y-6">
        {/* Main Details Card */}
        <Card className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-[#EAE6FA] bg-white p-4 shadow-none sm:p-6 space-y-6">
          <div className="space-y-1">
            <h2 className="text-[22px] font-bold text-[#2E00AB]">
              {mode === "create" ? "Add medicine" : "Edit medicine"}
            </h2>
            <p className="text-[14px] font-normal text-[#2E00AB]/80">
              Product image and details shown to patients.
            </p>
          </div>

          <div className="flex w-full min-w-0 flex-col items-start gap-6 md:flex-row">
            {/* Product Image Box Container - narrower upload card */}
            <div className="w-full max-w-[280px] shrink-0 space-y-2">
              <div
                className="flex h-[360px] w-full flex-col items-center justify-between rounded-[12px] border border-dashed border-[#EAE6FA] bg-[#FDFDFF] p-[14px]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
              >
                <div className="flex aspect-[326/315] w-full items-center justify-center overflow-hidden rounded-[8px] bg-[#EAE4FF]">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="Medicine preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="h-12 w-12 text-[#2E00AB]/40" />
                  )}
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onFileChange}
                  disabled={submitting || uploading}
                />

                <Button
                  type="button"
                  disabled={submitting || uploading}
                  onClick={() => fileRef.current?.click()}
                  className="bg-[#2E00AB] hover:bg-[#25008A] text-white font-semibold rounded-xl h-10 px-6 text-[13px] flex items-center gap-2 transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploading
                    ? "Uploading..."
                    : imageUrl
                    ? "Replace image"
                    : "Upload image"}
                </Button>

                <span className="text-[12px] font-normal text-[#2E00AB]/70">
                  JPG, PNG, or WebP · Max 5MB
                </span>
              </div>
              {(errors.image_url?.message || uploadError) && (
                <p className="text-xs text-destructive">
                  {errors.image_url?.message ?? uploadError}
                </p>
              )}
            </div>

            {/* Input Fields */}
            <div className="w-full min-w-0 flex-1 space-y-4">
              <Field label="Medicine Name" error={errors.name?.message}>
                <Input
                  {...register("name")}
                  placeholder="e.g. GLP-1 Compound"
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field
                label="Short description"
                error={errors.short_description?.message}
              >
                <Input
                  {...register("short_description")}
                  placeholder="Shown on the medication card"
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field
                label="Long description"
                error={errors.long_description?.message}
              >
                <Textarea
                  {...register("long_description")}
                  rows={3}
                  placeholder="Full description in the Learn More modal"
                  disabled={submitting}
                  className={textareaClass}
                />
              </Field>

              <div className="pt-1 space-y-4">
                <div className="w-[140px]">
                  <Field label="Status" error={errors.status?.message}>
                    <Select
                      value={status}
                      onValueChange={(v) =>
                        setValue("status", v as MedicineStatus)
                      }
                      disabled={submitting}
                    >
                      <SelectTrigger className="h-[53px] px-4 border-[#EAE6FA] bg-white text-[#2E00AB] rounded-[6px] text-[14px] font-normal">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent className="font-['DM_Sans',sans-serif]">
                        {MEDICINE_STATUSES.map((s) => (
                          <SelectItem
                            key={s}
                            value={s}
                            className="text-[14px] font-normal text-[#2E00AB]"
                          >
                            {MEDICINE_STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                {/* Clean Toggle Switch & Single-Line Label */}
                <div className="flex min-w-0 flex-wrap items-center gap-3 pt-1">
                  <Controller
  control={control}
  name="requires_questionnaire"
  render={({ field }) => (
    <Switch
      id="req-qq"
      checked={!!field.value}
      onCheckedChange={field.onChange}
      className="h-[34px] w-[60px] rounded-[10px] border border-[#E2DAFC] bg-[#FAF8FE] p-[3px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E00AB] data-[state=checked]:bg-[#FAF8FE] data-[state=unchecked]:bg-[#FAF8FE] [&>span]:h-[26px] [&>span]:w-[26px] [&>span]:rounded-[6px] [&>span]:transition-all [&>span]:duration-200 [&>span]:data-[state=checked]:bg-[#2E00AB] [&>span]:data-[state=unchecked]:bg-[#DCD5FA] [&>span]:data-[state=checked]:translate-x-[26px] [&>span]:data-[state=unchecked]:translate-x-0"
    />
  )}
/>
                  <Label
                    htmlFor="req-qq"
                    className="min-w-0 cursor-pointer select-none text-[14px] font-medium text-[#2E00AB]"
                  >
                    Requires questionnaire before checkout
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Target Categories */}
        <Card className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-[#EAE6FA] bg-white p-4 shadow-none sm:p-6 space-y-4">
          <div className="space-y-1">
            <h3 className="text-[18px] font-bold text-[#2E00AB]">
              Categories
            </h3>
            <p className="text-[13px] font-medium text-[#2E00AB]/80">
              Assign this medicine to one or more goal categories.
            </p>
          </div>

          <Controller
            control={control}
            name="category_ids"
            render={({ field }) => (
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                {(categoriesQ.data ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground font-medium py-1">
                    No categories yet. Create one under Categories first.
                  </p>
                )}
                {(categoriesQ.data ?? []).map((c) => {
                  const checked = (field.value ?? []).includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className="flex items-center gap-3 rounded-xl border border-[#EAE6FA] bg-[#FDFDFF] p-3.5 text-[13px] font-semibold text-[#2E00AB] cursor-pointer transition-colors hover:bg-[#F9F8FF]"
                    >
                      <Checkbox
                        checked={checked}
                        className="border-[#2E00AB]/30 data-[state=checked]:bg-[#2E00AB] data-[state=checked]:border-[#2E00AB] h-4 w-4 rounded"
                        onCheckedChange={(v) => {
                          const set = new Set(field.value ?? []);
                          if (v) set.add(c.id);
                          else set.delete(c.id);
                          field.onChange(Array.from(set));
                        }}
                      />
                      {c.name}
                    </label>
                  );
                })}
              </div>
            )}
          />
        </Card>

        {/* Medicine Pricing Section */}
        <MedicinePricingSection
          control={control}
          register={register}
          getValues={form.getValues}
          setValue={setValue}
          errors={errors}
          submitting={submitting}
        />

        {/* Important Info */}
        <Card className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-[#EAE6FA] bg-white p-4 shadow-none sm:p-6 space-y-4">
          <div className="space-y-1">
            <h3 className="text-[18px] font-bold text-[#2E00AB]">
              Important information
            </h3>
            <p className="text-[13px] font-medium text-[#2E00AB]/80">
              Bullet points shown in the Learn More modal.
            </p>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex min-w-0 items-center gap-3">
                <Input
                  {...register(`important_info.${index}.text`)}
                  placeholder={`Bullet ${index + 1}`}
                  disabled={submitting}
                  className={inputClass}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-[53px] w-[53px] rounded-xl text-[#2E00AB]/60 hover:text-destructive hover:bg-destructive/5"
                  disabled={submitting}
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => append({ text: "" })}
              className="border-[#EAE6FA] hover:bg-[#F9F8FF] text-[#2E00AB] h-10 px-4 rounded-xl font-semibold text-[13px] transition-colors mt-1"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add bullet
            </Button>
          </div>
        </Card>

        {/* Notice Block */}
        <Card className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-[#EAE6FA] bg-white p-4 shadow-none sm:p-6 space-y-4">
          <div className="space-y-1">
            <h3 className="text-[18px] font-bold text-[#2E00AB]">Notice</h3>
            <p className="text-[13px] font-medium text-[#2E00AB]/80">
              Optional footer disclaimer in the modal.
            </p>
          </div>

          <Textarea
            {...register("notice_text")}
            rows={2}
            placeholder="e.g. Individual results may vary…"
            disabled={submitting}
            className={textareaClass}
          />
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            type="submit"
            disabled={submitting || uploading}
            className="bg-[#2E00AB] hover:bg-[#25008A] text-white h-11 px-8 rounded-xl font-semibold text-[14px] shadow-sm transition-all min-w-[140px]"
          >
            {submitting
              ? "Saving…"
              : mode === "create"
              ? "Create medicine"
              : "Save changes"}
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={submitting}
              className="border-[#EAE6FA] hover:bg-[#F9F8FF] text-[#2E00AB] h-11 px-8 rounded-xl font-semibold text-[14px] transition-colors"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}