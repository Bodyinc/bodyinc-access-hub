import { n as queryOptions } from "../_libs/tanstack__react-query.mjs";
import { r as SEED_IDS, s as listMedicines } from "./medicines-8zD_oRw1.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/packages-C9A6ec8R.js
var STORAGE_KEY = "bi_packages";
function now() {
	return (/* @__PURE__ */ new Date()).toISOString();
}
function readAll() {
	if (typeof window === "undefined") return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}
function writeAll(packages) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(packages));
}
function sortPackages(packages) {
	return [...packages].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
}
function seedIfEmpty() {
	const existing = readAll();
	if (existing.length > 0) return existing;
	const ts = now();
	const seeded = [
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
				"Dose adjustment support"
			],
			clinical_note: "Pricing includes consultation and ongoing provider access.",
			sort_order: 0,
			is_active: true,
			created_at: ts,
			updated_at: ts
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
				"Quarterly lab review"
			],
			clinical_note: "Best value for committed treatment. Savings applied at checkout.",
			sort_order: 1,
			is_active: true,
			created_at: ts,
			updated_at: ts
		},
		{
			id: crypto.randomUUID(),
			medicine_id: SEED_IDS.multi,
			name: "Standard Treatment Plan",
			duration_months: 1,
			original_price: 249,
			price: 219,
			is_most_popular: false,
			features: [
				"Monthly supply",
				"Care team access",
				"Lifestyle coaching session"
			],
			clinical_note: null,
			sort_order: 0,
			is_active: true,
			created_at: ts,
			updated_at: ts
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
				"Lab coordination"
			],
			clinical_note: "Comprehensive plan for multi-pathway patients.",
			sort_order: 1,
			is_active: true,
			created_at: ts,
			updated_at: ts
		}
	];
	writeAll(seeded);
	return seeded;
}
function fromForm(values) {
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
		is_active: values.is_active ?? true
	};
}
function clearMostPopularForMedicine(all, medicineId, exceptId) {
	for (const pkg of all) if (pkg.medicine_id === medicineId && pkg.id !== exceptId && pkg.is_most_popular) {
		pkg.is_most_popular = false;
		pkg.updated_at = now();
	}
}
function listPackages(input = {}, medicineMap) {
	const resolvedMap = medicineMap ?? new Map(listMedicines().map((m) => [m.id, m.name]));
	let rows = sortPackages(seedIfEmpty());
	if (input.search) {
		const q = input.search.toLowerCase();
		rows = rows.filter((r) => r.name.toLowerCase().includes(q) || (resolvedMap.get(r.medicine_id)?.toLowerCase().includes(q) ?? false));
	}
	if (input.medicine_id && input.medicine_id !== "all") rows = rows.filter((r) => r.medicine_id === input.medicine_id);
	if (input.status === "active") rows = rows.filter((r) => r.is_active);
	else if (input.status === "inactive") rows = rows.filter((r) => !r.is_active);
	return rows.map((r) => ({
		...r,
		medicine_name: resolvedMap.get(r.medicine_id) ?? "Unknown",
		savings: Math.max(0, r.original_price - r.price)
	}));
}
function getPackage(id) {
	return sortPackages(seedIfEmpty()).find((p) => p.id === id) ?? null;
}
function createPackage(values) {
	const all = sortPackages(seedIfEmpty());
	const maxOrder = all.filter((p) => p.medicine_id === values.medicine_id).reduce((max, p) => Math.max(max, p.sort_order), -1);
	const sortOrder = values.sort_order ?? maxOrder + 1;
	const ts = now();
	const created = {
		id: crypto.randomUUID(),
		...fromForm({
			...values,
			sort_order: sortOrder
		}),
		created_at: ts,
		updated_at: ts
	};
	if (created.is_most_popular) clearMostPopularForMedicine(all, created.medicine_id);
	writeAll([...all, created]);
	return { id: created.id };
}
function updatePackage(id, values) {
	const all = sortPackages(seedIfEmpty());
	const index = all.findIndex((p) => p.id === id);
	if (index === -1) throw new Error("Package not found");
	const updated = {
		...all[index],
		...fromForm(values),
		sort_order: values.sort_order ?? all[index].sort_order,
		updated_at: now()
	};
	if (updated.is_most_popular) clearMostPopularForMedicine(all, updated.medicine_id, id);
	all[index] = updated;
	writeAll(all);
	return { id };
}
function deletePackage(id) {
	writeAll(readAll().filter((p) => p.id !== id));
	return { ok: true };
}
function setPackageActive(id, is_active) {
	const all = sortPackages(seedIfEmpty());
	const index = all.findIndex((p) => p.id === id);
	if (index === -1) throw new Error("Package not found");
	all[index] = {
		...all[index],
		is_active,
		updated_at: now()
	};
	writeAll(all);
	return { ok: true };
}
var LOCAL_STALE = Number.POSITIVE_INFINITY;
var packagesQueryKey = ["packages"];
function medicineNameMap() {
	return new Map(listMedicines().map((m) => [m.id, m.name]));
}
function packagesQueryOptions(input = {}) {
	return queryOptions({
		queryKey: packagesQueryKey,
		queryFn: () => listPackages(input, medicineNameMap()),
		staleTime: LOCAL_STALE
	});
}
function packageQueryOptions(id) {
	return queryOptions({
		queryKey: ["package", id],
		queryFn: () => getPackage(id),
		staleTime: LOCAL_STALE
	});
}
//#endregion
export { packagesQueryOptions as a, packagesQueryKey as i, deletePackage as n, setPackageActive as o, packageQueryOptions as r, updatePackage as s, createPackage as t };
