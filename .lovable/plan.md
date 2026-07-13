# Adopt the Medicine-page style dashboard-wide

The reference (Edit medicine screen) already defines the target visual language. The purple brand tokens exist in `src/styles.css`, but most dashboard pages still render with default shadcn shapes/spacing and don't carry the rounded, soft-lavender card treatment shown in the reference. This plan makes every admin surface — sidebar, top bar, list pages, detail pages, forms, auth — look and feel like that Medicine screen.

## Visual language to standardize

Locked from the reference:
- **Palette:** deep purple `--brand` for headings, active nav, primary buttons; `--brand-strong` for links/underlines; `--brand-surface` (lavender) for sidebar + page background; `--brand-soft` for active pills / hover; `--brand-border` for card/divider lines; white card interiors.
- **Shape:** cards `rounded-2xl` with 1px `border-brand-border`, no heavy shadow. Inputs/selects `rounded-xl`, buttons `rounded-xl`, avatars/thumbs `rounded-xl` with lavender fill. Section separators are hairline `border-brand-border`.
- **Type:** display headings in the existing serif/display face, deep purple, generous size; body in the current sans, neutral foreground; helper text muted purple. Field labels compact, medium weight.
- **Spacing:** generous card padding (24–28px), 24px gap between cards, 12–16px between fields. Two-column form + preview on `lg`, stacked on smaller.
- **Sidebar:** lavender surface, no border on the right, active item = `bg-brand-soft` pill with purple text, inactive = neutral purple text, logo block sits above nav with a hairline divider, Settings/Logout pinned to the bottom with a divider above.
- **Top bar:** page title in deep purple display face + one-line muted description underneath, actions right-aligned as outlined pill buttons; sidebar toggle icon rendered as a small filled purple square (matches reference).
- **Buttons:** primary = solid `bg-brand text-brand-foreground rounded-xl` with subtle hover; secondary = `bg-white border-brand-border text-brand`; destructive keeps red but adopts the same radius.
- **Tables:** wrapped in a `rounded-2xl border-brand-border` shell, header row lavender-tinted, row hover `bg-brand-surface/60`, action buttons icon-only in purple.
- **Tabs:** underline in `--brand`, inactive labels muted, `TabsList` horizontally scrollable on mobile.
- **Empty states / badges:** lavender chips with purple text; status dots reuse semantic colors but sit on lavender pills.

## Part A — Design system pass (one place, cascades everywhere)

1. `src/styles.css`
   - Bump default `--radius` so `rounded-lg`/`rounded-xl` match the reference (target ~14–16px).
   - Add small utility layer (via `@utility`) for the card treatment used everywhere: `.card-surface` = white bg, `border-brand-border`, `rounded-2xl`, padding; and `.field-shell` for inputs to guarantee the rounded-xl lavender-border look even where shadcn Input hasn't been re-skinned.
   - Confirm `--muted` maps to a very light lavender so muted text/backgrounds match the reference.

2. `src/components/ui/*` re-skin (variants only, no API changes)
   - `button.tsx`: default variant = brand fill, outline = white/brand-border/brand-text, ghost = transparent/brand-text, all `rounded-xl`, height 40/44.
   - `input.tsx`, `textarea.tsx`, `select.tsx`: `rounded-xl border-brand-border focus:ring-brand`, lavender placeholder.
   - `card.tsx`: `rounded-2xl border-brand-border shadow-none`, header padding tuned.
   - `tabs.tsx`: underline uses `--brand`.
   - `badge.tsx`: add `brand` and `brand-soft` variants; status badges route through these.
   - `switch.tsx` / `checkbox.tsx`: checked state uses `--brand`.

3. `src/components/admin/admin-sidebar.tsx`
   - Match the reference exactly: lavender surface, no right border, logo header with hairline below, nav items as full-width rows with active pill (`bg-brand-soft`, `text-brand`, `rounded-xl`), Settings/Logout pinned to the bottom above a hairline. Remove any remaining hex.
   - Keep the small filled-purple sidebar toggle glyph next to the logo on desktop and inside the top bar on mobile.

