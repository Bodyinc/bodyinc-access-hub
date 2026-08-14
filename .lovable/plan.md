# Refund History + Medicine Change History pages

Two new admin pages that give a full audit trail: one for every refund ever requested, one for every time a medicine/plan was switched by an admin or a practitioner.

## 1. Refund history — `/admin/billing/refund-history`

Today the Billing → Refunds tab shows a live action list capped at 300 rows with client-side search only. The new page is a read-only historical view:

- Filters: status (all / pending / approved / rejected), date range (last 7/30/90 days, all time).
- Search by refund ID (`#BI-XXXX`, `BI-XXXX`, raw UUID), patient name or email — same ID rules already used on Patients and Requests.
- Columns: Refund ID (`#BI-XXXX`), patient, amount, reason, status, admin note, reviewed by, requested date, resolved date, Stripe refund ID, invoice link.
- Server-side pagination (25/page) with total count, plus a CSV export of the current filter.
- Reached from a "View full history" link on the existing Refunds tab, and from the Billing sidebar entry.

## 2. Medicine change history — `/admin/medicine-changes`

A record of every medicine/plan switch, whether done by an admin (subscription change) or a practitioner (order change during review).

- Columns: date, order ID (`#BI-XXXX`), patient, changed from → changed to (medicine + variant + plan), price difference (extra charge or credit), category change flag + clinical reason, actor name and role (admin / practitioner), note.
- Filters: actor role, cross-category only, date range; search by order ID, patient or medicine name.
- Row click opens the related order detail page.
- Server-side pagination + CSV export.

Because practitioner-side changes are currently only written to the order timeline (not the admin log), the change flow will also start writing a structured audit row so this page has complete, consistent data going forward. Existing changes recorded on order timelines are backfilled into the view where the data allows.

## Technical notes

- New server functions in `src/lib/billing.functions.ts` (`listRefundHistory`) and a new `src/lib/audit.functions.ts` (`listMedicineChanges`), both admin-guarded via `assertAdmin`, using `supabaseAdmin`, with `range()` pagination and `count: "exact"` — same shape as `listActivityLog`.
- `changeRequestMedicine` in `src/lib/requests.functions.ts` gains an `admin_activity_log` insert with `action: "request.change_medicine"`, `entity: "medication_requests"`, and `before`/`after` payloads holding medicine/variant/package ids, names, delta cents, cross-category flag and reason. `subscription.change_medicine` in `src/lib/orders.functions.ts` gets the same enriched payload.
- Read path merges `admin_activity_log` rows with `medication_request_events` of type `category_changed` and `additional_payments` rows (for delta) so historical changes still show.
- New routes: `src/routes/_authenticated/admin.billing.refund-history.tsx` and `src/routes/_authenticated/admin.medicine-changes.index.tsx` (+ `admin.medicine-changes.tsx` outlet), each with `head()` metadata and `robots: noindex`, matching the existing admin route conventions.
- UI reuses `PageHeader`, `RefreshButton`, `adminInput`, the existing admin table wrapper styles, `formatRecordId` / `normalizeIdSearch` / `formatDollars` / `formatDate`.
- Sidebar: add "Refund history" under Billing and "Medicine changes" in `src/components/admin/admin-sidebar.tsx`, plus title entries in `admin.tsx`.
- No database migration required — both pages read existing tables.
