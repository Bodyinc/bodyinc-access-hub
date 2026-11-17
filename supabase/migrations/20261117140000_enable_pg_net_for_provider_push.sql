-- Assignment/in-app notification inserts call /api/internal/notification-push via pg_net.
-- If the extension is missing, the trigger silently no-ops and only email/test push work.
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.notify_provider_push_http()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net', 'extensions'
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
    RAISE WARNING 'notify_provider_push_http: pg_net net.http_post is unavailable';
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
