-- Stripe recurring-subscription support. Reuses existing payments + stripe_events
-- tables (created in 20260701074852). Adds subscriptions, promo_codes, and the
-- Stripe id columns needed to map catalog + customers to Stripe objects.

-- ============ Catalog + customer Stripe id columns ============
ALTER TABLE public.medicines      ADD COLUMN IF NOT EXISTS stripe_product_id      text;
ALTER TABLE public.packages       ADD COLUMN IF NOT EXISTS stripe_price_id        text;
ALTER TABLE public.profiles       ADD COLUMN IF NOT EXISTS stripe_customer_id     text;
ALTER TABLE public.intake_sessions ADD COLUMN IF NOT EXISTS stripe_customer_id     text;
ALTER TABLE public.intake_sessions ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

ALTER TABLE public.shop_checkout_orders ADD COLUMN IF NOT EXISTS stripe_subscription_id   text;
ALTER TABLE public.shop_checkout_orders ADD COLUMN IF NOT EXISTS stripe_invoice_id        text;
ALTER TABLE public.shop_checkout_orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON public.profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shop_orders_stripe_subscription ON public.shop_checkout_orders(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- ============ SUBSCRIPTIONS ============
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.intake_sessions(id) ON DELETE SET NULL,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_customer_id text,
  stripe_price_id text,
  package_id uuid REFERENCES public.packages(id) ON DELETE SET NULL,
  medicine_id uuid REFERENCES public.medicines(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'incomplete',
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscriptions admin or owner read" ON public.subscriptions;
CREATE POLICY "subscriptions admin or owner read" ON public.subscriptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR user_id = auth.uid());
DROP TRIGGER IF EXISTS trg_subscriptions_updated ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_session ON public.subscriptions(session_id);

-- ============ PROMO CODES ============
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  stripe_coupon_id text,
  stripe_promotion_code_id text UNIQUE,
  discount_type text NOT NULL CHECK (discount_type IN ('percent','amount')),
  percent_off numeric(5,2),
  amount_off_cents integer,
  currency text NOT NULL DEFAULT 'usd',
  duration text NOT NULL DEFAULT 'once' CHECK (duration IN ('once','repeating','forever')),
  duration_in_months integer,
  max_redemptions integer,
  redeem_by timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  times_redeemed integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT promo_discount_value CHECK (
    (discount_type = 'percent' AND percent_off IS NOT NULL) OR
    (discount_type = 'amount'  AND amount_off_cents IS NOT NULL)
  )
);
GRANT ALL ON public.promo_codes TO service_role;
GRANT SELECT ON public.promo_codes TO authenticated;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "promo codes admin read" ON public.promo_codes;
CREATE POLICY "promo codes admin read" ON public.promo_codes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "promo codes admin write" ON public.promo_codes;
CREATE POLICY "promo codes admin write" ON public.promo_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS trg_promo_codes_updated ON public.promo_codes;
CREATE TRIGGER trg_promo_codes_updated BEFORE UPDATE ON public.promo_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON public.promo_codes(is_active) WHERE is_active = true;
