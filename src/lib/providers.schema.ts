import { z } from "zod";

export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
] as const;
export type USState = (typeof US_STATES)[number];

export const CREDENTIALS = ["MD", "DO", "NP", "PA", "RN", "PharmD", "Other"] as const;

export const CONSULTATION_TYPES = ["video", "phone", "chat", "in_person"] as const;

export const COMMON_LANGUAGES = [
  "English","Spanish","Mandarin","French","German","Hindi","Arabic","Portuguese",
  "Russian","Korean","Japanese","Vietnamese","Tagalog",
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
  email: z.string().trim().email().max(255),
  full_name: z.string().trim().min(1, "Required").max(120),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^[\d\s()+-]{7,20}$/.test(v), "Invalid phone")
    .transform((v) => (v ? v : undefined)),
  avatar_url: optionalStr.refine(
    (v) => !v || /^https?:\/\//i.test(v),
    "Must be a URL",
  ),
  bio: z.string().trim().max(2000).optional().or(z.literal("")).transform((v) => v || undefined),

  credentials: z.enum(CREDENTIALS).optional(),
  specialty: optionalStr,
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
    .transform((v) => (v ? v.toUpperCase() : undefined)),
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