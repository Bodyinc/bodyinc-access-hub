import { supabase } from "@/integrations/supabase/client";
import type { PackageFormValues } from "./packages.schema";

export type StoredPackage = {
  id: string;
  medicine_id: string;
  name: string;
  duration_months: number;
  original_price: number;
  price: number;
  is_most_popular: boolean;
  features: string[];
  clinical_note?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ListPackagesInput = {
  search?: string;
  medicine_id?: string | "all";
  status?: "all" | "active" | "inactive";
};

export type ListPackageRow = StoredPackage & {
  medicine_name: string;
  savings: number;
};

function rowToStored(row: any): StoredPackage {
  const feat = Array.isArray(row.features) ? row.features : [];
  return {
    id: row.id,
    medicine_id: row.medicine_id,
    name: row.name,
    duration_months: row.duration_months,
    original_price: Number(row.original_price),
    price: Number(row.price),
    is_most_popular: row.is_most_popular,
    features: feat.map((v: unknown) =>
      typeof v === "string" ? v : typeof v === "object" && v && "text" in v ? String((v as any).text ?? "") : "",
    ).filter(Boolean),
    clinical_note: row.clinical_note,
    sort_order: row.sort_order,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function fromForm(values: PackageFormValues) {
  return {
    medicine_id: values.medicine_id,
    name: values.name,
    duration_months: values.duration_months,
    original_price: values.original_price,
    price: values.price,
    is_most_popular: values.is_most_popular ?? false,
    features: (values.features ?? []).map((f) => f.text.trim()).filter(Boolean),
    clinical_note: values.clinical_note ?? null,
    sort_order: values.sort_order ?? 0,
    is_active: values.is_active ?? true,
  };
}

export async function listPackages(input: ListPackagesInput = {}): Promise<ListPackageRow[]> {
  let query = supabase
    .from("packages")
    .select("*, medicines(name)")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (input.medicine_id && input.medicine_id !== "all") {
    query = query.eq("medicine_id", input.medicine_id);
  }
  if (input.status === "active") query = query.eq("is_active", true);
  if (input.status === "inactive") query = query.eq("is_active", false);
  if (input.search) {
    query = query.ilike("name", `%${input.search}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => {
    const stored = rowToStored(row);
    return {
      ...stored,
      medicine_name: row.medicines?.name ?? "Unknown",
      savings: Math.max(0, stored.original_price - stored.price),
    };
  });
}

export async function listPackagesByMedicine(medicineId: string): Promise<StoredPackage[]> {
  const { data, error } = await supabase
    .from("packages")
    .select("*")
    .eq("medicine_id", medicineId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToStored);
}

export async function getPackage(id: string): Promise<StoredPackage | null> {
  const { data, error } = await supabase.from("packages").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToStored(data) : null;
}

export async function createPackage(values: PackageFormValues): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("packages")
    .insert(fromForm(values) as any)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

export async function updatePackage(id: string, values: PackageFormValues): Promise<{ id: string }> {
  const { error } = await supabase.from("packages").update(fromForm(values) as any).eq("id", id);
  if (error) throw new Error(error.message);
  return { id };
}

export async function deletePackage(id: string): Promise<{ ok: true }> {
  const { error } = await supabase.from("packages").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function setPackageActive(id: string, is_active: boolean): Promise<{ ok: true }> {
  const { error } = await supabase.from("packages").update({ is_active }).eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}
