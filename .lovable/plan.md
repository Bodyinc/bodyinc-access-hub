## Goal

Round out the admin portal with three new areas backed by existing seeded data: **Orders & Payments**, **Intake Sessions**, and a richer **Patient profile**. No schema changes — everything reads from tables that already exist (`shop_checkout_orders`, `shop_checkout_order_items`, `payments`, `intake_sessions`, `intake_session_questionnaire_responses`, `intake_session_eligibility_results`, `intake_session_medicines`, `profiles`).

## 1. Orders & Payments viewer

New sidebar item **Orders** (between Packages and Providers).

Routes:
- `src/routes/_authenticated/admin.orders.tsx` — pathless `<Outlet />`
- `admin.orders.index.tsx` — list
- `admin.orders.$orderId.tsx` — detail

List page:
- Table of `shop_checkout_orders` (newest first): order #, customer name/email, item count, total, status, payment status, created.
- Filters: search (name/email/order id), status select (all / paid / pending / failed / refunded — derived from data), date range.
- Row click → detail.

Detail page (read-only):
- Header: order id, created, status badges.
- Customer block: name, email, phone, shipping address.
- Items table from `shop_checkout_order_items` (image, name, qty, unit price, subtotal).
- Payments block: rows from `payments` for that order/session (amount, currency, Stripe intent id, status, timestamps).
- Raw payload accordion (`raw_event`) collapsed by default.

Server layer: extend `src/lib/orders.functions.ts` (new) with `listOrders({search,status,from,to})` and `getOrder(id)` server fns using `requireSupabaseAuth` + admin-role check via `has_role`.

## 2. Intake Sessions page

New sidebar item **Intake Sessions** (below Patients).

Routes:
- `admin.intake-sessions.tsx` (layout)
- `admin.intake-sessions.index.tsx` — list
- `admin.intake-sessions.$sessionId.tsx` — detail

List: table of `intake_sessions` — name/email, state, sex, DOB, status, selected plan (join to `packages`), claimed user, created. Filters: search, status, claimed/unclaimed toggle.

Detail:
- Demographics + computed BMI from `height_cm` / `weight_kg`.
- **Categories considered** from `intake_session_categories` with pass/fail per rule.
- **Eligibility results** from `intake_session_eligibility_results` (rule, passed, reason).
- **Questionnaire answers** from `intake_session_questionnaire_responses` joined to `questionnaire_questions` / `questionnaire_question_options` — rendered Q → A with disqualifying answers flagged.
- **Recommended medicines** from `intake_session_medicines` (linked to `medicines`).
- Linked payment (if any) and CTA to open the order.

Server layer: `src/lib/intake-sessions.functions.ts` with `listIntakeSessions(filters)` and `getIntakeSession(id)` (admin-gated).

## 3. Complete Patient profile

Extend `src/routes/_authenticated/admin.patients.$patientId.tsx` with tabs (shadcn `Tabs`):

- **Profile** — everything in `profiles` (name, email, phone, DOB, sex, full address, avatar, joined, last update). Read-only.
- **Intake Sessions** — sessions where `claimed_by_user_id = patient.id` or matching email; each row links to the intake session detail above.
- **Orders** — orders from `shop_checkout_orders` for this patient (by user_id/email); rows link to the order detail.
- **Payments** — flat list of `payments` for this user.
- **Account actions** — existing password-reset + activate/deactivate controls.

Extend `patients.functions.ts` with `getPatientOrders(userId)`, `getPatientIntakeSessions(userId)`, `getPatientPayments(userId)`.

## 4. Sidebar & titles

- Add "Orders" and "Intake Sessions" to `src/components/admin/admin-sidebar.tsx` (icons: `ShoppingCart`, `FileText`).
- Add matching titles + regex cases in `admin.tsx` `TITLES` map for the new list/detail routes.

## Technical notes

- All new server fns use `createServerFn` with `.middleware([requireSupabaseAuth])` and verify `has_role(userId,'admin')` before querying.
- Queries paginated at 100 rows, sorted `created_at DESC`.
- Reads use `context.supabase` (RLS as admin user). No service-role usage needed.
- New query-options files under `src/lib/query-options/` (`orders.ts`, `intake-sessions.ts`) following the existing pattern; components use `useQuery`.
- No DB migrations. No changes to seeded data, patient portal, or existing CRUD pages.

## Out of scope (ask again if wanted)

- Editing orders/payments/sessions (all read-only).
- Dashboard stat cards, Available Slots, and Intake Form settings — still placeholders.
- Refund actions or Stripe webhook wiring.
