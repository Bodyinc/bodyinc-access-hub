-- Medicine variants (e.g. dosages: 50mg / 100mg). A medicine can have variants; packages
-- then belong to a variant instead of the medicine directly. No variants = packages stay
-- medicine-level (variant_id NULL), preserving existing behaviour.

CREATE TABLE public.medicine_variants (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id      uuid NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  name             text NOT NULL,
  from_price_cents integer,
  sort_order       int NOT NULL DEFAULT 0,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX medicine_variants_medicine_id_idx ON public.medicine_variants (medicine_id, sort_order);

ALTER TABLE public.packages
  ADD COLUMN variant_id uuid REFERENCES public.medicine_variants(id) ON DELETE CASCADE;
CREATE INDEX packages_variant_id_idx ON public.packages (variant_id);

GRANT SELECT ON public.medicine_variants TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.medicine_variants TO authenticated;
GRANT ALL ON public.medicine_variants TO service_role;

ALTER TABLE public.medicine_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage variants"
  ON public.medicine_variants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public read active variants"
  ON public.medicine_variants FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.medicines m
      WHERE m.id = medicine_id AND m.status = 'active'
    )
  );

CREATE TRIGGER update_medicine_variants_updated_at
  BEFORE UPDATE ON public.medicine_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lowest per-month rate across a variant's active packages.
CREATE OR REPLACE FUNCTION public.recompute_variant_from_price(p_variant_id uuid)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.medicine_variants
  SET from_price_cents = (
    SELECT MIN(round(price / GREATEST(duration_months, 1) * 100)::int)
    FROM public.packages
    WHERE variant_id = p_variant_id AND is_active = true
  )
  WHERE id = p_variant_id;
END; $$;

-- Medicine "from" price = lowest per-month across its active packages, excluding packages
-- that belong to an inactive variant (those aren't purchasable).
CREATE OR REPLACE FUNCTION public.recompute_medicine_from_price(p_medicine_id uuid)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.medicines
  SET from_price_cents = (
    SELECT MIN(round(p.price / GREATEST(p.duration_months, 1) * 100)::int)
    FROM public.packages p
    LEFT JOIN public.medicine_variants v ON v.id = p.variant_id
    WHERE p.medicine_id = p_medicine_id
      AND p.is_active = true
      AND (p.variant_id IS NULL OR v.is_active = true)
  )
  WHERE id = p_medicine_id;
END; $$;

CREATE OR REPLACE FUNCTION public.packages_recompute_from_price()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.variant_id IS NOT NULL THEN
      PERFORM public.recompute_variant_from_price(OLD.variant_id);
    END IF;
    PERFORM public.recompute_medicine_from_price(OLD.medicine_id);
    RETURN OLD;
  END IF;
  IF NEW.variant_id IS NOT NULL THEN
    PERFORM public.recompute_variant_from_price(NEW.variant_id);
  END IF;
  PERFORM public.recompute_medicine_from_price(NEW.medicine_id);
  IF TG_OP = 'UPDATE' THEN
    IF OLD.medicine_id <> NEW.medicine_id THEN
      PERFORM public.recompute_medicine_from_price(OLD.medicine_id);
    END IF;
    IF OLD.variant_id IS DISTINCT FROM NEW.variant_id AND OLD.variant_id IS NOT NULL THEN
      PERFORM public.recompute_variant_from_price(OLD.variant_id);
    END IF;
  END IF;
  RETURN NEW;
END; $$;

-- Toggling a variant active/inactive changes which packages count toward the medicine price.
CREATE OR REPLACE FUNCTION public.variants_recompute_medicine_from_price()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_medicine_from_price(OLD.medicine_id);
    RETURN OLD;
  END IF;
  PERFORM public.recompute_medicine_from_price(NEW.medicine_id);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS variants_recompute_medicine_from_price_trg ON public.medicine_variants;
CREATE TRIGGER variants_recompute_medicine_from_price_trg
  AFTER INSERT OR DELETE OR UPDATE OF is_active, medicine_id ON public.medicine_variants
  FOR EACH ROW EXECUTE FUNCTION public.variants_recompute_medicine_from_price();

-- Cap: at most 2 packages per bucket — per variant when variant_id is set, otherwise per
-- medicine among medicine-level (variant_id NULL) packages.
CREATE OR REPLACE FUNCTION public.enforce_max_packages_per_medicine()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE cnt integer;
BEGIN
  IF NEW.variant_id IS NOT NULL THEN
    SELECT count(*) INTO cnt
    FROM public.packages
    WHERE variant_id = NEW.variant_id AND id <> NEW.id;
  ELSE
    SELECT count(*) INTO cnt
    FROM public.packages
    WHERE medicine_id = NEW.medicine_id AND variant_id IS NULL AND id <> NEW.id;
  END IF;
  IF cnt >= 2 THEN
    RAISE EXCEPTION 'A medicine or variant can have at most 2 packages'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS enforce_max_packages_per_medicine_trg ON public.packages;
CREATE TRIGGER enforce_max_packages_per_medicine_trg
  BEFORE INSERT OR UPDATE OF medicine_id, variant_id ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_max_packages_per_medicine();
