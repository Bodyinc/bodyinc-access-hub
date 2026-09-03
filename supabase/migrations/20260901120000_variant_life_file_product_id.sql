-- Life File product IDs map to pharmacy SKUs (strength/form), so they live on variants.
-- medicines.lf_product_id remains for medicines sold without variants.

ALTER TABLE public.medicine_variants
  ADD COLUMN IF NOT EXISTS lf_product_id bigint;

COMMENT ON COLUMN public.medicine_variants.lf_product_id IS
  'Life File lfProductID for this strength/SKU. Required to send variant orders to pharmacy.';

CREATE UNIQUE INDEX IF NOT EXISTS medicine_variants_lf_product_id_key
  ON public.medicine_variants (lf_product_id)
  WHERE lf_product_id IS NOT NULL;

COMMENT ON COLUMN public.medicines.lf_product_id IS
  'Life File lfProductID for medicines without variants. When variants exist, set lf_product_id on each variant instead.';

-- Only copy when a medicine has a single variant — multiple variants need distinct IDs from MPS.
UPDATE public.medicine_variants v
SET lf_product_id = m.lf_product_id
FROM public.medicines m
WHERE m.id = v.medicine_id
  AND v.lf_product_id IS NULL
  AND m.lf_product_id IS NOT NULL
  AND (
    SELECT count(*)::int
    FROM public.medicine_variants mv
    WHERE mv.medicine_id = m.id
  ) = 1;
