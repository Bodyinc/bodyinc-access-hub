## Combined Admin + Practitioner Portal

This portal (`provider.bodyinc.com`, also serving as the new admin login) accepts both `admin` and `provider` roles. Patients are blocked with a link to `patient.bodyinc.com`. Adds Email OTP login and a complete password reset flow alongside email/password.

### Auth surface (`/auth`)

Single login page with two tabs:
- **Password** – email + password
- **OTP** – email → "Send code" → 6-digit code input → verify

Both flows go through server functions that enforce role gating BEFORE returning a session to the browser, so a wrong-portal user never holds a session client-side.

### Server functions (`src/lib/auth.functions.ts`)

Replace the single `signInAsProvider` with role-agnostic functions allowing `['admin','provider']`:

- `signInWithPassword({ email, password })` – ephemeral Supabase client, signs in, checks `get_user_portal`, signs out if role not allowed, returns `{ session }` on success or `{ error: 'wrong_portal'|'no_access'|'invalid_credentials', message, redirectUrl? }`.
- `sendLoginOtp({ email })` – calls `signInWithOtp({ email, shouldCreateUser: false })`. Returns generic success even if user doesn't exist (don't leak account existence).
- `verifyLoginOtp({ email, token })` – verifies 6-digit code via `verifyOtp({ type: 'email' })`, then same role check + sign-out-if-wrong pattern. Returns `{ session }` or error.
- `getCurrentPortalRole` – unchanged.

Wrong-portal message for patients includes link to `https://patient.bodyinc.com`. Admin↔provider are both allowed in this portal, so no cross-message between them.

### Routes

- `src/routes/auth.tsx` – tabs for Password / OTP. Redirects already-signed-in users to `/admin` (admin) or `/dashboard` (provider).
- `src/routes/forgot-password.tsx` – existing, kept.
- `src/routes/reset-password.tsx` – existing, kept.
- `src/routes/_authenticated/route.tsx` – gate accepts both `admin` and `provider`; stores role in route context.
- `src/routes/_authenticated/dashboard.tsx` – provider landing.
- `src/routes/_authenticated/admin.tsx` – new admin landing (placeholder; real admin UI comes later).
- `src/routes/index.tsx` – redirect signed-in admins to `/admin`, providers to `/dashboard`, else `/auth`.

Post-login navigation in `auth.tsx` calls `getCurrentPortalRole` after `setSession` and routes accordingly.

### Supabase

No schema changes needed — `get_user_portal` and the enum already include `admin`, `provider`, `patient`. Email OTP must be enabled in Supabase Auth → Providers → Email (it is on by default).

### Reset password flow (already implemented, verifying)

- `/forgot-password` → `resetPasswordForEmail({ redirectTo: origin + '/reset-password' })`
- `/reset-password` → detect `type=recovery`, `updateUser({ password })`, sign out, redirect to `/auth`
- Recovery emails are NOT gated by portal (a wrong-portal user requesting reset will still get the email; gating happens at next login attempt).

### Out of scope this turn

- Real admin dashboard UI
- Inviting practitioners/admins from the admin UI
- Email template customization (use Supabase defaults; can add Lovable auth emails later)

### Files changed

- Rewrite: `src/lib/auth.functions.ts`, `src/routes/auth.tsx`, `src/routes/_authenticated/route.tsx`, `src/routes/index.tsx`
- New: `src/routes/_authenticated/admin.tsx`
- Unchanged: `forgot-password.tsx`, `reset-password.tsx`, `_authenticated/dashboard.tsx`, Supabase migration
