# Changes the extension needs from apps/web

Written here instead of made — this worktree owns `apps/extension/` only.

## 1. A bearer-auth endpoint to POST fill progress back  (STEP 2A)

STEP 2A asks the extension to "POST progress back after filling". Today the only
extension-facing endpoint is `GET /api/fill/:application_id` (bearer auth via
`getBearerUser`). `PATCH /api/application/:id/requirement` exists but uses the
**cookie** session (`getSessionUser`), which a content script / popup fetch does
not carry.

Needed: something like `POST /api/fill/:application_id/progress`, bearer-authed,
body `{ filled: number, skipped: string[], unlisted_documents: string[] }`,
that stamps `application.autofilled_at` (new nullable column) and optionally
inserts the `unlisted_documents` as `report` rows of type `extra_document` so the
community doc list improves itself.

Until it exists the extension fills and shows the diff but records nothing.

## 2. (Nice to have) `opportunity.official_documents` and `opportunity.url` confirmed on the fill payload

`GET /api/fill/:application_id` returns `opportunity` via `select("*, opportunity(*)")`,
so both `official_documents` and `url` are included today. The extension now depends
on **both**:

- `official_documents` — input to the document diff.
- `url` — shown in the popup as "Rather not autofill? Open <host>", so a student
  who doesn't want the autofill can go straight to the real application page.

If the select is ever narrowed, keep both columns on it (or add the official
rows to `requirements` explicitly, and surface `opportunity.url` some other way).

Nothing else is required. Auth, eligibility gating, and the field/requirement
shapes are all already provided.
