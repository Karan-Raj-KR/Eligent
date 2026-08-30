// Self-check for devpost.ts's pure mapping logic — the parts a change in
// Devpost's formatting would silently break.
// Run: pnpm tsx --test scripts/devpost.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyLocation, parseEndDate, toOpportunity } from "./devpost";

test("parseEndDate reads the END of a range, not the start", () => {
  // Same month: the end is day-only and inherits the start's month.
  assert.equal(parseEndDate("Aug 28 - 29, 2026"), "2026-08-29");
  // Crossing months: the end states its own month.
  assert.equal(parseEndDate("Jun 18 - Aug 30, 2026"), "2026-08-30");
  assert.equal(parseEndDate("Aug 29 - Sep 01, 2026"), "2026-09-01");
  assert.equal(parseEndDate("Aug 07 - 31, 2026"), "2026-08-31");
  // Crossing New Year: a year on the end wins over the trailing one.
  assert.equal(parseEndDate("Dec 15, 2026 - Jan 20, 2027"), "2027-01-20");
});

test("parseEndDate returns null rather than guessing", () => {
  for (const bad of ["", "coming soon", "TBD 2026", "Aug 28 - 29"]) {
    assert.equal(parseEndDate(bad), null, `expected null for ${JSON.stringify(bad)}`);
  }
  // A date the calendar does not have must not roll forward into March.
  assert.equal(parseEndDate("Feb 30, 2026"), null);
});

test("classifyLocation: only an exact \"Online\" is online", () => {
  assert.equal(classifyLocation("Online"), "online");
  assert.equal(classifyLocation("  online "), "online");
  // Streams as well as meets in person — still a physical event.
  assert.equal(classifyLocation("Santa Clara Convention Center and Online"), "abroad");
});

test("classifyLocation recognises Indian venues without false positives", () => {
  assert.equal(classifyLocation("Jaipur"), "india");
  assert.equal(classifyLocation("Jaipur, India"), "india");
  assert.equal(classifyLocation("K. J. Somaiya School of Engineering, Mumbai"), "india");
  assert.equal(classifyLocation("Bengaluru, Karnataka"), "india");

  assert.equal(classifyLocation("New York, NY, USA"), "abroad");
  assert.equal(classifyLocation("University of Sydney"), "abroad");
  assert.equal(classifyLocation("Canada"), "abroad");
  // "Indiana" contains "india"; Lahore is not in India. Neither is a match.
  assert.equal(classifyLocation("Indianapolis, Indiana"), "abroad");
  assert.equal(classifyLocation("Lahore Garrison University"), "abroad");
});

const base = {
  title: "SYNCS HACK 2026",
  organization_name: "SYNCS",
  url: "https://syncs-hack-2026.devpost.com/",
  submission_period_dates: "Aug 28 - Dec 29, 2099",
  prize_amount: "$<span data-currency-value>5,000</span>",
  open_state: "open",
  invite_only: false,
  eligibility_requirement_invite_only_description: null,
  displayed_location: { location: "University of Sydney" },
};

test("toOpportunity maps the payload and strips Devpost's markup", () => {
  const result = toOpportunity(base);
  assert.ok("opportunity" in result, "expected a mapped opportunity");
  const o = result.opportunity;
  assert.equal(o.name, "SYNCS HACK 2026");
  assert.equal(o.provider, "SYNCS");
  assert.equal(o.deadline, "2099-12-29");
  assert.equal(o.amount, "$5,000"); // markup gone
  assert.equal(o.category, "hackathon");
  assert.equal(o.location_type, "abroad");
  assert.equal(o.funded, false);
  assert.deepEqual(o.official_documents, []);
});

test("a payload stating no eligibility rule yields ZERO criteria", () => {
  const result = toOpportunity(base);
  assert.ok("opportunity" in result);
  assert.deepEqual(result.opportunity.criteria, []);
});

test("invite_only is the one rule the payload states", () => {
  const result = toOpportunity({
    ...base,
    invite_only: true,
    eligibility_requirement_invite_only_description: "Open to invited participants only.",
  });
  assert.ok("opportunity" in result);
  assert.equal(result.opportunity.criteria.length, 1);
  const c = result.opportunity.criteria[0];
  assert.equal(c.field, "student_status");
  assert.equal(c.operator, "eq");
  assert.equal(c.value, "invited");
  // source_text is the API field it came from, and it really is in the payload.
  assert.equal(c.source_text, "invite_only");
  assert.ok(JSON.stringify(base).includes(c.source_text));
});

test("skips closed states, past deadlines and unreadable dates", () => {
  const closed = toOpportunity({ ...base, open_state: "ended" });
  assert.ok("skip" in closed && closed.skip.includes("open_state"));

  const past = toOpportunity({ ...base, submission_period_dates: "Aug 28 - 29, 2020" });
  assert.ok("skip" in past && past.skip.includes("passed"));

  const unreadable = toOpportunity({ ...base, submission_period_dates: "soon" });
  assert.ok("skip" in unreadable && unreadable.skip.includes("end date"));
});

test("HTML entities in a venue name are decoded before classifying", () => {
  const result = toOpportunity({
    ...base,
    displayed_location: { location: "Stone &amp; Chalk Melbourne" },
  });
  assert.ok("opportunity" in result);
  assert.equal(result.opportunity.location_type, "abroad");
});
