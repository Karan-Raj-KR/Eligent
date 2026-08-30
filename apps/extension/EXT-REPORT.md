# Eligent extension — build report

Scope: `apps/extension/` only. Chrome MV3, vanilla TS bundled with esbuild, no
runtime dependencies. This pass rewrote the form-filling half — label
extraction, field setting, multi-step re-scan, visual feedback — and moved the
API origin behind a single build-time define. The popup UI, session bridge and
background worker are unchanged.

```
pnpm --filter opportunity-extension build       # -> apps/extension/dist/
pnpm --filter opportunity-extension typecheck   # clean
pnpm --filter opportunity-extension test        # unit + render checks
pnpm --filter opportunity-extension test:e2e    # real-browser (Playwright) checks
```

Load unpacked: `chrome://extensions` → Developer mode → **Load unpacked** →
`apps/extension/dist/`. For the offline demo over `file://`, open the extension's
**Details** and enable **Allow access to file URLs**.

---

## The UI — three tabs, nothing else

`public/popup.html` + `public/popup.css` (the only stylesheet) + `src/popup.ts`.
380px, dark, one accent (`--accent`, blue), system font stack, rounded cards with
subtle borders, inline SVG only — no framework, no icon library. Semantic red /
amber are reserved for the BLOCKED / DOC-DIFF result states, per the brief.

### TAB 1 — HOME (status)

- Header: `Eligent` wordmark + the active application name.
- Setup checklist, three tappable cards, each a check or empty state:
  1. **Signed in** — an anonymous session is present (captured by `bridge.ts`).
     Tap → opens the web app.
  2. **Profile complete** — `N of 8 fields` with a thin progress bar. Tap → `/onboarding`.
  3. **Open an application** — the application name, or "Pick one from your
     matches". Tap → `/matches`.
- **What it knows about you** — the profile fields with values and a provenance
  label per row (`from your profile` when synced from the web app, `you entered
  it` when typed into the extension, `from the demo fixture` in demo mode). A
  search box filters the list. Tapping a row lets you fill a blank locally
  (stored only in `chrome.storage.local`, overlaid on the synced profile).
- Footer: *Your details stay in your browser. We never submit for you.*

**The 8 in "N of 8":** `full_name, cgpa, percentage, year_of_study, branch,
state, annual_family_income, institution_type` — the identity + academic set the
autofill writes. `gender` and `category` are eligibility-only, shown in the
panel when present but not counted toward the checklist.

### TAB 2 — SCAN (the action)

One primary button, **Scan this page**. Then exactly one of four full-width
states:

| state | when | shows |
|---|---|---|
| **FILLED** (green) | eligible, no document surprise | `12 fields found. 10 filled from your profile. 2 need you.` + the list of what needs you |
| **BLOCKED** (red) | engine returned not-eligible | the clause (`Family income exceeds ₹3L`), the verbatim source sentence, a source link, and a **See what you qualify for** button. Fills nothing. |
| **DOC DIFF** (amber) | eligible, but the form's file inputs exceed the official list | `This form demands 6 documents. Their page listed 4.` + the 2 unlisted uploads named. Given the most space. |
| **ERROR** | chrome:// page, injection failure, unreachable app | plain language, e.g. *Browser pages are off limits to extensions. Open the application portal and try again.* Never a stack trace. |

DOC DIFF wins over FILLED when both apply — the surprise documents are the
costlier thing to miss.

### TAB 3 — SETUP

`src/config.ts` owns every `chrome.storage` key.

- **API base URL** — the Eligent web app origin.
- **Field-mapping model key (BYOK)** — password field, note underneath:
  *stored locally, sent only to the provider, nothing routes through us.*
- **Model endpoint** / **Model** — default `https://integrate.api.nvidia.com/v1`
  and `meta/llama-3.3-70b-instruct` (NVIDIA NIM).
- **Demo mode** toggle + a scenario picker (docdiff / filled / blocked / error).
- **Forget everything** — clears the session, every per-host label cache, local
  values and settings.

---

## Behaviour rules — how each is enforced

