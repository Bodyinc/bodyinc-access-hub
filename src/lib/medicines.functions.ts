import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertAdmin } from "@/lib/admin-guard";


const syncInput = z.object({ medicineId: z.string().uuid() });

// Creates or updates the Stripe Product that a medicine maps to, storing its id.
export const syncMedicineToStripe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => syncInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getStripe } = await import("@/integrations/stripe/client.server");
    const stripe = getStripe();

    const { data: medicine, error } = await supabaseAdmin
      .from("medicines")
      .select("id, name, short_description, stripe_product_id")
      .eq("id", data.medicineId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!medicine) throw new Error("Medicine not found.");

    if (medicine.stripe_product_id) {
      await stripe.products.update(medicine.stripe_product_id, {
        name: medicine.name,
        description: medicine.short_description || undefined,
      });
      return { ok: true, stripe_product_id: medicine.stripe_product_id };
    }

    const product = await stripe.products.create({
      name: medicine.name,
      description: medicine.short_description || undefined,
      metadata: { medicine_id: medicine.id },
    });
    await supabaseAdmin
      .from("medicines")
      .update({ stripe_product_id: product.id })
      .eq("id", medicine.id);

    return { ok: true, stripe_product_id: product.id };
  });
