-- Each variant gets its own Stripe Product (named "Medicine — Variant") so invoice lines and
-- receipts name the variant. Medicine-level packages keep using the medicine's product.
ALTER TABLE public.medicine_variants ADD COLUMN IF NOT EXISTS stripe_product_id text;
