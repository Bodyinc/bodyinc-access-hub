// Server-side Stripe client. Top-level import of the SDK is only safe in
// *.server.ts modules — route files and *.functions.ts ship to the client bundle,
// so they must lazy-import this via: const { getStripe } = await import("@/integrations/stripe/client.server");
import Stripe from "stripe";

let _stripe: Stripe | undefined;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY. Add it to the admin .env to sync catalog to Stripe.");
  }
  if (!_stripe) _stripe = new Stripe(key);
  return _stripe;
}
