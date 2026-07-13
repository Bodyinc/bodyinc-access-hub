
## Goal

1. The purple brand (used in sidebar, medicine list, refresh button) is currently hardcoded with hex values (`#2A00A2`, `#4A3AFF`, `#E2DCFA`, `#F5F3FF`, `#EAE6FA`) in a handful of files. Newer admin pages (Orders, Intake Sessions, Patient tabs, Billing, etc.) still use default shadcn tokens (`bg-primary`, `bg-muted`, plain neutral cards), so the admin feels visually split.
2. Many admin list/detail pages break on tablet/mobile: wide tables overflow, header rows collapse, sidebar toggle missing, filter bars wrap awkwardly.

Fix both in one pass by promoting the purple brand to real design tokens and applying a consistent responsive pattern.

## Part A — Theme unification

### A1. Add brand tokens to `src/styles.css`

Introduce semantic tokens (OKLCH) so `bg-brand`, `text-brand`, `bg-brand-soft`, `border-brand-muted`, `bg-brand-surface` work as Tailwind utilities. Approximate mapping:

- `--brand` = `#2A00A2` (deep purple, primary actions, active nav text)
- `--brand-strong` = `#4A3AFF` (links, secondary nav text)
- `--brand-surface` = `#F5F3FF` (sidebar / page backgrounds)
- `--brand-soft` = `#EAE6FA` (active pill, hover)
- `--brand-border` = `#E2DCFA` (dividers, card borders)
- `--brand-foreground` = white

Also override shadcn semantic tokens so existing default components pick up the theme without touching every file:
- `--primary` → brand
- `--ring` → brand
- `--sidebar-*` block → brand surface / soft / border
- `--accent` / `--accent-foreground` → brand-soft / brand
- Keep `--background`, `--card` neutral (white) but shift `--muted` to a very light lavender.

Register all of the above in `@theme inline` so utilities like `bg-brand` compile.

### A2. Files to refactor from hex → tokens

Replace hardcoded hex classes with the new tokens (or with shadcn semantic classes, whichever fits):

- `src/components/admin/admin-sidebar.tsx`
- `src/components/admin/refresh-button.tsx`
- `src/components/admin/medicine-form.tsx`
- `src/components/admin/medicine-preview.tsx`
- `src/components/admin/package-form.tsx`
- `src/components/admin/package-preview.tsx`
- `src/components/admin/category-form.tsx`
- `src/components/admin/provider-form.tsx`
- `src/routes/_authenticated/admin.tsx` (top bar / titles)
- `src/routes/_authenticated/admin.medicines.index.tsx`
- `src/routes/_authenticated/admin.categories.index.tsx`
- `src/routes/_authenticated/admin.packages.index.tsx`
- `src/routes/_authenticated/admin.providers.index.tsx`
- `src/routes/_authenticated/admin.patients.index.tsx`
- `src/routes/_authenticated/admin.promos.index.tsx`
- `src/routes/_authenticated/admin.questionnaires.index.tsx`
- `src/routes/_authenticated/admin.questionnaires.new.tsx`
- `src/routes/_authenticated/admin.medication-rules.index.tsx`
- `src/routes/_authenticated/admin.orders.index.tsx`

### A3. Files that still use default tokens — align to brand

Sweep these to use the new tokens for primary CTAs, active states, tab underlines, badges, empty states, and card headers so they visually match the sidebar:

