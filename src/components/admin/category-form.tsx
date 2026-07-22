import { useEffect, useRef, useState, type ReactNode } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { uploadCategoryImage } from "@/lib/category-image-upload";
import {
  categoryFormSchema,
  BMI_BANDS,
  BMI_BAND_LABELS,
  SEX_VALUES,
  SEX_LABELS,
  type CategoryFormValues,
} from "@/lib/categories.schema";
import { StateMultiSelect } from "@/components/admin/state-multi-select";

const EMPTY: CategoryFormValues = {
  slug: "",
  name: "",
  tagline: "",
  image_url: "",
  sort_order: 0,
  is_active: true,
  eligibility_rules: {
    bmi_bands: [],
    sex: [],
    min_age: null,
    max_age: null,
    blocked_state_codes: [],
  },
};

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-[14px] font-bold text-[#2A00A2]">{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export type CategoryFormProps = {
  defaultValues?: Partial<CategoryFormValues>;
  mode: "create" | "edit";
  submitting?: boolean;
  onSubmit: (values: CategoryFormValues) => void | Promise<void>;
  onCancel?: () => void;
};

export function CategoryForm({ defaultValues, mode, submitting, onSubmit, onCancel }: CategoryFormProps) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema) as any,
    defaultValues: { ...EMPTY, ...defaultValues },
  });
  const { register, handleSubmit, control, watch, setValue, formState } = form;
  const errors = formState.errors as any;

  const initialRules = defaultValues?.eligibility_rules;
  const hasInitialRules = !!initialRules && (
    (initialRules.bmi_bands?.length ?? 0) > 0 ||
    (initialRules.sex?.length ?? 0) > 0 ||
    initialRules.min_age != null ||
    initialRules.max_age != null ||
    (initialRules.blocked_state_codes?.length ?? 0) > 0
  );
  const [showEligibility, setShowEligibility] = useState<boolean>(hasInitialRules);

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageUrl = watch("image_url");

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

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const url = await uploadCategoryImage(file);
      setValue("image_url", url, { shouldDirty: true });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const submit = handleSubmit((values) => {
    if (!showEligibility) {
      values.eligibility_rules = {
        bmi_bands: [],
        sex: [],
        min_age: null,
        max_age: null,
        blocked_state_codes: [],
      };
    }
    return onSubmit(values);
  });

  return (
    <form onSubmit={submit} className="space-y-6 max-w-5xl" noValidate>
      {/* Primary Info Card */}
      <Card className="border border-[#EAE6FA] bg-white rounded-xl shadow-sm overflow-hidden">
        <CardHeader className="border-b border-[#EAE6FA] bg-white p-6">
          <CardTitle className="text-[20px] font-bold text-[#2A00A2]">
            {mode === "create" ? "New category" : "Edit category"}
          </CardTitle>
          <CardDescription className="text-[14px] text-[#6B5AE0]/80 font-medium">
            Categories are the goals patients pick during intake.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Name" error={errors.name?.message}>
              <Input 
                {...register("name")} 
                placeholder="e.g. Weight Loss" 
                disabled={submitting} 
                className="h-12 border-[#EAE6FA] bg-[#FDFDFF] text-foreground placeholder:text-[#6B5AE0]/40 rounded-xl focus-visible:ring-[#2A00A2] text-[14px] font-medium"
              />
            </Field>
            <Field label="Slug" error={errors.slug?.message}>
              <Input 
                {...register("slug")} 
                placeholder="weight-loss" 
                disabled={submitting} 
                className="h-12 border-[#EAE6FA] bg-[#FDFDFF] text-foreground placeholder:text-[#6B5AE0]/40 rounded-xl focus-visible:ring-[#2A00A2] text-[14px] font-medium"
              />
            </Field>
          </div>
          <Field label="Tagline" error={errors.tagline?.message}>
            <Input 
              {...register("tagline")} 
              placeholder="Short one-liner shown on card" 
              disabled={submitting} 
              className="h-12 border-[#EAE6FA] bg-[#FDFDFF] text-foreground placeholder:text-[#6B5AE0]/40 rounded-xl focus-visible:ring-[#2A00A2] text-[14px] font-medium"
            />
          </Field>

          {/* Image upload */}
          <Field label="Category image" error={errors.image_url?.message}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            {imageUrl ? (
              <div className="flex items-center gap-4 rounded-xl border border-[#EAE6FA] bg-[#FDFDFF] p-3">
                <img src={imageUrl} alt="" className="h-20 w-20 rounded-lg object-cover border border-[#EAE6FA]" />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={submitting || uploading}
                    className="border-[#EAE6FA] text-[#2A00A2] rounded-lg"
                  >
                    {uploading ? "Uploading…" : "Replace"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setValue("image_url", "", { shouldDirty: true })}
                    disabled={submitting || uploading}
                    className="text-destructive hover:bg-red-50 rounded-lg"
                  >
                    <X className="h-4 w-4 mr-1" /> Remove
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting || uploading}
                className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#EAE6FA] bg-[#FDFDFF] p-8 text-[#6B5AE0] hover:bg-[#F9F8FF] transition-colors"
              >
                <Upload className="h-6 w-6" />
                <span className="text-[14px] font-semibold">
                  {uploading ? "Uploading…" : "Click to upload category image"}
                </span>
                <span className="text-[12px] text-[#6B5AE0]/70">JPG, PNG or WebP • max 5MB</span>
              </button>
            )}
          </Field>

          <div className="grid gap-5 sm:grid-cols-2 items-end">
            <Field label="Sort order" error={errors.sort_order?.message}>
              <Input 
                type="number" 
                min={0} 
                {...register("sort_order")} 
                disabled={submitting} 
                className="h-12 border-[#EAE6FA] bg-[#FDFDFF] text-foreground rounded-xl focus-visible:ring-[#2A00A2] text-[14px] font-medium"
              />
            </Field>
            <div className="h-12 flex items-center bg-[#FDFDFF] border border-[#EAE6FA] rounded-xl px-4">
              <Controller
                control={control}
                name="is_active"
                render={({ field }) => (
                  <div className="flex items-center gap-3 w-full">
                    <Switch 
                      checked={!!field.value} 
                      onCheckedChange={field.onChange} 
                      id="cat-active" 
                      className="data-[state=checked]:bg-[#2A00A2]"
                    />
                    <Label htmlFor="cat-active" className="text-[14px] font-semibold text-[#2A00A2] cursor-pointer select-none">Active</Label>
                  </div>
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Eligibility toggle */}
      <div className="flex items-center justify-between rounded-xl border border-[#EAE6FA] bg-white p-4 shadow-sm">
        <div>
          <p className="text-[14px] font-bold text-[#2A00A2]">Add eligibility rules</p>
          <p className="text-[13px] text-[#6B5AE0]/80 font-medium">
            Restrict who can pick this category based on BMI, sex, age, or state.
          </p>
        </div>
        <Switch
          checked={showEligibility}
          onCheckedChange={setShowEligibility}
          className="data-[state=checked]:bg-[#2A00A2]"
        />
      </div>

      {/* Rules Card */}
      {showEligibility && (
      <Card className="border border-[#EAE6FA] bg-white rounded-xl shadow-sm overflow-hidden">
        <CardHeader className="border-b border-[#EAE6FA] bg-white p-6">
          <CardTitle className="text-[16px] font-bold text-[#2A00A2]">Eligibility rules</CardTitle>
          <CardDescription className="text-[13px] text-[#6B5AE0]/80 font-medium">
            Patients must match every enabled group. Leave a group empty to skip that check.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <Controller
            control={control}
            name="eligibility_rules.bmi_bands"
            render={({ field }) => (
              <div className="space-y-3">
                <Label className="text-[14px] font-bold text-[#2A00A2]">BMI bands</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {BMI_BANDS.map((b) => {
                    const checked = (field.value ?? []).includes(b);
                    return (
                      <label key={b} className="flex items-center gap-3 rounded-xl border border-[#EAE6FA] bg-[#FDFDFF] p-3.5 text-[14px] font-medium text-[#5D22E8] cursor-pointer transition-colors hover:bg-[#F9F8FF]">
                        <Checkbox
                          checked={checked}
                          className="border-[#6B5AE0]/40 data-[state=checked]:bg-[#2A00A2] data-[state=checked]:border-[#2A00A2] h-4 w-4 rounded"
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
              <div className="space-y-3">
                <Label className="text-[14px] font-bold text-[#2A00A2]">Sex</Label>
                <div className="grid gap-3 sm:grid-cols-3">
                  {SEX_VALUES.map((s) => {
                    const checked = (field.value ?? []).includes(s);
                    return (
                      <label key={s} className="flex items-center gap-3 rounded-xl border border-[#EAE6FA] bg-[#FDFDFF] p-3.5 text-[14px] font-medium text-[#5D22E8] cursor-pointer transition-colors hover:bg-[#F9F8FF]">
                        <Checkbox
                          checked={checked}
                          className="border-[#6B5AE0]/40 data-[state=checked]:bg-[#2A00A2] data-[state=checked]:border-[#2A00A2] h-4 w-4 rounded"
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

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Minimum age" error={errors.eligibility_rules?.min_age?.message}>
              <Input 
                type="number" 
                min={0} 
                max={120} 
                {...register("eligibility_rules.min_age")} 
                disabled={submitting} 
                className="h-12 border-[#EAE6FA] bg-[#FDFDFF] text-foreground rounded-xl focus-visible:ring-[#2A00A2] text-[14px] font-medium"
              />
            </Field>
            <Field label="Maximum age" error={errors.eligibility_rules?.max_age?.message}>
              <Input 
                type="number" 
                min={0} 
                max={120} 
                {...register("eligibility_rules.max_age")} 
                disabled={submitting} 
                className="h-12 border-[#EAE6FA] bg-[#FDFDFF] text-foreground rounded-xl focus-visible:ring-[#2A00A2] text-[14px] font-medium"
              />
            </Field>
          </div>

          <Controller
            control={control}
            name="eligibility_rules.blocked_state_codes"
            render={({ field }) => (
              <div className="space-y-3 border-t border-[#EAE6FA] pt-6">
                <div className="space-y-1">
                  <Label className="text-[14px] font-bold text-[#2A00A2]">Blocked states</Label>
                  <p className="text-[13px] text-[#6B5AE0]/80 font-medium">
                    Patients in these states cannot select this category. Leave empty to allow every
                    state — unlike the groups above, this one excludes rather than includes.
                  </p>
                </div>
                <StateMultiSelect
                  selected={(field.value ?? []) as string[]}
                  placeholder="Block a state"
                  onToggle={(s) => {
                    const set = new Set((field.value ?? []) as string[]);
                    if (set.has(s)) set.delete(s);
                    else set.add(s);
                    field.onChange(Array.from(set));
                  }}
                />
              </div>
            )}
          />
        </CardContent>
      </Card>
      )}

      {/* Bottom Action Row */}
      <div className="flex gap-3 pt-2">
        <Button 
          type="submit" 
          disabled={submitting}
          className="bg-[#2A00A2] hover:bg-[#1F007A] text-white h-12 px-6 rounded-xl font-semibold text-[14px] shadow-sm transition-all min-w-[140px]"
        >
          {submitting ? "Saving…" : mode === "create" ? "Create category" : "Save changes"}
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