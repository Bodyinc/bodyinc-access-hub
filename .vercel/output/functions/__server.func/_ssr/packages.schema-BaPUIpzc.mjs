import { a as literalType, c as stringType, n as booleanType, r as coerce, s as objectType, t as arrayType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/packages.schema-BaPUIpzc.js
var packageFormSchema = objectType({
	medicine_id: stringType().uuid("Select a medicine"),
	name: stringType().trim().min(1, "Plan name is required").max(120),
	duration_months: coerce.number().int().min(1, "Duration must be at least 1 month"),
	original_price: coerce.number().min(0, "Original price must be 0 or greater"),
	price: coerce.number().min(0, "Sale price must be 0 or greater"),
	is_most_popular: booleanType().default(false),
	features: arrayType(objectType({ text: stringType().trim().min(1, "Feature cannot be empty").max(300) })).default([]),
	clinical_note: stringType().trim().max(2e3).optional().or(literalType("")).transform((v) => v ? v : void 0),
	sort_order: coerce.number().int().min(0).default(0),
	is_active: booleanType().default(true)
});
var DURATION_PRESETS = [
	1,
	3,
	6
];
function computeSavings(original, sale) {
	return Math.max(0, original - sale);
}
function formatPrice(amount) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD"
	}).format(amount);
}
//#endregion
export { packageFormSchema as i, computeSavings as n, formatPrice as r, DURATION_PRESETS as t };
