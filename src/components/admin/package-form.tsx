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
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "Add package" : "Edit package"}</CardTitle>
          <CardDescription>Pricing plan linked to a medicine.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Medicine" error={errors.medicine_id?.message}>
            <Select
              value={medicineId || undefined}
              onValueChange={(v) => setValue("medicine_id", v, { shouldValidate: true })}
              disabled={submitting || mode === "edit"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a medicine" />
              </SelectTrigger>
              <SelectContent>
                {medicines.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
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
            />
          </Field>

          <Field label="Duration (months)" error={errors.duration_months?.message}>
            <div className="flex flex-wrap gap-2">
              {DURATION_PRESETS.map((d) => (
                <Button
                  key={d}
                  type="button"
                  variant={durationMonths === d ? "default" : "outline"}
                  size="sm"
                  disabled={submitting}
                  onClick={() => setValue("duration_months", d)}
                >
                  {d} mo
                </Button>
              ))}
              <Input
                type="number"
                min={1}
                className="w-24"
                {...register("duration_months")}
                disabled={submitting}
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
              />
            </Field>
            <Field label="Sale price ($)" error={errors.price?.message}>
              <Input
                type="number"
                step="0.01"
                min={0}
                {...register("price")}
                disabled={submitting}
              />
            </Field>
          </div>

          {savings > 0 && (
            <p className="text-sm text-muted-foreground">
              Patient saves <span className="font-medium text-foreground">{formatPrice(savings)}</span>
            </p>
          )}

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Most popular</p>
              <p className="text-xs text-muted-foreground">
                Only one plan per medicine can be marked most popular.
              </p>
            </div>
            <Switch
              checked={isMostPopular}
              onCheckedChange={(v) => setValue("is_most_popular", v)}
              disabled={submitting}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Visible to patients when medicine is active.</p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={(v) => setValue("is_active", v)}
              disabled={submitting}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Included features</CardTitle>
          <CardDescription>Items shown on the recommended plan card.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2">
              <Input
                {...register(`features.${index}.text`)}
                placeholder={`Feature ${index + 1}`}
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
            <Plus className="mr-1.5 h-4 w-4" /> Add feature
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clinical note</CardTitle>
          <CardDescription>Disclaimer shown below plan cards.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            {...register("clinical_note")}
            rows={2}
            placeholder="Optional clinical disclaimer…"
            disabled={submitting}
          />
        </CardContent>
      </Card>

      {selectedMedicine && (
        <p className="text-xs text-muted-foreground">
          Linked to <span className="font-medium">{selectedMedicine.name}</span>
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : mode === "create" ? "Create package" : "Save changes"}
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
