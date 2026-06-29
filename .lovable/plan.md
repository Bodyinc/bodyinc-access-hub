## Goal

Build out the **Patients** admin tab: list/search patient accounts, view a detail page, perform admin actions (edit profile, send password reset, deactivate), and view their submitted intake quiz answers.

## Database

One migration:

**Table `public.intake_responses`** — stores patient answers to the intake quiz (no table currently exists).
- `id`, `user_id` (uuid, references patient), `question_id` (references `intake_questions`), `question_prompt` (text snapshot), `question_type`, `answer_text` (nullable), `answer_option_ids` (uuid[] for MCQ), `answer_labels` (text[] snapshot), `submitted_at`, timestamps.
- GRANTs: `authenticated` can SELECT own rows; admins can SELECT all. No anon access.
- RLS: patient can insert/select own; admin can select all via `has_role('admin')`.

**Table `public.patient_status`** — tracks admin-side deactivation without touching `auth.users`.
- `user_id` PK, `is_active bool default true`, `deactivated_at`, `deactivated_by`, `note text`, timestamps.
- RLS: admin-only read/write; patient can read own `is_active`.

(Profile fields like name/phone/dob already live in `public.profiles` — reuse it for edits.)

## Server functions (`src/lib/patients.functions.ts`)

All protected with `requireSupabaseAuth` + `has_role(userId, 'admin')`:

- `listPatientsFn({ search?, status?, page?, pageSize? })` — joins `profiles` ⨝ `user_roles` (role='patient') ⨝ `patient_status`. Returns `{ rows, total }`. Search across name/email/phone.
- `getPatientFn({ userId })` — returns profile + status + role + counts (intake responses count).
- `listPatientIntakeResponsesFn({ userId })` — returns responses ordered by `submitted_at` desc, grouped by submission batch if applicable.
- `updatePatientProfileFn({ userId, full_name, phone, dob })` — updates `profiles`.
- `setPatientActiveFn({ userId, is_active, note? })` — upserts `patient_status`.
- `sendPatientPasswordResetFn({ userId })` — loads `supabaseAdmin` inside handler, calls `auth.admin.generateLink({ type: 'recovery', email })` and emails via Supabase.

## Routes

- `src/routes/_authenticated/admin.patients.tsx` → layout wrapper with `<Outlet />` (replaces current single-file route).
- `src/routes/_authenticated/admin.patients.index.tsx` → **list page**
  - Search box (debounced, URL-synced via `validateSearch`), status filter (All / Active / Deactivated), paginated table.
  - Columns: Name, Email, Phone, DOB, Joined, Status, actions (View, Deactivate/Reactivate, Send password reset).
  - Row click → detail page.
- `src/routes/_authenticated/admin.patients.$patientId.tsx` → **detail page**
  - Tabs: **Profile** (editable form), **Intake responses** (read-only list of question + answer), **Account** (status toggle, last sign-in, send password reset button, danger zone).
  - Header shows avatar, name, email, status badge.

Title map in `admin.tsx` updated: `/admin/patients` → "Patients", `/admin/patients/$id` → "Patient details".

## Components

- `src/components/admin/patient-row-actions.tsx` — dropdown for table row actions.
- `src/components/admin/patient-profile-form.tsx` — name/phone/dob editable form (react-hook-form + zod, mirrors existing form patterns).
- `src/components/admin/patient-intake-responses.tsx` — renders grouped Q&A list with empty state.
- `src/components/admin/patient-account-panel.tsx` — status switch, password-reset button (confirm dialog), shows audit metadata.
- Sidebar `Patients` link already exists — no change.

## Query options

`src/lib/query-options/patients.ts` exports `patientsListQuery({...})`, `patientQuery(id)`, `patientIntakeResponsesQuery(id)`. Loaders call `ensureQueryData`; components use `useSuspenseQuery`. Mutations invalidate the relevant keys.

## Out of scope

- Patient-side intake submission flow (only admin-side viewing of existing responses; if no responses exist yet, empty state is shown).
- Orders/billing/consultation history (no such tables yet).
- Hard-deleting accounts (deactivation only, to keep `auth.users` intact).
- Bulk actions and CSV export.

## Notes

- "Deactivated" is enforced via `patient_status.is_active = false`; the `_authenticated` gate stays as-is (we don't block sign-in at the auth layer in this pass — that would require an auth hook). We can wire a redirect on the dashboard later if needed.
- All admin mutations re-verify `has_role(admin)` server-side before writing.
