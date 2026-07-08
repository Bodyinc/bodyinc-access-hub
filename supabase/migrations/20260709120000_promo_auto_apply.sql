-- Admin-managed promo codes: add an auto-apply flag (the first-time / welcome discount that
-- applies automatically at onboarding, without the patient entering a code). Seed the current
-- WELCOME20 ($22) so the existing first-time discount is now editable in the admin.
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS auto_apply boolean NOT NULL DEFAULT false;

INSERT INTO public.promo_codes (code, discount_type, amount_off_cents, currency, duration, is_active, auto_apply)
VALUES ('WELCOME20', 'amount', 2200, 'usd', 'once', true, true)
ON CONFLICT (code) DO NOTHING;
