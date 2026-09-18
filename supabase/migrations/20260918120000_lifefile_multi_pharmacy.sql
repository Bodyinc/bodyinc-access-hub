-- LifeFile multi-provider × multi-pharmacy routing (BodyInc requirements).
-- Pharmacies are admin-configured; credentials are per provider+pharmacy;
-- each medicine/variant points at the pharmacy that will fulfill it.

-- 1. Pharmacy catalog -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.life_file_pharmacies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  api_base_url text NOT NULL,
  vendor_id text,
  location_id text,
  api_network_id text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT life_file_pharmacies_name_key UNIQUE (name)
);

COMMENT ON TABLE public.life_file_pharmacies IS
  'LifeFile pharmacies (e.g. Striker, Optimal). API host + shared network headers live here.';

-- 2. Provider credentials per pharmacy ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.provider_life_file_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  pharmacy_id uuid NOT NULL REFERENCES public.life_file_pharmacies(id) ON DELETE CASCADE,
  api_base_url text,
  api_username text NOT NULL,
  api_password text NOT NULL,
  provider_life_file_id text,
  practice_id bigint,
  npi text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT provider_life_file_credentials_provider_pharmacy_key
    UNIQUE (provider_id, pharmacy_id)
);

COMMENT ON TABLE public.provider_life_file_credentials IS
  'Per-provider LifeFile login for a pharmacy. api_base_url overrides the pharmacy default when set.';

CREATE INDEX IF NOT EXISTS provider_life_file_credentials_provider_idx
  ON public.provider_life_file_credentials (provider_id);
CREATE INDEX IF NOT EXISTS provider_life_file_credentials_pharmacy_idx
  ON public.provider_life_file_credentials (pharmacy_id);

-- 3. Medicine → pharmacy product mappings ---------------------------------------------
-- Allows the same clinical medicine at multiple pharmacies with different Product IDs.
CREATE TABLE IF NOT EXISTS public.medicine_life_file_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id uuid NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.medicine_variants(id) ON DELETE CASCADE,
  pharmacy_id uuid NOT NULL REFERENCES public.life_file_pharmacies(id) ON DELETE RESTRICT,
  lf_product_id bigint NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT medicine_life_file_products_lf_product_id_positive
    CHECK (lf_product_id > 0)
);

-- One product ID per pharmacy for a medicine without variants.
CREATE UNIQUE INDEX IF NOT EXISTS medicine_life_file_products_med_pharmacy_uidx
  ON public.medicine_life_file_products (medicine_id, pharmacy_id)
  WHERE variant_id IS NULL;

-- One product ID per pharmacy for a specific variant.
CREATE UNIQUE INDEX IF NOT EXISTS medicine_life_file_products_variant_pharmacy_uidx
  ON public.medicine_life_file_products (variant_id, pharmacy_id)
  WHERE variant_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS medicine_life_file_products_pharmacy_product_uidx
  ON public.medicine_life_file_products (pharmacy_id, lf_product_id);

COMMENT ON TABLE public.medicine_life_file_products IS
  'Maps a medicine (or variant) to a LifeFile pharmacy + lfProductID. Routing uses this at send time.';

-- 4. Submission tracking on medication_requests ---------------------------------------
ALTER TABLE public.medication_requests
  ADD COLUMN IF NOT EXISTS life_file_status text,
  ADD COLUMN IF NOT EXISTS life_file_order_id text,
  ADD COLUMN IF NOT EXISTS life_file_error text,
  ADD COLUMN IF NOT EXISTS life_file_pharmacy_id uuid
    REFERENCES public.life_file_pharmacies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS life_file_submitted_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'medication_requests_life_file_status_check'
  ) THEN
    ALTER TABLE public.medication_requests
      ADD CONSTRAINT medication_requests_life_file_status_check
      CHECK (
        life_file_status IS NULL
        OR life_file_status IN ('submitted', 'accepted', 'failed')
      );
  END IF;
END $$;

COMMENT ON COLUMN public.medication_requests.life_file_status IS
  'LifeFile submission outcome: submitted | accepted | failed. Null means not attempted.';

-- 5. RLS (admin via service role / authenticated admin policies follow project pattern) -
ALTER TABLE public.life_file_pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_life_file_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicine_life_file_products ENABLE ROW LEVEL SECURITY;

-- Authenticated users: read active pharmacies (needed for admin forms).
DROP POLICY IF EXISTS life_file_pharmacies_select ON public.life_file_pharmacies;
CREATE POLICY life_file_pharmacies_select ON public.life_file_pharmacies
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS life_file_pharmacies_admin_write ON public.life_file_pharmacies;
CREATE POLICY life_file_pharmacies_admin_write ON public.life_file_pharmacies
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS provider_life_file_credentials_select ON public.provider_life_file_credentials;
CREATE POLICY provider_life_file_credentials_select ON public.provider_life_file_credentials
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR provider_id = auth.uid()
  );

DROP POLICY IF EXISTS provider_life_file_credentials_admin_write ON public.provider_life_file_credentials;
CREATE POLICY provider_life_file_credentials_admin_write ON public.provider_life_file_credentials
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS medicine_life_file_products_select ON public.medicine_life_file_products;
CREATE POLICY medicine_life_file_products_select ON public.medicine_life_file_products
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS medicine_life_file_products_admin_write ON public.medicine_life_file_products;
CREATE POLICY medicine_life_file_products_admin_write ON public.medicine_life_file_products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.life_file_pharmacies TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_life_file_credentials TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medicine_life_file_products TO authenticated, service_role;
