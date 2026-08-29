// Shared Stripe subscription reschedule used by both admin "change medicine" and the
// provider/admin request change-medicine flow.
//
// When the plan (or medicine) changes, the new package is applied immediately and the
// current billing/refill period end is recalculated from the current period start + the
// new package duration (e.g. 1-month → 3-month moves next bill from +1mo to +3mo).
// Money for the current cycle is handled separately (additional payment / customer credit).

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

/** Add calendar months to a unix timestamp (seconds). */
export function addMonthsUnix(unixSeconds: number, months: number): number {
  const d = new Date(unixSeconds * 1000);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  // Clamp overflow (e.g. Jan 31 + 1 month → Mar 3) back to last day of target month.
  if (d.getUTCDate() < day) d.setUTCDate(0);
  return Math.floor(d.getTime() / 1000);
}

export function periodEndFromDuration(params: {
  periodStartUnix: number;
  durationMonths: number;
  nowUnix?: number;
}): number {
  const { periodStartUnix, durationMonths, nowUnix = Math.floor(Date.now() / 1000) } = params;
  const months = Math.max(1, Number(durationMonths) || 1);
  const fromStart = addMonthsUnix(periodStartUnix, months);
  // If shortening would put the end in the past, start a fresh period from now.
  return fromStart > nowUnix ? fromStart : addMonthsUnix(nowUnix, months);
}

async function resolveShippingPriceId(params: {
  stripe: any;
  shippingItem: any | undefined;
  newIntervalCount: number;
}): Promise<string | null> {
  const { stripe, shippingItem, newIntervalCount } = params;
  if (!shippingItem) return null;

  const shipPrice: any = shippingItem.price;
  const currency: string = shipPrice.currency ?? "usd";
  const amountCents: number = shipPrice.unit_amount ?? 0;
  const sameInterval =
    shipPrice.recurring?.interval === "month" &&
    (shipPrice.recurring?.interval_count ?? 1) === newIntervalCount;
  if (sameInterval) return shipPrice.id as string;

  const lookupKey = `bi_shipping_${currency}_month_${newIntervalCount}_${amountCents}`;
  const existing = await stripe.prices.list({
    lookup_keys: [lookupKey],
    active: true,
    limit: 1,
  });
  if (existing.data[0]?.id) return existing.data[0].id as string;

  const created = await stripe.prices.create({
    currency,
    unit_amount: amountCents,
    recurring: { interval: "month", interval_count: newIntervalCount },
    lookup_key: lookupKey,
    product_data: { name: "Shipping" },
    metadata: { kind: "shipping" },
  });
  return created.id as string;
}

export async function applyPackageChangeToSubscription(params: {
  stripe: any;
  supabaseAdmin: any;
  sub: { id: string; stripe_subscription_id: string };
  pkg: ReschedulePackage;
}): Promise<{ description: string; currentPeriodEnd: string }> {
  const { stripe, supabaseAdmin, sub, pkg } = params;

  const medicineName = pkg.medicines?.name ?? "Treatment";
  const variantName = pkg.medicine_variants?.name ?? null;
  const planLabel =
    pkg.duration_months === 1 ? "Monthly Plan" : `${pkg.duration_months}-Month Plan`;
  const description = `${medicineName}${variantName ? ` — ${variantName}` : ""} · ${planLabel}`;
  const newIntervalCount = Math.max(1, Number(pkg.duration_months) || 1);

  const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
  const items = stripeSub.items.data as any[];
  const shippingItem = items.find((it: any) => isShippingItemPrice(it.price));
  const planItem = items.find((it: any) => !isShippingItemPrice(it.price));
  if (!planItem) throw new Error("Could not find the plan item on this subscription.");

  const periodStartUnix: number | undefined =
    (stripeSub as any).current_period_start ?? (planItem as any)?.current_period_start;
  if (!periodStartUnix) throw new Error("Could not determine the current billing period start.");

  const newPeriodEndUnix = periodEndFromDuration({
    periodStartUnix,
    durationMonths: newIntervalCount,
  });

  const shippingPriceId = await resolveShippingPriceId({
    stripe,
    shippingItem,
    newIntervalCount,
  });

  const newMeta: Record<string, string> = {
    ...(stripeSub.metadata ?? {}),
    medicine_id: pkg.medicine_id,
    package_id: pkg.id,
    variant_id: pkg.variant_id ?? "",
    variant_name: variantName ?? "",
  };

  // Drop any deferred schedule so we can apply the new plan + period immediately.
  const existingSchedule = (stripeSub as any).schedule;
  if (existingSchedule) {
    const sid = typeof existingSchedule === "string" ? existingSchedule : existingSchedule.id;
    try {
      await stripe.subscriptionSchedules.release(sid);
    } catch {
      // Already released / not managed — proceed.
    }
  }

  // Apply the new plan immediately. A schedule with a single phase ending at the duration-based
  // period end keeps Stripe's next invoice aligned with the new refill date (without charging
  // again — proration is none; price deltas are handled via additional payment / credit).
  const schedule = await stripe.subscriptionSchedules.create({
    from_subscription: sub.stripe_subscription_id,
  });
  const currentPhase: any = schedule.phases[0];

  const phaseItems: Array<{ price: string; quantity: number }> = [
    { price: pkg.stripe_price_id, quantity: 1 },
  ];
  if (shippingPriceId) {
    phaseItems.push({ price: shippingPriceId, quantity: 1 });
  }

  await stripe.subscriptionSchedules.update(schedule.id, {
    end_behavior: "release",
    phases: [
      {
        items: phaseItems,
        start_date: currentPhase.start_date ?? periodStartUnix,
        end_date: newPeriodEndUnix,
        proration_behavior: "none",
        metadata: newMeta,
      },
    ],
  });

  await stripe.subscriptions.update(sub.stripe_subscription_id, {
    description,
    metadata: newMeta,
  });

  const currentPeriodEnd = new Date(newPeriodEndUnix * 1000).toISOString();
  const { error: updErr } = await supabaseAdmin
    .from("subscriptions")
    .update({
      medicine_id: pkg.medicine_id,
      package_id: pkg.id,
      stripe_price_id: pkg.stripe_price_id,
      current_period_end: currentPeriodEnd,
    })
    .eq("id", sub.id);
  if (updErr) throw new Error(updErr.message);

  return { description, currentPeriodEnd };
}
