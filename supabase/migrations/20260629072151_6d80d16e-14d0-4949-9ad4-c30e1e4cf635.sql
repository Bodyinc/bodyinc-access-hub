
DO $$ BEGIN
  CREATE TYPE public.medicine_status AS ENUM ('active', 'inactive', 'draft');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE public.medicines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_description text NOT NULL,
  long_description text,
  image_url text,
  price_monthly numeric(10,2) NOT NULL DEFAULT 0,
  status public.medicine_status NOT NULL DEFAULT 'draft',
  important_info jsonb NOT NULL DEFAULT '[]'::jsonb,
  notice_text text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.medicines TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medicines TO authenticated;
GRANT ALL ON public.medicines TO service_role;

ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active medicines"
  ON public.medicines FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "Authenticated can view all medicines"
  ON public.medicines FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert medicines"
  ON public.medicines FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update medicines"
  ON public.medicines FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete medicines"
  ON public.medicines FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.sync_medicine_is_active()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.is_active := (NEW.status = 'active');
  RETURN NEW;
END; $$;

CREATE TRIGGER sync_medicine_is_active_trg
  BEFORE INSERT OR UPDATE ON public.medicines
  FOR EACH ROW EXECUTE FUNCTION public.sync_medicine_is_active();

CREATE TRIGGER update_medicines_updated_at
  BEFORE UPDATE ON public.medicines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id uuid NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  name text NOT NULL,
  duration_months int NOT NULL CHECK (duration_months >= 1),
  original_price numeric(10,2) NOT NULL DEFAULT 0,
  price numeric(10,2) NOT NULL DEFAULT 0,
  is_most_popular boolean NOT NULL DEFAULT false,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  clinical_note text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX packages_medicine_id_idx ON public.packages(medicine_id);

GRANT SELECT ON public.packages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.packages TO authenticated;
GRANT ALL ON public.packages TO service_role;

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active packages"
  ON public.packages FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "Authenticated can view all packages"
  ON public.packages FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert packages"
  ON public.packages FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update packages"
  ON public.packages FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete packages"
  ON public.packages FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.clear_other_most_popular()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_most_popular THEN
    UPDATE public.packages
      SET is_most_popular = false
      WHERE medicine_id = NEW.medicine_id
        AND id <> NEW.id
        AND is_most_popular = true;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER clear_other_most_popular_trg
  AFTER INSERT OR UPDATE OF is_most_popular, medicine_id ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.clear_other_most_popular();

CREATE TRIGGER update_packages_updated_at
  BEFORE UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed demo data
WITH m AS (
  INSERT INTO public.medicines (name, short_description, long_description, image_url, price_monthly, status, important_info, notice_text, sort_order)
  VALUES
    ('GLP-1 Compound',
     'Clinically guided GLP-1 therapy for sustainable weight management.',
     'Our GLP-1 compound is prescribed and monitored by licensed providers. Treatment includes ongoing check-ins, dose adjustments, and access to your care team throughout your journey.',
     'https://placehold.co/200x280/f5f5f5/666?text=GLP-1',
     199, 'active',
     '["Prescription required — consultation included","Weekly self-injection with provider guidance","Not suitable if pregnant or breastfeeding"]'::jsonb,
     'Individual results vary. Your provider will determine if this medication is appropriate for you.',
     0),
    ('Multi-Pathway Program',
     'Combined metabolic support tailored to your health profile.',
     'A comprehensive approach combining metabolic support medications with lifestyle coaching. Ideal for patients who need a broader treatment strategy beyond a single pathway.',
     'https://placehold.co/200x280/f5f5f5/666?text=Multi',
     249, 'active',
     '["Includes provider consultation and care plan","May combine multiple therapeutic approaches","Regular lab monitoring recommended"]'::jsonb,
     'Treatment plans are individualized. Discuss all medications with your provider.',
     1),
    ('Lean Muscle Support',
     'Preserve lean mass while supporting healthy body composition.',
     'Designed for patients focused on maintaining muscle mass during weight loss. Includes peptide support and nutrition guidance from your care team.',
     'https://placehold.co/200x280/f5f5f5/666?text=Lean',
     179, 'draft',
     '["Best paired with resistance training","Provider evaluation required before starting"]'::jsonb,
     NULL,
     2)
  RETURNING id, name
)
INSERT INTO public.packages (medicine_id, name, duration_months, original_price, price, is_most_popular, features, clinical_note, sort_order)
SELECT m.id, p.name, p.duration_months, p.original_price, p.price, p.is_most_popular, p.features, p.clinical_note, p.sort_order
FROM m
JOIN (VALUES
  ('GLP-1 Compound', 'Standard Treatment Plan', 1, 199::numeric, 167::numeric, false,
   '["Monthly medication supply","Provider check-in","Dose adjustment support"]'::jsonb,
   'Pricing includes consultation and ongoing provider access.', 0),
  ('GLP-1 Compound', '3-Month Value Plan', 3, 591::numeric, 447::numeric, true,
   '["3-month medication supply","Priority provider support","Free shipping","Quarterly lab review"]'::jsonb,
   'Best value for committed treatment. Savings applied at checkout.', 1),
  ('Multi-Pathway Program', 'Standard Treatment Plan', 1, 249::numeric, 219::numeric, false,
   '["Monthly supply","Care team access","Lifestyle coaching session"]'::jsonb,
   NULL, 0),
  ('Multi-Pathway Program', '3-Month Comprehensive Plan', 3, 747::numeric, 597::numeric, true,
   '["3-month medication supply","Bi-weekly coaching check-ins","Lab coordination"]'::jsonb,
   'Comprehensive plan for multi-pathway patients.', 1)
) AS p(med_name, name, duration_months, original_price, price, is_most_popular, features, clinical_note, sort_order)
ON p.med_name = m.name;
