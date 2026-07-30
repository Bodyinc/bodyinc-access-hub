import { z } from "zod";

import { US_STATES } from "@/lib/us-states";
import { normalizeEmail, sentenceCase, titleCaseName, upperTrim } from "@/lib/text-normalize";

export { US_STATES };
export type { USState } from "@/lib/us-states";

export const CREDENTIALS = ["MD", "DO", "NP", "PA", "RN", "PharmD", "Other"] as const;

export const CONSULTATION_TYPES = ["video", "phone", "chat", "in_person"] as const;

export const COMMON_LANGUAGES = [
  "English",
  "Spanish",
  "Mandarin",
  "French",
  "German",
  "Hindi",
  "Arabic",
  "Portuguese",
  "Russian",
  "Korean",
  "Japanese",
  "Vietnamese",
  "Tagalog",
] as const;

const optionalStr = z
  .string()
  .trim()
  .max(255)
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : undefined));

const stateEnum = z.enum(US_STATES);

export const providerFormSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .max(255)
    .transform((v) => normalizeEmail(v)),
  full_name: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(120)
    .transform((v) => titleCaseName(v)),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^[\d\s()+-]{7,20}$/.test(v), "Enter a valid phone number")
    .transform((v) => (v ? v : undefined)),
  avatar_url: optionalStr.refine(
    (v) => !v || /^https?:\/\//i.test(v),
    "Enter a valid URL starting with https://",
  ),
  bio: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? sentenceCase(v) : undefined)),

  credentials: z.enum(CREDENTIALS).optional(),
  specialty: optionalStr.transform((v) => (v ? titleCaseName(v) : undefined)),
  npi: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^\d{10}$/.test(v), "NPI must be 10 digits")
    .transform((v) => (v ? v : undefined)),
  dea: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^[A-Za-z]{2}\d{7}$/.test(v), "DEA must be 2 letters + 7 digits")
    .transform((v) => (v ? upperTrim(v) : undefined)),
  license_number: optionalStr,
  license_states: z.array(stateEnum).default([]),

  years_experience: z
    .union([z.number().int().min(0).max(80), z.literal("").transform(() => undefined)])
    .optional(),
  languages: z.array(z.string().min(1).max(40)).default([]),
  consultation_types: z.array(z.enum(CONSULTATION_TYPES)).default([]),
  practice_states: z.array(stateEnum).default([]),

  address_line1: optionalStr,
  address_line2: optionalStr,
  city: optionalStr,
  state: stateEnum.optional(),
  zip: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^\d{5}(-\d{4})?$/.test(v), "ZIP must be 5 or 9 digits")
    .transform((v) => (v ? v : undefined)),
  country: z.string().trim().default("US"),

  is_active: z.boolean().default(true),
});

export type ProviderFormValues = z.input<typeof providerFormSchema>;
export type ProviderFormParsed = z.output<typeof providerFormSchema>;
