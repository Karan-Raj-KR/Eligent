# API contract — profile endpoints

For the Chrome extension. This file is the contract: if the extension and this
document disagree, the document is right and the endpoint is a bug.

**One profile, not two.** A student enters their details once, on the web. The
extension reads them from here. It should never ask for them again, and it does
not need to know the profile schema — the labels ship with the values.

## Authentication

Both endpoints accept, in this order:

1. `Authorization: Bearer <supabase_access_token>` — for the extension, which
   has no cookie jar. The token is the one `bridge.js` already scrapes from the
   web app's session cookie.
2. The session cookie — for the web app itself.

Row Level Security scopes every read to that token's `auth.uid()`. There is no
service-role key anywhere in this path, and no way to read another student.

`401 {"error": "unauthenticated"}` if neither is present or the token expired.

---

## `GET /api/profile`

```jsonc
{
  "user_id": "8f14e45f-ceea-467a-9e3b-1b3c4a5d6e7f",

  // The raw row, or null when the student has not finished onboarding.
  // Prefer `fields` below — this is here for debugging, and columns may be added.
  "profile": {
    "id": "8f14e45f-…",
    "full_name": "Aarav Sharma",
    "cgpa": 8.6,
    "percentage": 81.4,
    "year_of_study": 2,
    "branch": "Computer Science",
    "state": "Karnataka",
    "annual_family_income": 220000,
    "institution_type": "Private",
    "category": "General",
    "gender": "Male",
    "created_at": "2026-08-29T18:22:10.441Z"
  },

  // profile_key -> everything needed to fill one form field.
  // Key order is onboarding order; iterate it directly for display.
  "fields": {
    "full_name": {
      "label": "Full name",             // human label — render this, don't invent one
      "value": "Aarav Sharma",          // string | number | null
      "hints": [                        // CSS selectors to try on a portal form
        "input[name*=name]",
        "input[id*=name]",
        "input[autocomplete=name]"
      ],
      "optional": false                 // true = a blank is a deliberate answer
    },
    "cgpa":                 { "label": "CGPA",                  "value": 8.6,               "hints": ["input[name*=cgpa]", "input[name*=gpa]", "input[id*=cgpa]"], "optional": false },
    "percentage":           { "label": "Percentage",            "value": 81.4,              "hints": ["…"], "optional": false },
    "year_of_study":        { "label": "Year of study",         "value": 2,                 "hints": ["…"], "optional": false },
    "branch":               { "label": "Branch",                "value": "Computer Science","hints": ["…"], "optional": false },
    "state":                { "label": "State",                 "value": "Karnataka",       "hints": ["…"], "optional": false },
    "annual_family_income": { "label": "Annual family income",  "value": 220000,            "hints": ["…"], "optional": false },
    "institution_type":     { "label": "Institution type",      "value": "Private",         "hints": ["…"], "optional": false },
    "category":             { "label": "Category",              "value": "General",         "hints": ["…"], "optional": true  },
    "gender":               { "label": "Gender",                "value": "Male",            "hints": ["…"], "optional": true  }
  },

  "completeness": { "filled": 8, "total": 8, "missing": [] }
}
```

### Notes for the caller

- **`profile` can be `null`.** That is a normal state (onboarding unfinished),
  not an error — the status is still `200`. `fields` is still present, with
  every `value` set to `null`, so a renderer needs no special case.
- **`value` is `null`, never `""`.** An empty string is normalised to `null`.
- **Categorical values are canonical**: `"Male"` / `"Female"` / `"Other"`,
  `"Government"` / `"Private"` / `"Aided"`, `"General"` / `"OBC"` / `"SC"` /
  `"ST"` / `"EWS"`. Written this way on save, so casing is stable and you can
  compare exactly. Do not lowercase them before matching a form's `<option>`.
- **`hints` are hints.** Ordered best-first, may be empty, and a match is never
  guaranteed — fall back to your own label mapping.
- Field keys are stable. New keys may be **added**; existing ones will not be
  renamed or removed without a note here.

---

## `GET /api/profile/completeness`

The same `completeness` object, without pulling the student's details to count
them.

```jsonc
{
  "filled": 6,
  "total": 8,
  "missing": ["state", "institution_type"]   // profile_keys, in display order
}
```

- `total` counts **required** fields only. `category` and `gender` are optional
  because onboarding offers "Prefer not to say" — declining is an answer, and
  counting it as missing would nag a student who already decided.
- `missing` is exactly the keys to prompt for, in the order to prompt for them.

---

## Errors

| Status | Body | Meaning |
|---|---|---|
| `401` | `{"error": "unauthenticated"}` | No/expired token and no session cookie. Re-read the token from the web app. |
| `400` | `{"error": "<postgres message>"}` | The query failed. Not expected in normal operation. |

`POST /api/profile` is unchanged and still writes the profile.