| rule | where |
|---|---|
| Never click submit | `form-scan.ts` skips `input[type=submit\|button\|reset\|image]`; nothing calls `.click()` or `form.submit()` anywhere. |
| Never tick declarations / consent / terms | checkboxes and radios are **never** touched. A checkbox whose label matches `DECLARATION_RE` is returned in `declarations[]` (and outlined red) so the popup can tell the human it's theirs. |
| Document diff by string comparison, no LLM | `docMatches` in `form-scan.ts` — substring either way, else a shared significant word (generic words filtered). No network, no model. |
| LLM only for a dictionary miss, cached per host | `llm.ts` `mapLabels()` is called from `popup.ts` **only** with labels `mapper.lookup` returned nothing for, **only** when a key is set and demo mode is off. Results (including confirmed non-matches) are written to `chrome.storage.local` under `labelmap:<hostname>` and reused on the next scan. |
| Never set a file input's value | `form-scan.ts` enumerates `input[type=file]` for the diff only (and outlines them red); it never assigns `.value` or `.files`. Verified: 0 file inputs touched. |
| Demo mode = bundled fixtures, zero network | demo mode loads `demo-{docdiff,filled,blocked}.json` from the extension package; the `error` scenario renders without any fetch. No `/api/fill` call, no model call. |
| One origin, one place | `src/config.ts` reads the esbuild `define` `__API_BASE__` and nothing else in the TS knows the URL; `manifest.json` / `popup.html` carry an `__API_ORIGIN__` placeholder that `build.mjs` substitutes. `build.mjs` throws if the placeholder is missing (someone hardcoded a domain). Default `https://eligent.karanrajkr.com`, override with `ELIGENT_API_BASE`. No `localhost` anywhere. |

### The rewritten form fill (`form-scan.ts` + `mapper.ts`)

- **Label extraction** — `mapper.extractLabel(el)` is a priority chain, first
  non-empty wins: `aria-label` / `aria-labelledby` → `<label for>` → wrapping
  `<label>` → `<fieldset><legend>` → preceding text node → `placeholder` →
  `name` → `id` → nearest preceding heading. Normalised: whitespace collapsed,
  a trailing `*`, `(required)` or `:` stripped. `lookup()` lowercases and
  strips inner punctuation itself.
- **Framework-safe set** — `setNativeValue`: `el.focus()`, then the value is set
  through `Object.getOwnPropertyDescriptor(proto, "value").set` (not `el.value =`,
  which React's own value tracker would ignore), then `input` + `change` bubble,
  then `el.blur()`. `<select>` matches an option by exact `value`, then by exact
  normalised visible text.
- **Multi-step portals** — after the first fill, a `MutationObserver` on
  `document.body` (childList + subtree, debounced 400 ms) re-runs the fill.
  Already-marked controls are skipped, so only genuinely new fields get touched;
  an explicit re-scan clears the marks first.
- **Visual feedback** — one injected `<style>`: green outline on a filled field,
  amber on an unmatched one, red on a field Eligent is hard-blocked from
  touching (declaration checkbox, file input). Set via a `data-eligent`
  attribute, so no page class is clobbered.

The eligibility gate is upstream and unchanged: `GET /api/fill/:application_id`
(bearer auth) returns `blocked: true` for a not-eligible profile, and the popup
renders BLOCKED without ever injecting the content script.

---

## Verification

### Unit + render — `pnpm test`
- `src/mapper.test.ts` — 29 positive + 10 negative label→key cases. Passing.
- `src/verify.test.ts` — against `TEST-PAGE.html`'s upload labels and the demo
  fixtures: the document string-match yields **exactly** `Domicile / Residence
  Certificate` + `Migration Certificate` (6 demanded, 4 listed); and all four
  `scan-view` states build the correct HTML (headline, doc names, source quote,
  declaration surfaced, plain-language error). Passing.

### Real browser — `pnpm test:e2e` (Playwright, already a repo devDependency)
- `src/verify-dom.mjs` — headless Chromium, four fixtures, asserting against the
  live DOM:

  **1. `TEST-PAGE.html`** (plain form)

  | check | result |
  |---|---|
  | fillable controls found | 12 (f1–f12) |
  | filled from the demo profile | 10 |
  | left for the user | `Mobile Number`, `Email Address` (the 2 decoys) |
  | `<select>` matched to options | `2nd Year`, `Computer Science`, `Private` ✓ |
  | declaration checkbox | **not ticked**, returned in `declarations[]`, outlined red ✓ |
  | `input[type=file]` values set | **0**, all 6 outlined red ✓ |
  | outlines | `f1` green, `f5`/`f6` amber ✓ |
  | field appended after the scan | filled by the `MutationObserver` within 550 ms, outlined green ✓ |
  | DOC DIFF `unlisted` | exactly `[Domicile / Residence Certificate, Migration Certificate]` ✓ |
  | official list covers all 6 uploads | `unlisted` empty ✓ |

  **2. `extractLabel` priority chain** — a 10-input fixture, one per rung
  (`aria-label` with a trailing `*`, `aria-labelledby` over a placeholder,
  `label[for]` with `(required)`, wrapping `<label>`, `<legend>`, preceding text
  node with a trailing `:`, `placeholder`, `name`, `id`, preceding `<h3>`); every
  rung resolves to the expected string ✓

  **3. A real React controlled `<input>`** (React 18 UMD from cdnjs, state
  mirrored into the DOM) — after the fill the input's `value` **and** React's
  `useState` both read `Aarav Sharma`, i.e. `setNativeValue` defeated React's
  value tracker; the field is outlined green and counted ✓

  **4. A real Google Form** (`docs.google.com/forms/d/…/viewform`, a live React
  app, injected past its Trusted-Types CSP via CDP `evaluate`) — Google renders
  its radios as `role="radio"` divs, so the only control the scan sees is the
  long-answer `<textarea>`; it maps to no profile key, so: 0 filled, 0
  radio/checkbox state changes, textarea left empty and outlined amber, its
  label read from Google's `aria-labelledby` wiring. (Skips with a warning, not a
  failure, if the form is unreachable.)

