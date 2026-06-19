
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'provider';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'patient';

CREATE OR REPLACE FUNCTION public.get_user_portal(_user_id uuid)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_portal(uuid) TO authenticated, anon, service_role;
