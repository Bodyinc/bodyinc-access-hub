## Fix horizontal scroll on Edit Medicine page

The page overflows on ~1138px MacBook widths because the two-column layout kicks in at `lg` (1024px) even though the columns together need more space than that:

- Left form column: `flex-1 max-w-5xl` with an inner 354px image card + form fields
- Right preview column: fixed `w-[440px]`
- `gap-12` (48px) between them
- Outer padding: `pl-8 pr-12`

With the admin sidebar taking ~260px, the content area on a 1138px screen is ~878px, well under what the two columns need — so the page scrolls sideways.

### Changes (single file: `src/routes/_authenticated/admin.medicines.$medicineId.tsx`)

1. Promote the side-by-side layout from `lg:` (1024px) to `xl:` (1280px), so on MacBook screens the form and preview stack vertically and each fits its own row.
2. Reduce outer padding on smaller widths: `px-4 sm:px-6 xl:pl-8 xl:pr-12`.
3. Add `min-w-0` to the form column and drop the `max-w-5xl` cap so it can shrink to the container width.
4. Make the preview column full-width when stacked and only fix to `440px` at `xl:`.
5. Reduce the gap at smaller widths (`gap-6 xl:gap-12`).

No visual changes at xl+ widths; only fixes the overflow at ≤1279px.
