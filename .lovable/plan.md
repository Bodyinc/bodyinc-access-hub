# Re-theme the admin panel

## New palette and roles

| Hex | Role |
| --- | --- |
| `#E8EEED` | Page/surface tint, table headers, hover rows |
| `#6A9B9C` | Primary brand (sidebar active, links, focus rings, primary accents) |
| `#E3E084` | Call-to-action / highlight (primary buttons, badges), with dark ink text |
| `#B8684B` | Secondary accent / warning-ish highlights, chips |
| `#3B4759` (with `4D` = 30% alpha for borders/muted) | Ink text color and hairline borders |

Text goes from purple `#2E00AB` to slate ink `#3B4759`; borders from `#EAE6FA` to `rgba(59,71,89,0.18–0.30)`; white cards stay white on an `#E8EEED` page background.

## What gets changed

1. **`src/styles.css` — single source of truth**
   - Add the five hexes as CSS variables (`--sand`, `--ink`, `--teal`, `--clay`, `--mist`) plus derived hover/soft shades.
   - Re-point the shadcn tokens (`--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--border`, `--input`, `--ring`, `--sidebar*`, `--brand*`) to the new palette in OKLCH so every shadcn component follows automatically.
   - Rewrite the hardcoded purple inside the `.admin-*` component classes (title, subtitle, label, input, textarea, select, card, buttons, table head/cell, check row) to use the new variables.

2. **`src/lib/admin-ui.ts`** — replace the inline `#2E00AB` / `#EAE6FA` in the shared class tokens with the new variable-driven classes.

3. **Component + route sweep (~40 files)** — replace remaining literal purple hexes with the new tokens/semantic classes in:
   - Admin components: sidebar, refresh button, medicine form / preview / pricing / packages editor, category form, promo form, provider form, state multi-select, request list, request review panel, refunds table, subscriptions table, activity log tab.
   - Admin routes: layout (`admin.tsx` header + mobile bar), dashboard, medicines, categories, questionnaires, medication rules, patients, providers, orders, intake sessions, intake form, promos, referrals, billing, settings, slots.
   - Shared/other: `request-status.ts` badge colors, `ui/sidebar.tsx`, `ui/switch.tsx`, provider sidebar, provider layout, `rx.$prescriptionId`.

4. **Contrast pass** — `#E3E084` buttons use ink `#3B4759` text (never white); `#6A9B9C` and `#B8684B` fills use white text. Status badges get a consistent tinted-background + ink-text treatment.

5. **Verification** — typecheck, then screenshot a few admin pages (dashboard, medicines list, edit medicine, orders) at desktop and mobile widths to confirm no leftover purple and no contrast regressions.

## Scope notes

- Admin panel only — the patient-facing dashboard in your screenshot is not re-skinned in this pass unless you want it included.
- Layout, spacing and functionality are untouched; this is purely color.

## Technical details

Colors are defined once in `src/styles.css` under `:root` and mapped through `@theme inline`, so future tweaks are one-file edits. Hardcoded hex literals in components are replaced by Tailwind classes backed by those tokens (`bg-brand`, `text-foreground`, `border-border`, etc.) rather than new literals.
