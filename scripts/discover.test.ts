// Self-check for discover.ts's link classification. Run:
//   pnpm tsx --test scripts/discover.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { classify, extractAnchors } from "./discover";

const SOURCE = new URL("https://example.com/scholarships/");

test("extractAnchors pulls href and plain-text anchor content", () => {
  const html = `<ul>
    <li><a href="/scholarships/merit-2026">Merit Scholarship <b>2026</b></a></li>
    <li><a href='/about'>About Us</a></li>
  </ul>`;
  const anchors = extractAnchors(html, SOURCE.href);
  assert.equal(anchors.length, 2);
  assert.equal(anchors[0].href, "/scholarships/merit-2026");
  assert.equal(anchors[0].text, "Merit Scholarship 2026");
});

test("extractAnchors decodes HTML-escaped hrefs (e.g. &amp; in query strings)", () => {
  const html = `<a href="/apply?title=X&amp;action=view">Apply</a>`;
  const anchors = extractAnchors(html, SOURCE.href);
  assert.equal(anchors[0].href, "/apply?title=X&action=view");
});

test("classify keeps a same-domain detail-page link", () => {
  const result = classify("/scholarships/merit-2026", "Merit Scholarship", SOURCE);
  assert.deepEqual(result, { url: "https://example.com/scholarships/merit-2026" });
});

test("classify resolves a relative href against the source page", () => {
  const result = classify("merit-2026", "Merit Scholarship", SOURCE);
  assert.deepEqual(result, { url: "https://example.com/scholarships/merit-2026" });
});

test("classify drops a different-domain link", () => {
  const result = classify("https://other.com/scholarships/x", "X Scholarship", SOURCE);
  assert.ok("skip" in result && result.skip === "different domain");
});

test("classify drops mailto/tel/javascript schemes", () => {
  for (const href of ["mailto:info@example.com", "tel:+911234567890", "javascript:void(0)"]) {
    const result = classify(href, "Contact", SOURCE);
    assert.ok("skip" in result, `expected ${href} to be skipped`);
  }
});

test("classify drops denylisted keyword pages", () => {
  for (const [href, text] of [
    ["/login", "Login"],
    ["/about-us", "About"],
    ["/blog/2026-updates", "Blog"],
    ["/contact", "Contact Us"],
    ["/category/merit", "Merit Category"],
  ] as const) {
    const result = classify(href, text, SOURCE);
    assert.ok("skip" in result, `expected ${href} to be skipped`);
  }
});

test("classify drops non-page assets and pagination links", () => {
  assert.ok("skip" in classify("/downloads/brochure.pdf", "Brochure", SOURCE));
  assert.ok("skip" in classify("/scholarships/?page=2", "Next", SOURCE));
  assert.ok("skip" in classify("/scholarships/page/3", "Next", SOURCE));
});

test("classify drops a fragment-only self-link", () => {
  const result = classify("#eligibility", "Eligibility", SOURCE);
  assert.ok("skip" in result && result.skip.includes("same page"));
});

test("classify drops empty anchor text", () => {
  const result = classify("/scholarships/merit-2026", "   ", SOURCE);
  assert.ok("skip" in result && result.skip === "empty anchor text");
});

const BUDDY4STUDY_SOURCE = new URL("https://www.buddy4study.com/scholarships/engineering");

test("classify on a buddy4study source keeps only /scholarship/<slug> detail links", () => {
  const result = classify("/scholarship/merit-2026", "Merit Scholarship", BUDDY4STUDY_SOURCE);
  assert.deepEqual(result, { url: "https://www.buddy4study.com/scholarship/merit-2026" });
});

test("classify on a buddy4study source drops non-/scholarship/ links even when nothing else would", () => {
  // /page/<slug> is a real buddy4study path (brand aggregator pages) — not a
  // login/category/pagination link, so the generic checks would have let it
  // through. The buddy4study-specific scope must still reject it.
  const result = classify("/page/reliance-foundation-scholarships", "Reliance Foundation", BUDDY4STUDY_SOURCE);
  assert.ok("skip" in result && result.skip.includes("buddy4study scholarship detail link"));

  const category = classify("/scholarships/karnataka", "Karnataka scholarships", BUDDY4STUDY_SOURCE);
  assert.ok("skip" in category);
});

test("classify does not apply the buddy4study scope to other domains", () => {
  // Same-shaped path, different host — the generic rules apply, not the scope.
  const result = classify("/page/some-other-scholarship", "Some Scholarship", SOURCE);
  assert.ok(!("skip" in result));
});
