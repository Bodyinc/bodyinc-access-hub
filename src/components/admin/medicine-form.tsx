import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadMedicineImage } from "@/lib/medicine-image-upload";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { categoriesQueryOptions } from "@/lib/query-options/categories";
import { Controller } from "react-hook-form";
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
  price_monthly: 0,
  status: "draft",
  important_info: [],
  notice_text: "",
  sort_order: 0,
  requires_questionnaire: false,
  category_ids: [],
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
    <div className="space-y-2 w-full">
      <Label className="text-[14px] font-bold text-[#2A00A2]">{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
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
    /* Changed max-w-[800px] to max-w-5xl and space-y-5 to space-y-6 to match CategoryForm layout placement perfectly */
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-5xl w-full" noValidate>
      {/* Normalized Header Card Block layout */}
      <Card className="border border-[#EAE6FA] bg-white rounded-xl shadow-sm overflow-hidden">
        <CardHeader className="border-b border-[#EAE6FA] bg-white p-6">
          <CardTitle className="text-[20px] font-bold text-[#2A00A2]">
            {mode === "create" ? "Add medicine" : "Edit medicine"}
          </CardTitle>
          <CardDescription className="text-[14px] text-[#6B5AE0]/80 font-medium">
            Product image and details shown to patients.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-[240px_1fr] lg:grid-cols-[260px_1fr]">
            {/* LEFT: Product image preview column */}
            <div className="space-y-2">
              <Label className="text-[14px] font-bold text-[#2A00A2]">Product image</Label>
              <div
                className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#C9C0F0] bg-[#F5F3FF] p-4 text-center transition-colors h-[260px]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
              >
                <div className="w-full aspect-square max-h-[150px] rounded-xl bg-white border border-[#EAE6FA] flex items-center justify-center overflow-hidden">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="Medicine preview"
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <ImagePlus className="h-8 w-8 text-[#6B5AE0]/40" />
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
                  className="bg-[#2A00A2] hover:bg-[#1F007A] text-white h-9 px-4 rounded-lg font-semibold text-[12px] shadow-sm"
                >
                  {uploading ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {uploading ? "Uploading…" : imageUrl ? "Replace image" : "Upload image"}
                </Button>
                <p className="text-[11px] text-[#6B5AE0]/70 font-medium">JPG, PNG, or WebP · Max 5MB</p>
              </div>
              {(errors.image_url?.message || uploadError) && (
                <p className="text-sm text-destructive">{errors.image_url?.message ?? uploadError}</p>
              )}
            </div>

            {/* RIGHT: Primary inputs alignment normalized to form height styles */}
            <div className="space-y-5">
              <Field label="Medicine Name" error={errors.name?.message}>
                <Input
                  {...register("name")}
                  placeholder="e.g. GLP-1 Compound"
                  disabled={submitting}
                  className="h-12 border-[#EAE6FA] bg-[#FDFDFF] text-foreground placeholder:text-[#6B5AE0]/40 rounded-xl focus-visible:ring-[#2A00A2] text-[14px] font-medium"
                />
              </Field>

              <Field label="Short description" error={errors.short_description?.message}>
                <Input
                  {...register("short_description")}
                  placeholder="Shown on the medication card"
                  disabled={submitting}
                  className="h-12 border-[#EAE6FA] bg-[#FDFDFF] text-foreground placeholder:text-[#6B5AE0]/40 rounded-xl focus-visible:ring-[#2A00A2] text-[14px] font-medium"
                />
              </Field>

              <Field label="Long description" error={errors.long_description?.message}>
                <Textarea
                  {...register("long_description")}
                  rows={4}
                  placeholder="Full description in the Learn More modal"
                  disabled={submitting}
                  className="border-[#EAE6FA] bg-[#FDFDFF] text-foreground rounded-xl focus-visible:ring-[#2A00A2] text-[14px] font-medium p-3 min-h-[100px] resize-none"
                />
              </Field>

              <div className="grid gap-5 grid-cols-1 sm:grid-cols-2">
                <Field label="Price per month ($)" error={errors.price_monthly?.message}>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    {...register("price_monthly")}
                    disabled={submitting}
                    className="h-12 border-[#EAE6FA] bg-[#FDFDFF] text-foreground rounded-xl focus-visible:ring-[#2A00A2] text-[14px] font-medium"
                  />
                </Field>
                <Field label="Status" error={errors.status?.message}>
                  <Select
                    value={status}
                    onValueChange={(v) => setValue("status", v as MedicineStatus)}
                    disabled={submitting}
                  >
                    <SelectTrigger className="h-12 border-[#EAE6FA] bg-[#FDFDFF] text-foreground rounded-xl focus:ring-[#2A00A2] text-[14px] font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-[#EAE6FA]">
                      {MEDICINE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="text-[14px] font-medium text-[#2A00A2] focus:bg-[#F9F8FF] focus:text-[#2A00A2]">
                          {MEDICINE_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="h-12 flex items-center bg-[#FDFDFF] border border-[#EAE6FA] rounded-xl px-4 mt-2">
                <Controller
                  control={control}
                  name="requires_questionnaire"
                  render={({ field }) => (
                    <div className="flex items-center gap-3 w-full">
                      <Switch
                        id="req-qq"
                        checked={!!field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-[#2A00A2]"
                      />
                      <Label htmlFor="req-qq" className="text-[14px] font-semibold text-[#2A00A2] cursor-pointer select-none">
                        Requires questionnaire before checkout
                      </Label>
                    </div>
                  )}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Target Categories Card Assignment Block */}
      <Card className="border border-[#EAE6FA] bg-white rounded-xl shadow-sm overflow-hidden">
        <CardHeader className="border-b border-[#EAE6FA] bg-white p-6">
          <CardTitle className="text-[16px] font-bold text-[#2A00A2]">Categories</CardTitle>
          <CardDescription className="text-[13px] text-[#6B5AE0]/80 font-medium">Assign this medicine to one or more goal categories.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
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
                    <label key={c.id} className="flex items-center gap-3 rounded-xl border border-[#EAE6FA] bg-[#FDFDFF] p-3.5 text-[14px] font-semibold text-[#2A00A2] cursor-pointer transition-colors hover:bg-[#F9F8FF]">
                      <Checkbox 
                        checked={checked} 
                        className="border-[#6B5AE0]/40 data-[state=checked]:bg-[#2A00A2] data-[state=checked]:border-[#2A00A2] h-4 w-4 rounded"
                        onCheckedChange={(v) => {
                          const set = new Set(field.value ?? []);
                          if (v) set.add(c.id); else set.delete(c.id);
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
        </CardContent>
      </Card>

      {/* Important Info Array Lists */}
      <Card className="border border-[#EAE6FA] bg-white rounded-xl shadow-sm overflow-hidden">
        <CardHeader className="border-b border-[#EAE6FA] bg-white p-6">
          <CardTitle className="text-[16px] font-bold text-[#2A00A2]">Important information</CardTitle>
          <CardDescription className="text-[13px] text-[#6B5AE0]/80 font-medium">Bullet points shown in the Learn More modal.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-3 items-center">
              <Input
                {...register(`important_info.${index}.text`)}
                placeholder={`Bullet ${index + 1}`}
                disabled={submitting}
                className="h-12 border-[#EAE6FA] bg-[#FDFDFF] text-foreground placeholder:text-[#6B5AE0]/40 rounded-xl focus-visible:ring-[#2A00A2] text-[14px] font-medium"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 h-12 w-12 rounded-xl text-[#6B5AE0]/60 hover:text-destructive hover:bg-destructive/5"
                disabled={submitting}
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => append({ text: "" })}
            className="border-[#EAE6FA] hover:bg-[#F9F8FF] text-[#6B5AE0] h-12 px-6 rounded-xl font-semibold text-[14px] transition-colors mt-1"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add bullet
          </Button>
        </CardContent>
      </Card>

      {/* Optional Notice Block */}
      <Card className="border border-[#EAE6FA] bg-white rounded-xl shadow-sm overflow-hidden">
        <CardHeader className="border-b border-[#EAE6FA] bg-white p-6">
          <CardTitle className="text-[16px] font-bold text-[#2A00A2]">Notice</CardTitle>
          <CardDescription className="text-[13px] text-[#6B5AE0]/80 font-medium">Optional footer disclaimer in the modal.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Textarea
            {...register("notice_text")}
            rows={2}
            placeholder="e.g. Individual results may vary…"
            disabled={submitting}
            className="border-[#EAE6FA] bg-[#FDFDFF] text-foreground rounded-xl focus-visible:ring-[#2A00A2] text-[14px] font-medium p-3 min-h-[80px] resize-none"
          />
        </CardContent>
      </Card>

      {/* Actions Row - Perfectly aligned and sized to system design guidelines */}
      <div className="flex gap-3 pt-2">
        <Button 
          type="submit" 
          disabled={submitting || uploading}
          className="bg-[#2A00A2] hover:bg-[#1F007A] text-white h-12 px-6 rounded-xl font-semibold text-[14px] shadow-sm transition-all min-w-[140px]"
        >
          {submitting ? "Saving…" : mode === "create" ? "Create medicine" : "Save changes"}
        </Button>
        {onCancel && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel} 
            disabled={submitting}
            className="border-[#EAE6FA] hover:bg-[#F9F8FF] text-[#6B5AE0] h-12 px-6 rounded-xl font-semibold text-[14px] transition-colors"
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}