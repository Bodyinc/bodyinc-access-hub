-- Link each Body Inc provider to their own QuickBlox agent account.
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS qb_user_id integer;

CREATE UNIQUE INDEX IF NOT EXISTS providers_qb_user_id_uidx
  ON public.providers (qb_user_id)
  WHERE qb_user_id IS NOT NULL;
