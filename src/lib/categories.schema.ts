import { z } from "zod";

import { US_STATES } from "@/lib/us-states";

export const BMI_BANDS = ["underweight", "normal", "overweight", "obese"] as const;
export type BmiBand = (typeof BMI_BANDS)[number];

export const SEX_VALUES = ["female", "male", "other"] as const;
export type SexValue = (typeof SEX_VALUES)[number];

// A cleared number input submits "", and z.coerce turns "" into 0 — .optional()/.nullable() only
// short-circuit undefined/null, so a blank age field would persist a bound of 0 and disqualify
// every patient. Map blank to null so it reads as "no bound configured".
const ageBound = z.preprocess(
  (value) => (value === "" ? null : value),
  z.coerce.number().int().min(0).max(120).nullable().optional(),
);

export const eligibilityRulesSchema = z
  .object({
    bmi_bands: z.array(z.enum(BMI_BANDS)).default([]),
    sex: z.array(z.enum(SEX_VALUES)).default([]),
    min_age: ageBound,
    max_age: ageBound,
    // Unlike the other groups this one is a deny list: listed states are excluded, empty allows all.
    blocked_state_codes: z.array(z.enum(US_STATES)).default([]),
  })
  .default({ bmi_bands: [], sex: [], blocked_state_codes: [] });

export type EligibilityRules = z.infer<typeof eligibilityRulesSchema>;

export const categoryFormSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(80)
    .regex(/^[a-z0-9-]+$/i, "Use letters, numbers, and dashes only")
    .transform((v) => v.toLowerCase()),
  name: z.string().trim().min(1, "Name is required").max(120),
  tagline: z.string().trim().max(200).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  description: z.string().trim().max(2000).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  icon: z.string().trim().max(60).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  sort_order: z.coerce.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
  eligibility_rules: eligibilityRulesSchema,
  medicine_ids: z.array(z.string().uuid()).default([]),
});

export type CategoryFormValues = z.input<typeof categoryFormSchema>;

export const BMI_BAND_LABELS: Record<BmiBand, string> = {
  underweight: "Underweight (<18.5)",
  normal: "Normal (18.5–24.9)",
  overweight: "Overweight (25–29.9)",
  obese: "Obese (30+)",
};

export const SEX_LABELS: Record<SexValue, string> = {
  female: "Female",
  male: "Male",
  other: "Other / Prefer not to say",
};