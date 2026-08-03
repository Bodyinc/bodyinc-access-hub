REVOKE ALL ON FUNCTION public.get_my_role() FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO service_role;

REVOKE ALL ON FUNCTION public.get_user_role(uuid) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.has_password() FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_password() TO service_role;