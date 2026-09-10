-- 0007_knowledge_source.sql
-- Group 5 (Teil 2) — knowledge_source (docs/data-model.md)
-- Worauf die Feld-Guidance zugreifen darf, und was gesagt wurde.
-- Owner: AfCJ -> kein organisation_id.
--
-- `guidance conversation` ist Build next (Kandidat, noch nicht Prototyp) und wird
-- bewusst NICHT gebaut.

create table knowledge_source (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  file_asset_id uuid not null references file_asset (id) on delete restrict,
  titel text not null,
  kategorie text,
  status text not null default 'entwurf' check (status in ('entwurf', 'freigegeben')),
  freigegeben_von uuid references person (id)
);

create trigger set_updated_at before update on knowledge_source
  for each row execute function set_updated_at();

comment on table knowledge_source is
  'Eine als Wissensquelle markierte Repository-Datei (Norm, SOP, Herstellerdokument). '
  'Prototyp: Repository + Kuratieren. Aktive LLM-Suche ist Build next.';
