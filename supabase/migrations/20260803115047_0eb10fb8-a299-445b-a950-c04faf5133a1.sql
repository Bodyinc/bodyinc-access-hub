ALTER VIEW public.public_medicines SET (security_invoker = true);

REVOKE ALL ON FUNCTION public.create_medication_order_on_payment() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.notify_provider_on_request_change() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.sync_profile_email() FROM anon, authenticated, PUBLIC;

REVOKE ALL ON FUNCTION public.increment_promo_redemption(uuid) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_promo_redemption(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.has_password() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_password() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_user_portal(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_portal(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_my_role() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_user_role(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "session insert" ON public.intake_sessions;
CREATE POLICY "session insert" ON public.intake_sessions
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (claimed_by_user_id IS NULL OR claimed_by_user_id = auth.uid())
    AND (expires_at IS NULL OR expires_at > now())
  );

DROP POLICY IF EXISTS "isc insert" ON public.intake_session_categories;
CREATE POLICY "isc insert" ON public.intake_session_categories
  FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.intake_sessions s
    WHERE s.id = session_id
      AND (s.expires_at IS NULL OR s.expires_at > now())
      AND (s.claimed_by_user_id IS NULL OR s.claimed_by_user_id = auth.uid())
  ));

DROP POLICY IF EXISTS "ism insert" ON public.intake_session_medicines;
CREATE POLICY "ism insert" ON public.intake_session_medicines
  FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.intake_sessions s
    WHERE s.id = session_id
      AND (s.expires_at IS NULL OR s.expires_at > now())
      AND (s.claimed_by_user_id IS NULL OR s.claimed_by_user_id = auth.uid())
  ));

DROP POLICY IF EXISTS "iser insert" ON public.intake_session_eligibility_results;
CREATE POLICY "iser insert" ON public.intake_session_eligibility_results
  FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.intake_sessions s
    WHERE s.id = session_id
      AND (s.expires_at IS NULL OR s.expires_at > now())
      AND (s.claimed_by_user_id IS NULL OR s.claimed_by_user_id = auth.uid())
  ));

DROP POLICY IF EXISTS "isqr insert" ON public.intake_session_questionnaire_responses;
CREATE POLICY "isqr insert" ON public.intake_session_questionnaire_responses
  FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.intake_sessions s
    WHERE s.id = session_id
      AND (s.expires_at IS NULL OR s.expires_at > now())
      AND (s.claimed_by_user_id IS NULL OR s.claimed_by_user_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Anyone can view medicine images" ON storage.objects;
CREATE POLICY "Admins can list medicine images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'medicine-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));