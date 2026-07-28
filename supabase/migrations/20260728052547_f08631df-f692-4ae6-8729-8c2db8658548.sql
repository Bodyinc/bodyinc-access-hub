CREATE TABLE public.medication_request_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.medication_requests(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author_role text NOT NULL DEFAULT 'provider',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_medication_request_notes_request ON public.medication_request_notes(request_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.medication_request_notes TO authenticated;
GRANT ALL ON public.medication_request_notes TO service_role;

ALTER TABLE public.medication_request_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all order notes"
ON public.medication_request_notes FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Providers read notes on their orders"
ON public.medication_request_notes FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'provider')
  AND EXISTS (
    SELECT 1 FROM public.medication_requests r
    WHERE r.id = medication_request_notes.request_id
      AND r.provider_id = auth.uid()
  )
);

CREATE POLICY "Providers add notes on their orders"
ON public.medication_request_notes FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND public.has_role(auth.uid(), 'provider')
  AND EXISTS (
    SELECT 1 FROM public.medication_requests r
    WHERE r.id = medication_request_notes.request_id
      AND r.provider_id = auth.uid()
  )
);

CREATE TRIGGER update_medication_request_notes_updated_at
BEFORE UPDATE ON public.medication_request_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
