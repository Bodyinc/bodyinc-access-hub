
CREATE TABLE public.intake_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES public.intake_questions(id) ON DELETE SET NULL,
  question_prompt text NOT NULL,
  question_type public.question_type NOT NULL,
  answer_text text,
  answer_option_ids uuid[] NOT NULL DEFAULT '{}',
  answer_labels text[] NOT NULL DEFAULT '{}',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX intake_responses_user_id_idx ON public.intake_responses(user_id);
CREATE INDEX intake_responses_submission_idx ON public.intake_responses(user_id, submission_id, submitted_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.intake_responses TO authenticated;
GRANT ALL ON public.intake_responses TO service_role;

ALTER TABLE public.intake_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own intake responses"
  ON public.intake_responses FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Patients can insert own intake responses"
  ON public.intake_responses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Patients can update own intake responses"
  ON public.intake_responses FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Patients can delete own intake responses"
  ON public.intake_responses FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all intake responses"
  ON public.intake_responses FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_intake_responses_updated_at
  BEFORE UPDATE ON public.intake_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
