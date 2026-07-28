## What I found

I ran the type checker, the linter, a dead-file scan and a database security scan. Current state:

- **TypeScript: clean.** `tsgo --noEmit` passes with zero errors.
- **Lint: 3,357 problems.** 2,969 are pure formatting (Prettier), 369 are `any` types, 14 empty `catch {}` blocks, 4 fast-refresh warnings, 1 raw `<img>`. Roughly 1,858 of them are in the generated Supabase types file, which should simply be ignored by the linter.
- **Duplicated helpers.** Six separate copies of a currency formatter (`money` / `formatCurrency`) across order, refund, subscription and change-medicine components, each formatting slightly differently (some take dollars, some cents).
- **One dead file:** `src/components/admin/local-storage-banner.tsx` is no longer referenced anywhere (left over from the localStorage-to-Supabase migration).
- **Swallowed errors.** 14 empty catch blocks silently discard failures, and several `console.log` calls remain in server code paths.
- **No page metadata.** 47 routes have no `head()` — no titles, so every browser tab and history entry shows the same generic name.
- **Database security scan: 34 findings**, including SECURITY DEFINER views, several `USING (true)` write policies, a public storage bucket that allows listing all files, and SECURITY DEFINER functions callable while signed out.

## Proposed work

### 1. Lint and formatting baseline
- Add generated files (`src/routeTree.gen.ts`, `src/integrations/supabase/types.ts`) to the lint ignore list so real issues aren't buried.
- Run Prettier across `src` to clear the ~1,100 remaining formatting errors.
- Downgrade `no-explicit-any` to a warning rather than churning 369 sites blindly; instead replace `any` in the highest-value spots only (see step 3).

### 2. Dead code and duplication
- Delete `local-storage-banner.tsx`.
- Create one shared `src/lib/format.ts` with a single `formatMoney(cents)` / `formatDollars(n)` pair plus the shared `ageOf` / `bmiOf` helpers, and point all six call sites at it.
- Merge the near-identical `admin-guard.ts` and `provider-guard.ts` role-caching logic into one `assertRole` helper, keeping the existing exported names so no call site changes behaviour.

### 3. Error handling and logging
- Replace the 14 empty `catch {}` blocks with either a logged error or an explicit comment explaining why the failure is safe to ignore.
- Remove stray `console.log` from server functions; keep `console.error` on genuine failure paths.
- Type the server-function return shapes that the UI reads via `(q.data as any)` so dashboard/list pages get real autocomplete and compile-time safety.

### 4. Page metadata
- Add a `head()` with a unique title and description to each admin and practitioner route (47 files), e.g. "Orders · Admin" / "Patient queue · Practitioner". Internal pages get `noindex` since they're behind auth.

### 5. Database security findings
- Review each of the 34 findings and fix the ones that are genuine: tighten `USING (true)` write policies to role checks, revoke `anon` EXECUTE on SECURITY DEFINER functions that only signed-in users should call, and restrict listing on the `medicine-images` bucket while keeping individual images publicly readable.
- Findings that are intentional (e.g. public read of the medicine catalogue) get documented in security memory rather than "fixed".

### Technical notes
- No feature behaviour changes, no UI redesign, no schema changes beyond RLS/grant/policy adjustments.
- Verification after each stage: `tsgo --noEmit`, `eslint src`, and a browser pass over `/admin` and `/provider` to confirm nothing regressed.

### Out of scope unless you ask
- Rewriting the 962-line `admin.patients.$patientId.tsx` and 816-line `requests.functions.ts` into smaller modules — worth doing but it's a bigger, riskier refactor best done as its own pass.
