import { n as queryOptions } from "../_libs/tanstack__react-query.mjs";
import { a as literalType, c as stringType, i as enumType, r as coerce, s as objectType, t as arrayType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/medicines-LJTZ9Z5B.js
var MEDICINE_STATUSES = [
	"active",
	"inactive",
	"draft"
];
var MEDICINE_STATUS_LABELS = {
	active: "Active",
	inactive: "Inactive",
	draft: "Draft"
};
var medicineFormSchema = objectType({
	name: stringType().trim().min(1, "Medicine name is required").max(120),
	short_description: stringType().trim().min(1, "Short description is required").max(500),
	long_description: stringType().trim().max(3e3).optional().or(literalType("")).transform((v) => v ? v : void 0),
	image_url: stringType().trim().optional().or(literalType("")).refine((v) => !v || /^https?:\/\/.+/i.test(v), { message: "Upload an image or provide a valid URL" }).transform((v) => v ? v : void 0),
	price_monthly: coerce.number().min(0, "Price must be 0 or greater"),
	status: enumType(MEDICINE_STATUSES).default("draft"),
	important_info: arrayType(objectType({ text: stringType().trim().min(1, "Bullet cannot be empty").max(500) })).default([]),
	notice_text: stringType().trim().max(1e3).optional().or(literalType("")).transform((v) => v ? v : void 0),
	sort_order: coerce.number().int().min(0).default(0)
});
function isMedicineActive(status) {
	return status === "active";
}
function formatPrice(amount) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD"
	}).format(amount);
}
var STORAGE_KEY = "bi_medicines";
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
function writeAll(medicines) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(medicines));
}
function sortMedicines(medicines) {
	return [...medicines].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
}
var SEED_IDS = {
	glp1: "a1111111-1111-4111-8111-111111111111",
	multi: "a2222222-2222-4222-8222-222222222222",
	lean: "a3333333-3333-4333-8333-333333333333"
};
function seedIfEmpty() {
	const existing = readAll();
	if (existing.length > 0) return existing;
	const ts = now();
	const seeded = [
		{
			id: SEED_IDS.glp1,
			name: "GLP-1 Compound",
			short_description: "Clinically guided GLP-1 therapy for sustainable weight management.",
			long_description: "Our GLP-1 compound is prescribed and monitored by licensed providers. Treatment includes ongoing check-ins, dose adjustments, and access to your care team throughout your journey.",
			image_url: "https://placehold.co/200x280/f5f5f5/666?text=GLP-1",
			price_monthly: 199,
			status: "active",
			important_info: [
				"Prescription required — consultation included",
				"Weekly self-injection with provider guidance",
				"Not suitable if pregnant or breastfeeding"
			],
			notice_text: "Individual results vary. Your provider will determine if this medication is appropriate for you.",
			sort_order: 0,
			is_active: true,
			created_at: ts,
			updated_at: ts
		},
		{
			id: SEED_IDS.multi,
			name: "Multi-Pathway Program",
			short_description: "Combined metabolic support tailored to your health profile.",
			long_description: "A comprehensive approach combining metabolic support medications with lifestyle coaching. Ideal for patients who need a broader treatment strategy beyond a single pathway.",
			image_url: "https://placehold.co/200x280/f5f5f5/666?text=Multi",
			price_monthly: 249,
			status: "active",
			important_info: [
				"Includes provider consultation and care plan",
				"May combine multiple therapeutic approaches",
				"Regular lab monitoring recommended"
			],
			notice_text: "Treatment plans are individualized. Discuss all medications with your provider.",
			sort_order: 1,
			is_active: true,
			created_at: ts,
			updated_at: ts
		},
		{
			id: SEED_IDS.lean,
			name: "Lean Muscle Support",
			short_description: "Preserve lean mass while supporting healthy body composition.",
			long_description: "Designed for patients focused on maintaining muscle mass during weight loss. Includes peptide support and nutrition guidance from your care team.",
			image_url: "https://placehold.co/200x280/f5f5f5/666?text=Lean",
			price_monthly: 179,
			status: "draft",
			important_info: ["Best paired with resistance training", "Provider evaluation required before starting"],
			notice_text: null,
			sort_order: 2,
			is_active: false,
			created_at: ts,
			updated_at: ts
		}
	];
	writeAll(seeded);
	return seeded;
}
function fromForm(values) {
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
		is_active: isMedicineActive(status)
	};
}
function listMedicines(input = {}) {
	let rows = sortMedicines(seedIfEmpty());
	if (input.search) {
		const q = input.search.toLowerCase();
		rows = rows.filter((r) => r.name.toLowerCase().includes(q) || r.short_description.toLowerCase().includes(q) || (r.long_description?.toLowerCase().includes(q) ?? false));
	}
	if (input.status && input.status !== "all") rows = rows.filter((r) => r.status === input.status);
	return rows;
}
function getMedicine(id) {
	return sortMedicines(seedIfEmpty()).find((m) => m.id === id) ?? null;
}
async function createMedicine(values) {
	const all = sortMedicines(seedIfEmpty());
	const maxOrder = all.reduce((max, m) => Math.max(max, m.sort_order), -1);
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
	writeAll([...all, created]);
	return { id: created.id };
}
async function updateMedicine(id, values) {
	const all = sortMedicines(seedIfEmpty());
	const index = all.findIndex((m) => m.id === id);
	if (index === -1) throw new Error("Medicine not found");
	all[index] = {
		...all[index],
		...fromForm(values),
		sort_order: values.sort_order ?? all[index].sort_order,
		updated_at: now()
	};
	writeAll(all);
	return { id };
}
async function deleteMedicine(id) {
	writeAll(readAll().filter((m) => m.id !== id));
	return { ok: true };
}
async function setMedicineActive(id, status) {
	const all = sortMedicines(seedIfEmpty());
	const index = all.findIndex((m) => m.id === id);
	if (index === -1) throw new Error("Medicine not found");
	all[index] = {
		...all[index],
		status,
		is_active: isMedicineActive(status),
		updated_at: now()
	};
	writeAll(all);
	return { ok: true };
}
var LOCAL_STALE = Number.POSITIVE_INFINITY;
var medicinesQueryKey = ["medicines"];
function medicinesQueryOptions() {
	return queryOptions({
		queryKey: medicinesQueryKey,
		queryFn: () => listMedicines(),
		staleTime: LOCAL_STALE
	});
}
function medicineQueryOptions(id) {
	return queryOptions({
		queryKey: ["medicine", id],
		queryFn: () => getMedicine(id),
		staleTime: LOCAL_STALE
	});
}
//#endregion
export { deleteMedicine as a, medicineFormSchema as c, medicinesQueryOptions as d, setMedicineActive as f, createMedicine as i, medicineQueryOptions as l, MEDICINE_STATUS_LABELS as n, formatPrice as o, updateMedicine as p, SEED_IDS as r, listMedicines as s, MEDICINE_STATUSES as t, medicinesQueryKey as u };
