CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX notifications_unread_idx ON public.notifications (user_id) WHERE read_at IS NULL;

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can mark their own notifications read"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

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
    v_type  := 'request_needs_attention';
    v_title := 'Needs attention';
    v_body  := 'An order for ' || v_med || ' is awaiting an additional payment.';
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

CREATE TRIGGER notify_provider_on_request_change
AFTER INSERT OR UPDATE ON public.medication_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_provider_on_request_change();