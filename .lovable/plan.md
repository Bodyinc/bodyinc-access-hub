## Goal

Add a "Danger zone" tab in Admin → Settings with a checklist of data groups to wipe, plus a confirm dialog before anything is deleted.

## Checklist options (only viable groups)

1. **Orders & requests** — medication requests + their events, prescriptions, shop checkout orders/items/events
2. **Billing & payments** — payments, subscriptions, additional payments, refund requests, cancellation feedback, stripe events, wallet transactions
3. **Intake sessions** — intake sessions and all their answers/eligibility/selection rows
4. **Catalog (medicines)** — medicines, variants, packages, category↔medicine links
5. **Categories / goals** — medication categories, questionnaire↔category links, medicine links
6. **Questionnaires** — questionnaires, questions, options
7. **Medication rules** — compatibility/restriction pairs

Not offered (unsafe / would break the app): patient accounts & profiles, user roles, platform settings. I'll note this in the UI.

Deletion respects dependencies: selecting a "parent" group (e.g. Catalog) automatically clears dependent rows that reference it (orders/requests pointing at medicines) so no foreign-key errors — the dialog lists what will be cascaded.

## UI

- New "Danger zone" tab in `admin.settings.index.tsx`, styled with red accents.
- Card with checkbox list (label + one-line "what this removes"), "Select all" toggle.
- Delete button disabled until at least one box is checked; opens AlertDialog requiring the word `DELETE` typed to confirm.
- On success: toast with per-group deleted counts, invalidate all admin queries.

## Technical

- New `src/lib/danger-zone.functions.ts`: `wipePlatformData` server fn, `requireSupabaseAuth` + `assertAdmin`, Zod-validated array of group keys, uses `supabaseAdmin` loaded inside the handler.
- Deletes run in a fixed dependency order (children before parents), returning `{ group: count }`.
- Writes one `admin_activity_log` entry (`action: "danger.wipe"`) recording which groups were wiped.
- Stripe objects are NOT touched — this only clears the app database. Called out in the dialog text.