-- Active medicines stay in the shop. shop_only hides them from onboarding
-- (new signups) while existing patients can still buy them.

ALTER TABLE public.medicines
  ADD COLUMN IF NOT EXISTS shop_only boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.medicines.shop_only IS
  'When true, the medicine is listed in the patient shop and hidden from onboarding, even if status is inactive.';

CREATE OR REPLACE VIEW public.public_medicines
WITH (security_invoker = true) AS
SELECT
  id,
  name,
  short_description,
  long_description,
  image_url,
  from_price_cents,
  important_info,
  notice_text,
  sort_order,
  shop_only
FROM public.medicines
WHERE status = 'active' OR shop_only = true
ORDER BY sort_order, created_at;

-- Signup catalog. The shop keeps reading public_medicines (includes shop_only).
CREATE OR REPLACE VIEW public.onboarding_medicines
WITH (security_invoker = true) AS
SELECT
  id,
  name,
  short_description,
  long_description,
  image_url,
  from_price_cents,
  important_info,
  notice_text,
  sort_order
FROM public.medicines
WHERE status = 'active'
  AND shop_only = false
ORDER BY sort_order, created_at;

GRANT SELECT ON TABLE public.onboarding_medicines TO anon, authenticated, service_role;
