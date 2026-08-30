// Self-check for discover.ts's link classification. Run:
//   pnpm tsx --test scripts/discover.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { classify, extractAnchors } from "./discover";
import { SOURCES, type Source } from "./sources";

const BUDDY4STUDY = SOURCES.find((s) => s.id === "buddy4study")!;

// A synthetic cross-host source, to cover discover.ts's crossHost path without
// coupling to whichever real source happens to need it.
const CROSSHOST: Source = {
  id: "crosshost-demo",
  category: "hackathon",
  location_type: "online",
  funded: true,
  listings: ["https://hub.example.com/list"],
  detail: /^https?:\/\/(?!help\.|info\.)[a-z0-9-]+\.example\.com\/?$/i,
  crossHost: true,
};

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

test("classify with a configured source keeps only its detail-page shape", () => {
  const result = classify("/scholarship/merit-2026", "Merit Scholarship", BUDDY4STUDY_SOURCE, BUDDY4STUDY);
  assert.deepEqual(result, { url: "https://www.buddy4study.com/scholarship/merit-2026" });
});

test("classify with a configured source drops links its detail pattern rejects", () => {
  // /page/<slug> is a real buddy4study path (brand aggregator pages) — not a
  // login/category/pagination link, so the generic checks would have let it
  // through. The source's detail pattern must still reject it.
  const result = classify("/page/reliance-foundation-scholarships", "Reliance Foundation", BUDDY4STUDY_SOURCE, BUDDY4STUDY);
  assert.ok("skip" in result && result.skip.includes("buddy4study"));

  const category = classify("/scholarships/karnataka", "Karnataka scholarships", BUDDY4STUDY_SOURCE, BUDDY4STUDY);
  assert.ok("skip" in category);
});

test("classify with a crossHost source keeps detail pages on other hosts", () => {
  const listing = new URL("https://hub.example.com/list");
  const result = classify(
    "https://cool-hack-2026.example.com/?ref=discover",
    "Cool Hack",
    listing,
    CROSSHOST,
  );
  assert.deepEqual(result, { url: "https://cool-hack-2026.example.com" });
});

test("classify honours a crossHost source's detail pattern (drops service subdomains)", () => {
  const listing = new URL("https://hub.example.com/list");
  assert.ok("skip" in classify("https://help.example.com/", "Help", listing, CROSSHOST));
  assert.ok("skip" in classify("https://info.example.com/blog", "Blog", listing, CROSSHOST));
});

test("classify without a configured source keeps generic same-domain links", () => {
  const result = classify("/page/some-other-scholarship", "Some Scholarship", SOURCE);
  assert.ok(!("skip" in result));
});
