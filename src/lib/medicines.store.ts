import { supabase } from "@/integrations/supabase/client";
import type { MedicineFormValues, MedicineStatus } from "./medicines.schema";

export type StoredMedicine = {
  id: string;
  name: string;
  short_description: string;
  long_description?: string | null;
  image_url?: string | null;
  price_monthly: number;
  status: MedicineStatus;
  important_info: string[];
  notice_text?: string | null;
  sort_order: number;
  is_active: boolean;
  requires_questionnaire: boolean;
  category_ids: string[];
  created_at: string;
  updated_at: string;
};

export type ListMedicinesInput = {
  search?: string;
  status?: "all" | MedicineStatus;
};

function rowToStored(row: any): StoredMedicine {
  const info = Array.isArray(row.important_info) ? row.important_info : [];
  const cats = Array.isArray(row.medication_category_medicines)
    ? row.medication_category_medicines.map((r: any) => String(r.category_id))
    : [];
  return {
    id: row.id,
    name: row.name,
    short_description: row.short_description,
    long_description: row.long_description,
    image_url: row.image_url,
    price_monthly: Number(row.price_monthly),
    status: row.status,
    important_info: info.map((v: unknown) =>
      typeof v === "string" ? v : typeof v === "object" && v && "text" in v ? String((v as any).text ?? "") : "",
    ).filter(Boolean),
    notice_text: row.notice_text,
    sort_order: row.sort_order,
    is_active: row.is_active,
    requires_questionnaire: !!row.requires_questionnaire,
    category_ids: cats,
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
    price_monthly: values.price_monthly,
    status: values.status ?? "draft",
    important_info: (values.important_info ?? [])
      .map((b) => b.text.trim())
      .filter(Boolean),
    notice_text: values.notice_text ?? null,
    sort_order: values.sort_order ?? 0,
    requires_questionnaire: !!values.requires_questionnaire,
  };
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
    .select("*, medication_category_medicines(category_id)")
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
    .select("*, medication_category_medicines(category_id)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToStored(data) : null;
}

export async function createMedicine(values: MedicineFormValues): Promise<{ id: string }> {
  const payload = fromForm(values);
  const { data, error } = await supabase
    .from("medicines")
    .insert(payload as any)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await syncMedicineCategories(data.id, values.category_ids ?? []);
  return { id: data.id };
}

export async function updateMedicine(id: string, values: MedicineFormValues): Promise<{ id: string }> {
  const payload = fromForm(values);
  const { error } = await supabase.from("medicines").update(payload as any).eq("id", id);
  if (error) throw new Error(error.message);
  await syncMedicineCategories(id, values.category_ids ?? []);
  return { id };
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
