import type { MedicineFormValues, MedicineStatus } from "./medicines.schema";
import { isMedicineActive } from "./medicines.schema";

const STORAGE_KEY = "bi_medicines";

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
  created_at: string;
  updated_at: string;
};

export type ListMedicinesInput = {
  search?: string;
  status?: "all" | MedicineStatus;
};

function now() {
  return new Date().toISOString();
}

function readAll(): StoredMedicine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredMedicine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(medicines: StoredMedicine[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(medicines));
}

function sortMedicines(medicines: StoredMedicine[]) {
  return [...medicines].sort(
    (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at),
  );
}

const SEED_IDS = {
  glp1: "a1111111-1111-4111-8111-111111111111",
  multi: "a2222222-2222-4222-8222-222222222222",
  lean: "a3333333-3333-4333-8333-333333333333",
} as const;

function seedIfEmpty() {
  const existing = readAll();
  if (existing.length > 0) return existing;

  const ts = now();
  const seeded: StoredMedicine[] = [
    {
      id: SEED_IDS.glp1,
      name: "GLP-1 Compound",
      short_description: "Clinically guided GLP-1 therapy for sustainable weight management.",
      long_description:
        "Our GLP-1 compound is prescribed and monitored by licensed providers. Treatment includes ongoing check-ins, dose adjustments, and access to your care team throughout your journey.",
      image_url: "https://placehold.co/200x280/f5f5f5/666?text=GLP-1",
      price_monthly: 199,
      status: "active",
      important_info: [
        "Prescription required — consultation included",
        "Weekly self-injection with provider guidance",
        "Not suitable if pregnant or breastfeeding",
      ],
      notice_text:
        "Individual results vary. Your provider will determine if this medication is appropriate for you.",
      sort_order: 0,
      is_active: true,
      created_at: ts,
      updated_at: ts,
    },
    {
      id: SEED_IDS.multi,
      name: "Multi-Pathway Program",
      short_description: "Combined metabolic support tailored to your health profile.",
      long_description:
        "A comprehensive approach combining metabolic support medications with lifestyle coaching. Ideal for patients who need a broader treatment strategy beyond a single pathway.",
      image_url: "https://placehold.co/200x280/f5f5f5/666?text=Multi",
      price_monthly: 249,
      status: "active",
      important_info: [
        "Includes provider consultation and care plan",
        "May combine multiple therapeutic approaches",
        "Regular lab monitoring recommended",
      ],
      notice_text: "Treatment plans are individualized. Discuss all medications with your provider.",
      sort_order: 1,
      is_active: true,
      created_at: ts,
      updated_at: ts,
    },
    {
      id: SEED_IDS.lean,
      name: "Lean Muscle Support",
      short_description: "Preserve lean mass while supporting healthy body composition.",
      long_description:
        "Designed for patients focused on maintaining muscle mass during weight loss. Includes peptide support and nutrition guidance from your care team.",
      image_url: "https://placehold.co/200x280/f5f5f5/666?text=Lean",
      price_monthly: 179,
      status: "draft",
      important_info: [
        "Best paired with resistance training",
        "Provider evaluation required before starting",
      ],
      notice_text: null,
      sort_order: 2,
      is_active: false,
      created_at: ts,
      updated_at: ts,
    },
  ];
  writeAll(seeded);
  return seeded;
}

function fromForm(values: MedicineFormValues): Omit<StoredMedicine, "id" | "created_at" | "updated_at"> {
  const status = values.status ?? "draft";
  return {
    name: values.name,
    short_description: values.short_description,
    long_description: values.long_description ?? null,
    image_url: values.image_url ?? null,
    price_monthly: values.price_monthly,
    status,
    important_info: (values.important_info ?? []).map((b) => b.text.trim()).filter(Boolean),
    notice_text: values.notice_text ?? null,
    sort_order: values.sort_order ?? 0,
    is_active: isMedicineActive(status),
  };
}

export function listMedicines(input: ListMedicinesInput = {}): StoredMedicine[] {
  let rows = sortMedicines(seedIfEmpty());

  if (input.search) {
    const q = input.search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.short_description.toLowerCase().includes(q) ||
        (r.long_description?.toLowerCase().includes(q) ?? false),
    );
  }
  if (input.status && input.status !== "all") {
    rows = rows.filter((r) => r.status === input.status);
  }

  return rows;
}

export function listActiveMedicines(): StoredMedicine[] {
  return listMedicines().filter((m) => m.is_active);
}

export function getMedicine(id: string): StoredMedicine | null {
  return sortMedicines(seedIfEmpty()).find((m) => m.id === id) ?? null;
}

export async function createMedicine(values: MedicineFormValues): Promise<{ id: string }> {
  const all = sortMedicines(seedIfEmpty());
  const maxOrder = all.reduce((max, m) => Math.max(max, m.sort_order), -1);
  const sortOrder = values.sort_order ?? maxOrder + 1;
  const ts = now();

  const created: StoredMedicine = {
    id: crypto.randomUUID(),
    ...fromForm({ ...values, sort_order: sortOrder }),
    created_at: ts,
    updated_at: ts,
  };

  writeAll([...all, created]);
  return { id: created.id };
}

export async function updateMedicine(id: string, values: MedicineFormValues): Promise<{ id: string }> {
  const all = sortMedicines(seedIfEmpty());
  const index = all.findIndex((m) => m.id === id);
  if (index === -1) throw new Error("Medicine not found");

  all[index] = {
    ...all[index],
    ...fromForm(values),
    sort_order: values.sort_order ?? all[index].sort_order,
    updated_at: now(),
  };
  writeAll(all);
  return { id };
}

export async function deleteMedicine(id: string) {
  writeAll(readAll().filter((m) => m.id !== id));
  return { ok: true };
}

export async function setMedicineActive(id: string, status: MedicineStatus) {
  const all = sortMedicines(seedIfEmpty());
  const index = all.findIndex((m) => m.id === id);
  if (index === -1) throw new Error("Medicine not found");

  all[index] = {
    ...all[index],
    status,
    is_active: isMedicineActive(status),
    updated_at: now(),
  };
  writeAll(all);
  return { ok: true };
}

export { SEED_IDS };
