import { c as stringType, i as enumType, n as booleanType, s as objectType } from "../_libs/zod.mjs";
import { l as createServerFn } from "./esm-9EjmF9OT.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-Dpn8S0gM.mjs";
import { a as isMcqType, c as updateQuestionSchema, s as questionFormSchema, t as QUESTION_TYPES } from "./questions.schema-C_UYXgFv.mjs";
import { t as createServerRpc } from "./createServerRpc-TAUNrjZd.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/questions.functions-D8TTSarI.js
async function assertAdmin(context) {
	const { data, error } = await context.supabase.rpc("has_role", {
		_user_id: context.userId,
		_role: "admin"
	});
	if (error || !data) throw new Error("Forbidden");
}
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
var listQuestions_createServerFn_handler = createServerRpc({
	id: "c845e6b12d87d58ae77b55d9ce7974a06e3663d00a9caf6a1cb736fd713e52db",
	name: "listQuestions",
	filename: "src/lib/questions.functions.ts"
}, (opts) => listQuestions.__executeServer(opts));
var listQuestions = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => listInput.parse(input ?? {})).handler(listQuestions_createServerFn_handler, async ({ data, context }) => {
	await assertAdmin(context);
	let query = context.supabase.from("intake_questions").select("id, prompt, description, question_type, sort_order, is_required, is_active, created_at, intake_question_options(id)").order("sort_order", { ascending: true }).order("created_at", { ascending: true });
	if (data.search) {
		const term = `%${data.search}%`;
		query = query.or(`prompt.ilike.${term},description.ilike.${term}`);
	}
	if (data.type !== "all") query = query.eq("question_type", data.type);
	if (data.status === "active") query = query.eq("is_active", true);
	else if (data.status === "inactive") query = query.eq("is_active", false);
	const { data: rows, error } = await query;
	if (error) throw new Error(error.message);
	return (rows ?? []).map((row) => {
		const { intake_question_options, ...rest } = row;
		return {
			...rest,
			option_count: Array.isArray(intake_question_options) ? intake_question_options.length : 0
		};
	});
});
var getQuestion_createServerFn_handler = createServerRpc({
	id: "17070efb1dbe6d99f03c21eef38aa9a2a124dd83432f17cacf21b55090d88eb1",
	name: "getQuestion",
	filename: "src/lib/questions.functions.ts"
}, (opts) => getQuestion.__executeServer(opts));
var getQuestion = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => idInput.parse(input)).handler(getQuestion_createServerFn_handler, async ({ data, context }) => {
	await assertAdmin(context);
	const [questionResult, orderResult] = await Promise.all([context.supabase.from("intake_questions").select("id, prompt, description, question_type, sort_order, is_required, is_active, created_at, intake_question_options(id, label, sort_order)").eq("id", data.id).order("sort_order", {
		referencedTable: "intake_question_options",
		ascending: true
	}).maybeSingle(), context.supabase.from("intake_questions").select("id").order("sort_order", { ascending: true }).order("created_at", { ascending: true })]);
	const { data: question, error } = questionResult;
	if (error) throw new Error(error.message);
	if (!question) throw new Error("Question not found");
	if (orderResult.error) throw new Error(orderResult.error.message);
	const index = (orderResult.data ?? []).findIndex((r) => r.id === data.id);
	return {
		...question,
		position: index === -1 ? null : index + 1
	};
});
var getQuestionPosition_createServerFn_handler = createServerRpc({
	id: "71dc08145b7f8500549f50cab214999f75180efae505e0d7422f059d789ab7d8",
	name: "getQuestionPosition",
	filename: "src/lib/questions.functions.ts"
}, (opts) => getQuestionPosition.__executeServer(opts));
var getQuestionPosition = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => idInput.parse(input)).handler(getQuestionPosition_createServerFn_handler, async ({ data, context }) => {
	await assertAdmin(context);
	const { data: rows, error } = await context.supabase.from("intake_questions").select("id").order("sort_order", { ascending: true }).order("created_at", { ascending: true });
	if (error) throw new Error(error.message);
	const index = (rows ?? []).findIndex((r) => r.id === data.id);
	return index === -1 ? null : index + 1;
});
async function insertOptions(supabase, questionId, options) {
	if (options.length === 0) return;
	const rows = options.map((opt, index) => ({
		question_id: questionId,
		label: opt.label,
		sort_order: opt.sort_order ?? index
	}));
	const { error } = await supabase.from("intake_question_options").insert(rows);
	if (error) throw new Error(error.message);
}
async function nextSortOrder(supabase) {
	const { data, error } = await supabase.from("intake_questions").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
	if (error) throw new Error(error.message);
	return (data?.sort_order ?? -1) + 1;
}
var createQuestion_createServerFn_handler = createServerRpc({
	id: "b5aa563ed5e0ad2d26f0d609d3a318498753dfe3b59129090ff5b3e69b7b936f",
	name: "createQuestion",
	filename: "src/lib/questions.functions.ts"
}, (opts) => createQuestion.__executeServer(opts));
var createQuestion = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => questionFormSchema.parse(input)).handler(createQuestion_createServerFn_handler, async ({ data, context }) => {
	await assertAdmin(context);
	const options = isMcqType(data.question_type) ? data.options ?? [] : [];
	const sortOrder = data.sort_order && data.sort_order > 0 ? data.sort_order : await nextSortOrder(context.supabase);
	const { data: created, error } = await context.supabase.from("intake_questions").insert({
		prompt: data.prompt,
		description: data.description ?? null,
		question_type: data.question_type,
		sort_order: sortOrder,
		is_required: data.is_required,
		is_active: data.is_active
	}).select("id").single();
	if (error || !created) throw new Error(error?.message ?? "Failed to create question");
	await insertOptions(context.supabase, created.id, options);
	return { id: created.id };
});
var updateQuestion_createServerFn_handler = createServerRpc({
	id: "1263778073df9f11c409ddd2d611439180aab4e9e4871b9203f55a859b2d24f7",
	name: "updateQuestion",
	filename: "src/lib/questions.functions.ts"
}, (opts) => updateQuestion.__executeServer(opts));
var updateQuestion = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => updateQuestionSchema.parse(input)).handler(updateQuestion_createServerFn_handler, async ({ data, context }) => {
	await assertAdmin(context);
	const options = isMcqType(data.question_type) ? data.options ?? [] : [];
	const { error } = await context.supabase.from("intake_questions").update({
		prompt: data.prompt,
		description: data.description ?? null,
		question_type: data.question_type,
		sort_order: data.sort_order,
		is_required: data.is_required,
		is_active: data.is_active
	}).eq("id", data.id);
	if (error) throw new Error(error.message);
	const { error: deleteError } = await context.supabase.from("intake_question_options").delete().eq("question_id", data.id);
	if (deleteError) throw new Error(deleteError.message);
	await insertOptions(context.supabase, data.id, options);
	return { id: data.id };
});
var deleteQuestion_createServerFn_handler = createServerRpc({
	id: "82a3e9e47803f4cc69baa1422367d39e8cd67efad9a99d5f0b106a335a5f12fd",
	name: "deleteQuestion",
	filename: "src/lib/questions.functions.ts"
}, (opts) => deleteQuestion.__executeServer(opts));
var deleteQuestion = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => idInput.parse(input)).handler(deleteQuestion_createServerFn_handler, async ({ data, context }) => {
	await assertAdmin(context);
	const { error } = await context.supabase.from("intake_questions").delete().eq("id", data.id);
	if (error) throw new Error(error.message);
	return { ok: true };
});
var setQuestionActive_createServerFn_handler = createServerRpc({
	id: "4d8353a865360805ea896da0da5cb7e1218ec05cec778f5eb0f05da41ee68012",
	name: "setQuestionActive",
	filename: "src/lib/questions.functions.ts"
}, (opts) => setQuestionActive.__executeServer(opts));
var setQuestionActive = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => objectType({
	id: stringType().uuid(),
	is_active: booleanType()
}).parse(input)).handler(setQuestionActive_createServerFn_handler, async ({ data, context }) => {
	await assertAdmin(context);
	const { error } = await context.supabase.from("intake_questions").update({ is_active: data.is_active }).eq("id", data.id);
	if (error) throw new Error(error.message);
	return { ok: true };
});
var moveQuestion_createServerFn_handler = createServerRpc({
	id: "96c1d93a3e13ccab2d94ca39d6440464b98fb4d9f558e9e99720c51ffa5b3a38",
	name: "moveQuestion",
	filename: "src/lib/questions.functions.ts"
}, (opts) => moveQuestion.__executeServer(opts));
var moveQuestion = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => objectType({
	id: stringType().uuid(),
	direction: enumType(["up", "down"])
}).parse(input)).handler(moveQuestion_createServerFn_handler, async ({ data, context }) => {
	await assertAdmin(context);
	const { data: rows, error } = await context.supabase.from("intake_questions").select("id, sort_order").order("sort_order", { ascending: true }).order("created_at", { ascending: true });
	if (error) throw new Error(error.message);
	const list = rows ?? [];
	const index = list.findIndex((r) => r.id === data.id);
	if (index === -1) throw new Error("Question not found");
	const swapIndex = data.direction === "up" ? index - 1 : index + 1;
	if (swapIndex < 0 || swapIndex >= list.length) return { ok: true };
	const current = list[index];
	const neighbor = list[swapIndex];
	const { error: e1 } = await context.supabase.from("intake_questions").update({ sort_order: neighbor.sort_order }).eq("id", current.id);
	if (e1) throw new Error(e1.message);
	const { error: e2 } = await context.supabase.from("intake_questions").update({ sort_order: current.sort_order }).eq("id", neighbor.id);
	if (e2) throw new Error(e2.message);
	return { ok: true };
});
//#endregion
export { createQuestion_createServerFn_handler, deleteQuestion_createServerFn_handler, getQuestionPosition_createServerFn_handler, getQuestion_createServerFn_handler, listQuestions_createServerFn_handler, moveQuestion_createServerFn_handler, setQuestionActive_createServerFn_handler, updateQuestion_createServerFn_handler };
