CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL,
  type text NOT NULL,
  description text,
  referral_id uuid REFERENCES public.referrals(id) ON DELETE SET NULL,
  stripe_invoice_id text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_wallet_txn_user ON public.wallet_transactions(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_txn_invoice_debit
  ON public.wallet_transactions(user_id, stripe_invoice_id, type)
  WHERE stripe_invoice_id IS NOT NULL;
