## Admin Dashboard

Replace the placeholder at `/admin` (currently 4 "Coming soon" cards) with a real operations overview built from existing tables: `payments`, `medication_requests`, `subscriptions`, `intake_sessions`, `profiles`, `providers`, `refund_requests`, `medicines`, `admin_activity_log`.

### 1. KPI row (with 30-day vs previous-30-day trend)
- Revenue (sum of succeeded `payments.amount_cents`)
- New patients (`profiles` created)
- Requests created
- Active subscriptions

### 2. Attention panel — what an admin must act on today
Clickable cards that deep-link into existing screens:
- Unassigned requests (no `provider_id`, paid/awaiting states) → `/admin/requests`
- Pending review / awaiting additional payment → `/admin/requests`
- Refund requests pending → `/admin/billing`
- Failed payments (last 30 days) → `/admin/billing`
- Abandoned intake sessions (started, not paid, not expired) → `/admin/intake-sessions`

### 3. Charts (Recharts, already available in the stack)
- Revenue trend: daily line/area chart, last 30 days
- Requests by status: horizontal bar
- New patients per day: bar chart

### 4. Lists
- Latest 8 requests: patient name, medicine, status badge, provider, created — row click opens the request
- Top 5 medicines by request volume (last 30 days)
- Recent admin activity (last 6 rows from `admin_activity_log`)

### 5. Controls
- Range switcher: 7 / 30 / 90 days, driving all metrics and charts
- Refresh button (reuses `src/components/admin/refresh-button.tsx`)
- Skeleton loading states and a friendly empty state when there is no data yet

### Technical notes
- New `src/lib/admin-dashboard.functions.ts`: one `getAdminDashboard` server function (`requireSupabaseAuth` + `assertAdmin`, `supabaseAdmin` imported inside the handler) returning `{ kpis, attention, series, recent, topMedicines, activity }` for a given `days` input. Aggregation done in the handler over bounded, date-filtered selects — no new tables or migrations.
- Called from the component with `useServerFn` + `useQuery` (not a loader), matching the existing admin pages.
- UI split into small components under `src/components/admin/dashboard/` (`kpi-card.tsx`, `attention-cards.tsx`, `revenue-chart.tsx`, `status-chart.tsx`, `recent-requests.tsx`).
- Styling uses the existing admin tokens in `src/lib/admin-ui.ts` and the sand/teal/ink palette already in use; page keeps its `head()` metadata with `noindex`.
