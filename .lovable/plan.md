## Normalize user data — single source of truth

Make `profiles` the only place common user info lives (admins, providers, patients). `providers` holds only provider-specific fields. `user_roles` keeps roles. `auth.users` is auth only.

### Schema migration

1. Extend `public.profiles`:
   - Add `email text` (synced from `auth.users`), `avatar_url text`, `updated_at` already present.
   - Backfill `email` from `auth.users.email` for existing rows.
   - Add `UNIQUE (email)`.
   - Update `handle_new_user()` trigger to also write `email` and `avatar_url` from `auth.users` / `raw_user_meta_data`.
   - Add trigger on `auth.users` UPDATE (email change) to sync `profiles.email`.
   - RLS: keep "users view/insert/update own profile"; add admin full-access policy via `has_role(auth.uid(),'admin')` so admin lists work.

2. Refactor `public.providers`:
   - Backfill `profiles` rows for any provider whose profile is missing (copy `full_name`, `phone`, `email`, `avatar_url`).
   - Drop columns: `email`, `full_name`, `phone`, `avatar_url`.
   - Drop indexes on those columns; add `providers_specialty_idx` on `lower(specialty)` for search.
   - Keep all provider-specific columns (bio, credentials, specialty, npi, dea, license_*, years_experience, languages, consultation_types, practice_states, address_*, country, is_active).

3. `user_roles`: unchanged. Add grants if missing (already granted).

4. Helper view `public.provider_directory` (security_invoker) joining `providers` + `profiles` for admin list queries — keeps server code simple and respects RLS:
   ```
   SELECT p.id, pr.full_name, pr.email, pr.phone, pr.avatar_url,
          p.specialty, p.credentials, p.is_active, p.created_at
   FROM public.providers p
   JOIN public.profiles pr ON pr.id = p.id;
   ```

### Code updates (after migration approval + types regen)

- `src/lib/providers.schema.ts`: split into two zod schemas — `profileFieldsSchema` (full_name, phone, email, avatar_url) and `providerFieldsSchema` (provider-only). Combine for the form.
- `src/lib/providers.functions.ts`:
  - `createProvider`: createUser → insert `profiles` (id, email, full_name, phone, avatar_url) → insert `user_roles` → insert `providers` (provider-only fields) → send reset link.
  - `updateProvider`: split payload — write profile fields to `profiles`, provider fields to `providers`.
  - `listProviders`: query `provider_directory` view (or join in code).
  - `getProvider`: select `providers.*` and join `profiles` (`profiles!inner(full_name, email, phone, avatar_url)`); flatten before returning.
  - `resendInvite`: read email from `profiles` instead of `providers`.
- `src/components/admin/provider-form.tsx`: no UX change — form still shows identity + provider sections; the submit payload is split server-side.
- `src/routes/_authenticated/admin.providers.index.tsx` & `admin.providers.$providerId.tsx`: adjust to new shape returned by list/get.

### Out of scope

- Patients table (will come with patient feature).
- Avatar storage bucket.
- Migrating admin self-edit UI.
