import { c as stringType, i as enumType, n as booleanType, s as objectType } from "../_libs/zod.mjs";
import { l as createServerFn } from "./esm-9EjmF9OT.mjs";
import { t as createSsrRpc } from "./createSsrRpc-NTk29FAB.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-Dpn8S0gM.mjs";
import { c as updateQuestionSchema, s as questionFormSchema, t as QUESTION_TYPES } from "./questions.schema-C_UYXgFv.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/questions.functions-CgcgEHZL.js
var listInput = objectType({
	search: stringType().trim().max(200).optional(),
	type: enumType(["all", ...QUESTION_TYPES]).default("all"),
	status: enumType([
		"all",
		"active",
		"inactive"
	]).default("all")
}).default({
	type: "all",
	status: "all"
});
var idInput = objectType({ id: stringType().uuid() });
var listQuestions = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => listInput.parse(input ?? {})).handler(createSsrRpc("c845e6b12d87d58ae77b55d9ce7974a06e3663d00a9caf6a1cb736fd713e52db"));
var getQuestion = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => idInput.parse(input)).handler(createSsrRpc("17070efb1dbe6d99f03c21eef38aa9a2a124dd83432f17cacf21b55090d88eb1"));
createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => idInput.parse(input)).handler(createSsrRpc("71dc08145b7f8500549f50cab214999f75180efae505e0d7422f059d789ab7d8"));
var createQuestion = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => questionFormSchema.parse(input)).handler(createSsrRpc("b5aa563ed5e0ad2d26f0d609d3a318498753dfe3b59129090ff5b3e69b7b936f"));
var updateQuestion = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => updateQuestionSchema.parse(input)).handler(createSsrRpc("1263778073df9f11c409ddd2d611439180aab4e9e4871b9203f55a859b2d24f7"));
var deleteQuestion = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => idInput.parse(input)).handler(createSsrRpc("82a3e9e47803f4cc69baa1422367d39e8cd67efad9a99d5f0b106a335a5f12fd"));
var setQuestionActive = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => objectType({
	id: stringType().uuid(),
	is_active: booleanType()
}).parse(input)).handler(createSsrRpc("4d8353a865360805ea896da0da5cb7e1218ec05cec778f5eb0f05da41ee68012"));
var moveQuestion = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => objectType({
	id: stringType().uuid(),
	direction: enumType(["up", "down"])
}).parse(input)).handler(createSsrRpc("96c1d93a3e13ccab2d94ca39d6440464b98fb4d9f558e9e99720c51ffa5b3a38"));
//#endregion
export { moveQuestion as a, listQuestions as i, deleteQuestion as n, setQuestionActive as o, getQuestion as r, updateQuestion as s, createQuestion as t };
