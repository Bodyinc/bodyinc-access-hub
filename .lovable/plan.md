## What I found

Your `public.notifications` table already exists and is wired up correctly for everything except one thing:

- Row-level security: enabled
- Access rules: users can read their own notifications, and mark their own as read
- Live updates: the table is already published for realtime
- Auto-alerts: the trigger on medication requests is active
- **Missing: no Data API privileges are granted on the table at all** — so every read from the app fails with a permission error, even for signed-in users whose access rules would otherwise allow it.

## The fix

One small database migration that grants the app access to the table, matching the rules already in place:

- Signed-in users: read their own notifications, and update them (to mark as read)
- Backend/service access: full access, so the trigger and server-side code can insert alerts
- No anonymous access — notifications are private

Nothing else changes: no schema edits, no new columns, no changes to your indexes, policies, trigger, or app code.

## Technical detail

```sql
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
```

After that, the notification bell should load and update live without further changes.
