// Shared Stripe subscription reschedule used by both admin "change medicine" and the
// provider/admin request change-medicine flow. The new plan applies from the NEXT billing cycle
// (proration_behavior: "none"); if the new plan's billing duration differs, the recurring
// shipping item is re-intervalled to match (Stripe requires all recurring prices on a
// subscription to share an interval).

export function isShippingItemPrice(price: any): boolean {
  return (
    price?.metadata?.kind === "shipping" ||
    (typeof price?.lookup_key === "string" && price.lookup_key.startsWith("bi_shipping_"))
  );
}

export type ReschedulePackage = {
  id: string;
  medicine_id: string;
  variant_id: string | null;
  duration_months: number;
  stripe_price_id: string;
  medicines?: { name?: string } | null;
  medicine_variants?: { name?: string } | null;
};

export async function applyPackageChangeToSubscription(params: {
  stripe: any;
  supabaseAdmin: any;
  sub: { id: string; stripe_subscription_id: string };
  pkg: ReschedulePackage;
}): Promise<{ description: string }> {
  const { stripe, supabaseAdmin, sub, pkg } = params;

  const medicineName = pkg.medicines?.name ?? "Treatment";
  const variantName = pkg.medicine_variants?.name ?? null;
  const planLabel = pkg.duration_months === 1 ? "Monthly Plan" : `${pkg.duration_months}-Month Plan`;
  const description = `${medicineName}${variantName ? ` — ${variantName}` : ""} · ${planLabel}`;
  const newIntervalCount = Math.max(1, Number(pkg.duration_months) || 1);

  // Resolve the subscription's current plan + shipping items.
  const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
  const items = stripeSub.items.data;
  const shippingItem = items.find((it: any) => isShippingItemPrice(it.price));
  const currentPeriodEnd: number | undefined =
    (stripeSub as any).current_period_end ?? (items[0] as any)?.current_period_end;
  if (!currentPeriodEnd) throw new Error("Could not determine the current billing period end.");

  // Build the NEW phase's items: the new plan price + the shipping item re-intervalled to
  // match the new plan's duration. Shipping keeps its current amount.
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

  // Use a subscription schedule so the change applies from the NEXT cycle: the current phase runs
  // unchanged until the current period ends, then a new phase starts with the new plan. A plain
  // subscriptions.update would stretch the CURRENT period to the new interval.
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
        // Reset the billing cycle to the phase start so the new plan begins a FRESH period at the
        // transition (and generates the renewal invoice) — otherwise Stripe keeps the old anchor.
        billing_cycle_anchor: "phase_start",
        metadata: newMeta,
      },
    ],
  });

  // Reflect the go-forward plan in our DB now (shown as the upcoming plan; the next invoice date
  // stays at the current period end). stripe_price_id / current_period_end are left to the webhook,
  // which flips them at the phase transition.
  const { error: updErr } = await supabaseAdmin
    .from("subscriptions")
    .update({ medicine_id: pkg.medicine_id, package_id: pkg.id })
    .eq("id", sub.id);
  if (updErr) throw new Error(updErr.message);

  return { description };
}
