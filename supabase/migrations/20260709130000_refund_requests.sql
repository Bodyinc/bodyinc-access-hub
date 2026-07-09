-- Patient-initiated refund requests. Patients submit a request against a paid
-- payment; admins approve (→ stripe.refunds.create, payment marked refunded) or
-- reject. payments.status already carries 'refunded' — no enum change needed.

CREATE TABLE IF NOT EXISTS public.refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note text,
  stripe_refund_id text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.refund_requests TO authenticated;
GRANT ALL ON public.refund_requests TO service_role;
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "refund requests admin or owner read" ON public.refund_requests;
CREATE POLICY "refund requests admin or owner read" ON public.refund_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR user_id = auth.uid());

DROP POLICY IF EXISTS "refund requests owner insert" ON public.refund_requests;
CREATE POLICY "refund requests owner insert" ON public.refund_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "refund requests admin update" ON public.refund_requests;
CREATE POLICY "refund requests admin update" ON public.refund_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP TRIGGER IF EXISTS trg_refund_requests_updated ON public.refund_requests;
CREATE TRIGGER trg_refund_requests_updated BEFORE UPDATE ON public.refund_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_refund_requests_user ON public.refund_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_payment ON public.refund_requests(payment_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON public.refund_requests(status);

-- At most one open (pending) request per payment.
CREATE UNIQUE INDEX IF NOT EXISTS uidx_refund_requests_open
  ON public.refund_requests(payment_id) WHERE status = 'pending';