- `src/verify-popup.mjs` — renders the real `popup.html` + `popup.css` +
  `popup.js` behind a `chrome.*` shim, screenshots every tab and Scan state
  (`dist/shots/`), and asserts:
  - HOME: `8 of 8 fields`, active application name, provenance labels, footer.
  - SCAN → each demo scenario produces its state with the right class and copy —
    DOC DIFF names the 2 extras, FILLED shows `12 / 10 / 2` and the 2 decoys,
    BLOCKED shows the clause + quote + escape hatch, ERROR shows the
    browser-page message.

  All pass.

---

## Files

```
public/manifest.json      MV3, name "Eligent"; host perms carry an __API_ORIGIN__ placeholder (build.mjs substitutes the real origin) + NVIDIA NIM
public/popup.html         static shell — header, demo banner, tab bar, 3 panels; __API_ORIGIN__ placeholder in the API-base field
public/popup.css          the one stylesheet
public/demo-{docdiff,filled,blocked}.json   offline fixtures, paired with TEST-PAGE.html
src/popup.ts              3-tab controller: HOME checklist + profile panel, SCAN flow, SETUP
src/scan-view.ts          pure HTML builders for the 4 Scan states
src/form-scan.ts          the DOM half of a scan — fillForm / documentDiff / docMatches
src/content.ts            classic content script: message <-> form-scan (no exports — see note in file)
src/config.ts             settings + per-host label cache + "forget everything"
src/llm.ts                NVIDIA NIM label→key mapping, called only on a dictionary miss
src/mapper.ts             static label dictionary (lookup) + the DOM label priority chain (extractLabel)
src/config.ts / build.mjs API origin: one esbuild `define` (__API_BASE__) + one string substitution (__API_ORIGIN__), default https://eligent.karanrajkr.com, override with ELIGENT_API_BASE
src/background.ts         session capture from the bridge (kept)
src/bridge.ts             reads the web app's Supabase session + application id (kept)
src/{mapper,verify}.test.ts, src/verify-{browser.ts,dom.mjs,popup.mjs}   verification
```

## Known limits

- **Real portal DOMs** — `TEST-PAGE.html`, a real React controlled input and a
  live Google Form are exercised end to end; buddy4study / unstop / devpost
  markup is not. `mapper.ts` phrases are still meant to be extended per portal.
- **Progress POST-back** — still not implemented; no bearer-authed endpoint
  exists for it. See `NEEDS-FROM-WEB.md`.
- **Shadow DOM, cross-origin iframes** — not traversed. `MutationObserver`
  handles same-document multi-step portals (fields swapped in without a
  navigation); a full page navigation drops the observer and needs a re-scan.
- **Custom API base / model endpoint on other hosts** — needs a one-time host
  permission grant (`optional_host_permissions: https://*/*`); the build's own
  origin and NVIDIA NIM work out of the box.
- **`<select>` option matching** is exact only (value, then normalised visible
  text) — a portal that labels an option "Second Year" while the profile holds
  "2nd Year" won't match. Extend the profile values or the dictionary, not a
  fuzzy contains.
- **MutationObserver re-scan** fills newly-appeared fields but its result never
  reaches the popup (it may be closed by then) — the outline colour on the field
  is the only feedback for step 2+.
- The BYOK model call runs from the popup; if the popup closes mid-call the
  learned mappings for that scan aren't cached (they're re-derived next scan).
