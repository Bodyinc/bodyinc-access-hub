import { z } from "zod";

export const MEDICINE_STATUSES = ["active", "inactive", "draft"] as const;
export type MedicineStatus = (typeof MEDICINE_STATUSES)[number];

export const MEDICINE_STATUS_LABELS: Record<MedicineStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  draft: "Draft",
};

export const medicineFormSchema = z.object({
  name: z.string().trim().min(1, "Medicine name is required").max(120),
  short_description: z.string().trim().min(1, "Short description is required").max(500),
  long_description: z
    .string()
    .trim()
    .max(3000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  image_url: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^https?:\/\/.+/i.test(v), {
      message: "Upload an image or provide a valid URL",
    })
    .transform((v) => (v ? v : undefined)),
  price_monthly: z.coerce.number().min(0, "Price must be 0 or greater"),
  status: z.enum(MEDICINE_STATUSES).default("draft"),
  important_info: z
    .array(z.object({ text: z.string().trim().min(1, "Bullet cannot be empty").max(500) }))
    .default([]),
  notice_text: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  sort_order: z.coerce.number().int().min(0).default(0),
  requires_questionnaire: z.boolean().default(false),
  category_ids: z.array(z.string().uuid()).default([]),
});

export type MedicineFormValues = z.input<typeof medicineFormSchema>;

export function isMedicineActive(status: MedicineStatus) {
  return status === "active";
}

export function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}
