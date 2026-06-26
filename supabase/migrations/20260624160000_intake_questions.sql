CREATE TYPE public.question_type AS ENUM ('short_text', 'mcq_single', 'mcq_multi');

CREATE TABLE public.intake_questions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt        text NOT NULL,
  description   text,
  question_type public.question_type NOT NULL,
  sort_order    int NOT NULL DEFAULT 0,
  is_required   boolean NOT NULL DEFAULT true,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.intake_question_options (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.intake_questions(id) ON DELETE CASCADE,
  label       text NOT NULL,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX intake_questions_sort_order_idx
  ON public.intake_questions (sort_order, created_at);

CREATE INDEX intake_questions_is_active_idx
  ON public.intake_questions (is_active);

CREATE INDEX intake_question_options_question_id_idx
  ON public.intake_question_options (question_id, sort_order);

CREATE TRIGGER update_intake_questions_updated_at
  BEFORE UPDATE ON public.intake_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT ON public.intake_questions TO anon, authenticated;
GRANT SELECT ON public.intake_question_options TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.intake_questions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.intake_question_options TO authenticated;
GRANT ALL ON public.intake_questions TO service_role;
GRANT ALL ON public.intake_question_options TO service_role;

ALTER TABLE public.intake_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_question_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage intake questions"
  ON public.intake_questions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage intake question options"
  ON public.intake_question_options
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public read active intake questions"
  ON public.intake_questions
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Public read active question options"
  ON public.intake_question_options
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.intake_questions q
      WHERE q.id = question_id
        AND q.is_active = true
    )
  );

CREATE OR REPLACE VIEW public.public_intake_quiz AS
SELECT
  q.id,
  q.prompt,
  q.description,
  q.question_type,
  q.sort_order,
  q.is_required,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'label', o.label,
        'sort_order', o.sort_order
      )
      ORDER BY o.sort_order, o.created_at
    ) FILTER (WHERE o.id IS NOT NULL),
    '[]'::jsonb
  ) AS options
FROM public.intake_questions q
LEFT JOIN public.intake_question_options o ON o.question_id = q.id
WHERE q.is_active = true
GROUP BY q.id
ORDER BY q.sort_order, q.created_at;

GRANT SELECT ON public.public_intake_quiz TO anon, authenticated;
