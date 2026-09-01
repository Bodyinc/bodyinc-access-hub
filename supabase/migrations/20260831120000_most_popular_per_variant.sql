-- Scope "most popular" to one package per variant (or one among medicine-level packages).
CREATE OR REPLACE FUNCTION public.clear_other_most_popular() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO public
    AS $$
BEGIN
  IF NEW.is_most_popular THEN
    UPDATE public.packages
      SET is_most_popular = false
      WHERE medicine_id = NEW.medicine_id
        AND id <> NEW.id
        AND is_most_popular = true
        AND (
          (NEW.variant_id IS NULL AND variant_id IS NULL)
          OR (NEW.variant_id IS NOT NULL AND variant_id = NEW.variant_id)
        );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clear_other_most_popular_trg ON public.packages;

CREATE TRIGGER clear_other_most_popular_trg
  AFTER INSERT OR UPDATE OF is_most_popular, medicine_id, variant_id
  ON public.packages
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_other_most_popular();
