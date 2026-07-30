## Goal
After clicking Save on any add/edit page, return the user to that module's listing page.

## Current state (verified)
Already redirect correctly on save:
- Medicine new + edit → /admin/medicines
- Category new → /admin/categories
- Promo new + edit → /admin/promos
- Provider new + edit → /admin/providers

Do NOT redirect on save (the gaps):
- **Category edit** (`admin.categories.$categoryId`) — shows toast only, stays on page
- **Questionnaire edit** (`admin.questionnaires.$questionnaireId`) — the "Changes saved." details form stays on page
- **Questionnaire new** — redirects to the questionnaire detail page, not the listing
- **Patient edit** (`admin.patients.$patientId`) — "Profile updated." stays on page
- **Practitioner profile** (`provider.profile`) — stays on page

## Changes
1. Category edit: after `toast.success("Category updated.")`, `navigate({ to: "/admin/categories" })`.
2. Questionnaire edit: after saving the details form, navigate to `/admin/questionnaires`. Question-level saves inside the editor (add/edit/delete a single question) stay in place — redirecting mid-editing would break the flow.
3. Questionnaire new: keep the redirect to the new questionnaire's detail page, because a brand-new question set has no questions yet and the user must land there to add them. (Say the word and I'll switch it to the listing instead.)
4. Patient edit: after "Profile updated.", navigate to `/admin/patients`. Status change / password reset actions stay in place.
5. Practitioner profile: this is the user's own profile with no listing page — leave as is.

Each redirect keeps the existing query invalidation so the listing shows fresh data, and the success toast still appears after navigation.

## Technical notes
All affected files already import `useNavigate`; the change is adding a `navigate({ to: ... })` call inside the existing `onSuccess` handlers in:
- `src/routes/_authenticated/admin.categories.$categoryId.tsx`
- `src/routes/_authenticated/admin.questionnaires.$questionnaireId.tsx`
- `src/routes/_authenticated/admin.patients.$patientId.tsx`
