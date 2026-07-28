## Goal
Replace the static "Practitioner dashboard" heading with a time-aware greeting.

## Behaviour
Greeting is computed on the client from the practitioner's local time:

```text
05:00–11:59  Good morning
12:00–16:59  Good afternoon
17:00–20:59  Good evening
21:00–04:59  Working late
```

Heading text: `Good morning` (plus first name when available, e.g. `Good morning, Dr. Chen`). Subtitle stays "Your workload at a glance."

## Technical notes
- Edit `src/routes/_authenticated/provider.index.tsx` only.
- Compute greeting in a `useState` + `useEffect` (set after mount) so SSR/hydration don't mismatch; render the plain title until hydrated.
- Re-evaluate on an interval (every 60s) so a long-open tab rolls over correctly.
- Name comes from the existing provider dashboard query if it already returns one; otherwise the greeting renders without a name.
