## Admin Dashboard — Layout & Sidebar Foundation

Build the shell + navigation for the admin portal, with placeholder pages for each section so the structure is ready and we fill in features incrementally.

### Sidebar sections (in order)

1. Dashboard (overview — placeholder for now)
2. Intake Questions - for medication check (i won't be Jot form)
3. Available Slots
4. Providers
5. Medicines (SKUs)
6. Packages
7. Patients
8. Intake Form (JotForm ID setting)

### Scope of this step (layout only — no DB yet)

- Add shadcn `Sidebar` with `SidebarProvider` wrapping the entire `/admin` subtree.
- Convert `/admin` into a layout route with nested children. Each section gets its own route file and a placeholder page ("Coming soon" + short description of what will live there).
- Header bar with `SidebarTrigger`, page title (derived from route), and the existing Sign out button.
- Active-route highlighting, collapsible to icon-only mode, mobile responsive.
- Keep admin-only access: nested under `_authenticated` and gated by `has_role(admin)` check on the layout (redirect to `/dashboard` if not admin).

### Route structure

```
src/routes/_authenticated/
  admin.tsx                       ← layout (sidebar + outlet + admin gate)
  admin.index.tsx                 ← Dashboard overview
  admin.questions.tsx             ← Intake Questions
  admin.slots.tsx                 ← Available Slots
  admin.providers.tsx             ← Providers
  admin.medicines.tsx             ← Medicines
  admin.packages.tsx              ← Packages
  admin.patients.tsx              ← Patients
  admin.intake-form.tsx           ← JotForm ID config
```

### Files to create / change

- Replace current `src/routes/_authenticated/admin.tsx` → layout shell (sidebar + outlet + admin role check via `get_my_role` RPC).
- Create `src/components/admin/admin-sidebar.tsx` — sidebar with the 8 nav items, icons from lucide-react, active-state via `useRouterState`.
- Create 8 child route files listed above, each rendering a `<Card>` placeholder with the feature description.
- No DB migrations, no server functions, no business logic yet — pure layout.

### What we are NOT doing in this step (deferred to follow-ups)

Each numbered feature below will become its own focused build once you approve this shell:

- (1) Question schema (MCQ + text), public fetch endpoint
- (2) Slots schema + timezone-aware availability
- (3) Provider invite flow (admin-create user + reset link via Supabase Admin API)
- (4) Medicine SKUs + dynamic categories + rich-text description + "requires consultation" flag + image upload (storage bucket)
- (5) Packages tied to medicines with duration + discount %
- (6) Patient list + drill-down (intake / consultations / billing)
- (7) `app_settings` table with `jotform_form_id` field + admin edit UI

### Design direction

Stick to the current theme tokens (no new colors). Sidebar uses the standard shadcn look. If you want a more distinct admin aesthetic (denser data-app feel, custom palette, etc.), say so and I'll generate design directions before building.

### Technical notes

- Use shadcn `Sidebar` with `collapsible="icon"`; the `SidebarTrigger` lives in the header so it stays visible when collapsed.
- Use `w-[var(--sidebar-width)]` form for any width classes (Tailwind 4 quirk).
- Admin gate inside layout: query `get_my_role` RPC via TanStack Query; while loading show a skeleton; if not `admin`, `redirect({ to: '/dashboard' })`.
- All sidebar items use `<Link to="...">` for type-safe routing — child route files must exist before the build runs.

Confirm and I'll build the shell. After that we can knock out the 7 feature sections one by one in the order you prefer.