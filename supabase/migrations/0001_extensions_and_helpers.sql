-- 0001_extensions_and_helpers.sql
-- Extensions and generic helpers used by every later migration.
-- See docs/data-model.md, "Übersetzungsregeln für die KI":
--   - jede Entität bekommt id, created_at, updated_at
--   - Statusfelder verwenden eine feste Werteliste, nie Freitext

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- Generic updated_at trigger, attached per-table below.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function set_updated_at() is
  'Generic BEFORE UPDATE trigger: stamps updated_at = now() on every row change.';
