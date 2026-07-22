## Goal

Replace the three cascading dropdowns in the Change Medicine dialog with a scalable, side-by-side layout that shows the current plan, lets an admin quickly find a new medicine + plan (even with 250+ medicines), and previews the price difference before confirming.

## New Modal Layout

Wider dialog (`max-w-3xl`), two columns on md+, stacked on mobile.

```text
┌─────────────────────── Change medicine ────────────────────────┐
│  CURRENT PLAN                    │  NEW PLAN                    │
│  ┌────────────────────────────┐  │  [Search medicines…]         │
│  │ Semaglutide — 50mg         │  │  ┌────────────────────────┐  │
│  │ Monthly plan               │  │  │ ○ Tirzepatide          │  │
│  │ $199.00 / mo               │  │  │ ○ Metformin            │  │
│  │ Renews Aug 21, 2026        │  │  │ ● Finasteride ✓        │  │
│  └────────────────────────────┘  │  │ ○ Minoxidil            │  │
│                                  │  │ … virtualized / scroll │  │
│                                  │  └────────────────────────┘  │
│                                  │  Variant: [50mg ▾]           │
│                                  │  Plan:    [Monthly $210 ▾]   │
│                                  │                              │
│  DIFFERENCE                                                     │
│  New price:      $210.00 / mo                                   │
│  Current price:  $199.00 / mo                                   │
│  Change:         +$11.00 / mo   (applies from next cycle)       │
├──────────────────────────────────────────────────────────────── │
│                              [Cancel]  [Confirm change]         │
└─────────────────────────────────────────────────────────────────┘
```

### Behavior

- Left column reads current medicine / variant / plan / price / next renewal directly from the already-fetched `getOrder` data — no extra request.
- Right column:
  - Text input filters the medicine list by name (case-insensitive substring). Active medicines only. Excludes the current medicine.
  - Medicine list is a scrollable panel (`max-h-72 overflow-y-auto`) with radio-style rows so it works for 10 or 250 items. Each row shows name + "from $X/mo".
  - Once a medicine is picked, Variant selector appears only if it has variants; Plan selector always appears with the same `planLabel` formatting used today.
  - Selecting a medicine auto-selects the only variant/package when there's just one.
- Difference block computes `new.price - current.price`. Handles differing `duration_months` by normalizing to per-month ($/mo) so the comparison is meaningful, and shows the raw plan price alongside. Copy notes the change applies from the next billing cycle (no charge now) — same guarantee as today's backend.
- Confirm button disabled until a package is selected and it differs from the current one. Calls the existing `changeSubscriptionMedicine` server fn — no backend changes.

## Files

- `src/components/admin/change-medicine-dialog.tsx` — rewrite: accept `currentPackage`, `currentMedicineName`, `currentVariantName`, `currentPeriodEnd` props; new two-column layout; searchable list; difference summary.
- `src/routes/_authenticated/admin.orders.$orderId.tsx` — pass the current-plan context (already in `q.data`) into `<ChangeMedicineDialog />`.

## Out of Scope

- Backend/Stripe logic (`changeSubscriptionMedicine`) unchanged.
- No prorated-charge preview from Stripe's upcoming-invoice API — we intentionally don't charge at the switch, so a plain per-month diff matches the actual behavior.
