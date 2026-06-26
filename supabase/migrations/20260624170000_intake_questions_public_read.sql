-- Run this ONLY if you already applied an older version of 20260624160000_intake_questions.sql
-- without anon read policies or the public_intake_quiz view.

ALTER TABLE public.intake_questions
  ADD COLUMN IF NOT EXISTS description text;

GRANT SELECT ON public.intake_questions TO anon;
GRANT SELECT ON public.intake_question_options TO anon;

DROP POLICY IF EXISTS "Public read active intake questions" ON public.intake_questions;
CREATE POLICY "Public read active intake questions"
  ON public.intake_questions
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Public read active question options" ON public.intake_question_options;
CREATE POLICY "Public read active question options"
  ON public.intake_question_options
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.intake_questions q
      WHERE q.id = question_id AND q.is_active = true
    )
  );

CREATE OR REPLACE VIEW public.public_intake_quiz AS
SELECT
  q.id, q.prompt, q.description, q.question_type, q.sort_order, q.is_required,
  COALESCE(
    jsonb_agg(
      jsonb_build_object('id', o.id, 'label', o.label, 'sort_order', o.sort_order)
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
