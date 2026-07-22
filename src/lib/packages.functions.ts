import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertAdmin } from "@/lib/admin-guard";
import { archiveInStripe } from "@/lib/stripe-objects";


const syncInput = z.object({ packageId: z.string().uuid() });
const bulkSyncInput = z.object({ medicineId: z.string().uuid().optional() });
const archiveInput = z.object({
  priceIds: z.array(z.string()).default([]),
  productIds: z.array(z.string()).default([]),
});
const archiveMedicineInput = z.object({ medicineId: z.string().uuid() });


// Creates/updates the Stripe Product (per medicine) and recurring Price (per package),
// then stores their ids back on the rows. Stripe Prices are immutable, so a changed
// amount/interval means create-new + archive-old.
async function syncOnePackage(
  packageId: string,
  supabaseAdmin: any,
  stripe: any,
): Promise<{ ok: true; stripe_price_id: string; stripe_product_id: string }> {
  {
    const data = { packageId };

    const { data: pkg, error: pkgErr } = await supabaseAdmin
      .from("packages")
      .select("id, name, price, duration_months, stripe_price_id, medicine_id, variant_id")
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

    // Variant packages map to their own Stripe Product ("Medicine — Variant") so invoices name
    // the variant; medicine-level packages use the medicine's product.
    let productId: string;
    if (pkg.variant_id) {
      const { data: variant, error: vErr } = await supabaseAdmin
        .from("medicine_variants")
        .select("id, name, stripe_product_id")
        .eq("id", pkg.variant_id)
        .maybeSingle();
      if (vErr) throw new Error(vErr.message);
      if (!variant) throw new Error("Linked variant not found.");

      const productName = `${medicine.name} — ${variant.name}`;
      if (variant.stripe_product_id) {
        productId = variant.stripe_product_id;
        try {
          await stripe.products.update(productId, {
            name: productName,
            description: medicine.short_description || undefined,
          });
        } catch {
          // Non-fatal: keep the existing product if the name update fails.
        }
      } else {
        const product = await stripe.products.create({
          name: productName,
          description: medicine.short_description || undefined,
          metadata: { medicine_id: medicine.id, variant_id: variant.id },
        });
        productId = product.id;
        await supabaseAdmin
          .from("medicine_variants")
          .update({ stripe_product_id: productId })
          .eq("id", variant.id);
      }
    } else {
      productId = medicine.stripe_product_id ?? "";
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

    return { ok: true as const, stripe_price_id: priceId, stripe_product_id: productId };
  }
}

export const syncPackageToStripe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => syncInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getStripe } = await import("@/integrations/stripe/client.server");
    return syncOnePackage(data.packageId, supabaseAdmin, getStripe());
  });

// Backfills every package that has no Stripe price yet — scoped to one medicine, or the whole
// catalogue when no medicineId is given. Per-package failures are collected rather than thrown so
// one bad row cannot abort the rest of the run.
export const syncUnpricedPackages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => bulkSyncInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getStripe } = await import("@/integrations/stripe/client.server");
    const stripe = getStripe();

    let query = supabaseAdmin
      .from("packages")
      .select("id, name, medicines(name)")
      .is("stripe_price_id", null);
    if (data.medicineId) {
      query = query.eq("medicine_id", data.medicineId);
    }
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    let synced = 0;
    const failed: { name: string; error: string }[] = [];

    for (const row of rows ?? []) {
      const label = `${(row as any).medicines?.name ?? "?"} — ${row.name}`;
      try {
        await syncOnePackage(row.id, supabaseAdmin, stripe);
        synced++;
      } catch (e) {
        failed.push({ name: label, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return { total: (rows ?? []).length, synced, failed };
  });

// Archives Stripe objects whose backing rows were just removed (a plan or variant deleted during
// a medicine save). The caller must collect the ids BEFORE deleting, since the rows are gone by
// the time this runs.
export const archiveStripeObjects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => archiveInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { getStripe } = await import("@/integrations/stripe/client.server");
    return archiveInStripe(getStripe(), data.priceIds, data.productIds);
  });

// Archives everything a medicine owns in Stripe. Must run BEFORE the medicine row is deleted:
// packages and variants cascade-delete, taking their Stripe ids with them and orphaning the
// Stripe objects with no record left to find them by.
export const archiveMedicineStripeObjects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => archiveMedicineInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getStripe } = await import("@/integrations/stripe/client.server");

    const [{ data: medicine }, { data: packages }, { data: variants }] = await Promise.all([
      supabaseAdmin
        .from("medicines")
        .select("stripe_product_id")
        .eq("id", data.medicineId)
        .maybeSingle(),
      supabaseAdmin.from("packages").select("stripe_price_id").eq("medicine_id", data.medicineId),
      supabaseAdmin
        .from("medicine_variants")
        .select("stripe_product_id")
        .eq("medicine_id", data.medicineId),
    ]);

    const priceIds = (packages ?? []).map((p: any) => p.stripe_price_id).filter(Boolean);
    const productIds = [
      ...(variants ?? []).map((v: any) => v.stripe_product_id),
      medicine?.stripe_product_id,
    ].filter(Boolean) as string[];

    return archiveInStripe(getStripe(), priceIds, productIds);
  });
