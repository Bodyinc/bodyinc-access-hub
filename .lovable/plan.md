## Goal

Remove the admin pages that contain no real functionality — only a "Coming soon" card.

## Empty pages found

- **Available Slots** (`/admin/slots`) — card + "Coming soon."
- **Intake Form** (`/admin/intake-form`) — card + "Coming soon."

Not removed: the **Dashboard** (`/admin`) also shows placeholder stat cards, but it's the landing page for the admin area — deleting it would break `/admin`. Say the word if you want it emptied/replaced too.

## Changes

1. Delete `src/routes/_authenticated/admin.slots.tsx` and `src/routes/_authenticated/admin.intake-form.tsx` (route tree regenerates automatically).
2. Remove the "Available Slots" and "Intake Form" entries from the sidebar nav list in `src/components/admin/admin-sidebar.tsx`.
3. Remove `/admin/slots` and `/admin/intake-form` from the `TITLES` map in `src/routes/_authenticated/admin.tsx`.
4. Grep for any other links to those routes and clean them up, then typecheck.
