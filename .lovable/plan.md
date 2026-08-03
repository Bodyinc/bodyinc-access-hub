# Unified ID display format: `#BI-XXXX`

Every internal record ID (patients, orders/subscriptions, medication requests, intake sessions, prescriptions) is currently shown either as a full UUID or as an ad-hoc 8-character truncation. This standardises them to a single readable format: `#BI-` followed by the first 4 characters of the ID, uppercased — e.g. `#BI-9A3F`.

## What changes

A shared formatter is added and used everywhere an ID is shown to a user:

- Order / subscription detail header (currently the full UUID)
- Orders list table (currently `9a3f12ab…`)
- Medication request review panel header (admin + practitioner) — currently the full UUID
- Patient detail page: order and payment rows
- Prescription page (`Rx: …`)
- Any other place a record's own ID is rendered

Not changed (these are external references, not our IDs): Stripe subscription / invoice / payment-intent IDs, promo codes, and activity-log action names.

## Search behaviour

Where a list lets you search by order ID, the search will accept the displayed form too — typing `#BI-9A3F`, `BI-9A3F`, or `9a3f` all match — so people can copy the code straight off the screen and paste it into search.

## Technical notes

- Add `formatRecordId(id)` to `src/lib/format.ts`: returns `#BI-` + `id.slice(0, 4).toUpperCase()`, and `—` for nullish values.
- Replace raw/truncated ID renders in: `src/routes/_authenticated/admin.orders.$orderId.tsx`, `src/routes/_authenticated/admin.orders.index.tsx`, `src/components/admin/request-review-panel.tsx`, `src/routes/_authenticated/admin.patients.$patientId.tsx`, `src/routes/_authenticated/rx.$prescriptionId.tsx`, plus any equivalent spots found during the pass.
- Add a small `normalizeIdSearch()` helper that strips a leading `#`/`BI-` prefix before the query is sent, applied in the order/request search inputs.
- Nothing in the database changes; this is display-only. Note that a 4-character prefix is not unique, so it stays a label — full UUIDs remain in URLs and API calls.
