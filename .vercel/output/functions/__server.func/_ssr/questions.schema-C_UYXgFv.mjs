import { a as literalType, c as stringType, i as enumType, n as booleanType, o as numberType, r as coerce, s as objectType, t as arrayType, u as ZodIssueCode } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/questions.schema-C_UYXgFv.js
var QUESTION_TYPES = [
	"short_text",
	"mcq_single",
	"mcq_multi"
];
var QUESTION_TYPE_LABELS = {
	short_text: "Short answer",
	mcq_single: "Multiple choice — one answer",
	mcq_multi: "Multiple choice — multiple answers"
};
var QUESTION_TYPE_BADGE_LABELS = {
	short_text: "Short answer",
	mcq_single: "One choice",
	mcq_multi: "Multi choice"
};
var QUESTION_TYPE_HELPERS = {
	short_text: "Patient types a brief response",
	mcq_single: "Patient picks exactly one option",
	mcq_multi: "Patient can select several options"
};
function optionLetter(index) {
	return String.fromCharCode(65 + index);
}
var questionOptionSchema = objectType({
	label: stringType().trim().min(1, "Option cannot be empty").max(255),
	sort_order: numberType().int().min(0).optional()
});
var questionFormSchema = objectType({
	prompt: stringType().trim().min(1, "Question is required").max(2e3),
	description: stringType().trim().max(500, "Description must be 500 characters or less").optional().or(literalType("")).transform((v) => v ? v : void 0),
	question_type: enumType(QUESTION_TYPES),
	sort_order: coerce.number().int().min(0).default(0),
	is_required: booleanType().default(true),
	is_active: booleanType().default(true),
	options: arrayType(questionOptionSchema).default([])
}).superRefine((data, ctx) => {
	if (!(data.question_type === "mcq_single" || data.question_type === "mcq_multi")) {
		if (data.options.length > 0) ctx.addIssue({
			code: ZodIssueCode.custom,
			message: "Short descriptive questions cannot have options",
			path: ["options"]
		});
		return;
	}
	if (data.options.length < 2) ctx.addIssue({
		code: ZodIssueCode.custom,
		message: "Add at least 2 options",
		path: ["options"]
	});
	if (data.options.length > 10) ctx.addIssue({
		code: ZodIssueCode.custom,
		message: "Maximum 10 options allowed",
		path: ["options"]
	});
});
var updateQuestionSchema = objectType({
	id: stringType().uuid(),
	prompt: stringType().trim().min(1, "Question is required").max(2e3),
	description: stringType().trim().max(500, "Description must be 500 characters or less").optional().or(literalType("")).transform((v) => v ? v : void 0),
	question_type: enumType(QUESTION_TYPES),
	sort_order: coerce.number().int().min(0).default(0),
	is_required: booleanType().default(true),
	is_active: booleanType().default(true),
	options: arrayType(objectType({
		label: stringType().trim().min(1, "Option cannot be empty").max(255),
		sort_order: numberType().int().min(0).optional()
	})).default([])
}).superRefine((data, ctx) => {
	if (!(data.question_type === "mcq_single" || data.question_type === "mcq_multi")) {
		if (data.options.length > 0) ctx.addIssue({
			code: ZodIssueCode.custom,
			message: "Short descriptive questions cannot have options",
			path: ["options"]
		});
		return;
	}
	if (data.options.length < 2) ctx.addIssue({
		code: ZodIssueCode.custom,
		message: "Add at least 2 options",
		path: ["options"]
	});
	if (data.options.length > 10) ctx.addIssue({
		code: ZodIssueCode.custom,
		message: "Maximum 10 options allowed",
		path: ["options"]
	});
});
function isMcqType(type) {
	return type === "mcq_single" || type === "mcq_multi";
}
//#endregion
export { isMcqType as a, updateQuestionSchema as c, QUESTION_TYPE_LABELS as i, QUESTION_TYPE_BADGE_LABELS as n, optionLetter as o, QUESTION_TYPE_HELPERS as r, questionFormSchema as s, QUESTION_TYPES as t };
