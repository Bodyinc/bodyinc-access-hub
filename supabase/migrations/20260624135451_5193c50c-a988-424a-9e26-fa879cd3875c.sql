
-- 1. Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Backfill email from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- Backfill profiles for providers missing a profile row
INSERT INTO public.profiles (id, full_name, phone, email, avatar_url)
SELECT pr.id, pr.full_name, pr.phone, pr.email, pr.avatar_url
FROM public.providers pr
LEFT JOIN public.profiles pf ON pf.id = pr.id
WHERE pf.id IS NULL;

-- Fill missing profile fields from providers for existing rows
UPDATE public.profiles pf
SET
  full_name = COALESCE(NULLIF(pf.full_name, ''), pr.full_name),
  phone = COALESCE(pf.phone, pr.phone),
  email = COALESCE(pf.email, pr.email),
  avatar_url = COALESCE(pf.avatar_url, pr.avatar_url)
FROM public.providers pr
WHERE pf.id = pr.id;

-- Enforce uniqueness/not-null on profiles.email
ALTER TABLE public.profiles ALTER COLUMN email SET NOT NULL;
DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Drop duplicated columns from providers
DROP INDEX IF EXISTS public.providers_email_idx;
DROP INDEX IF EXISTS public.providers_full_name_idx;

ALTER TABLE public.providers
  DROP CONSTRAINT IF EXISTS providers_email_key;

ALTER TABLE public.providers
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS full_name,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS avatar_url;

CREATE INDEX IF NOT EXISTS providers_specialty_idx
  ON public.providers (lower(specialty));

-- 3. Update handle_new_user trigger to also write email + avatar_url
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, dob, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    NULLIF(NEW.raw_user_meta_data->>'dob', '')::date,
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email
    WHERE public.profiles.email IS DISTINCT FROM EXCLUDED.email;
  RETURN NEW;
END;
$function$;

-- Ensure trigger exists on auth.users for new users
DO $$ BEGIN
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Sync email changes from auth.users to profiles
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles SET email = NEW.email WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_email_update ON auth.users;
CREATE TRIGGER on_auth_user_email_update
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_email();

-- 4. RLS: admins manage all profiles
DROP POLICY IF EXISTS "Admins manage all profiles" ON public.profiles;
CREATE POLICY "Admins manage all profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Provider directory view (security_invoker -> respects RLS)
DROP VIEW IF EXISTS public.provider_directory;
CREATE VIEW public.provider_directory
WITH (security_invoker = true)
AS
SELECT
  p.id,
  pr.full_name,
  pr.email,
  pr.phone,
  pr.avatar_url,
  p.specialty,
  p.credentials,
  p.is_active,
  p.created_at
FROM public.providers p
JOIN public.profiles pr ON pr.id = p.id;

GRANT SELECT ON public.provider_directory TO authenticated;
GRANT ALL ON public.provider_directory TO service_role;
