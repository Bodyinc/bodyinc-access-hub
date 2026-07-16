import { supabase } from "@/integrations/supabase/client";
import type { MedicineFormValues, MedicineStatus } from "./medicines.schema";

export type StoredMedicinePackage = {
  id: string;
  name: string;
  duration_months: number;
  original_price: number;
  price: number;
  is_most_popular: boolean;
  is_active: boolean;
  features: string[];
  clinical_note?: string | null;
  sort_order: number;
};

export type StoredMedicineVariant = {
  id: string;
  name: string;
  is_active: boolean;
  from_price_cents: number | null;
  sort_order: number;
  packages: StoredMedicinePackage[];
};

export type StoredMedicine = {
  id: string;
  name: string;
  short_description: string;
  long_description?: string | null;
  image_url?: string | null;
  from_price_cents: number | null;
  status: MedicineStatus;
  important_info: string[];
  notice_text?: string | null;
  sort_order: number;
  is_active: boolean;
  requires_questionnaire: boolean;
  category_ids: string[];
  packages: StoredMedicinePackage[];
  variants: StoredMedicineVariant[];
  created_at: string;
  updated_at: string;
};

export type ListMedicinesInput = {
  search?: string;
  status?: "all" | MedicineStatus;
};

function packageRowToStored(row: any): StoredMedicinePackage {
  const feat = Array.isArray(row.features) ? row.features : [];
  return {
    id: row.id,
    name: row.name,
    duration_months: Number(row.duration_months),
    original_price: Number(row.original_price),
    price: Number(row.price),
    is_most_popular: !!row.is_most_popular,
    is_active: row.is_active !== false,
    features: feat
      .map((v: unknown) =>
        typeof v === "string" ? v : typeof v === "object" && v && "text" in v ? String((v as any).text ?? "") : "",
      )
      .filter(Boolean),
    clinical_note: row.clinical_note,
    sort_order: Number(row.sort_order ?? 0),
  };
}

function sortPackages(rows: any[]): StoredMedicinePackage[] {
  return rows
    .map(packageRowToStored)
    .sort(
      (a, b) => a.duration_months - b.duration_months || a.sort_order - b.sort_order,
    );
}

