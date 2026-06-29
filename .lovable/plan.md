## Goal

Replace the localStorage-backed `medicines.store.ts` and `packages.store.ts` with real Supabase persistence so the Admin medicines/packages screens read and write to the database.

## Database

Two new migrations (one combined migration is fine):

**Table `public.medicines`**
- `id uuid pk default gen_random_uuid()`
- `name text not null`, `short_description text not null`
- `long_description text`, `image_url text`
- `price_monthly numeric(10,2) not null default 0`
- `status medicine_status not null default 'draft'` (enum: `active | inactive | draft`)
- `important_info jsonb not null default '[]'` (array of strings)
- `notice_text text`
- `sort_order int not null default 0`
- `is_active bool not null default false` (derived from status via trigger)
- `created_at`, `updated_at` + `update_updated_at_column` trigger

**Table `public.packages`**
- `id uuid pk`
- `medicine_id uuid not null references public.medicines(id) on delete cascade`
- `name text not null`, `duration_months int not null`
- `original_price numeric(10,2) not null`, `price numeric(10,2) not null`
- `is_most_popular bool not null default false`
- `features jsonb not null default '[]'`
- `clinical_note text`, `sort_order int not null default 0`
- `is_active bool not null default true`
- timestamps + trigger
- Trigger: when a row is inserted/updated with `is_most_popular = true`, clear flag on other packages of the same medicine.

**GRANTs / RLS**
- `GRANT SELECT ON public.medicines, public.packages TO anon` (publicly readable for the marketing site).
- `GRANT SELECT, INSERT, UPDATE, DELETE TO authenticated`, `GRANT ALL TO service_role`.
- Enable RLS.
- Policies: `SELECT` for `anon` and `authenticated` (only `is_active = true` for `anon`, all rows for `authenticated`); `INSERT/UPDATE/DELETE` restricted to `public.has_role(auth.uid(), 'admin')`.

**Storage bucket `medicine-images`**
- Public bucket (already referenced by `medicine-image-upload.ts`).
- Policy: anyone can read; only admins can insert/update/delete.

## Server functions

New file `src/lib/medicines.functions.ts`:
- `listMedicinesFn` (public, uses server publishable client) — supports `{ search, status }`.
- `getMedicineFn({ id })` (public).
- `createMedicineFn`, `updateMedicineFn`, `deleteMedicineFn`, `setMedicineStatusFn` — protected with `requireSupabaseAuth` + `has_role('admin')` check.

New file `src/lib/packages.functions.ts` (replace the empty stub):
- `listPackagesFn({ search, medicine_id, status })` (public, joins medicine name).
- `getPackageFn({ id })` (public).
- `createPackageFn`, `updatePackageFn`, `deletePackageFn`, `setPackageActiveFn` — admin-only.

All admin mutations re-check `has_role(userId, 'admin')` server-side before the write.

## Client wiring

- Rewrite `src/lib/medicines.store.ts` and `src/lib/packages.store.ts` to be thin wrappers that call the server functions (keep the same exported names — `listMedicines`, `getMedicine`, `createMedicine`, `updateMedicine`, `deleteMedicine`, `setMedicineActive`, plus the package equivalents) so existing routes/components don't need edits.
- `StoredMedicine` / `StoredPackage` types stay; map DB rows (`important_info`/`features` jsonb arrays of strings) into the existing shape.
- Drop the `SEED_IDS` constant — seed data now comes from a migration (insert the 3 demo medicines + 4 demo packages so the UI isn't empty on first load).
- Remove the `LocalStorageBanner` usage from medicines/packages admin routes.

## Out of scope

- Provider/profile/intake tables — untouched.
- Pre-existing TS errors unrelated to medicines/packages.
- No changes to form components or route files beyond removing the local-storage banner.
