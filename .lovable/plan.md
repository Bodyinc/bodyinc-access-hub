## Add Provider Feature

US-healthcare provider management for the admin portal. Admins invite providers (who set their own password via emailed reset link), edit their record later, toggle active/inactive, and soft- or hard-delete.

### Database (one migration)

New table `public.providers` (1:1 with `auth.users`):

- `id uuid PK references auth.users(id) on delete cascade`
- Core: `email text not null unique`, `full_name text not null`, `phone text`, `avatar_url text`, `bio text`
- Licensing: `credentials text` (MD/DO/NP/PA/other), `specialty text`, `npi text` (10 digits), `dea text`, `license_number text`, `license_states text[]` (US state codes)
- Practice: `years_experience int`, `languages text[]`, `consultation_types text[]` (video/phone/chat/in-person), `practice_states text[]`
- Address: `address_line1 text`, `address_line2 text`, `city text`, `state text` (2-char), `zip text` (5 or 9 digit), `country text default 'US'`
- Status: `is_active boolean not null default true`, `created_at`, `updated_at`
- Trigger: `updated_at` auto-touch
- Grants: `authenticated` full CRUD, `service_role` all
- RLS:
  - Admins (via `has_role(auth.uid(),'admin')`) → full CRUD
  - A provider can `SELECT`/`UPDATE` their own row (`id = auth.uid()`)
- Add `has_role(_user_id uuid, _role app_role)` helper if it isn't already there (current schema only has `get_user_role`).
- Extend `_authenticated/route.tsx` gate logic later if needed — not in this change.

### Server functions (`src/lib/providers.functions.ts`)

All gated with `requireSupabaseAuth` + admin check via `has_role` RPC. Privileged ops dynamically import `client.server`'s `supabaseAdmin`.

- `listProviders({ search?, status? })` — joins `providers` + `user_roles`; returns rows for the table view.
- `getProvider({ id })` — single record for the edit screen.
- `createProvider({ ...providerFields })`:
  1. `supabaseAdmin.auth.admin.createUser({ email, email_confirm: true })`
  2. Insert `user_roles` row with role `'provider'`
  3. Insert `providers` row keyed by the new user id
  4. `supabaseAdmin.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo: '<origin>/reset-password' } })` and let Supabase email it (Brevo SMTP already configured)
- `updateProvider({ id, ...fields })` — admin RLS allows the update.
- `resendInvite({ id })` — re-issues the recovery link.
- `setProviderActive({ id, is_active })` — flips flag; when false, also call `supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: '876000h' })` to block login. Re-activating clears the ban.
- `deleteProvider({ id })` — `supabaseAdmin.auth.admin.deleteUser(id)`; cascades remove `providers` + `user_roles`.

Validation: zod schema (NPI = 10 digits, DEA = 2 letters + 7 digits, ZIP 5 or 9, US state code in enum list, email format). Shared between client form and server handler.

### Routes / UI

Replace placeholder `src/routes/_authenticated/admin.providers.tsx` with a list view, and add two more files:

- `admin.providers.tsx` — table with search (name/email/specialty), status filter (All/Active/Inactive), "Add Provider" button → `/admin/providers/new`. Row actions: Edit, Resend invite, Activate/Deactivate, Delete (confirm dialog).
- `admin.providers.new.tsx` — full form, on submit calls `createProvider`, toasts "Invite link sent", redirects to list.
- `admin.providers.$providerId.tsx` — edit form pre-filled via `getProvider`; save calls `updateProvider`.

Form is split into shared component `src/components/admin/provider-form.tsx` with sections: Identity, Licensing & Credentials, Practice, Address, Status. Uses react-hook-form + zod, shadcn `Form`, `Input`, `Select`, `Textarea`, `MultiSelect` (build a small Combobox for state/language multi-select), `Switch` for active.

Data fetching: TanStack Query — `useSuspenseQuery` in routes, mutations via `useMutation` + `queryClient.invalidateQueries(['providers'])`.

### Files

Create:
- `src/lib/providers.functions.ts`
- `src/lib/providers.schema.ts` (zod + US states/credentials constants shared client+server)
- `src/components/admin/provider-form.tsx`
- `src/routes/_authenticated/admin.providers.new.tsx`
- `src/routes/_authenticated/admin.providers.$providerId.tsx`

Edit:
- `src/routes/_authenticated/admin.providers.tsx` (replace placeholder with list view)

Migration: `providers` table + `has_role` function (if missing) + RLS + grants + updated_at trigger.

### Out of scope

- Bulk import
- Provider availability / scheduling (separate Slots feature)
- File upload for avatar (URL field only for now — storage bucket can come later if you want)
- Audit log
