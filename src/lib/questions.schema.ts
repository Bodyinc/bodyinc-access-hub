import { z } from "zod";

export const QUESTION_TYPES = ["short_text", "mcq_single", "mcq_multi"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  short_text: "Short answer",
  mcq_single: "Multiple choice — one answer",
  mcq_multi: "Multiple choice — multiple answers",
};

export const QUESTION_TYPE_BADGE_LABELS: Record<QuestionType, string> = {
  short_text: "Short answer",
  mcq_single: "One choice",
  mcq_multi: "Multi choice",
};

export const QUESTION_TYPE_HELPERS: Record<QuestionType, string> = {
  short_text: "Patient types a brief response",
  mcq_single: "Patient picks exactly one option",
  mcq_multi: "Patient can select several options",
};

export function optionLetter(index: number) {
  return String.fromCharCode(65 + index);
}

const questionOptionSchema = z.object({
  label: z.string().trim().min(1, "Option cannot be empty").max(255),
  sort_order: z.number().int().min(0).optional(),
});

export const questionFormSchema = z
  .object({
    prompt: z.string().trim().min(1, "Question is required").max(2000),
    description: z
      .string()
      .trim()
      .max(500, "Description must be 500 characters or less")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
    question_type: z.enum(QUESTION_TYPES),
    sort_order: z.coerce.number().int().min(0).default(0),
    is_required: z.boolean().default(true),
    is_active: z.boolean().default(true),
    options: z.array(questionOptionSchema).default([]),
  })
  .superRefine((data, ctx) => {
    const isMcq = data.question_type === "mcq_single" || data.question_type === "mcq_multi";
    if (!isMcq) {
      if (data.options.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Short descriptive questions cannot have options",
          path: ["options"],
        });
      }
      return;
    }
    if (data.options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add at least 2 options",
        path: ["options"],
      });
    }
    if (data.options.length > 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Maximum 10 options allowed",
        path: ["options"],
      });
    }
  });

export type QuestionFormValues = z.input<typeof questionFormSchema>;

export const updateQuestionSchema = z
  .object({
    id: z.string().uuid(),
    prompt: z.string().trim().min(1, "Question is required").max(2000),
    description: z
      .string()
      .trim()
      .max(500, "Description must be 500 characters or less")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
    question_type: z.enum(QUESTION_TYPES),
    sort_order: z.coerce.number().int().min(0).default(0),
    is_required: z.boolean().default(true),
    is_active: z.boolean().default(true),
    options: z
      .array(
        z.object({
          label: z.string().trim().min(1, "Option cannot be empty").max(255),
          sort_order: z.number().int().min(0).optional(),
        }),
      )
      .default([]),
  })
  .superRefine((data, ctx) => {
    const isMcq = data.question_type === "mcq_single" || data.question_type === "mcq_multi";
    if (!isMcq) {
      if (data.options.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Short descriptive questions cannot have options",
          path: ["options"],
        });
      }
      return;
    }
    if (data.options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add at least 2 options",
        path: ["options"],
      });
    }
    if (data.options.length > 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Maximum 10 options allowed",
        path: ["options"],
      });
    }
  });

export function isMcqType(type: QuestionType) {
  return type === "mcq_single" || type === "mcq_multi";
}
