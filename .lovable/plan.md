## Practitioner Portal

Today the provider portal has a single screen: "Requests", listing only orders already assigned to them, reusing the admin review panel in read-mostly mode. This plan turns it into a real workspace.

### Navigation (provider sidebar)

```text
Dashboard      counts + today's work
Requests       orders assigned to me
Unassigned     open orders I can claim
Patients       patients from my assigned orders
My profile     bio, credentials, languages, avatar
```

### 1. Dashboard

Landing page at `/provider` with cards: Pending review, Awaiting additional payment, Approved (awaiting prescription), Prescribed today, and Unassigned/claimable count. Each card links into the matching filtered list. Requests list moves to `/provider/requests`.

### 2. Unassigned queue + self-assign

New provider-scoped list of medication orders with no provider yet. A provider only sees orders whose patient state is covered by their own `license_states`, so they can't claim patients they aren't licensed for. "Claim" assigns that single order to them (`provider_id = me`) and writes a `provider_assigned` event to the order timeline. Claiming is rejected if someone else already took it.

### 3. Patients tab

Lists distinct patients drawn from orders assigned to the provider, with a debounced search bar (name or patient reference). Opening a patient shows a clinical-only profile:

- Shown: first/full name, sex, age/DOB, state, height/weight/BMI, intake questionnaire answers, eligibility results, order history, prescriptions, statuses.
- Hidden: email, phone, street/billing address, Stripe IDs, payment amounts, refunds, promo/wallet data.

The hiding is enforced server-side — new provider-scoped functions that select only clinical columns, never the admin `getPatient`/`getPatientRelated` functions (those stay admin-only).

### 4. Change medicine — same category, or explicitly across categories

The medicine picker in the review panel gains a category-aware mode for providers:

- Default: only medicines sharing a category with the current medicine are selectable.
- A "Change category" toggle unlocks the full catalogue, requires picking the new category and typing a clinical reason (min ~10 chars), and records both the old→new category and the reason on the order timeline.
- Existing price-difference behaviour is unchanged: a dearer switch raises an additional payment request, a cheaper one credits the next cycle.

Server-side the same rule is enforced: cross-category changes without a reason are rejected.

### 5. Approve consultation

Already possible; this makes it first-class — an "Approve consultation" action on `pending_review` orders with an optional note, plus a visible "Reject & refund" path. Prescription generation and fulfilment steps stay as they are today.

### 6. Clinical notes on an order

A notes thread on each order: provider or admin adds a note, shown newest-first with author and timestamp, visible to providers assigned to the order and to all admins. Not visible to patients.

### 7. Provider profile

`/provider/profile` lets a provider edit their own bio, credentials, specialty, languages, consultation types, and avatar. Licence states, NPI, DEA, licence number, and active status stay admin-only (read-only display).

---

### Technical notes

- New `src/lib/provider.functions.ts` holding provider-scoped server functions (`providerDashboardCounts`, `listClaimableRequests`, `claimRequest`, `listMyPatients`, `getMyPatientClinical`, `getMyProviderProfile`, `updateMyProviderProfile`), each behind `requireSupabaseAuth` plus a `assertProvider`-style guard, with all patient reads projecting a fixed clinical column allowlist.
- `changeRequestMedicine` in `src/lib/requests.functions.ts` gains optional `categoryChange` + `reason`, validated server-side against `medication_category_medicines`.
- One migration: a `medication_request_notes` table (request_id, author_id, author_role, body, timestamps) with GRANTs and RLS — admins full access, providers limited to orders assigned to them, patients no access.
- New routes under `src/routes/_authenticated/provider.*`; sidebar items added in `src/components/provider/provider-sidebar.tsx`; existing `RequestReviewPanel` extended rather than forked, keeping the current teal/ink theme.
