-- Without this, every query against every table fails with
-- "permission denied for table ...", including the ones RLS would have allowed.
--
-- PostgREST does not connect as the table owner. It connects as anon,
-- authenticated, or service_role and relies on those roles holding table
-- privileges. Creating a table inside a migration does not reliably grant them:
-- verified on a local supabase stack, where the six tables came out with
-- Dxtm (truncate/references/trigger/maintain) for those roles and no
-- arwd (select/insert/update/delete) at all. The loader and the app both got
-- permission denied on the first statement they ran.
--
-- RLS is still the gate, and is unchanged. Every table has it enabled with
-- policies scoping rows to auth.uid(); opportunity and criterion stay
-- select-only for clients because no insert/update policy exists for them.
-- These grants only get the roles past the table-level check so that those
-- policies are the thing actually deciding. This is Supabase's own model.
-- (service_role additionally carries BYPASSRLS, which is what lets the seed
-- loader write opportunity and criterion rows at all.)

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;

grant usage, select on all sequences in schema public
  to anon, authenticated, service_role;

-- Tables added by later migrations inherit the same treatment.
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;

alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;
