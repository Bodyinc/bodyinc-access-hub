import type { PackageFormValues } from "./packages.schema";
import { listMedicines, SEED_IDS } from "./medicines.store";

const STORAGE_KEY = "bi_packages";

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

function now() {
  return new Date().toISOString();
}

function readAll(): StoredPackage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredPackage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(packages: StoredPackage[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(packages));
}

function sortPackages(packages: StoredPackage[]) {
  return [...packages].sort(
    (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at),
  );
}

function seedIfEmpty() {
  const existing = readAll();
  if (existing.length > 0) return existing;

  const ts = now();
  const seeded: StoredPackage[] = [
    {
      id: crypto.randomUUID(),
      medicine_id: SEED_IDS.glp1,
      name: "Standard Treatment Plan",
      duration_months: 1,
      original_price: 199,
      price: 167,
      is_most_popular: false,
      features: [
        "Monthly medication supply",
        "Provider check-in",
        "Dose adjustment support",
      ],
      clinical_note: "Pricing includes consultation and ongoing provider access.",
      sort_order: 0,
      is_active: true,
      created_at: ts,
      updated_at: ts,
    },
    {
      id: crypto.randomUUID(),
      medicine_id: SEED_IDS.glp1,
      name: "3-Month Value Plan",
      duration_months: 3,
      original_price: 591,
      price: 447,
      is_most_popular: true,
      features: [
        "3-month medication supply",
        "Priority provider support",
        "Free shipping",
        "Quarterly lab review",
      ],
      clinical_note: "Best value for committed treatment. Savings applied at checkout.",
      sort_order: 1,
      is_active: true,
      created_at: ts,
      updated_at: ts,
    },
    {
      id: crypto.randomUUID(),
      medicine_id: SEED_IDS.multi,
      name: "Standard Treatment Plan",
      duration_months: 1,
      original_price: 249,
      price: 219,
      is_most_popular: false,
      features: ["Monthly supply", "Care team access", "Lifestyle coaching session"],
      clinical_note: null,
      sort_order: 0,
      is_active: true,
      created_at: ts,
      updated_at: ts,
    },
    {
      id: crypto.randomUUID(),
      medicine_id: SEED_IDS.multi,
      name: "3-Month Comprehensive Plan",
      duration_months: 3,
      original_price: 747,
      price: 597,
      is_most_popular: true,
      features: [
        "3-month medication supply",
        "Bi-weekly coaching check-ins",
        "Lab coordination",
      ],
      clinical_note: "Comprehensive plan for multi-pathway patients.",
      sort_order: 1,
      is_active: true,
      created_at: ts,
      updated_at: ts,
    },
  ];
  writeAll(seeded);
  return seeded;
}

function fromForm(values: PackageFormValues): Omit<StoredPackage, "id" | "created_at" | "updated_at"> {
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

function clearMostPopularForMedicine(
  all: StoredPackage[],
  medicineId: string,
  exceptId?: string,
) {
  for (const pkg of all) {
    if (pkg.medicine_id === medicineId && pkg.id !== exceptId && pkg.is_most_popular) {
      pkg.is_most_popular = false;
      pkg.updated_at = now();
    }
  }
}

export function listPackages(
  input: ListPackagesInput = {},
  medicineMap?: Map<string, string>,
): ListPackageRow[] {
  const resolvedMap =
    medicineMap ?? new Map(listMedicines().map((m) => [m.id, m.name]));

  let rows = sortPackages(seedIfEmpty());

  if (input.search) {
    const q = input.search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (resolvedMap.get(r.medicine_id)?.toLowerCase().includes(q) ?? false),
    );
  }
  if (input.medicine_id && input.medicine_id !== "all") {
    rows = rows.filter((r) => r.medicine_id === input.medicine_id);
  }
  if (input.status === "active") {
    rows = rows.filter((r) => r.is_active);
  } else if (input.status === "inactive") {
    rows = rows.filter((r) => !r.is_active);
  }

  return rows.map((r) => ({
    ...r,
    medicine_name: resolvedMap.get(r.medicine_id) ?? "Unknown",
    savings: Math.max(0, r.original_price - r.price),
  }));
}

export function listPackagesByMedicine(medicineId: string): StoredPackage[] {
  return sortPackages(seedIfEmpty()).filter((p) => p.medicine_id === medicineId && p.is_active);
}

export function getPackage(id: string): StoredPackage | null {
  return sortPackages(seedIfEmpty()).find((p) => p.id === id) ?? null;
}

export async function createPackage(values: PackageFormValues): Promise<{ id: string }> {
  const all = sortPackages(seedIfEmpty());
  const maxOrder = all
    .filter((p) => p.medicine_id === values.medicine_id)
    .reduce((max, p) => Math.max(max, p.sort_order), -1);
  const sortOrder = values.sort_order ?? maxOrder + 1;
  const ts = now();

  const created: StoredPackage = {
    id: crypto.randomUUID(),
    ...fromForm({ ...values, sort_order: sortOrder }),
    created_at: ts,
    updated_at: ts,
  };

  if (created.is_most_popular) {
    clearMostPopularForMedicine(all, created.medicine_id);
  }

  writeAll([...all, created]);
  return { id: created.id };
}

export async function updatePackage(id: string, values: PackageFormValues): Promise<{ id: string }> {
  const all = sortPackages(seedIfEmpty());
  const index = all.findIndex((p) => p.id === id);
  if (index === -1) throw new Error("Package not found");

  const updated: StoredPackage = {
    ...all[index],
    ...fromForm(values),
    sort_order: values.sort_order ?? all[index].sort_order,
    updated_at: now(),
  };

  if (updated.is_most_popular) {
    clearMostPopularForMedicine(all, updated.medicine_id, id);
  }

  all[index] = updated;
  writeAll(all);
  return { id };
}

export async function deletePackage(id: string) {
  writeAll(readAll().filter((p) => p.id !== id));
  return { ok: true };
}

export async function setPackageActive(id: string, is_active: boolean) {
  const all = sortPackages(seedIfEmpty());
  const index = all.findIndex((p) => p.id === id);
  if (index === -1) throw new Error("Package not found");

  all[index] = { ...all[index], is_active, updated_at: now() };
  writeAll(all);
  return { ok: true };
}