- `src/routes/__root.tsx` (body background)
- `src/routes/auth.tsx`, `forgot-password.tsx`, `reset-password.tsx`
- `src/routes/_authenticated/dashboard.tsx`
- `src/routes/_authenticated/admin.index.tsx` (dashboard cards)
- `src/routes/_authenticated/admin.intake-form.tsx`, `admin.slots.tsx`, `admin.billing.index.tsx`
- `src/routes/_authenticated/admin.orders.$orderId.tsx`
- `src/routes/_authenticated/admin.intake-sessions.index.tsx` + `admin.intake-sessions.$sessionId.tsx`
- `src/routes/_authenticated/admin.patients.$patientId.tsx` (tab underline → brand)
- `src/routes/_authenticated/admin.medicines.$medicineId.tsx`
- `src/routes/_authenticated/admin.packages.$packageId.tsx`, `admin.packages.new.tsx`
- `src/routes/_authenticated/admin.providers.$providerId.tsx`
- `src/routes/_authenticated/admin.categories.$categoryId.tsx`
- `src/routes/_authenticated/admin.promos.$promoId.tsx`
- `src/routes/_authenticated/admin.questionnaires.$questionnaireId.tsx`
- `src/components/admin/subscriptions-table.tsx`, `refunds-table.tsx`, `promo-form.tsx`

Rule: no new hex values in components — everything routes through the tokens added in A1.

## Part B — Responsive pass

Apply a single consistent responsive pattern (per the responsive-layout guidance) to every admin page.

### B1. Shell (`admin.tsx`)

- Add `<SidebarTrigger />` in the top bar visible on `< md` so mobile users can open the sidebar.
- Top bar: `grid-cols-[auto_minmax(0,1fr)_auto]`, title with `truncate`, actions `shrink-0`.
- Main content padding scales: `px-3 sm:px-6 py-4 sm:py-8`.

### B2. List pages (all `admin.*.index.tsx`)

Common pattern:
- Header row: `grid grid-cols-[minmax(0,1fr)_auto] gap-3 sm:flex sm:items-center sm:justify-between` with `min-w-0` on the title block and `shrink-0` on action buttons.
- Filter bar: `flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap`; search input full-width on mobile.
- Tables: wrap in `<div className="overflow-x-auto rounded-xl border border-brand-border">`; on `< sm` swap to a stacked card list (map rows to `Card` with label/value pairs) for Orders, Intake Sessions, Patients, Payments where the table is wide.
- Row action buttons: keep icon-only on mobile with `sr-only` labels.

### B3. Detail pages

- Two-column layouts (`lg:grid-cols-2`) already stack; audit for `whitespace-nowrap`/fixed widths and remove.
- `Tabs` on patient detail: allow horizontal scroll (`overflow-x-auto` on `TabsList`).
- Long JSON / payload viewers: `overflow-x-auto` + `text-xs`.

### B4. Forms (`medicine-form`, `package-form`, etc.)

- Convert 2-col field grids to `grid gap-4 md:grid-cols-2`.
- Sticky preview column: only `lg:sticky`, unset on mobile (already the case in medicine/package — verify others).
- Footer action row: `flex flex-col-reverse gap-2 sm:flex-row sm:justify-end`.

### B5. Auth pages

- `auth.tsx`, `forgot-password.tsx`, `reset-password.tsx`: center card with `w-full max-w-md px-4`, ensure logo/heading scale (`text-2xl sm:text-3xl`).

## Deliverables

1. Updated `src/styles.css` with brand tokens + shadcn overrides.
2. Refactored components/routes listed in A2/A3 — no raw hex.
3. Responsive updates per B1–B5.
4. Quick smoke test: build passes, sidebar navigation intact, sidebar tokens still map correctly.

## Out of scope

- No changes to business logic, server functions, DB schema, or query behavior.
- No new features/pages.
- Marketing/public site untouched beyond auth pages.

## Technical notes

- All colors defined as `oklch(...)` in `:root` (and mirrored in `.dark` if dark mode is desired later — for now light only, matching current admin).
- Register brand tokens as `--color-brand`, `--color-brand-strong`, `--color-brand-surface`, `--color-brand-soft`, `--color-brand-border`, `--color-brand-foreground` inside `@theme inline` so utility classes compile.
- Prefer shadcn semantic classes (`bg-primary`, `bg-accent`, `border-border`) once `--primary`/`--accent`/`--sidebar-*` are pointed at brand; use `bg-brand-*` only where a shadcn token doesn't fit.
- Responsive uses Tailwind breakpoints `sm` (640), `md` (768), `lg` (1024). Test viewports: 375, 768, 1280.
