import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertAdmin } from "@/lib/admin-guard";


const syncInput = z.object({ packageId: z.string().uuid() });

// Creates/updates the Stripe Product (per medicine) and recurring Price (per package),
// then stores their ids back on the rows. Stripe Prices are immutable, so a changed
// amount/interval means create-new + archive-old.
export const syncPackageToStripe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => syncInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getStripe } = await import("@/integrations/stripe/client.server");
    const stripe = getStripe();

    const { data: pkg, error: pkgErr } = await supabaseAdmin
      .from("packages")
      .select("id, name, price, duration_months, stripe_price_id, medicine_id")
      .eq("id", data.packageId)
      .maybeSingle();
    if (pkgErr) throw new Error(pkgErr.message);
    if (!pkg) throw new Error("Package not found.");

    const { data: medicine, error: medErr } = await supabaseAdmin
      .from("medicines")
      .select("id, name, short_description, stripe_product_id")
      .eq("id", pkg.medicine_id)
      .maybeSingle();
    if (medErr) throw new Error(medErr.message);
    if (!medicine) throw new Error("Linked medicine not found.");

    let productId = medicine.stripe_product_id;
    if (!productId) {
      const product = await stripe.products.create({
        name: medicine.name,
        description: medicine.short_description || undefined,
        metadata: { medicine_id: medicine.id },
      });
      productId = product.id;
      await supabaseAdmin
        .from("medicines")
        .update({ stripe_product_id: productId })
        .eq("id", medicine.id);
    }

    const unitAmount = Math.round(Number(pkg.price) * 100);
    const intervalCount = Math.max(1, Number(pkg.duration_months) || 1);

    let priceId = pkg.stripe_price_id;
    let needsNewPrice = true;
    if (priceId) {
      try {
        const existing = await stripe.prices.retrieve(priceId);
        const sameAmount = existing.unit_amount === unitAmount;
        const sameInterval =
          existing.recurring?.interval === "month" &&
          (existing.recurring?.interval_count ?? 1) === intervalCount;
        const sameProduct = existing.product === productId;
        if (existing.active && sameAmount && sameInterval && sameProduct) {
          needsNewPrice = false;
        }
      } catch {
        needsNewPrice = true;
      }
    }

    if (needsNewPrice) {
      const price = await stripe.prices.create({
        product: productId,
        unit_amount: unitAmount,
        currency: "usd",
        recurring: { interval: "month", interval_count: intervalCount },
        metadata: { package_id: pkg.id },
      });
      if (priceId) {
        try {
          await stripe.prices.update(priceId, { active: false });
        } catch {
          // Old price may already be archived; ignore.
        }
      }
      priceId = price.id;
      await supabaseAdmin.from("packages").update({ stripe_price_id: priceId }).eq("id", pkg.id);
    }

    return { ok: true, stripe_price_id: priceId, stripe_product_id: productId };
  });
