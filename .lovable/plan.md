## Category form cleanup

Update the Category create/edit form and supporting code:

### 1. Remove "Assigned medicines"
- Delete the entire "Assigned medicines" card from `src/components/admin/category-form.tsx`.
- Drop `medicine_ids` from `CategoryFormValues` (`src/lib/categories.schema.ts`) and remove all references in `src/lib/categories.store.ts` (`syncMedicines`, `medicine_ids` in `StoredCategory`, list/get selects with `medication_category_medicines`).
- Remove the `medicines` prop from `CategoryForm` and stop fetching medicines in `admin.categories.new.tsx` and `admin.categories.$categoryId.tsx`.
- Leave the `medication_category_medicines` table in place (no destructive migration) since it may still be used elsewhere; just stop reading/writing it from the category form.

### 2. Eligibility rules gated by toggle
- Add a local UI-only state `showEligibility` in `CategoryForm` (default: `true` when editing a category that already has any rules configured, otherwise `false`).
- Add a `Switch` labeled "Add eligibility rules" above the Eligibility card.
- Only render the Eligibility card when the toggle is on. When toggled off, clear all eligibility values (bmi_bands/sex/min_age/max_age/blocked_state_codes) before submit so nothing stale persists.

### 3. Replace icon + description with an image upload
- Remove the `icon` field and the `description` textarea from the form UI.
- Drop `icon` and `description` from `categoryFormSchema` and from `fromForm`/`rowToStored` writes (keep the DB columns; just stop writing them).
- Add a new `image_url` field:
  - DB migration: `ALTER TABLE public.medication_categories ADD COLUMN image_url text;`
  - Create a public `category-images` bucket via `supabase--storage_create_bucket` and add RLS on `storage.objects`: public SELECT, admin-only INSERT/UPDATE/DELETE (mirroring the existing `medicine-images` policies).
  - Add `src/lib/category-image-upload.ts` mirroring `src/lib/medicine-image-upload.ts`.
  - Add an upload control to the form (drag/drop area + preview + remove), similar in style to the medicine image uploader but scoped to the category card.
- Update `StoredCategory` and `categoriesQueryOptions` consumers to expose `image_url`. Update the categories list page to show the image thumbnail where the icon used to appear.

### Technical notes
- `CategoryFormValues` becomes: `slug, name, tagline, sort_order, is_active, image_url, eligibility_rules`.
- If `supabase--storage_create_bucket` is blocked by the workspace public-bucket policy, fall back to reusing the existing `medicine-images` bucket under a `categories/` prefix, and note it for the user.
- No changes to patient-facing routes in this pass — only admin form + store + schema + one migration.
