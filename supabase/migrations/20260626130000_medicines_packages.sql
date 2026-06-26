CREATE TYPE public.medicine_status AS ENUM ('active', 'inactive', 'draft');

CREATE TABLE public.medicines (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  short_description text NOT NULL,
  long_description  text,
  image_url         text,
  price_monthly     numeric(10, 2) NOT NULL DEFAULT 0,
  status            public.medicine_status NOT NULL DEFAULT 'draft',
  important_info    jsonb NOT NULL DEFAULT '[]'::jsonb,
  notice_text       text,
  sort_order        int NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.packages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id      uuid NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  name             text NOT NULL,
  duration_months  int NOT NULL CHECK (duration_months >= 1),
  original_price   numeric(10, 2) NOT NULL DEFAULT 0,
  price            numeric(10, 2) NOT NULL DEFAULT 0,
  is_most_popular  boolean NOT NULL DEFAULT false,
  features         jsonb NOT NULL DEFAULT '[]'::jsonb,
  clinical_note    text,
  sort_order       int NOT NULL DEFAULT 0,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX medicines_sort_order_idx ON public.medicines (sort_order, created_at);
CREATE INDEX medicines_status_idx ON public.medicines (status);
CREATE INDEX packages_medicine_id_idx ON public.packages (medicine_id, sort_order);
CREATE INDEX packages_is_active_idx ON public.packages (is_active);

CREATE TRIGGER update_medicines_updated_at
  BEFORE UPDATE ON public.medicines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_packages_updated_at
  BEFORE UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT ON public.medicines TO anon, authenticated;
GRANT SELECT ON public.packages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.medicines TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.packages TO authenticated;
GRANT ALL ON public.medicines TO service_role;
GRANT ALL ON public.packages TO service_role;

ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage medicines"
  ON public.medicines
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage packages"
  ON public.packages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public read active medicines"
  ON public.medicines
  FOR SELECT TO anon, authenticated
  USING (status = 'active');

CREATE POLICY "Public read active packages"
  ON public.packages
  FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1
      FROM public.medicines m
      WHERE m.id = medicine_id
        AND m.status = 'active'
    )
  );

CREATE OR REPLACE VIEW public.public_medicines AS
SELECT
  id,
  name,
  short_description,
  long_description,
  image_url,
  price_monthly,
  important_info,
  notice_text,
  sort_order
FROM public.medicines
WHERE status = 'active'
ORDER BY sort_order, created_at;

CREATE OR REPLACE VIEW public.public_medicine_packages AS
SELECT
  p.id,
  p.medicine_id,
  m.name AS medicine_name,
  p.name,
  p.duration_months,
  p.original_price,
  p.price,
  p.is_most_popular,
  p.features,
  p.clinical_note,
  p.sort_order
FROM public.packages p
JOIN public.medicines m ON m.id = p.medicine_id
WHERE p.is_active = true
  AND m.status = 'active'
ORDER BY p.medicine_id, p.sort_order, p.created_at;

GRANT SELECT ON public.public_medicines TO anon, authenticated;
GRANT SELECT ON public.public_medicine_packages TO anon, authenticated;
