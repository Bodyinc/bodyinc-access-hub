
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.sex_type AS ENUM ('female','male','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.bmi_band AS ENUM ('underweight','normal','overweight','obese');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.medication_relationship AS ENUM ('incompatible','restricted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM ('pending','succeeded','failed','refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.eligibility_result AS ENUM ('eligible','ineligible','needs_review');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.intake_session_status AS ENUM ('in_progress','payment_pending','completed','abandoned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.q_question_type AS ENUM ('text','number','yes_no','single_choice','multi_choice');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ PROFILE ADDITIONS ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS state_code text,
  ADD COLUMN IF NOT EXISTS sex public.sex_type;

-- ============ MEDICINE ADDITIONS ============
ALTER TABLE public.medicines
  ADD COLUMN IF NOT EXISTS requires_questionnaire boolean NOT NULL DEFAULT false;

-- ============ MEDICATION CATEGORIES ============
CREATE TABLE IF NOT EXISTS public.medication_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tagline text,
  description text,
  icon text,
  eligibility_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.medication_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.medication_categories TO authenticated;
GRANT ALL ON public.medication_categories TO service_role;
ALTER TABLE public.medication_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories readable" ON public.medication_categories FOR SELECT TO anon, authenticated USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "categories admin write" ON public.medication_categories FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "categories admin update" ON public.medication_categories FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "categories admin delete" ON public.medication_categories FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_medication_categories_updated BEFORE UPDATE ON public.medication_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CATEGORY <-> MEDICINE ============
CREATE TABLE IF NOT EXISTS public.medication_category_medicines (
  category_id uuid NOT NULL REFERENCES public.medication_categories(id) ON DELETE CASCADE,
  medicine_id uuid NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (category_id, medicine_id)
);
GRANT SELECT ON public.medication_category_medicines TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.medication_category_medicines TO authenticated;
GRANT ALL ON public.medication_category_medicines TO service_role;
ALTER TABLE public.medication_category_medicines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cat_med read" ON public.medication_category_medicines FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "cat_med admin write" ON public.medication_category_medicines FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ MEDICATION RELATIONSHIPS ============
CREATE TABLE IF NOT EXISTS public.medication_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_a_id uuid NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  medicine_b_id uuid NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  relationship public.medication_relationship NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (medicine_a_id <> medicine_b_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS medication_relationships_pair_uidx
  ON public.medication_relationships (LEAST(medicine_a_id, medicine_b_id), GREATEST(medicine_a_id, medicine_b_id));
GRANT SELECT ON public.medication_relationships TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.medication_relationships TO authenticated;
GRANT ALL ON public.medication_relationships TO service_role;
ALTER TABLE public.medication_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rel read" ON public.medication_relationships FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "rel admin write" ON public.medication_relationships FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_medication_relationships_updated BEFORE UPDATE ON public.medication_relationships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ QUESTIONNAIRES ============
CREATE TABLE IF NOT EXISTS public.questionnaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.questionnaires TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.questionnaires TO authenticated;
GRANT ALL ON public.questionnaires TO service_role;
ALTER TABLE public.questionnaires ENABLE ROW LEVEL SECURITY;
CREATE POLICY "q read" ON public.questionnaires FOR SELECT TO anon, authenticated USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "q admin write" ON public.questionnaires FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_questionnaires_updated BEFORE UPDATE ON public.questionnaires FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.questionnaire_medicines (
  questionnaire_id uuid NOT NULL REFERENCES public.questionnaires(id) ON DELETE CASCADE,
  medicine_id uuid NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (questionnaire_id, medicine_id)
);
GRANT SELECT ON public.questionnaire_medicines TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.questionnaire_medicines TO authenticated;
GRANT ALL ON public.questionnaire_medicines TO service_role;
ALTER TABLE public.questionnaire_medicines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qm read" ON public.questionnaire_medicines FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "qm admin write" ON public.questionnaire_medicines FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.questionnaire_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id uuid NOT NULL REFERENCES public.questionnaires(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  description text,
  question_type public.q_question_type NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  disqualify_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.questionnaire_questions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.questionnaire_questions TO authenticated;
GRANT ALL ON public.questionnaire_questions TO service_role;
ALTER TABLE public.questionnaire_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qq read" ON public.questionnaire_questions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "qq admin write" ON public.questionnaire_questions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_questionnaire_questions_updated BEFORE UPDATE ON public.questionnaire_questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.questionnaire_question_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.questionnaire_questions(id) ON DELETE CASCADE,
  label text NOT NULL,
  value text,
  sort_order integer NOT NULL DEFAULT 0,
  is_disqualifying boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.questionnaire_question_options TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.questionnaire_question_options TO authenticated;
GRANT ALL ON public.questionnaire_question_options TO service_role;
ALTER TABLE public.questionnaire_question_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qqo read" ON public.questionnaire_question_options FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "qqo admin write" ON public.questionnaire_question_options FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ INTAKE SESSIONS (anonymous) ============
CREATE TABLE IF NOT EXISTS public.intake_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text NOT NULL UNIQUE,
  state_code text,
  sex public.sex_type,
  dob date,
  height_cm numeric(6,2),
  weight_kg numeric(6,2),
  full_name text,
  email text,
  phone text,
  selected_plan_id uuid REFERENCES public.packages(id) ON DELETE SET NULL,
  status public.intake_session_status NOT NULL DEFAULT 'in_progress',
  claimed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);
GRANT SELECT, INSERT, UPDATE ON public.intake_sessions TO anon, authenticated;
GRANT ALL ON public.intake_sessions TO service_role;
ALTER TABLE public.intake_sessions ENABLE ROW LEVEL SECURITY;
-- Anon may insert freely; reads/updates gated by service role or admin. Public
-- lookups happen server-side (service role) using the token.
CREATE POLICY "session insert" ON public.intake_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "session admin or owner read" ON public.intake_sessions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR claimed_by_user_id = auth.uid());
CREATE POLICY "session admin update" ON public.intake_sessions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_intake_sessions_updated BEFORE UPDATE ON public.intake_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.intake_session_categories (
  session_id uuid NOT NULL REFERENCES public.intake_sessions(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.medication_categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, category_id)
);
GRANT SELECT, INSERT, DELETE ON public.intake_session_categories TO anon, authenticated;
GRANT ALL ON public.intake_session_categories TO service_role;
ALTER TABLE public.intake_session_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "isc insert" ON public.intake_session_categories FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "isc admin read" ON public.intake_session_categories FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "isc admin delete" ON public.intake_session_categories FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.intake_session_medicines (
  session_id uuid NOT NULL REFERENCES public.intake_sessions(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.medication_categories(id) ON DELETE CASCADE,
  medicine_id uuid NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, category_id)
);
GRANT SELECT, INSERT, DELETE ON public.intake_session_medicines TO anon, authenticated;
GRANT ALL ON public.intake_session_medicines TO service_role;
ALTER TABLE public.intake_session_medicines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ism insert" ON public.intake_session_medicines FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "ism admin read" ON public.intake_session_medicines FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "ism admin delete" ON public.intake_session_medicines FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.intake_session_questionnaire_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.intake_sessions(id) ON DELETE CASCADE,
  medicine_id uuid NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questionnaire_questions(id) ON DELETE CASCADE,
  answer_text text,
  answer_number numeric,
  answer_boolean boolean,
  answer_option_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.intake_session_questionnaire_responses TO anon, authenticated;
GRANT ALL ON public.intake_session_questionnaire_responses TO service_role;
ALTER TABLE public.intake_session_questionnaire_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "isqr insert" ON public.intake_session_questionnaire_responses FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "isqr admin read" ON public.intake_session_questionnaire_responses FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.intake_session_eligibility_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.intake_sessions(id) ON DELETE CASCADE,
  medicine_id uuid NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  result public.eligibility_result NOT NULL,
  reason text,
  evaluated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.intake_session_eligibility_results TO anon, authenticated;
GRANT ALL ON public.intake_session_eligibility_results TO service_role;
ALTER TABLE public.intake_session_eligibility_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "iser insert" ON public.intake_session_eligibility_results FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "iser admin read" ON public.intake_session_eligibility_results FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ============ PAYMENTS ============
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.intake_sessions(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  plan_id uuid REFERENCES public.packages(id) ON DELETE SET NULL,
  stripe_payment_intent_id text UNIQUE,
  stripe_customer_id text,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  status public.payment_status NOT NULL DEFAULT 'pending',
  raw_event jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments admin or owner read" ON public.payments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR user_id = auth.uid());
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.stripe_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  type text NOT NULL,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.stripe_events TO service_role;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stripe events admin read" ON public.stripe_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ============ Helpful indexes ============
CREATE INDEX IF NOT EXISTS idx_cat_med_medicine ON public.medication_category_medicines(medicine_id);
CREATE INDEX IF NOT EXISTS idx_qq_questionnaire ON public.questionnaire_questions(questionnaire_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_qqo_question ON public.questionnaire_question_options(question_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_isqr_session ON public.intake_session_questionnaire_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_session ON public.payments(session_id);
