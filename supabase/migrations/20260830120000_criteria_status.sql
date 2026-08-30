-- An opportunity with no criteria passes for EVERY profile: evaluate() with an
-- empty criteria list has nothing to fail on, so it returns `eligible`. That is
-- the most damaging thing this product can do — a confident wrong yes.
--
-- Such rows are not deleted. The opportunity is real and a human may still want
-- it; what we lack is verified eligibility data. So it is marked, and the
-- matching API refuses to give it a verdict.
--
--   verified   — at least one criterion carrying a verbatim source_text
--   unverified — no criteria could be extracted from the published page
alter table opportunity
  add column if not exists criteria_status text not null default 'verified';

do $$ begin
  alter table opportunity add constraint opportunity_criteria_status_check
    check (criteria_status in ('verified', 'unverified'));
exception when duplicate_object then null;
end $$;

-- Backfill from reality rather than trusting the default: anything with no
-- criterion rows right now is unverified by definition.
update opportunity o
set criteria_status = 'unverified'
where not exists (select 1 from criterion c where c.opportunity_id = o.id);

comment on column opportunity.criteria_status is
  'verified = has >= 1 criterion with a verbatim source_text. unverified = none could be extracted; /api/matches must never call it eligible.';
