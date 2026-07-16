-- Packages restructure:
--   * medicines.price_monthly is removed; the displayed price is now derived from packages.
--   * from_price_cents caches the lowest effective per-month price across a medicine's
--     active packages (price / duration_months), so the shop can sort/paginate in one query.
--   * a medicine is capped at 2 packages.

ALTER TABLE public.medicines ADD COLUMN IF NOT EXISTS from_price_cents integer;
CREATE INDEX IF NOT EXISTS medicines_from_price_idx ON public.medicines (from_price_cents);

-- Lowest per-month rate (in cents) over active packages; NULL when the medicine has none.
CREATE OR REPLACE FUNCTION public.recompute_medicine_from_price(p_medicine_id uuid)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.medicines
  SET from_price_cents = (
    SELECT MIN(round(price / GREATEST(duration_months, 1) * 100)::int)
    FROM public.packages
    WHERE medicine_id = p_medicine_id AND is_active = true
  )
  WHERE id = p_medicine_id;
END; $$;

CREATE OR REPLACE FUNCTION public.packages_recompute_from_price()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_medicine_from_price(OLD.medicine_id);
    RETURN OLD;
  END IF;
  PERFORM public.recompute_medicine_from_price(NEW.medicine_id);
  IF TG_OP = 'UPDATE' AND OLD.medicine_id <> NEW.medicine_id THEN
    PERFORM public.recompute_medicine_from_price(OLD.medicine_id);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS packages_recompute_from_price_trg ON public.packages;
CREATE TRIGGER packages_recompute_from_price_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.packages_recompute_from_price();

-- Cap: at most 2 packages per medicine (UI enforces too; this is the backstop).
CREATE OR REPLACE FUNCTION public.enforce_max_packages_per_medicine()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  cnt integer;
BEGIN
  SELECT count(*) INTO cnt
  FROM public.packages
  WHERE medicine_id = NEW.medicine_id
    AND id <> NEW.id;
  IF cnt >= 2 THEN
    RAISE EXCEPTION 'A medicine can have at most 2 packages'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS enforce_max_packages_per_medicine_trg ON public.packages;
CREATE TRIGGER enforce_max_packages_per_medicine_trg
  BEFORE INSERT OR UPDATE OF medicine_id ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_max_packages_per_medicine();

-- Backfill for existing rows.
UPDATE public.medicines m
SET from_price_cents = (
  SELECT MIN(round(p.price / GREATEST(p.duration_months, 1) * 100)::int)
  FROM public.packages p
  WHERE p.medicine_id = m.id AND p.is_active = true
);

-- Drop price_monthly. The public view depends on it, so recreate the view first.
DROP VIEW IF EXISTS public.public_medicines;
ALTER TABLE public.medicines DROP COLUMN IF EXISTS price_monthly;

CREATE OR REPLACE VIEW public.public_medicines AS
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
ORDER BY sort_order, created_at;

GRANT SELECT ON public.public_medicines TO anon, authenticated;
