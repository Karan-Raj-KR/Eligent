// Self-check for the page adapter. The shapes here mirror what buddy4study
// actually serves. Run: pnpm tsx --test scripts/page-records.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { pageRecords } from "./lib/page-records";

function nextPage(brandPage: unknown): string {
  return `<html><body><div id="__next"></div><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
    props: { pageProps: { scholarship: { brandPage } } },
  })}</script></body></html>`;
}

const SOURCE = "https://example.org/page/some-scholarship";

test("reads every opportunity out of a client-rendered Next.js page", () => {
  const html = nextPage({
    name: "Example Foundation",
    scholarships: [
      {
        title: "Example Scholarship 2026-27",
        deadline: "2026-10-05",
        purposeAward: "Up to INR 2,00,000",
        eligibility: "<ul><li>Applicants must have scored at least 75% in Class 12.</li></ul>",
        requiredDocument: "<ul><li>Class 12 marksheet</li></ul>",
        applyLink: "https://apply.example.org/UG",
        offeredBy: "<p>NA</p>",
        oppurtunityType: "Scholarship",
      },
      {
        title: "Example Scholarship 2021-22",
        deadline: "2022-02-16",
        eligibility: "<ul><li>Open to all.</li></ul>",
        applyLink: "https://apply.example.org/old",
        oppurtunityType: "Scholarship",
      },
    ],
  });

  const records = pageRecords(html, SOURCE);
  assert.equal(records.length, 2, "past editions are returned too — expiry is harvest.ts's call, not the adapter's");

  const current = records[0];
  assert.equal(current.name, "Example Scholarship 2026-27");
  assert.equal(current.deadline, "2026-10-05");
  assert.equal(current.amount, "Up to INR 2,00,000");
  assert.equal(current.url, "https://apply.example.org/UG", "applyLink is where a human actually applies");
  assert.equal(current.provider, "Example Foundation", "<p>NA</p> offeredBy falls back to the brand name");
  assert.match(current.text, /scored at least 75% in Class 12/);
  assert.match(current.text, /Class 12 marksheet/);
  assert.ok(!current.text.includes("<li>"), "text handed to the model is plain text, not markup");
});

test("drops non-funding rows but keeps every funding type the site uses", () => {
  // Real values observed on buddy4study: the live Reliance editions are filed
  // as "Outreach Project", so anything that allowlists "Scholarship" loses them.
  const html = nextPage({
    name: "Example",
    scholarships: [
      { title: "Psychometric Test", eligibility: "<p>Anyone</p>", oppurtunityType: "Performance Reward" },
      { title: "Tagged Scholarship", eligibility: "<p>Students</p>", oppurtunityType: "Scholarship" },
      { title: "Tagged Outreach", eligibility: "<p>Students</p>", oppurtunityType: "Outreach Project" },
      { title: "Untagged", eligibility: "<p>Students</p>" },
    ],
  });
  assert.deepEqual(pageRecords(html, SOURCE).map((r) => r.name), [
    "Tagged Scholarship",
    "Tagged Outreach",
    "Untagged",
  ]);
});

test("falls back to whole-page text for a plain server-rendered page", () => {
  const records = pageRecords("<html><body><p>Applicants must be in year 2.</p></body></html>", SOURCE);
  assert.equal(records.length, 1);
  assert.equal(records[0].name, null, "a plain page states no structured name — the model must find one");
  assert.equal(records[0].url, SOURCE);
  assert.match(records[0].text, /Applicants must be in year 2/);
});

test("an empty SPA shell yields nothing rather than a blank opportunity", () => {
  assert.deepEqual(pageRecords("<html><body><div id=\"__next\"></div></body></html>", SOURCE), []);
});

test("a row with no readable eligibility text is dropped", () => {
  const html = nextPage({ name: "Example", scholarships: [{ title: "Bare", oppurtunityType: "Scholarship" }] });
  assert.deepEqual(pageRecords(html, SOURCE), []);
});
