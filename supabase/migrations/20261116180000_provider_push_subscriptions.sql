-- Provider-portal Web Push subscriptions (separate from patient push_subscriptions).

CREATE TABLE IF NOT EXISTS public.provider_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS provider_push_subscriptions_user_idx
  ON public.provider_push_subscriptions (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_push_subscriptions TO authenticated;
GRANT ALL ON public.provider_push_subscriptions TO service_role;

ALTER TABLE public.provider_push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Providers manage their own push subscriptions"
  ON public.provider_push_subscriptions;
CREATE POLICY "Providers manage their own push subscriptions"
  ON public.provider_push_subscriptions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- When an in-app notification is inserted (DB trigger or app code), ask the
-- provider app to deliver a Web Push. Does not change notification insert logic.
CREATE OR REPLACE FUNCTION public.notify_provider_push_http()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_url text;
BEGIN
  v_url := coalesce(
    nullif(current_setting('app.provider_app_url', true), ''),
    'https://provider.bodyinc.com'
  );
  BEGIN
    PERFORM net.http_post(
      url := rtrim(v_url, '/') || '/api/internal/notification-push',
      body := jsonb_build_object('id', NEW.id),
      headers := jsonb_build_object('Content-Type', 'application/json')
    );
  EXCEPTION WHEN undefined_function THEN
    NULL;
  WHEN OTHERS THEN
    RAISE WARNING 'notify_provider_push_http failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_provider_push_http ON public.notifications;
CREATE TRIGGER notify_provider_push_http
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.notify_provider_push_http();
