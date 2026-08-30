# Eligent extension — build report

Branch `overnight-ext`, worktree `../eligent-ext`. Scope: `apps/extension/` only.
Build: Chrome MV3, vanilla TS bundled with esbuild, no runtime deps.

## What works (verified)

### STEP 1 — `src/mapper.ts`
Pure `lookup(labelText) -> ProfileKey | null`. Static ordered phrase dictionary,
whole-token matching on whitespace-normalised, case-insensitive text so
`name as per marksheet` → `full_name` (not `percentage` via "marks"). Negative
guards keep `father's name` / `college name` / `bank account` / `year of passing`
out of the wrong bucket. Covers every field in `apps/web/src/lib/field-hints.ts`
(the 9 in the brief + `category`).
Test: `src/mapper.test.ts`, 29 positive + 10 negative cases, run with
`pnpm --filter opportunity-extension test` (esbuild → CJS → node, non-zero exit on
any failed assert). **Passing.**

### STEP 2 — `src/content.ts`
Injected into the active tab by the popup via `chrome.scripting.executeScript`
(activeTab grant from the popup click — no broad host permissions). Guarded
against double-injection. One message in (`ELIGENT_FILL`), one result out.

- **FILL** — walks `input, select, textarea`, resolves each to a profile key
  through `mapper.lookup` over label(`for=`)/wrapping-label/`aria-label`/
  `aria-labelledby`/`placeholder`/`name`/`id`/`title` (best signal first). Sets
  values through the native `HTMLInputElement/Select/TextArea` value setter, then
  dispatches bubbling `input` + `change` so React-controlled inputs register.
  `<select>` matched by option value or visible text. Never touches
  `submit`/`button`/`reset`/`image`/`hidden`/`file`/`password`.
- **Checkboxes/radios** — never ticked, ever. If the label reads like a legal
  affirmation (`declar*`, `consent`, `terms`, `attest*`, `undertak*`, `hereby`,
  `certif*`, `authoris/ze*`, `privacy`, `disclaimer`, `affirm*`) it is returned in
  `skipped` with a reason so the popup can tell the human what's still theirs.
- **BLOCK** — `response.blocked === true` → fills nothing, returns `{blocked:true}`.
  (The popup already gates on this before injecting; content.ts double-checks.)
- **DOC DIFF** — enumerates every `<input type="file">`, derives a name from its
  label / aria / placeholder / nearest preceding heading, and string-matches that
  set against the official document list from the API. Match = substring either
  way, else a shared significant word (generic words like "certificate", "copy",
  "photo" filtered; falls back to any shared word when both names are all-generic
  so "ID proof" still matches "ID proof"). **No LLM, no network.** Returns
  `{ formDemands, pageListed, unlisted[], matched[] }`.

### STEP 3 — `public/popup.html` + `src/popup.ts`
360px, light theme, plain CSS, high contrast. States:
- **Filled** — "Filled N fields. Check them, then submit yourself." + a "Left for
  you" list (declaration boxes, fields with no profile value).
- **Document detected** — "This form demands N documents. Their page listed M.
  Here are the ones nobody told you about:" + the unlisted list. Counts come
  straight from the diff; nothing is invented.
- **Blocked** — reason headline + the verbatim clause + source quote + gap line
  (reuses the Phase 4 blocked renderer).
Plus the existing signed-out / no-application / ready states.

### STEP 4 — offline demo mode
Checkbox in the popup footer ("Demo mode — use bundled fixture, no network").
Persisted to `chrome.storage.local`. When on, the popup loads
`public/fixture.json` (eligible → fill + diff) or `public/fixture-blocked.json`
(blocked → clause) instead of calling the API. Zero network. `fixture.json` is
built to pair with `TEST-PAGE.html`.

### STEP 5 — verification
`TEST-PAGE.html`: fake portal, 12 labelled inputs (10 mappable + email/mobile as
decoys), 6 file inputs (4 on the official list, 2 off it), one declaration
checkbox. Ran the **built** `dist/content.js` against it in a real browser with a
`chrome.runtime` shim:

| Check | Expected | Got |
|---|---|---|
| fields filled | 10 (all mappable, decoys untouched) | 10 ✓ |
| declaration checkbox | not ticked, reported in `skipped` | not ticked, reported ✓ |
| file inputs | never touched | all empty ✓ |
| diff `formDemands` / `pageListed` | 6 / 6 | 6 / 6 ✓ |
| diff `unlisted` | exactly `Domicile / Residence Certificate`, `Migration Certificate` | exactly those two ✓ |
| blocked message | `{blocked:true}`, nothing filled | `{blocked:true}`, 0 filled ✓ |

`pnpm --filter opportunity-extension typecheck` and `... build` both clean.

## What is untested / known limits

- **Popup end-to-end in a real Chrome profile** — element-id wiring is
  cross-checked against `popup.html` and the state logic is plain show/hide, but
  it has not been click-tested inside `chrome://extensions`. The mapper, fill,
  block and diff logic (the parts with real branching) are browser-verified.
- **Real portal DOMs** — only `TEST-PAGE.html` was exercised. `mapper.ts` phrases
  and `nearestName`'s heading walk are best-effort against buddy4study /
  reliancefoundation markup; treat the dictionary as tunable. `ponytail:` ceiling
  noted in `mapper.ts` — it's a static dictionary, extend phrases as real portals
  show up.
- **Progress POST-back (STEP 2A)** — not implemented: no bearer-auth endpoint
  exists for it. See `NEEDS-FROM-WEB.md`.
- **Multi-step / paginated application forms** — fills whatever is in the current
  DOM; no navigation between form pages.
- **Shadow DOM / cross-origin iframes** — not traversed.
- `docMatches` is a heuristic; a portal that labels an upload with only a
  synonym of an official doc ("Bonafide" vs "Institution Certificate") will be
  reported as unlisted. Conservative on purpose — better a false "nobody told
  you" than hiding a required upload.

## Needed from the web app

See `NEEDS-FROM-WEB.md`. Short version: a bearer-authed
`POST /api/fill/:id/progress` so the extension can record what it filled and feed
back the unlisted documents. Everything else it needs is already on
`GET /api/fill/:application_id`.

## Load it in Chrome

1. `pnpm --filter opportunity-extension build`  (outputs `apps/extension/dist/`)
2. `chrome://extensions` → enable **Developer mode** (top-right).
3. **Load unpacked** → select `apps/extension/dist/`.
4. For the offline demo / the test page over `file://`: on the extension's card
   click **Details** → enable **Allow access to file URLs**.
5. Pin the extension. You should see the Eligent icon.

### Try the offline demo (no app, no network)
1. Open `apps/extension/TEST-PAGE.html` in a tab (drag the file into Chrome).
2. Click the Eligent icon → tick **Demo mode**.
3. Leave the case on "Eligible" → **Check eligibility & fill**. 10 fields fill;
   the popup shows the two unlisted uploads. Switch the case to "Blocked" and
   run again to see the clause with nothing filled.

### Live flow
1. `pnpm --filter web dev`, sign in at `http://localhost:3000`, open an
   application (`/application/<id>`) — the bridge captures the session.
2. Open the scholarship's real form in another tab.
3. Click the Eligent icon → **Check eligibility & fill**. If the engine says
   not-eligible you get the clause and nothing is filled; otherwise fields fill
   and any surprise document uploads are listed. **You press submit. Always.**
