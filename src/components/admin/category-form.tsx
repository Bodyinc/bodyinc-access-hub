import { useEffect, useRef, useState, type ReactNode } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
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
import { adminLabel } from "@/lib/admin-ui";
import { Switch } from "../ui/switch";

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

// Increased spacing below label to match Figma spacing
function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <Label className={`${adminLabel} block`}>{label}</Label>
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
    <div className="admin-page-shell space-y-5 sm:space-y-6">
      <div>
        <h2 className="text-[24px] font-bold leading-tight text-[#2A00A2] sm:text-[28px] lg:text-[32px]">
          {mode === "create" ? "New category" : "Edit category"}
        </h2>
        <p className="mt-1 text-sm font-medium text-[#6B5AE0]/80 sm:text-base">
          Categories are the goals patients pick during intake.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-5 sm:space-y-6" noValidate>
        <Card className="rounded-[12px] border border-[#E0D4FF] bg-white shadow-sm">
          <CardContent className="space-y-5 p-4 sm:space-y-6 sm:p-6">
            <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
              <Field label="Name" error={errors.name?.message}>
                <Input 
                  {...register("name")} 
                  placeholder="e.g. Weight Loss" 
                  disabled={submitting} 
                  className="h-[44px] px-4 py-[14px] border-[#E0D4FF] bg-[#FFFFFF] text-[#2E00AB] placeholder:text-[#6B5AE0]/40 rounded-[6px] focus-visible:ring-[#2A00A2] text-[16px] font-[500] leading-none font-['DM_Sans',sans-serif] sm:h-[53px] sm:text-[18px]"
                />
              </Field>
              <Field label="Slug" error={errors.slug?.message}>
                <Input 
                  {...register("slug")} 
                  placeholder="weight-loss" 
                  disabled={submitting} 
                  className="h-[44px] px-4 py-[14px] border-[#E0D4FF] bg-[#FFFFFF] text-[#2E00AB] placeholder:text-[#6B5AE0]/40 rounded-[6px] focus-visible:ring-[#2A00A2] text-[16px] font-[500] leading-none font-['DM_Sans',sans-serif] sm:h-[53px] sm:text-[18px]"
                />
              </Field>
            </div>
            <Field label="Tagline" error={errors.tagline?.message}>
              <Input 
                {...register("tagline")} 
                placeholder="Short one-liner shown on card" 
                disabled={submitting} 
                className="h-[44px] px-4 py-[14px] border-[#E0D4FF] bg-[#FFFFFF] text-[#2E00AB] placeholder:text-[#6B5AE0]/40 rounded-[6px] focus-visible:ring-[#2A00A2] text-[16px] font-[500] leading-none font-['DM_Sans',sans-serif] sm:h-[53px] sm:text-[18px]"
              />
            </Field>

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
                <div className="flex flex-wrap items-center gap-4 rounded-[6px] border border-[#E0D4FF] bg-[#FFFFFF] p-3">
                  <img src={imageUrl} alt="" className="h-20 w-20 rounded-lg object-cover border border-[#E0D4FF]" />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={submitting || uploading}
                      className="border-[#E0D4FF] text-[#2A00A2] rounded-lg"
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
                  className="w-full flex flex-col items-center justify-center gap-2 rounded-[6px] border border-dashed border-[#E0D4FF] bg-[#FFFFFF] p-8 text-[#6B5AE0] hover:bg-[#F9F8FF] transition-colors"
                >
                  <Upload className="h-6 w-6" />
                  <span className="text-[14px] font-semibold">
                    {uploading ? "Uploading…" : "Click to upload category image"}
                  </span>
                  <span className="text-[12px] text-[#6B5AE0]/70">JPG, PNG or WebP • max 5MB</span>
                </button>
              )}
            </Field>

            <div className="grid gap-6 sm:grid-cols-2 items-end">
              <Field label="Sort order" error={errors.sort_order?.message}>
                <Input 
                  type="number" 
                  min={0} 
                  {...register("sort_order")} 
                  disabled={submitting} 
                  className="h-[44px] px-4 py-[14px] border-[#E0D4FF] bg-[#FFFFFF] text-[#2E00AB] rounded-[6px] focus-visible:ring-[#2A00A2] text-[16px] font-[500] leading-none font-['DM_Sans',sans-serif] sm:h-[53px] sm:text-[18px]"
                />
              </Field>
              <div className="space-y-3">
                <Label className={`${adminLabel} block`}>Active</Label>
                <div className="flex h-[44px] items-center rounded-[6px] border border-[#E0D4FF] bg-[#FFFFFF] px-4 sm:h-[53px]">
                  <Controller
                    control={control}
                    name="is_active"
                    render={({ field }) => (
                      <div className="flex items-center justify-between w-full">
                        <Label htmlFor="cat-active" className="text-[14px] font-semibold text-[#2A00A2] cursor-pointer select-none">Active</Label>
                        <Switch
  id="cat-active"
  checked={!!field.value}
  onCheckedChange={field.onChange}
  disabled={submitting}
/>
                      </div>
                    )}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Eligibility Toggle Card */}
        <div className="flex flex-col gap-4 rounded-[12px] border border-[#E0D4FF] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className={adminLabel}>Add eligibility rules</p>
            <p className="text-[13px] text-[#6B5AE0]/80 font-medium">
              Restrict who can pick this category based on BMI, sex, age, or state.
            </p>
          </div>
          <Switch
  id="eligibility-toggle"
  checked={showEligibility}
  onCheckedChange={setShowEligibility}
  disabled={submitting}
