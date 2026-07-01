import { useEffect, type ReactNode } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  categoryFormSchema,
  BMI_BANDS,
  BMI_BAND_LABELS,
  SEX_VALUES,
  SEX_LABELS,
  type CategoryFormValues,
} from "@/lib/categories.schema";
import type { StoredMedicine } from "@/lib/medicines.store";

const EMPTY: CategoryFormValues = {
  slug: "",
  name: "",
  tagline: "",
  description: "",
  icon: "",
  sort_order: 0,
  is_active: true,
  eligibility_rules: { bmi_bands: [], sex: [], min_age: null, max_age: null },
  medicine_ids: [],
};

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export type CategoryFormProps = {
  defaultValues?: Partial<CategoryFormValues>;
  mode: "create" | "edit";
  submitting?: boolean;
  medicines: Pick<StoredMedicine, "id" | "name">[];
  onSubmit: (values: CategoryFormValues) => void | Promise<void>;
  onCancel?: () => void;
};

export function CategoryForm({ defaultValues, mode, submitting, medicines, onSubmit, onCancel }: CategoryFormProps) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema) as any,
    defaultValues: { ...EMPTY, ...defaultValues },
  });
  const { register, handleSubmit, control, watch, setValue, formState } = form;
  const errors = formState.errors as any;

  const nameVal = watch("name");
  const slugVal = watch("slug");
  useEffect(() => {
    if (mode === "create" && nameVal && !slugVal) {
      setValue(
        "slug",
        String(nameVal)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      );
    }
  }, [nameVal, slugVal, mode, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "New category" : "Edit category"}</CardTitle>
          <CardDescription>Categories are the goals patients pick during intake.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" error={errors.name?.message}>
              <Input {...register("name")} placeholder="e.g. Weight Loss" disabled={submitting} />
            </Field>
            <Field label="Slug" error={errors.slug?.message}>
              <Input {...register("slug")} placeholder="weight-loss" disabled={submitting} />
            </Field>
          </div>
          <Field label="Tagline" error={errors.tagline?.message}>
            <Input {...register("tagline")} placeholder="Short one-liner shown on card" disabled={submitting} />
          </Field>
          <Field label="Description" error={errors.description?.message}>
            <Textarea {...register("description")} rows={3} disabled={submitting} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Icon (lucide name)" error={errors.icon?.message}>
              <Input {...register("icon")} placeholder="Sparkles" disabled={submitting} />
            </Field>
            <Field label="Sort order" error={errors.sort_order?.message}>
              <Input type="number" min={0} {...register("sort_order")} disabled={submitting} />
            </Field>
            <div className="flex items-end gap-3">
              <Controller
                control={control}
                name="is_active"
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Switch checked={!!field.value} onCheckedChange={field.onChange} id="cat-active" />
                    <Label htmlFor="cat-active">Active</Label>
                  </div>
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Eligibility rules</CardTitle>
          <CardDescription>
            Patients must match every enabled group. Leave a group empty to skip that check.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Controller
            control={control}
            name="eligibility_rules.bmi_bands"
            render={({ field }) => (
              <div className="space-y-2">
                <Label>BMI bands</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {BMI_BANDS.map((b) => {
                    const checked = (field.value ?? []).includes(b);
                    return (
                      <label key={b} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            const set = new Set(field.value ?? []);
                            if (v) set.add(b);
                            else set.delete(b);
                            field.onChange(Array.from(set));
                          }}
                        />
                        {BMI_BAND_LABELS[b]}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          />

          <Controller
            control={control}
            name="eligibility_rules.sex"
            render={({ field }) => (
              <div className="space-y-2">
                <Label>Sex</Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {SEX_VALUES.map((s) => {
                    const checked = (field.value ?? []).includes(s);
                    return (
                      <label key={s} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            const set = new Set(field.value ?? []);
                            if (v) set.add(s);
                            else set.delete(s);
                            field.onChange(Array.from(set));
                          }}
                        />
                        {SEX_LABELS[s]}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Minimum age" error={errors.eligibility_rules?.min_age?.message}>
              <Input type="number" min={0} max={120} {...register("eligibility_rules.min_age")} disabled={submitting} />
            </Field>
            <Field label="Maximum age" error={errors.eligibility_rules?.max_age?.message}>
              <Input type="number" min={0} max={120} {...register("eligibility_rules.max_age")} disabled={submitting} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assigned medicines</CardTitle>
          <CardDescription>Medicines shown to patients who pick this category.</CardDescription>
        </CardHeader>
        <CardContent>
          <Controller
            control={control}
            name="medicine_ids"
            render={({ field }) => (
              <div className="grid gap-2 sm:grid-cols-2">
                {medicines.length === 0 && (
                  <p className="text-sm text-muted-foreground">No medicines yet. Add medicines first.</p>
                )}
                {medicines.map((m) => {
                  const checked = (field.value ?? []).includes(m.id);
                  return (
                    <label key={m.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          const set = new Set(field.value ?? []);
                          if (v) set.add(m.id);
                          else set.delete(m.id);
                          field.onChange(Array.from(set));
                        }}
                      />
                      {m.name}
                    </label>
                  );
                })}
              </div>
            )}
          />
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : mode === "create" ? "Create category" : "Save changes"}
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