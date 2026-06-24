## Fix: reset link must land on the password-change screen

The `/reset-password` screen already exists. What's broken is the link's landing — it currently lands on `/auth` (login) instead. Two things cause this, one in code and one in the Supabase email template.

### 1. Code — handle every recovery link shape on `/reset-password`

Today `src/routes/reset-password.tsx` only handles `?code=…` (PKCE) and an existing session. If Supabase sends the newer `token_hash` shape or the legacy hash fragment, the page sits in "Verifying…" or the supabase-js listener fires `SIGNED_IN` and the user is bounced via the global auth listener.

Update `src/routes/reset-password.tsx` to:
- Handle `?token_hash=…&type=recovery` via `supabase.auth.verifyOtp({ type: 'recovery', token_hash })`.
- Keep existing `?code=…` PKCE branch (`exchangeCodeForSession`).
- Keep hash-fragment branch (supabase-js auto-parses; listener flips `ready` on `PASSWORD_RECOVERY` / `SIGNED_IN`).
- After verifying, strip the query/hash from the URL so a refresh doesn't re-consume the token.
- Show explicit error UI with a "Request a new link" button → `/forgot-password` when the link is missing/expired/invalid.

Also guard the global `onAuthStateChange` listener in `src/routes/__root.tsx` so a `PASSWORD_RECOVERY` event on `/reset-password` does NOT call `router.invalidate()` (which is what sends the user to `/auth` mid-flow). Skip invalidation when `window.location.pathname === '/reset-password'`.

### 2. Supabase dashboard — email template + URL config (you do this once)

This is why the link currently dumps you on login: the recovery email is using the magic-link template, so its URL points to Site URL (`/auth`) instead of `/reset-password`.

- **Auth → URL Configuration**
  - Site URL: your production origin (e.g. `https://provider.bodyinc.com`)
  - Redirect URLs: add `https://provider.bodyinc.com/reset-password`, your Lovable preview origin + `/reset-password`, and `http://localhost:*/reset-password` for dev.
- **Auth → Email Templates → Reset Password**: body must use `{{ .ConfirmationURL }}` (NOT `{{ .Token }}`). Recommended body:
  ```html
  <h2>Reset your password</h2>
  <p><a href="{{ .ConfirmationURL }}">Click here to set a new password</a>. This link expires in 1 hour.</p>
  ```
  `{{ .ConfirmationURL }}` automatically resolves to `<SiteURL>/reset-password?...` because our code passes `redirectTo: <origin>/reset-password`.

### Files
- `src/routes/reset-password.tsx` — add `token_hash` branch + URL cleanup + clearer error state with "Request a new link" CTA.
- `src/routes/__root.tsx` — skip router invalidation while on `/reset-password`.

### Out of scope
No changes to `forgot-password.tsx`, `auth.functions.ts`, or login UX. No DB migrations.
