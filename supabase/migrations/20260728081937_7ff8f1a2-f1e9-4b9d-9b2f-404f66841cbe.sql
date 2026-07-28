DELETE FROM public.questionnaire_categories qc
USING public.questionnaire_categories qc2, public.questionnaires q1, public.questionnaires q2
WHERE qc.category_id = qc2.category_id
  AND qc.questionnaire_id <> qc2.questionnaire_id
  AND q1.id = qc.questionnaire_id
  AND q2.id = qc2.questionnaire_id
  AND (q2.updated_at, q2.id) > (q1.updated_at, q1.id);

ALTER TABLE public.questionnaire_categories
  ADD CONSTRAINT questionnaire_categories_category_unique UNIQUE (category_id);