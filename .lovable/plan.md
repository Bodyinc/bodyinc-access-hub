# Patient Portal Pre-Payment Flow — Schema + Admin

Design a normalized, extensible schema for the unauthenticated intake → checkout flow, and build all admin-side management screens. The patient-facing flow (steps 1–7) is out of scope for this task and will be built next.

## 1. Database Schema (one migration)

### New enums
- `sex_type`: `female | male | other`
- `question_type` (extend existing): ensure `text | number | yes_no | single_choice | multi_choice`
- `bmi_band`: `underweight | normal | overweight | obese`
- `medication_relationship`: `incompatible | restricted` (compatible = default, no row needed)
- `payment_status`: `pending | succeeded | failed | refunded`
- `eligibility_result`: `eligible | ineligible | needs_review`

### Core tables

**`medication_categories`** (Goals — replaces implicit categorization)
- `id`, `slug` (unique), `name`, `tagline`, `description`, `icon`, `sort_order`, `is_active`
- `eligibility_rules` jsonb — flexible rule blob, e.g. `{ "bmi_bands": ["overweight","obese"], "sex": ["female"], "min_age": 18 }`. Frontend & server evaluate against patient inputs. Empty = always visible.

**`medicines`** (extend existing)
- add `requires_questionnaire boolean default false`
- add `category_id uuid` (nullable during migration) — but use join table below for many-to-many

**`medication_category_medicines`** (M:N)
- `category_id`, `medicine_id`, `sort_order`, PK(category_id, medicine_id)

**`medication_relationships`** (compatibility rules)
- `id`, `medicine_a_id`, `medicine_b_id`, `relationship medication_relationship`, `reason text`
- Unique on unordered pair via `LEAST/GREATEST` index
- Enforced at selection time (server + client)

**`questionnaires`**
- `id`, `name`, `description`, `is_active`

**`questionnaire_medicines`** (M:N — a questionnaire can gate multiple meds)
- `questionnaire_id`, `medicine_id`, PK

**`questionnaire_questions`**
- `id`, `questionnaire_id`, `prompt`, `description`, `question_type`, `is_required`, `sort_order`
- `disqualify_rules` jsonb — e.g. `{ "if_any_option_selected": ["opt_uuid_1"] }` or `{ "if_yes": true }`

**`questionnaire_question_options`**
- `id`, `question_id`, `label`, `value`, `sort_order`, `is_disqualifying boolean`

### Patient-facing intake session (pre-auth)

Because the account isn't created until payment succeeds, we need an anonymous session that survives the flow and is claimed on account creation.

**`intake_sessions`**
- `id`, `session_token` (unique, opaque, stored in browser), `state_code`, `sex sex_type`, `dob date`, `height_cm numeric`, `weight_kg numeric`, `full_name`, `email`, `phone`, `selected_plan_id uuid`, `status` (`in_progress | payment_pending | completed | abandoned`), `claimed_by_user_id uuid null`, `created_at`, `updated_at`, `expires_at`

**`intake_session_categories`** — patient's selected goals (M:N)
**`intake_session_medicines`** — one medicine per category (unique on `(session_id, category_id)`)
**`intake_session_questionnaire_responses`**
- `id`, `session_id`, `medicine_id`, `question_id`, `answer_text`, `answer_number`, `answer_boolean`, `answer_option_ids uuid[]`
**`intake_session_eligibility_results`**
- `id`, `session_id`, `medicine_id`, `result eligibility_result`, `reason`, `evaluated_at`

### Payments

**`payments`**
- `id`, `session_id` (nullable — set for pre-auth), `user_id` (nullable until account created), `stripe_payment_intent_id`, `stripe_customer_id`, `amount_cents`, `currency`, `status payment_status`, `plan_id`, `raw_event jsonb`, timestamps

**`stripe_events`** (idempotency for webhooks)
- `id`, `stripe_event_id unique`, `type`, `payload jsonb`, `received_at`

### Profile additions
- add `state_code text`, `sex sex_type` to `profiles`
- keep existing `dob`

### Existing table cleanup
- `intake_questions` / `intake_question_options` / `intake_responses` were built for a single generic questionnaire. Keep for now (used by current admin), but new work uses `questionnaires` + `questionnaire_questions` scoped per medicine. Old tables can be deprecated later.