function rowToStored(row: any): StoredMedicine {
  const info = Array.isArray(row.important_info) ? row.important_info : [];
  const cats = Array.isArray(row.medication_category_medicines)
    ? row.medication_category_medicines.map((r: any) => String(r.category_id))
    : [];
  const allPackages = Array.isArray(row.packages) ? row.packages : [];
  // Medicine-level packages are those not tied to a variant.
  const pkgs = sortPackages(allPackages.filter((p: any) => !p.variant_id));
  const variants: StoredMedicineVariant[] = (
    Array.isArray(row.medicine_variants) ? row.medicine_variants : []
  )
    .map((v: any) => ({
      id: v.id,
      name: v.name,
      is_active: v.is_active !== false,
      from_price_cents: v.from_price_cents == null ? null : Number(v.from_price_cents),
      sort_order: Number(v.sort_order ?? 0),
      packages: sortPackages(allPackages.filter((p: any) => p.variant_id === v.id)),
    }))
    .sort((a: StoredMedicineVariant, b: StoredMedicineVariant) => a.sort_order - b.sort_order);
  return {
    id: row.id,
    name: row.name,
    short_description: row.short_description,
    long_description: row.long_description,
    image_url: row.image_url,
    from_price_cents: row.from_price_cents == null ? null : Number(row.from_price_cents),
    status: row.status,
    important_info: info.map((v: unknown) =>
      typeof v === "string" ? v : typeof v === "object" && v && "text" in v ? String((v as any).text ?? "") : "",
    ).filter(Boolean),
    notice_text: row.notice_text,
    sort_order: row.sort_order,
    is_active: row.is_active,
    requires_questionnaire: !!row.requires_questionnaire,
    category_ids: cats,
    packages: pkgs,
    variants,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function fromForm(values: MedicineFormValues) {
  return {
    name: values.name,
    short_description: values.short_description,
    long_description: values.long_description ?? null,
    image_url: values.image_url ?? null,
    status: values.status ?? "draft",
    important_info: (values.important_info ?? [])
      .map((b) => b.text.trim())
      .filter(Boolean),
    notice_text: values.notice_text ?? null,
    sort_order: values.sort_order ?? 0,
    requires_questionnaire: !!values.requires_questionnaire,
  };
}

function defaultPackageName(durationMonths: number) {
  return durationMonths === 1 ? "Monthly Plan" : `${durationMonths}-Month Plan`;
}

function packageFromForm(
  medicineId: string,
  variantId: string | null,
  pkg: NonNullable<MedicineFormValues["packages"]>[number],
  index: number,
) {
  const duration = Number(pkg.duration_months) || 1;
  return {
    medicine_id: medicineId,
    variant_id: variantId,
    name: (pkg.name && pkg.name.trim()) || defaultPackageName(duration),
    duration_months: duration,
    original_price: Number(pkg.original_price) || 0,
    price: Number(pkg.price) || 0,
    is_most_popular: !!pkg.is_most_popular,
    is_active: pkg.is_active ?? true,
    features: (pkg.features ?? []).map((f) => f.text.trim()).filter(Boolean),
    clinical_note: pkg.clinical_note ?? null,
    sort_order: index,
  };
}

// Reconciles a medicine's variants and packages to match the submitted form. Works by id so a
// package keeps its row (and its order/subscription history + Stripe price) even when it moves
// between the medicine-level bucket and a variant — it is UPDATEd (reparented), never
// deleted-and-recreated. Only genuinely removed rows are deleted. Returns package ids to sync.
export async function reconcileMedicinePricing(
  medicineId: string,
  values: MedicineFormValues,
): Promise<string[]> {
  const variants = values.variants ?? [];

  // 1. Reconcile variant rows; map each form variant to its persisted id. Deleting a variant
  //    cascade-deletes its packages (intended — the variant's plans go with it).
  const { data: existingVariantRows, error: vErr } = await supabase
    .from("medicine_variants")
    .select("id")
    .eq("medicine_id", medicineId);
  if (vErr) throw new Error(vErr.message);
  const existingVariantIds = new Set((existingVariantRows ?? []).map((r: any) => String(r.id)));
  const keptVariantIds = new Set(variants.map((v) => v.id).filter((id): id is string => !!id));
  const variantsToDelete = [...existingVariantIds].filter((id) => !keptVariantIds.has(id));
  if (variantsToDelete.length > 0) {
    const { error } = await supabase.from("medicine_variants").delete().in("id", variantsToDelete);
    if (error) throw new Error(error.message);
  }

  const variantIdByIndex: string[] = [];
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    const payload = {
      medicine_id: medicineId,
      name: v.name.trim(),
      is_active: v.is_active ?? true,
      sort_order: i,
    };
    if (v.id && existingVariantIds.has(v.id)) {
      const { error } = await supabase.from("medicine_variants").update(payload as any).eq("id", v.id);
      if (error) throw new Error(error.message);
      variantIdByIndex[i] = v.id;
    } else {
      const { data, error } = await supabase
        .from("medicine_variants")
        .insert(payload as any)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      variantIdByIndex[i] = data.id;
    }
  }

  // 2. Flatten the desired packages with their target variant (null = medicine-level).
  const desired: {
    pkg: NonNullable<MedicineFormValues["packages"]>[number];
    variantId: string | null;
    sort: number;
  }[] = [];
  if (variants.length > 0) {
    variants.forEach((v, i) =>
      (v.packages ?? []).forEach((pkg, j) => desired.push({ pkg, variantId: variantIdByIndex[i], sort: j })),
    );
  } else {
    (values.packages ?? []).forEach((pkg, j) => desired.push({ pkg, variantId: null, sort: j }));
  }

  // 3. Id-based package reconcile across the whole medicine.
  const { data: existingPkgRows, error: pErr } = await supabase
    .from("packages")
    .select("id")
    .eq("medicine_id", medicineId);
  if (pErr) throw new Error(pErr.message);
  const existingPkgIds = new Set((existingPkgRows ?? []).map((r: any) => String(r.id)));
  const keptPkgIds = new Set(desired.map((d) => d.pkg.id).filter((id): id is string => !!id));
  const pkgsToDelete = [...existingPkgIds].filter((id) => !keptPkgIds.has(id));
  if (pkgsToDelete.length > 0) {
    const { error } = await supabase.from("packages").delete().in("id", pkgsToDelete);
    if (error) throw new Error(error.message);
  }

  const syncIds: string[] = [];
  for (const d of desired) {
    const payload = packageFromForm(medicineId, d.variantId, d.pkg, d.sort);
    if (d.pkg.id && existingPkgIds.has(d.pkg.id)) {
      const { error } = await supabase.from("packages").update(payload as any).eq("id", d.pkg.id);
      if (error) throw new Error(error.message);
      syncIds.push(d.pkg.id);
    } else {
      const { data, error } = await supabase
        .from("packages")
        .insert(payload as any)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      syncIds.push(data.id);
    }
  }
  return syncIds;
}

async function syncMedicineCategories(medicineId: string, categoryIds: string[]) {
  await supabase.from("medication_category_medicines").delete().eq("medicine_id", medicineId);
  if (categoryIds.length > 0) {
    const rows = categoryIds.map((cid, i) => ({
      medicine_id: medicineId,
      category_id: cid,
      sort_order: i,
    }));
    const { error } = await supabase.from("medication_category_medicines").insert(rows as any);
    if (error) throw new Error(error.message);
  }
}

export async function listMedicines(input: ListMedicinesInput = {}): Promise<StoredMedicine[]> {
  let query = supabase
    .from("medicines")
    .select("*, medication_category_medicines(category_id), packages(*), medicine_variants(*)")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (input.status && input.status !== "all") {
    query = query.eq("status", input.status);
  }
  if (input.search) {
    const s = `%${input.search}%`;
    query = query.or(`name.ilike.${s},short_description.ilike.${s},long_description.ilike.${s}`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToStored);
}

export async function listActiveMedicines(): Promise<StoredMedicine[]> {
  const rows = await listMedicines();
  return rows.filter((m) => m.is_active);
}

export async function getMedicine(id: string): Promise<StoredMedicine | null> {
  const { data, error } = await supabase
    .from("medicines")
    .select("*, medication_category_medicines(category_id), packages(*), medicine_variants(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToStored(data) : null;
}

export async function createMedicine(
  values: MedicineFormValues,
): Promise<{ id: string; packageSyncIds: string[] }> {
  const payload = fromForm(values);
  const { data, error } = await supabase
    .from("medicines")
    .insert(payload as any)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await syncMedicineCategories(data.id, values.category_ids ?? []);
  const packageSyncIds = await reconcileMedicinePricing(data.id, values);
  return { id: data.id, packageSyncIds };
}

export async function updateMedicine(
  id: string,
  values: MedicineFormValues,
): Promise<{ id: string; packageSyncIds: string[] }> {
  const payload = fromForm(values);
  const { error } = await supabase.from("medicines").update(payload as any).eq("id", id);
  if (error) throw new Error(error.message);
  await syncMedicineCategories(id, values.category_ids ?? []);
  const packageSyncIds = await reconcileMedicinePricing(id, values);
  return { id, packageSyncIds };
}

export async function deleteMedicine(id: string): Promise<{ ok: true }> {
  const { error } = await supabase.from("medicines").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function setMedicineActive(id: string, status: MedicineStatus): Promise<{ ok: true }> {
  const { error } = await supabase.from("medicines").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}
