## Goal

Today refunds only exist as a flat table under Admin → Billing → Refunds, with no way to see how many are processed vs. waiting on you. Add a clear overview.

## What gets built

**1. Refund summary strip (Billing → Refunds tab)**

Four small cards above the table, computed from the refund rows already loaded:
- Needs approval — count + total dollar amount of `pending` requests
- Approved / processed — count + total refunded amount
- Rejected — count
- Total requested — count + amount, all time

The "Needs approval" card is highlighted when the count is above zero.

**2. Status filter**

A row of filter chips (All / Pending / Approved / Rejected) next to the existing search box, so you can jump straight to the queue of items awaiting your action. Filtering happens client-side on the already-fetched list; search keeps working on top of it.

**3. Dashboard tie-in**

The admin dashboard already has a "Refunds to approve" action card. Add a second refunds figure to it flow: a "Refunds processed" line showing the count of approved refunds in the selected 7/30/90-day window, linking to `/admin/billing`.

## Technical notes

- Refund summary + filters are pure presentation in `src/components/admin/refunds-table.tsx`, derived with `useMemo` from the existing `listRefunds` result — no new server calls.
- Cards reuse the existing admin card styling and `formatDollars` from `src/lib/format.ts`.
- For the dashboard figure, `src/lib/admin-dashboard.server.ts` currently only counts pending refunds; extend that query to also fetch `status`, `amount_cents`, `reviewed_at` so an in-window approved count can be returned, and surface it in `attention-cards.tsx`.
- No schema changes, no new tables, no changes to approve/reject behaviour.
