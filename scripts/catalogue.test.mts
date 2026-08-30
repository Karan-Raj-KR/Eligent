// Catalogue regression tests — the verdicts that must never silently flip.
//
//   npx tsx scripts/catalogue.test.mts
//
// Offline and deterministic: it reads packages/db/seed.ts, which dump-seed.ts
// keeps identical to the database. No credentials, no network, no model.
//
// Every assertion here is a bug that shipped or nearly shipped. A restriction
// the catalogue fails to encode does not produce a slightly worse answer — it
// tells a student they qualify for something they cannot have.

import assert from "node:assert/strict";
import { evaluate, type Criterion } from "@opportunity/engine";
import { seedOpportunities, type SeedOpportunity } from "../packages/db/seed.js";

const BASE = {
  full_name: "Test Student",
  cgpa: 8.4,
  percentage: 82,
  year_of_study: 2,
  branch: "Computer Science",
  state: "Karnataka",
  annual_family_income: 300000,
  institution_type: "Private",
  category: "General",
  gender: "Male",
};

function find(fragment: string): SeedOpportunity {
  const matches = seedOpportunities.filter((o) => o.name.toLowerCase().includes(fragment.toLowerCase()));
  assert.ok(matches.length > 0, `no opportunity matching "${fragment}" — was it deleted? update this test deliberately, never to make it pass`);
  return matches[0];
}

const criteriaOf = (o: SeedOpportunity) => o.criteria as unknown as Criterion[];

/** Every criterion in the catalogue must quote the page it came from. */
function assertQuoted(o: SeedOpportunity) {
  for (const c of o.criteria) {
    assert.ok(c.source_text.trim().length > 0, `${o.name}: criterion ${c.field} has no source_text`);
  }
}

// ---------------------------------------------------------------------------
// 1. GENDER — the Kotak Kanya bug. A male profile was returned as ELIGIBLE for
//    a scholarship whose page says "Exclusively for girl students".
// ---------------------------------------------------------------------------
{
  const kanya = find("Kotak Kanya");
  assertQuoted(kanya);

  const gender = kanya.criteria.find((c) => c.field === "gender");
  assert.ok(gender, "Kotak Kanya must carry a gender criterion");
  assert.equal(gender.value, "Female", "must be the canonical 'Female', not 'female' — the engine compares with ===");
  assert.match(
    gender.source_text.toLowerCase(),
    /girl|women|female|kanya/,
    "the quoted clause must actually state the restriction",
  );

  const male = evaluate(BASE, criteriaOf(kanya));
  assert.equal(male.status, "rejected", "a male profile must be REJECTED by a girls-only scholarship");
  const failedGender = male.failed.find((f) => f.field === "gender");
  assert.ok(failedGender, "the gender criterion must be among the failures");
  assert.equal(failedGender.gap, undefined, "a categorical failure has no gap — it can never be a near miss");

  // The student has to be shown WHY, in the provider's own words.
  const quoted = kanya.criteria.find((c) => c.field === "gender")!.source_text;
  assert.ok(quoted.length > 0, "the rejection must be able to quote the clause");

  // And the scholarship must still work for the students it is meant for.
  // Kanya is also first-year-only, so a year-2 woman is still (correctly)
  // rejected — what must never happen is her failing on GENDER. This is the
  // half of the fix that canonicalisation buys: a criterion holding "female"
  // while her profile holds "Female" would reject every woman alive.
  const female = evaluate({ ...BASE, gender: "Female" }, criteriaOf(kanya));
  assert.ok(
    !female.failed.some((f) => f.field === "gender"),
    `a female profile must pass the gender criterion (failed: ${female.failed.map((f) => f.field).join(", ") || "none"})`,
  );

  // The eligible woman this scholarship is actually for.
  const firstYearWoman = evaluate({ ...BASE, gender: "Female", year_of_study: 1 }, criteriaOf(kanya));
  assert.equal(
    firstYearWoman.status,
    "eligible",
    `a first-year woman meeting every criterion must be ELIGIBLE (failed: ${firstYearWoman.failed.map((f) => `${f.field}=${JSON.stringify(f.profileValue)} vs ${JSON.stringify(f.requirement)}`).join(", ")})`,
  );
}

