## Goal
Link questionnaires to categories (goals) instead of medicines.

## Database migration
- Create `public.questionnaire_categories` (questionnaire_id, category_id) with PK on the pair, FKs to `questionnaires` and `medication_categories` (both `on delete cascade`), grants for `authenticated`/`service_role`, RLS enabled, and admin-write + authenticated-read policies matching `questionnaire_medicines`.
- Drop `public.questionnaire_medicines`.
- Any place in DB (functions/policies) referencing `questionnaire_medicines` — none found, safe to drop.

## Code changes
- `src/lib/questionnaires.store.ts`: rename `medicine_ids` → `category_ids`; replace `questionnaire_medicines` reads/writes with `questionnaire_categories`. Rename `syncQuestionnaireMedicines` → `syncQuestionnaireCategories`.
- `src/routes/_authenticated/admin.questionnaires.new.tsx` and `admin.questionnaires.$questionnaireId.tsx`: swap the medicines multi-select for a categories multi-select using `categoriesQueryOptions()` from `src/lib/query-options/categories.ts`. Update labels ("Linked medicines" → "Linked goals / categories") and state variable names.
- `src/routes/_authenticated/admin.questionnaires.index.tsx`: if it shows a "medicines" column/count, switch to categories.
- Leave sidebar entry and the intake-session eligibility flow (which reads `intake_session_medicines`) untouched — this change only concerns which entity a questionnaire is attached to.

## Out of scope
- Intake session evaluation logic that currently resolves questionnaires per medicine. If that runtime lookup exists elsewhere and needs to switch to category-based resolution, we address it in a follow-up once you confirm.
