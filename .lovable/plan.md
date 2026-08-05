# Search by order number and patient ID

Today the admin search boxes only match names, emails and medicine names (plus a raw UUID substring for orders). Pasting a displayed code like `#BI-9A3F` finds nothing on the Requests and Patients lists.

## What changes

- **Medication requests list** (`/admin/requests`, practitioner list): the search box also matches the order/request ID. Typing `#BI-9A3F`, `BI-9A3F`, `9a3f`, or a full UUID all find the record. Placeholder updated to mention order ID.
- **Patients list** (`/admin/patients`): the search box also matches the patient ID in the same three forms. Placeholder updated to mention patient ID.
- **Orders list**: already supports it; unchanged.

## Technical notes

- `src/components/admin/request-list.tsx`: run the debounced value through `normalizeIdSearch()` before sending it to `listRequests`, same as the orders list does.
- `src/lib/requests.functions.ts`: the existing in-memory filter already checks `r.id.includes(s)` — it keeps working once the prefix is stripped; no change needed beyond confirming case-insensitive compare.
- `src/routes/_authenticated/admin.patients.index.tsx`: apply `normalizeIdSearch()` to the search term before the query.
- `src/lib/patients.functions.ts`: extend the `.or(...)` filter with an `id::text` prefix match so a 4-char code matches. Since PostgREST cannot `ilike` a uuid column directly, do the ID match separately: when the term looks like a hex fragment (or full uuid), also collect profiles whose `id` text starts with it, and merge with the name/email/phone matches before the status filter is applied.

Display-only formatting stays as-is; nothing in the database changes.
