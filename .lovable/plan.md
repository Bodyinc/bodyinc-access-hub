# Add provider name to the dashboard greeting

## Goal
The Practitioner dashboard heading is now dynamic by time of day. Extend it to include the logged-in practitioner's name, e.g. "Good morning, Dr. Smith".

## Current state
- `src/routes/_authenticated/provider.index.tsx` renders `greeting ?? "Practitioner dashboard"` and calls `providerDashboard` from `src/lib/provider.functions.ts`.
- `providerDashboard` returns workload counts only. It does not fetch the provider's display name.
- Provider full name lives in `public.profiles.full_name` (the `getMyProviderProfile` function already reads this).

## Changes

### 1. Backend: `src/lib/provider.functions.ts`
Update `providerDashboard` to fetch the provider's `full_name` from `public.profiles` using `context.userId` and include it in the response. Keep the existing counts and claimable logic unchanged.

```typescript
const { data: meProfile } = await supabaseAdmin
  .from("profiles")
  .select("full_name")
  .eq("id", context.userId)
  .maybeSingle();

return { ...counts, claimable, full_name: meProfile?.full_name ?? "" };
```

### 2. Frontend: `src/routes/_authenticated/provider.index.tsx`
- Read `full_name` from the dashboard query result.
- Update the heading to `{greeting}{name ? `, ${name}` : ""}`.
- Keep the "Practitioner dashboard" fallback when the greeting has not yet computed client-side.

## Verification
- Run the TypeScript build check to confirm no type errors.
- Open `/provider` in the preview to confirm the greeting displays the provider name after data loads.