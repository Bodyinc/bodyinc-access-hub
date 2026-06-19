
# Practitioner Portal – Login (Invite-Only)

Build a login-only auth surface for `provider.bodyinc.com` that talks to the shared Supabase project (same one used by Admin and the future Patient project). Architected so the Patient project can reuse the exact same pattern.

## Shared Supabase changes (single migration)

The existing `app_role` enum currently has `admin` (and used by `user_roles`). Extend it and add helpers all three projects will share.

- `ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'provider';`
- `ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'patient';`
- Add `public.get_user_portal(_user_id uuid)` returning the user's role — SECURITY DEFINER, stable, `search_path = public`. Used by every portal to decide allow/deny.
- Keep `user_roles` exactly as is. RLS already lets a user read their own role.

No new tables. No data backfill in this migration (admins are seeded already).

## Wrong-portal blocking (the core requirement)

Strict server-side gate. No session is ever created on the wrong portal.

1. User submits email + password on `/auth` (provider portal).
2. Client calls a new server function `signInAsProvider({ email, password })`.
3. Handler flow:
   a. Use a server-local Supabase client (`SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY`, `persistSession: false`) to call `signInWithPassword`.
   b. On success, immediately call `get_user_portal(user.id)`.
   c. If role !== `'provider'`: call `supabase.auth.signOut()` on that ephemeral client (kills the just-issued refresh token) and return `{ error: 'wrong_portal', actualRole, redirectUrl }` where redirectUrl maps `admin → https://admin.bodyinc.com`, `patient → https://patient.bodyinc.com`. If role is null: return `{ error: 'no_access' }`.
   d. If role === `'provider'`: return `{ session }` (access + refresh token).
4. Client receives the session and calls `supabase.auth.setSession(session)` only on success — so the browser never holds a session for a wrong-portal user.
5. On `wrong_portal`, show: *"This email is registered as a {role}. Please log in at {portal-url}."* with a clickable link.

This pattern is copy-pasted into the Patient project later by swapping the allowed role constant.

## Routes & files (this project)

- `src/routes/auth.tsx` – public login page (email, password, "Forgot password?" link). Redirects to `/dashboard` if already signed in as provider.
- `src/routes/forgot-password.tsx` – public, sends `resetPasswordForEmail` with `redirectTo: ${origin}/reset-password`.
- `src/routes/reset-password.tsx` – public, detects `type=recovery`, calls `updateUser({ password })`, then signs out and redirects to `/auth`.
- `src/routes/_authenticated/route.tsx` – integration-managed gate (already present pattern). Add a secondary check: after `getUser()`, call `get_user_portal`; if not `'provider'`, sign out and redirect to `/auth` with a wrong-portal flag. Prevents access if a session somehow leaks in.
- `src/routes/_authenticated/dashboard.tsx` – minimal placeholder ("Welcome, Practitioner") + sign-out button. Real practitioner features come later.
- `src/lib/auth.functions.ts` – `signInAsProvider`, `getCurrentPortalRole` server fns.

## Signup

Invite-only. No signup link on `/auth`. Practitioner accounts are created from the Admin project (existing) which inserts into `auth.users` + `user_roles(role='provider')`. The login page just states: *"Practitioner accounts are created by your administrator."*

## Sign-out hygiene

Per the auth-guards rules: `cancelQueries → clear → supabase.auth.signOut() → navigate('/auth', replace)`.

## Reusability for Patient/Admin projects

The Admin project is done; do not change it. For the future Patient project, copy:
- `auth.functions.ts` (change allowed role to `'patient'`, change redirect map)
- `auth.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `_authenticated/route.tsx`

Shared Supabase migration above is the only DB work needed across all three.

## Design (login page)

Centered card, brand-neutral until you give styling direction. Email + password inputs (zod validation: email format, password min 8), submit button, inline error area for wrong-portal message (with link), "Forgot password?" link below. Toaster for generic errors.

## Out of scope for this turn

- Practitioner dashboard features
- Admin UI for inviting practitioners (assumed already in your admin project — if not, flag it)
- Social login (none requested)
- Custom auth emails (can add later via Lovable email tools)

## Open item to confirm during build

Admin project should be inserting `user_roles(user_id, role='provider')` when creating a practitioner. If it doesn't yet, you'll need to add that there — practitioners won't be able to log in without a row in `user_roles`.
