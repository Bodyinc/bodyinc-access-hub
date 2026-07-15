CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.platform_settings (key, value) VALUES
  ('consultation_fee_cents', '0'::jsonb),
  ('consultation_fee_enabled', 'false'::jsonb),
  ('shipping_fee_cents', '0'::jsonb),
  ('shipping_fee_enabled', 'false'::jsonb),
  ('referral_reward_cents', '5000'::jsonb),
  ('referral_enabled', 'true'::jsonb),
  ('maintenance_mode', 'false'::jsonb),
  ('new_signups_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.admin_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created ON public.admin_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_entity ON public.admin_activity_log(entity, created_at DESC);

ALTER TABLE public.shop_checkout_orders
  ADD COLUMN IF NOT EXISTS consultation numeric NOT NULL DEFAULT 0;
