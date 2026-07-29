## Goal

Make it easy to get back from any inner page, and make Save/Cancel always reachable without scrolling.

## 1. Consistent back navigation

Today back links exist only on a few detail pages (orders, patients, intake sessions, request review) and each is hand-rolled; form pages (new/edit medicine, category, promo, provider, questionnaire) have no back affordance at all.

- Add a small shared `PageHeader` component (`src/components/admin/page-header.tsx`) with: a "Back to …" link (typed `to`, not `history.back()`), page title, optional subtitle, and a right-hand slot for actions.
- Add a breadcrumb line for nested pages (e.g. Medications › Semaglutide › Edit) using the existing shadcn breadcrumb primitive.
- Apply it to every inner page so each has an explicit parent link:
  - Medicines: new / `$medicineId` → /admin/medicines
  - Categories: new / `$categoryId` → /admin/categories
  - Promos: new / `$promoId` → /admin/promos
  - Providers: new / `$providerId` → /admin/providers
  - Questionnaires: new / `$questionnaireId` → /admin/questionnaires
  - Patients, Orders, Intake sessions, Requests: replace the ad-hoc markup with the shared header (same destinations as now)
  - Provider portal: patient detail and request detail
- Keep the existing mobile top bar; the back link sits directly under it so it works on small screens too.

## 2. Sticky save bars

Long forms (medicine, questionnaire, category, provider, promo, settings) put Save at the very bottom, so it disappears while editing.

- Add a shared `FormActionBar` component: a sticky footer pinned to the bottom of the form container (`sticky bottom-0`, themed background + top border, safe-area padding) holding Cancel and Save, plus a pending state on Save.
- Wire it into: `medicine-form.tsx`, `category-form.tsx`, `promo-form.tsx`, `provider-form.tsx`, the questionnaire editor pages, and the settings page tabs that have a Save.
- The bar stays inside the scrolling content column so it never overlaps the sticky medicine preview panel on desktop.
- Keyboard shortcut: Cmd/Ctrl+S submits the active form.

## Technical notes

- Purely presentational: no changes to server functions, stores, or mutations.
- Uses existing theme tokens (`#E8EEED`, `#D5DEDD`, `#6A9B9C`, `#3B4759`) — no new colors.
- Back links use `<Link to="...">` for real hrefs/preloading rather than `router.history.back()`.
- After the change: typecheck plus a quick browser pass over one long form to confirm the action bar is visible at any scroll position.
