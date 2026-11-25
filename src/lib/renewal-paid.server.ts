// A successful subscription refill. Stripe charges the saved card on its own.
// Saving the payment lets the existing order trigger show the charge, and
// current_period_end is the refill date the portal reads.

type RenewalInvoice = {
  id?: string | null;
  billing_reason?: string | null;
  amount_paid?: number | null;
  currency?: string | null;
  customer?: unknown;
  subscription?: unknown;
  period_end?: number | null;
  hosted_invoice_url?: string | null;
  invoice_pdf?: string | null;
  payment_intent?: unknown;
  parent?: { subscription_details?: { subscription?: unknown } };
  lines?: { data?: Array<{ period?: { end?: number | null } | null }> };
};

export function renewalSubscriptionId(invoice: RenewalInvoice): string | null {
  const direct = idOf(invoice.subscription);
  if (direct) return direct;
  return idOf(invoice.parent?.subscription_details?.subscription);
}

export function renewalPeriodEndIso(invoice: RenewalInvoice): string | null {
  let end = 0;
  for (const line of invoice.lines?.data ?? []) {
    const value = line?.period?.end;
    if (typeof value === "number" && value > end) end = value;
  }
  if (!end && typeof invoice.period_end === "number") end = invoice.period_end;
  if (!end) return null;
  return new Date(end * 1000).toISOString();
}

function idOf(value: unknown): string | null {
  if (typeof value === "string" && value) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: string }).id;
    return id || null;
  }
  return null;
}

function customerIdOf(value: unknown): string | null {
  return idOf(value);
}

/** Returns true when this event is a subscription refill we saved or had already saved. */
export async function recordPaidRenewal(supabaseAdmin: any, invoice: RenewalInvoice): Promise<boolean> {
  if (invoice.billing_reason !== "subscription_cycle") return false;
  const stripeSubscriptionId = renewalSubscriptionId(invoice);
  const invoiceId = invoice.id;
  if (!stripeSubscriptionId || !invoiceId) return false;

  const { data: sub, error: subError } = await supabaseAdmin
    .from("subscriptions")
    .select("id, user_id, package_id, status")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();
  if (subError) throw new Error(subError.message);
  if (!sub?.id) return false;

  const periodEnd = renewalPeriodEndIso(invoice);
  const now = new Date().toISOString();
  const patch: Record<string, string> = { updated_at: now };
  if (periodEnd) patch.current_period_end = periodEnd;
  if (sub.status === "past_due" || sub.status === "unpaid" || sub.status === "active" || sub.status === "trialing") {
    patch.status = "active";
  }
  const { error: updateError } = await supabaseAdmin.from("subscriptions").update(patch).eq("id", sub.id);
  if (updateError) throw new Error(updateError.message);

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("payments")
    .select("id")
    .eq("stripe_invoice_id", invoiceId)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  if (!existing) {
    const amount = Number(invoice.amount_paid ?? 0);
    const { error: insertError } = await supabaseAdmin.from("payments").insert({
      user_id: sub.user_id,
      plan_id: sub.package_id,
      stripe_customer_id: customerIdOf(invoice.customer),
      stripe_payment_intent_id: idOf(invoice.payment_intent),
      stripe_subscription_id: stripeSubscriptionId,
      stripe_invoice_id: invoiceId,
      amount_cents: Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0,
      currency: invoice.currency || "usd",
      status: "succeeded",
      raw_event: {
        id: invoiceId,
        billing_reason: invoice.billing_reason,
        hosted_invoice_url: invoice.hosted_invoice_url ?? null,
        invoice_pdf: invoice.invoice_pdf ?? null,
        amount_paid: amount,
      },
    });
    if (insertError && insertError.code !== "23505") throw new Error(insertError.message);
  }

  if (periodEnd) {
    await supabaseAdmin
      .from("medication_requests")
      .update({ billing_period_end: periodEnd, updated_at: now })
      .eq("stripe_invoice_id", invoiceId);
  }

  return true;
}
