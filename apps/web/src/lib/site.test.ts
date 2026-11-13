import assert from "node:assert/strict";
import test from "node:test";
import { isPastDeadline } from "./deadlines";
import { PAGE_COPY, siteJsonLd } from "./site";

test("public meta descriptions are 140 to 160 characters", () => {
  for (const [key, copy] of Object.entries(PAGE_COPY)) {
    assert.ok(
      copy.description.length >= 140 && copy.description.length <= 160,
      `${key} description is ${copy.description.length} characters`,
    );
    assert.ok(copy.title.length > 0, `${key} needs a title`);
  }
});

test("json-ld names only Karan Raj KR", () => {
  const json = JSON.stringify(siteJsonLd());
  assert.match(json, /Karan Raj KR/);
  assert.equal(json.includes("John"), false);
  assert.equal(json.includes("testimonial"), false);
});

test("a deadline earlier than today in India is past", () => {
  assert.equal(isPastDeadline("2026-11-12", "2026-11-13"), true);
  assert.equal(isPastDeadline("2026-11-13", "2026-11-13"), false);
  assert.equal(isPastDeadline("2026-11-05T18:30:00.000Z", "2026-11-13"), true);
  assert.equal(isPastDeadline(null, "2026-11-13"), false);
  assert.equal(isPastDeadline("rolling", "2026-11-13"), false);
});
