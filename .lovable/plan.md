## Goal

Move notifications out of the top-right bell and into a proper **Notifications** item in the practitioner sidebar.

## Changes

**1. Remove the header bell**
- Delete the bell from both the mobile and desktop headers in the practitioner layout. The desktop header row exists only to hold the bell, so it goes away entirely; the mobile header keeps its menu button and page title.
- Delete the old bell component file.

**2. Add "Notifications" to the sidebar**
- New sidebar item between "Unassigned queue" and "My Patients" (order can be adjusted).
- Shows a small unread count badge next to the label when there are unread notifications; the badge stays visible as a dot when the sidebar is collapsed to icons.
- The count comes from the same live-updating query as before, so it still updates instantly when a new alert arrives.

**3. New Notifications page (`/provider/notifications`)**
- Full-page list of the latest 50 notifications, unread ones visually highlighted.
- "Mark all read" action at the top.
- Clicking a notification marks it read and opens the linked order.
- Empty state: "You're all caught up."
- Added to the layout's page-title map so the header shows "Notifications".

## Technical detail

- Extract the existing fetch + realtime subscription into a shared `useNotifications()` hook so the sidebar badge and the page share one query cache key and one Supabase channel (avoids duplicate subscriptions).
- Server functions `listMyNotifications` / `markNotificationsRead` stay unchanged.
- New files: `src/lib/use-notifications.ts`, `src/routes/_authenticated/provider.notifications.tsx`. Edited: `provider.tsx`, `provider-sidebar.tsx`. Removed: `src/components/notifications/notification-bell.tsx`.
