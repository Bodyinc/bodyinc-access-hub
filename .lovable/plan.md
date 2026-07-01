## Remove "Intake Questions (legacy)" completely

### Frontend
- Delete files:
  - `src/routes/_authenticated/admin.questions.tsx`
  - `src/routes/_authenticated/admin.questions.index.tsx`
  - `src/routes/_authenticated/admin.questions.new.tsx`
  - `src/routes/_authenticated/admin.questions.$questionId.tsx`
  - `src/lib/questions.functions.ts`
  - `src/lib/questions.store.ts`
  - `src/lib/questions.schema.ts`
  - `src/components/admin/question-form.tsx`
  - `src/components/admin/question-preview.tsx`
- Edit `src/components/admin/admin-sidebar.tsx`: remove the "Intake Questions (legacy)" nav item and unused `HelpCircle` import.
- Edit `src/routes/_authenticated/admin.tsx`: remove the three `/admin/questions*` entries from the `TITLES` map / title logic.
- Edit `src/routes/_authenticated/admin.patients.$patientId.tsx`: remove the `intake_response_count` badge display.
- Edit `src/lib/patients.functions.ts`: drop the `intake_responses` count query in `getPatient` and remove the entire `listPatientIntakeResponses` server function.
- Clean stale comments in `src/lib/medicines.functions.ts` and `src/lib/packages.functions.ts` that reference `questions.functions.ts`.
- `src/routeTree.gen.ts` regenerates automatically.

### Backend (Supabase migration)
Single migration dropping the legacy tables (with policies/indexes cascading):
```sql
DROP TABLE IF EXISTS public.intake_responses CASCADE;
DROP TABLE IF EXISTS public.intake_question_options CASCADE;
DROP TABLE IF EXISTS public.intake_questions CASCADE;
```
The new intake flow uses `intake_sessions`, `questionnaires`, `questionnaire_questions`, etc. — those are untouched.

### Verification
Confirm build passes and no remaining references to `intake_questions` / `intake_responses` / `admin/questions` exist.