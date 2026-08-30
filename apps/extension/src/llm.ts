/// <reference types="chrome" />
// The ONLY place the extension calls a model, and only for one thing: resolving
// a form label the static dictionary (mapper.ts) could not place. No page text,
// no eligibility, no documents — those are all deterministic elsewhere.
//
// Results are cached per hostname by the caller (config.mergeLabelMap), so a
// given site is asked about at most once per label.

import type { ProfileKey } from "./mapper";
import type { Settings } from "./config";

export const PROFILE_KEYS: ProfileKey[] = [
  "full_name",
  "cgpa",
  "percentage",
  "year_of_study",
  "branch",
  "state",
  "annual_family_income",
  "institution_type",
  "gender",
  "category",
];

const SYSTEM = `You map a web form field's label to one key from a fixed list, or to null.
Keys: full_name, cgpa, percentage, year_of_study, branch, state,
annual_family_income, institution_type, gender, category.
Rules:
- Only map a label that unambiguously asks for that exact thing about the applicant.
- "father's name", "college name", "bank name", "date of birth", "year of passing",
  "mobile", "email", "address", "pincode", "roll number" -> null.
- Reply with ONLY minified JSON: {"<label>":"<key or null>", ...}. No prose.`;

interface MapResult {
  mappings: Record<string, ProfileKey | null>;
  error?: string;
}

/** Ask the model to place labels the dictionary missed. Never throws — a failure
 *  returns every label mapped to null so the caller just fills less. */
export async function mapLabels(labels: string[], settings: Settings): Promise<MapResult> {
  const clean = [...new Set(labels.map((l) => l.trim()).filter(Boolean))].slice(0, 25);
  const empty: Record<string, ProfileKey | null> = Object.fromEntries(clean.map((l) => [l, null]));
  if (clean.length === 0) return { mappings: {} };
  if (!settings.apiKey) return { mappings: empty, error: "no API key set" };

  const endpoint = `${settings.llmBase.replace(/\/+$/, "")}/chat/completions`;
  let body: unknown;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.llmModel,
        temperature: 0,
        max_tokens: 600,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: JSON.stringify(clean) },
        ],
      }),
    });
    if (!res.ok) return { mappings: empty, error: `model HTTP ${res.status}` };
    body = await res.json();
  } catch (err) {
    return { mappings: empty, error: err instanceof Error ? err.message : "network error" };
  }

  const content = (body as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]?.message?.content;
  if (typeof content !== "string") return { mappings: empty, error: "empty model response" };

  const json = content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1);
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { mappings: empty, error: "model did not return JSON" };
  }

  const valid = new Set<string>(PROFILE_KEYS);
  const mappings: Record<string, ProfileKey | null> = { ...empty };
  for (const label of clean) {
    const v = parsed[label];
    mappings[label] = typeof v === "string" && valid.has(v) ? (v as ProfileKey) : null;
  }
  return { mappings };
}
