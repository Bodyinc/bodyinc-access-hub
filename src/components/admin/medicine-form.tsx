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
      <Label>{label}</Label>
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "Add medicine" : "Edit medicine"}</CardTitle>
          <CardDescription>Product image and details shown to patients.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Product image" error={errors.image_url?.message ?? uploadError ?? undefined}>
            <div
              className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/30 p-6 transition-colors hover:bg-muted/50"
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Medicine preview"
                  className="h-40 w-auto max-w-full rounded-md object-contain"
                />
              ) : (
                <div className="flex h-32 w-24 items-center justify-center rounded-md bg-muted">
                  <ImagePlus className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
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
                variant="outline"
                size="sm"
                disabled={submitting || uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-1.5 h-4 w-4" />
                )}
                {uploading ? "Uploading…" : imageUrl ? "Replace image" : "Upload image"}
              </Button>
              <p className="text-xs text-muted-foreground">JPG, PNG, or WebP · Max 5MB</p>
            </div>
          </Field>

          <Field label="Medicine name" error={errors.name?.message}>
            <Input
              {...register("name")}
              placeholder="e.g. GLP-1 Compound"
              disabled={submitting}
            />
          </Field>

          <Field label="Short description" error={errors.short_description?.message}>
            <Input
              {...register("short_description")}
              placeholder="Shown on the medication card"
              disabled={submitting}
            />
          </Field>

          <Field label="Long description" error={errors.long_description?.message}>
            <Textarea
              {...register("long_description")}
              rows={4}
              placeholder="Full description in the Learn More modal"
              disabled={submitting}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Price per month ($)" error={errors.price_monthly?.message}>
              <Input
                type="number"
                step="0.01"
                min={0}
                {...register("price_monthly")}
                disabled={submitting}
              />
            </Field>
            <Field label="Status" error={errors.status?.message}>
              <Select
                value={status}
                onValueChange={(v) => setValue("status", v as MedicineStatus)}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEDICINE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {MEDICINE_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Important information</CardTitle>
          <CardDescription>Bullet points shown in the Learn More modal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2">
              <Input
                {...register(`important_info.${index}.text`)}
                placeholder={`Bullet ${index + 1}`}
                disabled={submitting}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
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
            size="sm"
            disabled={submitting}
            onClick={() => append({ text: "" })}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add bullet
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notice</CardTitle>
          <CardDescription>Optional footer disclaimer in the modal.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            {...register("notice_text")}
            rows={2}
            placeholder="e.g. Individual results may vary…"
            disabled={submitting}
          />
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={submitting || uploading}>
          {submitting ? "Saving…" : mode === "create" ? "Create medicine" : "Save changes"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
