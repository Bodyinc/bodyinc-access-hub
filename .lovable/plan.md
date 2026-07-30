## Goal

Make every data-entry surface in the Admin and Practitioner portals grammatically consistent: UI copy, typed values, and validation/feedback messages.

## 1. Copy style rules (applied everywhere)

- **Labels**: sentence case, no trailing colon ("Full name", "Years of experience"). Acronyms stay uppercase: ID, NPI, DEA, BMI, ZIP, USD, SKU.
- **Placeholders**: sentence case, real examples prefixed "e.g. " ("e.g. Weight loss"). No trailing period.
- **Search fields**: single pattern — "Search by name, email, or phone…" (Oxford comma, single ellipsis character, never "...").
- **Select placeholders**: "Select a provider", "Select a state", "All statuses".
- **Buttons**: sentence case verbs — "Save changes", "Create category", "Cancel", "Delete permanently". Pending states use "Saving…", "Creating…".
- **Section titles/descriptions**: sentence case titles, descriptions are full sentences ending in a period.

Known offenders to fix include: "Select Status" → "Select a status", "Search by customer or order id" → "Search by customer or order ID", "10 digits" → "e.g. 1234567890", all `...` → `…`, "Reason for rejecting (optional)..." → "Reason for rejecting (optional)".

## 2. Typed-value normalization

Add `src/lib/text-normalize.ts` with small helpers:

- `titleCaseName(v)` — capitalizes each word for person/product names (preserves hyphens, apostrophes, and existing all-caps acronyms).
- `sentenceCase(v)` — capitalizes first letter for descriptions, bios, notes, reasons.
- `upperTrim(v)` — states, ZIP suffixes, DEA, promo codes.
- `slugify(v)` — lowercase slugs.
- `collapseSpaces(v)` — trims and collapses whitespace (applied to every text input on save).

Applied on submit (not while typing, so the cursor never jumps), inside the zod schemas via `.transform()` where a schema exists:

| Field group | Rule |
| --- | --- |
| Provider/patient names, medicine name, category name, variant name, plan name, questionnaire name | title case + collapse spaces |
| Descriptions, bios, notes, clinical notes, rejection/cross-category reasons, disclaimers | sentence case + collapse spaces |
| Email | lowercase + trim |
| Promo code, DEA, licensed/blocked states | uppercase + trim |
| Slug | slugify |
| Phone, NPI, ZIP | trim, digits kept as entered |

Touched schemas/forms: `medicines.schema.ts`, `categories.schema.ts`, `packages.schema.ts`, `providers.schema.ts`, promo form, questionnaire editor, provider profile, request notes and review panel, medication rules, referrals.

## 3. Validation & feedback messages

- Zod messages become full sentences with a capital first letter and no trailing period: "Enter a valid email address", "Name must be at least 2 characters", "Select at least one category".
- Toasts follow one pattern: success = "<Thing> saved." / "<Thing> created." / "<Thing> deleted."; error = the server message, capitalized, with a fallback "Something went wrong. Please try again."
- Confirm dialogs: title as a question ("Delete this medicine?"), body as a full sentence explaining consequences.

## 4. Verification

Prettier + ESLint + typecheck, then a Playwright pass over the main admin forms (medicine, category, provider, promo, questionnaire) and the practitioner profile to screenshot labels/placeholders and confirm nothing regressed.

## Technical notes

Normalization lives in schema `.transform()` calls so both the form and the server function receive already-normalized values; forms without a zod schema get the helper applied in their submit handler. No database or business-logic changes — display and input handling only.