4. `src/routes/_authenticated/admin.tsx`
   - Top bar: purple display title + muted subtitle (per-route copy already exists in `TITLES`), actions right, `SidebarTrigger` visible `< md`.
   - Page background `bg-brand-surface`, content wrapper `max-w-6xl mx-auto` with `px-4 sm:px-8 py-6 sm:py-8`.

## Part B — Screens to bring in line

For each screen: swap raw hex + default cards for the tokens and the re-skinned primitives from Part A. No new features, no logic changes.

- **Forms & previews** (already closest to target — audit + minor spacing/radius fixes)
  - `medicine-form.tsx`, `medicine-preview.tsx`
  - `package-form.tsx`, `package-preview.tsx`
  - `category-form.tsx`, `provider-form.tsx`, `promo-form.tsx`

- **List pages** — apply the card-wrapped table treatment, lavender header row, purple primary button, icon-only row actions:
  - `admin.medicines.index.tsx`, `admin.categories.index.tsx`, `admin.packages.index.tsx`, `admin.providers.index.tsx`, `admin.patients.index.tsx`, `admin.promos.index.tsx`, `admin.questionnaires.index.tsx`, `admin.medication-rules.index.tsx`, `admin.orders.index.tsx`, `admin.intake-sessions.index.tsx`

- **Detail pages** — heading style, tab underline, card shells, status pills:
  - `admin.index.tsx` (dashboard cards)
  - `admin.orders.$orderId.tsx`, `admin.intake-sessions.$sessionId.tsx`
  - `admin.patients.$patientId.tsx` (tabs + inner cards)
  - `admin.medicines.$medicineId.tsx`, `admin.packages.$packageId.tsx`, `admin.packages.new.tsx`
  - `admin.providers.$providerId.tsx`, `admin.categories.$categoryId.tsx`
  - `admin.promos.$promoId.tsx`, `admin.questionnaires.$questionnaireId.tsx`
  - `admin.intake-form.tsx`, `admin.slots.tsx`, `admin.billing.index.tsx`
  - `subscriptions-table.tsx`, `refunds-table.tsx`

- **Auth & practitioner**
  - `auth.tsx`, `forgot-password.tsx`, `reset-password.tsx`: lavender page bg, centered `rounded-2xl` white card with brand-border, purple primary button, display-face heading.
  - `dashboard.tsx`: match top bar + card treatment.

- **Global**
  - `refresh-button.tsx`: keep behavior, restyle through the new outline button variant (drop hex).
  - `__root.tsx`: body bg = `bg-brand-surface`.

Rule enforced during the sweep: no `#hex`, no `text-white`/`bg-black`, no raw `bg-primary` where a brand token fits better; everything routes through the tokens + re-skinned primitives.

## Part C — Verification

- Build + typecheck must pass.
- Spot-check at 375 / 768 / 1280:
  - Sidebar collapses to icon strip on `<md`, trigger visible in top bar.
  - Tables scroll horizontally inside their rounded card shell.
  - Forms stack under `lg`, preview column unsticks.
  - Auth card centers with `w-full max-w-md`.
- Visual parity check against the reference: sidebar active pill, card radius, primary button, input radius, heading color/face.

## Out of scope

- No changes to data fetching, server functions, DB schema, or business logic.
- No new pages or features.
- Dark mode is not part of this pass (light-only, matching the reference).

## Technical notes

- All new values stay in `src/styles.css` as `oklch(...)` and are registered inside `@theme inline` so utilities compile.
- Re-skinning shadcn primitives keeps every existing call site working — no prop or import changes at usage sites.
- Where a screen currently hardcodes hex, it's replaced with the matching token (`bg-brand`, `text-brand`, `border-brand-border`, `bg-brand-soft`, `bg-brand-surface`), never a new hex.
