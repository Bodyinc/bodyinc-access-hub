## Goal

A notification bell in the practitioner portal that alerts you in-app when:
- a new request is ready to review (assigned to you, status `pending_review`)
- you are assigned/claim a patient order (`provider_assigned`)
- an order changes state and needs attention (`awaiting_additional_payment`) or is approved (`approved`)

## What gets built

**1. Database (one migration)**

New table `public.notifications`:
- `user_id` (recipient), `type`, `title`, `body`, `link` (in-app path, e.g. `/provider/requests/<id>`), `entity_id`, `read_at`
- Grants: `select`/`update` to `authenticated`, all to `service_role`
- RLS: a user reads and marks read only their own rows; inserts happen server-side only
- Added to the realtime publication so the bell updates live

Trigger on `medication_requests`: on insert and on status/provider change, insert a notification for the assigned provider (skipping the actor's own action where the provider changed it themselves). Statuses mapped: `pending_review` → "Ready to review", `provider_assigned` → "New patient assigned", `approved` → "Consultation approved", `awaiting_additional_payment` → "Needs attention".

**2. Server functions** (`src/lib/notifications.functions.ts`)
- `listMyNotifications` — recent 50 + unread count
- `markNotificationsRead` — one or all

**3. UI**
- `src/components/notifications/notification-bell.tsx` — bell icon with unread badge, popover list (title, body, relative time, unread dot), click navigates to the linked order and marks read, "Mark all read" action
- Realtime subscription in a `useEffect` (cleaned up on unmount) invalidating the query on new rows
- Mounted in the practitioner portal header (`src/routes/_authenticated/provider.tsx`), styled with the existing sand/teal/ink theme

## Notes

Notifications are in-app only — no email or push. The same bell can be dropped into the admin shell later with no extra backend work, since the table is keyed by recipient user.