/>
        </div>

        {/* Rules Card */}
        {showEligibility && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-[#2A00A2]">Eligibility rules</h3>
              <p className="text-xs text-[#6B5AE0]/80 font-medium mt-0.5">
                Patients must match every enabled group. Leave a group empty to skip that check.
              </p>
            </div>

            <Card className="border border-[#E0D4FF] bg-white rounded-[12px] shadow-sm">
              <CardContent className="space-y-5 p-4 sm:space-y-6 sm:p-6">
                <Controller
                  control={control}
                  name="eligibility_rules.bmi_bands"
                  render={({ field }) => (
                    <div className="space-y-3">
                      <Label className={`${adminLabel} block`}>BMI bands</Label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {BMI_BANDS.map((b) => {
                          const checked = (field.value ?? []).includes(b);
                          return (
                            <label key={b} className="flex items-center gap-3 rounded-[6px] border border-[#E0D4FF] bg-[#FFFFFF] p-3.5 text-[14px] font-medium text-[#5D22E8] cursor-pointer transition-colors hover:bg-[#F9F8FF]">
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
                      <Label className={`${adminLabel} block`}>Sex</Label>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {SEX_VALUES.map((s) => {
                          const checked = (field.value ?? []).includes(s);
                          return (
                            <label key={s} className="flex items-center gap-3 rounded-[6px] border border-[#E0D4FF] bg-[#FFFFFF] p-3.5 text-[14px] font-medium text-[#5D22E8] cursor-pointer transition-colors hover:bg-[#F9F8FF]">
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

                <div className="grid gap-6 sm:grid-cols-2">
                  <Field label="Minimum age" error={errors.eligibility_rules?.min_age?.message}>
                    <Input 
                      type="number" 
                      min={0} 
                      max={120} 
                      {...register("eligibility_rules.min_age")} 
                      disabled={submitting} 
                      className="h-[44px] px-4 py-[14px] border-[#E0D4FF] bg-[#FFFFFF] text-[#2E00AB] rounded-[6px] focus-visible:ring-[#2A00A2] text-[16px] font-[500] leading-none font-['DM_Sans',sans-serif] sm:h-[53px] sm:text-[18px]"
                    />
                  </Field>
                  <Field label="Maximum age" error={errors.eligibility_rules?.max_age?.message}>
                    <Input 
                      type="number" 
                      min={0} 
                      max={120} 
                      {...register("eligibility_rules.max_age")} 
                      disabled={submitting} 
                      className="h-[44px] px-4 py-[14px] border-[#E0D4FF] bg-[#FFFFFF] text-[#2E00AB] rounded-[6px] focus-visible:ring-[#2A00A2] text-[16px] font-[500] leading-none font-['DM_Sans',sans-serif] sm:h-[53px] sm:text-[18px]"
                    />
                  </Field>
                </div>

                <Controller
                  control={control}
                  name="eligibility_rules.blocked_state_codes"
                  render={({ field }) => (
                    <div className="space-y-3 border-t border-[#E0D4FF] pt-6">
                      <div className="space-y-1">
                        <Label className={`${adminLabel} block`}>Blocked states</Label>
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
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <Button 
            type="submit" 
            disabled={submitting}
            className="h-11 min-w-[140px] rounded-[8px] bg-[#2A00A2] px-6 text-[14px] font-semibold text-white shadow-sm transition-all hover:bg-[#1F007A] sm:h-[53px]"
          >
            {submitting ? "Saving…" : mode === "create" ? "Create category" : "Save changes"}
          </Button>
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel} 
              disabled={submitting}
              className="h-11 rounded-[8px] border-[#E0D4FF] px-6 text-[14px] font-semibold text-[#6B5AE0] transition-colors hover:bg-[#F9F8FF] sm:h-[53px]"
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}