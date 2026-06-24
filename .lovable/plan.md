## Auth fixes

### 1. Persistence & speed
- `src/routes/_authenticated/route.tsx`: replace `getUser()` (network) with `getSession()` (localStorage, instant). Cache the `get_user_portal` RPC result in `sessionStorage` keyed by user id so it runs once per session, not on every protected nav.
- `src/routes/index.tsx`: same treatment.
- `src/routes/__root.tsx`: add a single `supabase.auth.onAuthStateChange` listener that calls `router.invalidate()` on `SIGNED_IN` / `SIGNED_OUT` / `USER_UPDATED`, and clears the cached role on `SIGNED_OUT`.

### 2. Real reset-password flow (not magic link)
- `src/routes/reset-password.tsx`: handle the recovery `code` in the URL with `supabase.auth.exchangeCodeForSession(window.location.href)`; gate the form on `PASSWORD_RECOVERY` (or a successful code exchange). After `updateUser({ password })`, sign out and send to `/auth`.
- `src/routes/forgot-password.tsx`: keep `resetPasswordForEmail` with `redirectTo: <origin>/reset-password` (already correct).

### 3. 8-digit copy consistency
- `src/routes/auth.tsx`: OTP success toast "6-digit code" → "8-digit code"; align labels/errors.

### 4. Out of code scope (you set in Supabase dashboard)
1. Auth → URL Configuration: Site URL = your origin; Redirect URLs include `<origin>/reset-password` and the preview origin.
2. Auth → Email Templates → **Reset Password**: body must use `{{ .ConfirmationURL }}` (not `{{ .Token }}` — that's why it currently behaves like a magic link).
3. Auth → Providers → Email: OTP length = 8, expiry 600s.

### Files
- src/routes/_authenticated/route.tsx
- src/routes/index.tsx
- src/routes/__root.tsx
- src/routes/reset-password.tsx
- src/routes/auth.tsx
