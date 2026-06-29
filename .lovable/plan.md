## Problem

Visiting `/admin/providers/<id>` returns 500 ("This page didn't load"). `getProvider` in `src/lib/providers.functions.ts` still uses a PostgREST embed:

```ts
.select("*, profiles!inner(full_name, email, phone, avatar_url)")
```

There is no foreign key between `public.providers.id` and `public.profiles.id` (both reference `auth.users.id`, not each other). PostgREST therefore errors with "Could not find a relationship between 'providers' and 'profiles' in the schema cache", the server fn throws, h3 returns 500, and the wrapper renders the fallback error page.

A previous turn claimed to fix this by splitting into two queries, but the change was not actually saved.

## Fix

Edit only `getProvider` in `src/lib/providers.functions.ts`:

1. Query `providers` by `id` (no embed).
2. Query `profiles` by `id` for `full_name, email, phone, avatar_url`.
3. Merge: `return { ...provider, ...(profile ?? {}) }`.
4. Throw `Provider not found` if the providers row is missing.

No DB changes, no other files touched.
