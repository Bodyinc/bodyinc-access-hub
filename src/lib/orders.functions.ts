import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertAdmin } from "@/lib/admin-guard";


// A subscription is the canonical record of every purchase (onboarding + shop). "active" is
// shown as "paid"; incomplete subscriptions are unconfirmed and hidden from the default view.
function displayStatus(subStatus: string): string {
  return subStatus === "active" ? "paid" : subStatus;
}

const listInput = z
  .object({
    search: z.string().trim().max(200).optional(),
    status: z.string().trim().max(40).optional(),
  })
  .default({});

export const listOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("subscriptions")
      .select(
        "id, user_id, session_id, stripe_subscription_id, package_id, medicine_id, status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (data.status && data.status !== "all") {
      q = q.eq("status", data.status === "paid" ? "active" : data.status);
    } else {
      // Confirmed only — hide never-completed (abandoned) checkouts.
      q = q.not("status", "in", "(incomplete,incomplete_expired)");
    }

    const { data: subs, error } = await q;
    if (error) throw new Error(error.message);
    const rows = subs ?? [];

    const userIds = Array.from(new Set(rows.map((r: any) => r.user_id).filter(Boolean)));
    const pkgIds = Array.from(new Set(rows.map((r: any) => r.package_id).filter(Boolean)));
    const medIds = Array.from(new Set(rows.map((r: any) => r.medicine_id).filter(Boolean)));
    const subIds = rows.map((r: any) => r.stripe_subscription_id).filter(Boolean);
    // Guest onboarding orders (no account yet) carry the customer only on their intake session.
    const sessionIds = Array.from(
      new Set(rows.filter((r: any) => !r.user_id).map((r: any) => r.session_id).filter(Boolean)),
    );

    const [{ data: profiles }, { data: pkgs }, { data: meds }, { data: payments }, { data: sessions }] =
      await Promise.all([
        userIds.length
          ? supabaseAdmin.from("profiles").select("id, full_name, email").in("id", userIds)
          : Promise.resolve({ data: [] as any[] }),
        pkgIds.length
          ? supabaseAdmin.from("packages").select("id, name").in("id", pkgIds)
          : Promise.resolve({ data: [] as any[] }),
        medIds.length
          ? supabaseAdmin.from("medicines").select("id, name").in("id", medIds)
          : Promise.resolve({ data: [] as any[] }),
        subIds.length
          ? supabaseAdmin
              .from("payments")
              .select("stripe_subscription_id, amount_cents, status, created_at")
              .in("stripe_subscription_id", subIds)
              .order("created_at", { ascending: true })
          : Promise.resolve({ data: [] as any[] }),
        sessionIds.length
          ? supabaseAdmin
              .from("intake_sessions")
              .select("id, full_name, email")
              .in("id", sessionIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

    const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const pkgMap = new Map((pkgs ?? []).map((p: any) => [p.id, p]));
    const medMap = new Map((meds ?? []).map((m: any) => [m.id, m]));
    const sessMap = new Map((sessions ?? []).map((s: any) => [s.id, s]));
    const payMap = new Map<string, any>();
    for (const pay of payments ?? []) {
      // first payment per subscription = the initial charge (list amount)
      if (!payMap.has(pay.stripe_subscription_id)) payMap.set(pay.stripe_subscription_id, pay);
    }

    let result = rows.map((r: any) => {
      const p = pMap.get(r.user_id) as any;
      const sess = !p ? (sessMap.get(r.session_id) as any) : null;
      const pay = payMap.get(r.stripe_subscription_id);
      const medName = (medMap.get(r.medicine_id) as any)?.name;
      const pkgName = (pkgMap.get(r.package_id) as any)?.name;
      return {
        id: r.id,
        customer_name: p?.full_name ?? sess?.full_name ?? null,
        customer_email: p?.email ?? sess?.email ?? null,
        is_guest: !p && !!sess,
        item_name: [medName, pkgName].filter(Boolean).join(" — ") || "—",
        item_count: 1,
        amount: pay ? Number(pay.amount_cents) / 100 : null,
        status: displayStatus(r.status),
        created_at: r.created_at,
      };
    });

    if (data.search) {
      const s = data.search.toLowerCase();
      result = result.filter(
        (r: any) =>
          (r.customer_name ?? "").toLowerCase().includes(s) ||
          (r.customer_email ?? "").toLowerCase().includes(s) ||
          r.id.toLowerCase().includes(s),
      );
    }
    return result;
  });

export const getOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: sub, error } = await supabaseAdmin
      .from("subscriptions")
      .select(
        "id, user_id, session_id, stripe_subscription_id, stripe_customer_id, package_id, medicine_id, status, current_period_end, cancel_at_period_end, created_at",
      )
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!sub) throw new Error("Order not found");

    // Onboarding subscriptions are created as a guest — the account (and its profile) only exist
    // after the post-checkout OTP step, so user_id stays null until then. The customer's details
    // were captured on the intake_session at checkout, so fall back to it when there is no profile.
    const [{ data: profile }, { data: intake }, { data: payments }] = await Promise.all([
      sub.user_id
        ? supabaseAdmin
            .from("profiles")
            .select(
              "id, full_name, email, phone, street_address, city, state_code, postal_code, country",
            )
            .eq("id", sub.user_id)
            .maybeSingle()
        : Promise.resolve({ data: null as any }),
      sub.session_id
        ? supabaseAdmin
            .from("intake_sessions")
            .select("full_name, email, phone, state_code, selected_plan_id")
            .eq("id", sub.session_id)
            .maybeSingle()
        : Promise.resolve({ data: null as any }),
      supabaseAdmin
        .from("payments")
        .select("*")
        .eq("stripe_subscription_id", sub.stripe_subscription_id)
        .order("created_at", { ascending: false }),
    ]);

    // The subscription's own package/medicine ids can be null on bare rows; the intake session's
    // selected plan is the fallback for what the patient actually chose.
    const effectivePackageId = sub.package_id ?? (intake as any)?.selected_plan_id ?? null;

    const { data: pkg } = effectivePackageId
      ? await supabaseAdmin
          .from("packages")
          .select("name, price, duration_months, medicine_id, medicine_variants(name)")
          .eq("id", effectivePackageId)
          .maybeSingle()
      : { data: null as any };

    const effectiveMedicineId = sub.medicine_id ?? (pkg as any)?.medicine_id ?? null;
    const { data: med } = effectiveMedicineId
      ? await supabaseAdmin.from("medicines").select("name").eq("id", effectiveMedicineId).maybeSingle()
      : { data: null as any };

    const customer = profile
      ? { ...profile, is_guest: false }
      : intake
        ? {
            full_name: (intake as any).full_name ?? null,
            email: (intake as any).email ?? null,
            phone: (intake as any).phone ?? null,
            state_code: (intake as any).state_code ?? null,
            street_address: null,
            city: null,
            postal_code: null,
            country: null,
            is_guest: true,
          }
        : null;

    return {
      subscription: sub,
      package: pkg ?? null,
      variant_name: (pkg as any)?.medicine_variants?.name ?? null,
      medicine: med ?? null,
      customer,
      payments: payments ?? [],
      display_status: displayStatus(sub.status),
    };
  });

