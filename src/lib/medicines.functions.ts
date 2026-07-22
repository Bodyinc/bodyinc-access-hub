import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertAdmin } from "@/lib/admin-guard";
import { archiveInStripe, BILLING_SUBSCRIPTION_STATUSES } from "@/lib/stripe-objects";


const syncInput = z.object({ medicineId: z.string().uuid() });
const deleteInput = z.object({ medicineId: z.string().uuid() });

export type MedicineDeletionImpact = {
  billingSubscriptions: number;
  totalSubscriptions: number;
  shopOrderRefs: number;
  packages: number;
  blocked: boolean;
};

async function measureDeletionImpact(
  supabaseAdmin: any,
  medicineId: string,
): Promise<MedicineDeletionImpact> {
  const countOf = async (table: string, apply: (q: any) => any) => {
    const { count } = await apply(supabaseAdmin.from(table).select("id", { count: "exact", head: true }));
    return count ?? 0;
  };

  const [billingSubscriptions, totalSubscriptions, orders, orderItems, packages] = await Promise.all([
    countOf("subscriptions", (q) =>
      q.eq("medicine_id", medicineId).in("status", BILLING_SUBSCRIPTION_STATUSES),
    ),
    countOf("subscriptions", (q) => q.eq("medicine_id", medicineId)),
    countOf("shop_checkout_orders", (q) => q.eq("medicine_id", medicineId)),
    countOf("shop_checkout_order_items", (q) => q.eq("medicine_id", medicineId)),
    countOf("packages", (q) => q.eq("medicine_id", medicineId)),
  ]);

  const shopOrderRefs = orders + orderItems;
  return {
    billingSubscriptions,
    totalSubscriptions,
    shopOrderRefs,
    packages,
    blocked: billingSubscriptions > 0 || shopOrderRefs > 0,
  };
}

// Read-only: lets the confirmation dialog state the consequences before the admin commits,
// rather than the delete failing (or silently orphaning a subscription) after they click.
export const getMedicineDeletionImpact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deleteInput.parse(input))
  .handler(async ({ data, context }): Promise<MedicineDeletionImpact> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return measureDeletionImpact(supabaseAdmin, data.medicineId);
  });

// Deleting a medicine never cancels its Stripe subscriptions — Stripe keeps billing on its own
// schedule — and subscriptions.medicine_id is ON DELETE SET NULL, so the record survives with no
// idea what it was for. Refuse rather than create that orphan. Shop order FKs have no ON DELETE
// clause, so Postgres would reject those anyway; catching it here gives a usable message.
export const deleteMedicineSafely = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deleteInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getStripe } = await import("@/integrations/stripe/client.server");

    // Re-measured server-side: the dialog's numbers are a display, never the authority.
    const impact = await measureDeletionImpact(supabaseAdmin, data.medicineId);

    if (impact.billingSubscriptions > 0) {
      throw new Error(
        `${impact.billingSubscriptions} patient${impact.billingSubscriptions === 1 ? " is" : "s are"} still being billed for this medicine. Deleting it will NOT stop those charges, and the subscription records would lose all record of what they are for. Cancel or migrate them in Stripe first, or set this medicine inactive instead.`,
      );
    }
    if (impact.shopOrderRefs > 0) {
      throw new Error(
        `This medicine appears on ${impact.shopOrderRefs} shop order${impact.shopOrderRefs === 1 ? "" : "s"} and cannot be deleted without destroying that order history. Set it inactive instead.`,
      );
    }

    const [{ data: medicine }, { data: packages }, { data: variants }] = await Promise.all([
      supabaseAdmin.from("medicines").select("stripe_product_id").eq("id", data.medicineId).maybeSingle(),
      supabaseAdmin.from("packages").select("stripe_price_id").eq("medicine_id", data.medicineId),
      supabaseAdmin.from("medicine_variants").select("stripe_product_id").eq("medicine_id", data.medicineId),
    ]);

    const archiveResult = await archiveInStripe(
      getStripe(),
      (packages ?? []).map((p: any) => p.stripe_price_id).filter(Boolean),
      [
        ...(variants ?? []).map((v: any) => v.stripe_product_id),
        medicine?.stripe_product_id,
      ].filter(Boolean) as string[],
    );

    const { error } = await supabaseAdmin.from("medicines").delete().eq("id", data.medicineId);
    if (error) throw new Error(error.message);

    return { ok: true as const, archived: archiveResult.archived, archiveFailed: archiveResult.failed };
  });

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