// ---------------------------------------------------------------------------
// 2. STATE — a Karnataka-only scholarship must reject a student from elsewhere,
//    and a categorical failure must never soften into a near miss.
// ---------------------------------------------------------------------------
{
  const stateRestricted = seedOpportunities.find((o) => o.criteria.some((c) => c.field === "state"));
  assert.ok(stateRestricted, "the catalogue must contain at least one state-restricted opportunity");
  assertQuoted(stateRestricted);

  const state = stateRestricted.criteria.find((c) => c.field === "state")!;
  const allowed = (Array.isArray(state.value) ? state.value : [state.value]).map(String);

  const insider = evaluate({ ...BASE, state: allowed[0] }, criteriaOf(stateRestricted));
  assert.ok(!insider.failed.some((f) => f.field === "state"), `a ${allowed[0]} student must pass the state criterion of "${stateRestricted.name}"`);

  const outsider = evaluate({ ...BASE, state: "Nagaland" }, criteriaOf(stateRestricted));
  assert.equal(outsider.status, "rejected", "a student from another state must be REJECTED, never near-miss");
  assert.ok(outsider.failed.some((f) => f.field === "state"), "the state criterion must be the (or a) failure");
}

// ---------------------------------------------------------------------------
// 3. INCOME — the numeric path, including the near-miss boundary. Income is
//    where "you were 2% over" is genuinely useful and must stay truthful.
// ---------------------------------------------------------------------------
{
  const incomeRestricted = seedOpportunities.find((o) => {
    const c = o.criteria.find((x) => x.field === "annual_family_income" && x.operator === "lte");
    return c && typeof c.value === "number" && o.criteria.every((x) => x.field === "annual_family_income" || x.operator !== "eq");
  });
  assert.ok(incomeRestricted, "the catalogue must contain at least one income-capped opportunity");
  assertQuoted(incomeRestricted);

  const cap = incomeRestricted.criteria.find((c) => c.field === "annual_family_income")!.value as number;

  const under = evaluate({ ...BASE, annual_family_income: cap - 1 }, criteriaOf(incomeRestricted));
  assert.ok(!under.failed.some((f) => f.field === "annual_family_income"), "income under the cap must pass");

  // Comfortably over: rejected, and the gap arithmetic must be right.
  const over = evaluate({ ...BASE, annual_family_income: cap * 2 }, criteriaOf(incomeRestricted));
  const failed = over.failed.find((f) => f.field === "annual_family_income");
  assert.ok(failed, "income over the cap must fail");
  assert.equal(failed.gap?.direction, "over");
  assert.equal(failed.gap?.amount, cap, `gap must be the real shortfall (${cap * 2} - ${cap})`);
  assert.equal(failed.gap?.unit, "INR");

  // Just over: this is the near miss the product exists to surface.
  const justOver = evaluate({ ...BASE, annual_family_income: Math.round(cap * 1.05) }, criteriaOf(incomeRestricted));
  assert.ok(
    justOver.failed.some((f) => f.field === "annual_family_income"),
    "5% over the cap must still fail the income criterion",
  );
}

// ---------------------------------------------------------------------------
// 4. THE GATE — no opportunity may ship without a quoted criterion, because a
//    criterion-less row returns `eligible` for every student alive.
// ---------------------------------------------------------------------------
{
  const naked = seedOpportunities.filter((o) => o.criteria.length === 0);
  assert.equal(naked.length, 0, `${naked.length} opportunities have zero criteria and pass for everyone:\n  ${naked.map((o) => o.name).join("\n  ")}`);

  const unquoted = seedOpportunities.flatMap((o) => o.criteria.filter((c) => !c.source_text?.trim()).map((c) => `${o.name} / ${c.field}`));
  assert.equal(unquoted.length, 0, `criteria with no verbatim source_text:\n  ${unquoted.join("\n  ")}`);
}

console.log(`catalogue: ok (${seedOpportunities.length} opportunities, ${seedOpportunities.reduce((n, o) => n + o.criteria.length, 0)} criteria)`);
