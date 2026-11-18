-- As soon as intake is finished (or an unassigned order becomes claimable),
-- ask the provider app to email + notify licensed providers to claim.
-- Deduped in app code via email_reminders (provider_claim_offer).

CREATE OR REPLACE FUNCTION public.notify_ready_to_claim_http()
RETURNS void
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
      url := rtrim(v_url, '/') || '/api/internal/ready-to-claim',
      body := jsonb_build_object('source', 'intake'),
      headers := jsonb_build_object('Content-Type', 'application/json')
    );
  EXCEPTION WHEN undefined_function THEN
    RAISE WARNING 'notify_ready_to_claim_http: pg_net net.http_post is unavailable';
  WHEN OTHERS THEN
    RAISE WARNING 'notify_ready_to_claim_http failed: %', SQLERRM;
  END;
END;
$$;

-- First questionnaire answer for a session = intake filled (same rule as app).
CREATE OR REPLACE FUNCTION public.notify_ready_to_claim_on_intake_answer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.intake_session_questionnaire_responses q
    WHERE q.session_id = NEW.session_id
      AND q.id IS DISTINCT FROM NEW.id
  ) THEN
    PERFORM public.notify_ready_to_claim_http();
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_ready_to_claim_on_intake_answer failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_ready_to_claim_on_intake_answer
  ON public.intake_session_questionnaire_responses;
CREATE TRIGGER notify_ready_to_claim_on_intake_answer
AFTER INSERT ON public.intake_session_questionnaire_responses
FOR EACH ROW
EXECUTE FUNCTION public.notify_ready_to_claim_on_intake_answer();

-- Session marked completed (answers may already exist).
CREATE OR REPLACE FUNCTION public.notify_ready_to_claim_on_session_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' AND coalesce(OLD.status, '') IS DISTINCT FROM 'completed' THEN
    PERFORM public.notify_ready_to_claim_http();
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_ready_to_claim_on_session_completed failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_ready_to_claim_on_session_completed ON public.intake_sessions;
CREATE TRIGGER notify_ready_to_claim_on_session_completed
AFTER UPDATE OF status ON public.intake_sessions
FOR EACH ROW
EXECUTE FUNCTION public.notify_ready_to_claim_on_session_completed();

-- Shop consultation questionnaire submitted, or onboarding patient enters open chat.
CREATE OR REPLACE FUNCTION public.notify_ready_to_claim_on_consultation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_ready_to_claim_http();
    RETURN NEW;
  END IF;

  IF coalesce(NEW.form_submitted, false)
     AND NOT coalesce(OLD.form_submitted, false) THEN
    PERFORM public.notify_ready_to_claim_http();
  ELSIF NEW.form_submission_id IS NOT NULL
        AND OLD.form_submission_id IS DISTINCT FROM NEW.form_submission_id THEN
    PERFORM public.notify_ready_to_claim_http();
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_ready_to_claim_on_consultation failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_ready_to_claim_on_consultation ON public.patient_consultations;
CREATE TRIGGER notify_ready_to_claim_on_consultation
AFTER INSERT OR UPDATE ON public.patient_consultations
FOR EACH ROW
EXECUTE FUNCTION public.notify_ready_to_claim_on_consultation();

-- Payment/order becomes unassigned + claimable after intake was already finished.
CREATE OR REPLACE FUNCTION public.notify_ready_to_claim_on_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ready boolean := false;
BEGIN
  IF NEW.provider_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.status NOT IN (
    'payment_completed',
    'provider_assigned',
    'pending_review',
    'awaiting_additional_payment',
    'approved',
    'prescribed'
  ) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_ready := true;
  ELSIF OLD.provider_id IS NOT NULL AND NEW.provider_id IS NULL THEN
    v_ready := true;
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    v_ready := true;
  ELSIF OLD.session_id IS DISTINCT FROM NEW.session_id AND NEW.session_id IS NOT NULL THEN
    v_ready := true;
  END IF;

  IF v_ready THEN
    PERFORM public.notify_ready_to_claim_http();
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_ready_to_claim_on_request failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_ready_to_claim_on_request ON public.medication_requests;
CREATE TRIGGER notify_ready_to_claim_on_request
AFTER INSERT OR UPDATE ON public.medication_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_ready_to_claim_on_request();
