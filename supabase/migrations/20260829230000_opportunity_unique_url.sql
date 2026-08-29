-- packages/db/load.ts upserts seeded opportunities keyed on their apply URL, so
-- re-running the loader updates a row instead of duplicating it. Postgres needs
-- a unique constraint to resolve ON CONFLICT against.
--
-- Kept as its own migration rather than folded into the initial schema so it is
-- correct whether or not the initial schema has already been pushed.
alter table opportunity add constraint opportunity_url_key unique (url);
