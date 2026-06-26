import { z } from "zod";

export const packageFormSchema = z.object({
  medicine_id: z.string().uuid("Select a medicine"),
  name: z.string().trim().min(1, "Plan name is required").max(120),
  duration_months: z.coerce.number().int().min(1, "Duration must be at least 1 month"),
  original_price: z.coerce.number().min(0, "Original price must be 0 or greater"),
  price: z.coerce.number().min(0, "Sale price must be 0 or greater"),
  is_most_popular: z.boolean().default(false),
  features: z
    .array(z.object({ text: z.string().trim().min(1, "Feature cannot be empty").max(300) }))
    .default([]),
  clinical_note: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  sort_order: z.coerce.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});

export type PackageFormValues = z.input<typeof packageFormSchema>;

export const DURATION_PRESETS = [1, 3, 6] as const;

export function computeSavings(original: number, sale: number) {
  return Math.max(0, original - sale);
}

export function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}
