// Stripe Prices can never be deleted, only archived, and Products can only be deleted while no
// Price has ever attached — so both are deactivated rather than removed. Archiving is safe for
// existing customers: a subscription already on an archived price keeps billing; archiving only
// stops NEW subscriptions from using it.
export async function archiveInStripe(stripe: any, priceIds: string[], productIds: string[]) {
  const failed: { id: string; error: string }[] = [];
  let archived = 0;

  for (const id of new Set(priceIds.filter(Boolean))) {
    try {
      await stripe.prices.update(id, { active: false });
      archived++;
    } catch (e) {
      failed.push({ id, error: e instanceof Error ? e.message : String(e) });
    }
  }
  // Products come second: Stripe rejects deactivating a product while it still has an active
  // default price, so its prices must be archived first.
  for (const id of new Set(productIds.filter(Boolean))) {
    try {
      await stripe.products.update(id, { active: false });
      archived++;
    } catch (e) {
      failed.push({ id, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return { archived, failed };
}

// Stripe statuses that mean the customer is still on the hook — the subscription is billing now
// or will retry. Deleting a medicine never cancels these, so they must block deletion.
export const BILLING_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due", "unpaid"];
