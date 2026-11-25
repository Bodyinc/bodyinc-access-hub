-- A cheaper medicine change still uses awaiting_additional_payment, but the
-- patient is approving the change, not paying more. The phone alert follows
-- the price difference. A higher price keeps the additional-payment wording.

CREATE OR REPLACE FUNCTION public.notify_provider_on_request_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_med    text;
  v_title  text;
  v_body   text;
  v_type   text;
  v_delta  integer;
BEGIN
  IF NEW.provider_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.provider_id IS NOT DISTINCT FROM OLD.provider_id
     AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_med FROM public.medicines WHERE id = NEW.medicine_id;
  v_med := coalesce(v_med, 'a treatment');

  IF TG_OP = 'INSERT' OR NEW.provider_id IS DISTINCT FROM OLD.provider_id THEN
    v_type  := 'request_assigned';
    v_title := 'New patient assigned';
    v_body  := 'An order for ' || v_med || ' has been assigned to you.';
  ELSIF NEW.status = 'pending_review' THEN
    v_type  := 'request_ready_for_review';
    v_title := 'Ready to review';
    v_body  := 'An order for ' || v_med || ' is ready for your review.';
  ELSIF NEW.status = 'approved' THEN
    v_type  := 'request_approved';
    v_title := 'Consultation approved';
    v_body  := 'The consultation for ' || v_med || ' has been approved.';
  ELSIF NEW.status = 'awaiting_additional_payment' THEN
    v_type := 'request_needs_attention';
    v_delta := coalesce(NEW.plan_change_delta_cents, 0);
    IF v_delta > 0 THEN
      v_title := 'Needs attention';
      v_body  := 'An order for ' || v_med || ' is awaiting an additional payment.';
    ELSIF v_delta < 0 THEN
      v_title := 'Patient needs to approve';
      v_body  := 'The medicine was changed to ' || v_med || ', which costs less. The patient needs to approve it. No extra payment is due.';
    ELSE
      v_title := 'Patient needs to approve';
      v_body  := 'The medicine was changed to ' || v_med || '. The patient needs to approve it before the order continues. No extra payment is due.';
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  -- Don't notify a practitioner about their own action.
  IF auth.uid() IS NOT NULL AND auth.uid() = NEW.provider_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, link, entity_id)
  VALUES (NEW.provider_id, v_type, v_title, v_body,
          '/provider/requests/' || NEW.id::text, NEW.id);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_provider_on_request_change failed: %', sqlerrm;
  RETURN NEW;
END;
$$;
