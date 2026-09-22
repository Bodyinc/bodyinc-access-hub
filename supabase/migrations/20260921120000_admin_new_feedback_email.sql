-- Existing inquiries should not generate a burst of admin emails when this ships.
INSERT INTO public.email_reminders (reminder_type, target_id, period_key)
SELECT 'admin_new_feedback', id, ''
FROM public.patient_feedback
ON CONFLICT (reminder_type, target_id, period_key) DO NOTHING;

-- Instant admin email: POST the new row to the admin app. Preview/local still pick
-- new inquiries up from the admin sidebar poll if this HTTP call cannot run.
CREATE OR REPLACE FUNCTION public.notify_admins_new_feedback_http()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_url text;
BEGIN
  v_url := coalesce(
    nullif(current_setting('app.admin_app_url', true), ''),
    'https://admin.bodyinc.com'
  );
  BEGIN
    PERFORM net.http_post(
      url := rtrim(v_url, '/') || '/api/internal/new-feedback',
      body := jsonb_build_object('id', NEW.id),
      headers := jsonb_build_object('Content-Type', 'application/json')
    );
  EXCEPTION WHEN undefined_function THEN
    NULL;
  WHEN OTHERS THEN
    RAISE WARNING 'notify_admins_new_feedback_http failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_admins_new_feedback_http ON public.patient_feedback;
CREATE TRIGGER notify_admins_new_feedback_http
AFTER INSERT ON public.patient_feedback
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_new_feedback_http();
