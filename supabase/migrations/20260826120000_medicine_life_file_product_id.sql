-- Life File pharmacy mapping lives on the medicine row, not in application code.
-- lf_product_id is required to Send to Pharmacy.

ALTER TABLE public.medicines
  ADD COLUMN IF NOT EXISTS lf_product_id bigint;

COMMENT ON COLUMN public.medicines.lf_product_id IS
  'Life File lfProductID. Null means this medicine cannot be sent to the pharmacy.';

CREATE UNIQUE INDEX IF NOT EXISTS medicines_lf_product_id_key
  ON public.medicines (lf_product_id)
  WHERE lf_product_id IS NOT NULL;

-- Backfill the five Life File test products by normalized name (longest first).
UPDATE public.medicines
SET lf_product_id = 305157968
WHERE lf_product_id IS NULL
  AND (
    trim(regexp_replace(lower(name), '[^a-z0-9]+', ' ', 'g'))
      = 'benzocaine lidocaine tetracaine susp dental'
    OR trim(regexp_replace(lower(name), '[^a-z0-9]+', ' ', 'g'))
      LIKE 'benzocaine lidocaine tetracaine susp dental %'
  );

UPDATE public.medicines
SET lf_product_id = 305492218
WHERE lf_product_id IS NULL
  AND (
    trim(regexp_replace(lower(name), '[^a-z0-9]+', ' ', 'g'))
      = 'baclofen dexamethasone flurbiprofen emulsion'
    OR trim(regexp_replace(lower(name), '[^a-z0-9]+', ' ', 'g'))
      LIKE 'baclofen dexamethasone flurbiprofen emulsion %'
  );

UPDATE public.medicines
SET lf_product_id = 305492220
WHERE lf_product_id IS NULL
  AND (
    trim(regexp_replace(lower(name), '[^a-z0-9]+', ' ', 'g')) = 'acarbose1'
    OR trim(regexp_replace(lower(name), '[^a-z0-9]+', ' ', 'g')) LIKE 'acarbose1 %'
  );

UPDATE public.medicines
SET lf_product_id = 305492221
WHERE lf_product_id IS NULL
  AND (
    trim(regexp_replace(lower(name), '[^a-z0-9]+', ' ', 'g')) = 'acetaminophen'
    OR trim(regexp_replace(lower(name), '[^a-z0-9]+', ' ', 'g')) LIKE 'acetaminophen %'
  );

UPDATE public.medicines
SET lf_product_id = 305492222
WHERE lf_product_id IS NULL
  AND (
    trim(regexp_replace(lower(name), '[^a-z0-9]+', ' ', 'g')) = 'acyclovir'
    OR trim(regexp_replace(lower(name), '[^a-z0-9]+', ' ', 'g')) LIKE 'acyclovir %'
  );
