import { supabase } from "@/integrations/supabase/client";
import type { CategoryFormValues, EligibilityRules } from "./categories.schema";

export type StoredCategory = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  eligibility_rules: EligibilityRules;
  medicine_ids: string[];
  created_at: string;
  updated_at: string;
};

function rowToStored(row: any): StoredCategory {
  const rules = (row.eligibility_rules ?? {}) as Partial<EligibilityRules>;
  const meds = Array.isArray(row.medication_category_medicines)
    ? row.medication_category_medicines.map((r: any) => String(r.medicine_id))
    : [];
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    icon: row.icon,
    sort_order: row.sort_order,
    is_active: row.is_active,
    eligibility_rules: {
      bmi_bands: (rules.bmi_bands ?? []) as EligibilityRules["bmi_bands"],
      sex: (rules.sex ?? []) as EligibilityRules["sex"],
      min_age: rules.min_age ?? null,
      max_age: rules.max_age ?? null,
      blocked_state_codes: (rules.blocked_state_codes ??
        []) as EligibilityRules["blocked_state_codes"],
    },
    medicine_ids: meds,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function fromForm(values: CategoryFormValues) {
  return {
    slug: values.slug,
    name: values.name,
    tagline: values.tagline ?? null,
    description: values.description ?? null,
    icon: values.icon ?? null,
    sort_order: values.sort_order ?? 0,
    is_active: values.is_active ?? true,
    eligibility_rules: {
      bmi_bands: values.eligibility_rules?.bmi_bands ?? [],
      sex: values.eligibility_rules?.sex ?? [],
      min_age: values.eligibility_rules?.min_age ?? null,
      max_age: values.eligibility_rules?.max_age ?? null,
      blocked_state_codes: values.eligibility_rules?.blocked_state_codes ?? [],
    },
  };
}

async function syncMedicines(categoryId: string, medicineIds: string[]) {
  await supabase.from("medication_category_medicines").delete().eq("category_id", categoryId);
  if (medicineIds.length > 0) {
    const rows = medicineIds.map((mid, i) => ({
      category_id: categoryId,
      medicine_id: mid,
      sort_order: i,
    }));
    const { error } = await supabase.from("medication_category_medicines").insert(rows as any);
    if (error) throw new Error(error.message);
  }
}

export async function listCategories(): Promise<StoredCategory[]> {
  const { data, error } = await supabase
    .from("medication_categories")
    .select("*, medication_category_medicines(medicine_id)")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToStored);
}

export async function getCategory(id: string): Promise<StoredCategory | null> {
  const { data, error } = await supabase
    .from("medication_categories")
    .select("*, medication_category_medicines(medicine_id)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToStored(data) : null;
}

export async function createCategory(values: CategoryFormValues): Promise<{ id: string }> {
  const payload = fromForm(values);
  const { data, error } = await supabase
    .from("medication_categories")
    .insert(payload as any)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await syncMedicines(data.id, values.medicine_ids ?? []);
  return { id: data.id };
}

export async function updateCategory(id: string, values: CategoryFormValues): Promise<{ id: string }> {
  const payload = fromForm(values);
  const { error } = await supabase.from("medication_categories").update(payload as any).eq("id", id);
  if (error) throw new Error(error.message);
  await syncMedicines(id, values.medicine_ids ?? []);
  return { id };
}

export async function deleteCategory(id: string): Promise<{ ok: true }> {
  const { error } = await supabase.from("medication_categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function setCategoryActive(id: string, is_active: boolean): Promise<{ ok: true }> {
  const { error } = await supabase.from("medication_categories").update({ is_active }).eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}