### RLS summary
- All new admin-managed catalog tables (`medication_categories`, `medication_relationships`, `questionnaires`, `questionnaire_questions`, `questionnaire_question_options`, `questionnaire_medicines`, `medication_category_medicines`):
  - `anon` + `authenticated`: SELECT where `is_active` (public read for the intake flow)
  - Admin-only: INSERT/UPDATE/DELETE via `has_role(auth.uid(),'admin')`
- `intake_sessions*`: `anon` may INSERT and SELECT/UPDATE their own row **only by `session_token`** (checked via a `has_session_token(token)` SECURITY DEFINER function that reads a request header or a token column match). Admins can SELECT all.
- `payments`, `stripe_events`: service_role only; users read their own via `user_id = auth.uid()`.
- GRANTs included for every new table per project rules.

## 2. Admin Portal — new/updated screens

All under `/admin`, added to the sidebar.

### New: **Categories** (`/admin/categories`)
- List, search, drag-sort
- New/Edit form: name, slug, tagline, description, icon, `is_active`, eligibility rules builder:
  - BMI bands (multi-select)
  - Sex (multi-select)
  - Min/max age
  - Free-form JSON escape hatch for future rules
- Assign medicines (multi-select with sort)

### Updated: **Medicines** (`/admin/medicines`)
- Add fields: `requires_questionnaire` toggle, category assignments (multi-select)
- Detail page gains a "Compatibility" tab

### New: **Medication Rules** (`/admin/medication-rules`)
- Table of relationships (medicine A ⇔ medicine B, type, reason)
- Create rule dialog: pick two medicines, pick `incompatible | restricted`, reason
- Also reachable from a medicine's detail "Compatibility" tab

### New: **Questionnaires** (`/admin/questionnaires`)
- List questionnaires with linked medicine count
- New/Edit: name, description, `is_active`, linked medicines (multi-select)
- Nested questions manager (reuses existing question-form pattern):
  - Add/edit/delete questions with type, required, sort
  - Manage options for choice types
  - Mark options / yes-no answers as **disqualifying**
- Preview panel showing patient-facing rendering

### Updated: **Patients** (existing tab)
- Detail page gains new tabs:
  - **Intake selections**: categories, medicines, plan, session status
  - **Questionnaire responses**: grouped by medicine, with question prompts + answers + eligibility result
  - **Payments**: Stripe payment intents, amounts, status, dates
- Height/weight/state/sex/dob shown on profile tab

### Sidebar order
Dashboard · Categories · Medicines · Medication Rules · Questionnaires · Packages · Providers · Patients · Intake form (legacy) · Slots

## 3. Server functions

New `*.functions.ts` modules (admin-gated with `has_role('admin')`):
- `categories.functions.ts` — CRUD, sort, medicine assignment
- `medication-rules.functions.ts` — CRUD relationships
- `questionnaires.functions.ts` — CRUD questionnaires, questions, options, medicine links
- Extend `medicines.functions.ts` — `requires_questionnaire`, category assignment
- Extend `patients.functions.ts` — `getPatientIntakeSelections`, `getPatientQuestionnaireResponses`, `listPatientPayments`

Public (anon) server functions for the intake flow are **out of scope for this task** (patient portal build).

## 4. Business rules enforced

- Server-side validation on session mutations:
  - One medicine per category (`UNIQUE (session_id, category_id)`)
  - Reject medicine selection that violates any `medication_relationships` row of type `incompatible` against already-selected medicines
- Category visibility rules evaluated on the client from `eligibility_rules` jsonb, using BMI computed in-browser from height/weight
- Eligibility computation: server evaluates `disqualify_rules` + option `is_disqualifying` on questionnaire submit and writes `intake_session_eligibility_results`

## Out of scope (next task)

- Patient-facing intake wizard (steps 1–7 UI)
- Stripe checkout integration & webhook handler
- Account provisioning on payment success
- Emails / notifications

## Order of implementation

1. Migration (all schema above)
2. Categories admin
3. Medicines updates (requires_questionnaire, category assignment)
4. Medication rules admin
5. Questionnaires admin
6. Patients detail extensions
7. Sidebar + routing wiring
