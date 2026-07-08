-- Link each payment to its subscription/order so the admin can scope payments to an order
-- and rebuild the Orders view on subscriptions + payments. The unique invoice index makes
-- payment writes idempotent (Stripe fires both invoice.paid and invoice.payment_succeeded).
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS stripe_invoice_id text;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_payments_stripe_invoice
  ON public.payments(stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_stripe_subscription
  ON public.payments(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
