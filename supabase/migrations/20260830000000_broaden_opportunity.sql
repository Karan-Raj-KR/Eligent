-- Broaden Eligent from scholarships to a general opportunity finder.
-- Adds category / location_type / funded to opportunity, and the profile
-- columns the new criterion fields compare against. Migration only — no data
-- is invented here; the harvester fills real rows.
--
-- Written idempotent (IF NOT EXISTS / guarded constraint adds): during the
-- overnight run the `opportunity` columns were added out-of-band so seed.ts
-- could load, while the `profile` columns were not. This file is safe to apply
-- whatever state the database is in.

-- opportunity: what kind of thing it is, where it runs, whether money is on the table.
alter table opportunity add column if not exists category text not null default 'scholarship';
alter table opportunity add column if not exists location_type text not null default 'india';
alter table opportunity add column if not exists funded boolean not null default true;

do $$ begin
  alter table opportunity add constraint opportunity_category_check check (category in (
    'scholarship', 'fellowship', 'grant', 'hackathon',
    'internship', 'programme', 'event', 'competition'
  ));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table opportunity add constraint opportunity_location_type_check
    check (location_type in ('india', 'abroad', 'online'));
exception when duplicate_object then null;
end $$;

-- Existing rows are all hand-harvested Indian scholarships — the defaults above
-- already put them at scholarship / india / true, so no UPDATE is needed.

-- profile: columns for the criterion fields added alongside this migration
-- (region, nationality, team_size, student_status, age, experience_years).
-- Nullable — the engine treats a missing profile value as a hard failure, which
-- is the correct conservative behaviour until onboarding collects them.
alter table profile add column if not exists region text;
alter table profile add column if not exists nationality text;
alter table profile add column if not exists team_size int;
alter table profile add column if not exists student_status text;
alter table profile add column if not exists age int;
alter table profile add column if not exists experience_years numeric;