const CHANGEABLE_STATUSES = ["active", "trialing", "past_due"];

function isShippingItemPrice(price: any): boolean {
  return (
    price?.metadata?.kind === "shipping" ||
    (typeof price?.lookup_key === "string" && price.lookup_key.startsWith("bi_shipping_"))
  );
}

// Admin-only: change the medicine/variant/plan of a patient's live subscription. The new price
// applies from the NEXT billing cycle (proration_behavior: "none"); if the new plan's billing
// duration differs, the recurring shipping item is re-intervalled to match (Stripe requires all
// recurring prices on a subscription to share an interval).
export const changeSubscriptionMedicine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ orderId: z.string().uuid(), packageId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getStripe } = await import("@/integrations/stripe/client.server");
    const stripe = getStripe();

    const { data: sub, error: subErr } = await supabaseAdmin
      .from("subscriptions")
      .select("id, stripe_subscription_id, medicine_id, package_id, stripe_price_id, status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (subErr) throw new Error(subErr.message);
    if (!sub) throw new Error("Subscription not found.");
    if (!sub.stripe_subscription_id) throw new Error("This subscription has no Stripe record.");
    if (!CHANGEABLE_STATUSES.includes(sub.status)) {
      throw new Error(`Cannot change a ${sub.status} subscription.`);
    }

    const { data: pkg, error: pkgErr } = await supabaseAdmin
      .from("packages")
      .select(
        "id, medicine_id, variant_id, duration_months, price, stripe_price_id, is_active, medicines(name), medicine_variants(name)",
      )
      .eq("id", data.packageId)
      .maybeSingle();
    if (pkgErr) throw new Error(pkgErr.message);
    if (!pkg) throw new Error("Selected plan not found.");
    if (!pkg.is_active) throw new Error("Selected plan is inactive.");
    if (!pkg.stripe_price_id) {
      throw new Error("This plan isn't synced to Stripe yet. Open the medicine and save it, then retry.");
    }

    const medicineName = (pkg as any).medicines?.name ?? "Treatment";
    const variantName = (pkg as any).medicine_variants?.name ?? null;
    const planLabel =
      pkg.duration_months === 1 ? "Monthly Plan" : `${pkg.duration_months}-Month Plan`;
    const description = `${medicineName}${variantName ? ` — ${variantName}` : ""} · ${planLabel}`;
    const newIntervalCount = Math.max(1, Number(pkg.duration_months) || 1);

    // Resolve the subscription's current plan + shipping items.
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    const items = stripeSub.items.data;
    const shippingItem = items.find((it) => isShippingItemPrice(it.price));
    const currentPeriodEnd: number | undefined =
      (stripeSub as any).current_period_end ?? (items[0] as any)?.current_period_end;
    if (!currentPeriodEnd) throw new Error("Could not determine the current billing period end.");

    // Build the NEW phase's items: the new plan price + the shipping item re-intervalled to
    // match the new plan's duration (Stripe requires all recurring prices on a subscription to
    // share an interval). Shipping keeps its current amount.
    const newItems: Array<{ price: string; quantity: number }> = [
      { price: pkg.stripe_price_id, quantity: 1 },
    ];
    if (shippingItem) {
      const shipPrice: any = shippingItem.price;
      const currency: string = shipPrice.currency ?? "usd";
      const amountCents: number = shipPrice.unit_amount ?? 0;
      const sameInterval =
        shipPrice.recurring?.interval === "month" &&
        (shipPrice.recurring?.interval_count ?? 1) === newIntervalCount;
      let shippingPriceId: string = shipPrice.id;
      if (!sameInterval) {
        const lookupKey = `bi_shipping_${currency}_month_${newIntervalCount}_${amountCents}`;
        const existing = await stripe.prices.list({
          lookup_keys: [lookupKey],
          active: true,
          limit: 1,
        });
        shippingPriceId =
          existing.data[0]?.id ??
          (
            await stripe.prices.create({
              currency,
              unit_amount: amountCents,
              recurring: { interval: "month", interval_count: newIntervalCount },
              lookup_key: lookupKey,
              product_data: { name: "Shipping" },
              metadata: { kind: "shipping" },
            })
          ).id;
      }
      newItems.push({ price: shippingPriceId, quantity: 1 });
    }

    // Use a subscription schedule so the change applies from the NEXT cycle: the current phase
    // runs unchanged until the current period ends, then a new phase starts with the new plan.
    // A plain subscriptions.update would stretch the CURRENT period to the new interval.
    const existingSchedule = (stripeSub as any).schedule;
    if (existingSchedule) {
      const sid = typeof existingSchedule === "string" ? existingSchedule : existingSchedule.id;
      try {
        await stripe.subscriptionSchedules.release(sid);
      } catch {
        // Already released / not managed — proceed to create a fresh one.
      }
    }

    const schedule = await stripe.subscriptionSchedules.create({
      from_subscription: sub.stripe_subscription_id,
    });
    const currentPhase: any = schedule.phases[0];
    const currentPhaseItems = (currentPhase.items ?? []).map((i: any) => ({
      price: typeof i.price === "string" ? i.price : i.price?.id,
      quantity: i.quantity ?? 1,
    }));
    const newMeta: Record<string, string> = {
      ...(stripeSub.metadata ?? {}),
      medicine_id: pkg.medicine_id,
      package_id: pkg.id,
      variant_id: pkg.variant_id ?? "",
      variant_name: variantName ?? "",
    };

    await stripe.subscriptionSchedules.update(schedule.id, {
      end_behavior: "release",
      phases: [
        {
          items: currentPhaseItems,
          start_date: currentPhase.start_date,
          end_date: currentPeriodEnd,
          proration_behavior: "none",
        },
        {
          items: newItems,
          proration_behavior: "none",
          // Reset the billing cycle to the phase start so the new plan begins a FRESH period
          // (and generates the renewal invoice) at the transition — otherwise Stripe keeps the
          // old anchor and the new interval spans from the old cycle start (e.g. Jul→Oct, no
          // charge at the boundary).
          billing_cycle_anchor: "phase_start",
          metadata: newMeta,
        },
      ],
    });

    // Reflect the go-forward plan in our DB now (shown as the upcoming plan; the next invoice
    // date stays at the current period end). stripe_price_id / current_period_end are left to
    // the webhook, which flips them at the phase transition.
    const { error: updErr } = await supabaseAdmin
      .from("subscriptions")
      .update({ medicine_id: pkg.medicine_id, package_id: pkg.id })
      .eq("id", sub.id);
    if (updErr) throw new Error(updErr.message);

    await supabaseAdmin.from("admin_activity_log").insert({
      admin_user_id: context.userId,
      action: "subscription.change_medicine",
      entity: "subscriptions",
      entity_id: sub.id,
      before: { medicine_id: sub.medicine_id, package_id: sub.package_id },
      after: { medicine_id: pkg.medicine_id, package_id: pkg.id },
    } as any);

    return { ok: true, description };
  });
