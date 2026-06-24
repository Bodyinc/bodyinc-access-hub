
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.providers (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  phone text,
  avatar_url text,
  bio text,
  credentials text,
  specialty text,
  npi text,
  dea text,
  license_number text,
  license_states text[] NOT NULL DEFAULT '{}',
  years_experience int,
  languages text[] NOT NULL DEFAULT '{}',
  consultation_types text[] NOT NULL DEFAULT '{}',
  practice_states text[] NOT NULL DEFAULT '{}',
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip text,
  country text NOT NULL DEFAULT 'US',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.providers TO authenticated;
GRANT ALL ON public.providers TO service_role;

ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all providers" ON public.providers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Providers view own record" ON public.providers
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Providers update own record" ON public.providers
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE TRIGGER update_providers_updated_at
  BEFORE UPDATE ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX providers_full_name_idx ON public.providers (lower(full_name));
CREATE INDEX providers_email_idx ON public.providers (lower(email));
CREATE INDEX providers_is_active_idx ON public.providers (is_active);
