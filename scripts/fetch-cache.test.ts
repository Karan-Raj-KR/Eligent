// Self-check for the JS-shell heuristic in lib/fetch-cache.ts. Run:
//   pnpm tsx --test scripts/fetch-cache.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { looksLikeJsShell } from "./lib/fetch-cache";

test("looksLikeJsShell flags a short page regardless of markup", () => {
  const html = "<html><body><p>Loading...</p></body></html>";
  assert.equal(looksLikeJsShell(html), true);
});

test("looksLikeJsShell flags a page with plenty of text but no <p>/<li> tags (a SPA shell)", () => {
  // A Next.js-style shell: real content length lives in a <script> JSON blob,
  // not in any content tag — exactly what buddy4study's raw HTML looks like.
  const filler = "x".repeat(900);
  const html = `<html><body><div id="__next"></div><script id="__NEXT_DATA__">{"a":"${filler}"}</script></body></html>`;
  assert.equal(looksLikeJsShell(html), true);
});

test("looksLikeJsShell clears a normal server-rendered page", () => {
  const paragraph = "Applicants must have a CGPA of at least 8.0 to qualify for this scholarship. ".repeat(12);
  const html = `<html><body><p>${paragraph}</p><li>One document requirement.</li></body></html>`;
  assert.equal(looksLikeJsShell(html), false);
});

test("looksLikeJsShell flags exactly-empty content", () => {
  assert.equal(looksLikeJsShell(""), true);
  assert.equal(looksLikeJsShell("<html><body></body></html>"), true);
});
