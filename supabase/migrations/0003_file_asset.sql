-- 0003_file_asset.sql
-- Group 5 (Teil 1) — file_asset, vorgezogen vor Group 2/3, weil lesson und
-- field_job_type bereits in dieser Migration darauf verweisen (FK-Reihenfolge).
-- Siehe docs/data-model.md, Group 5.

-- ============================================================
-- file_asset
-- Owner: AfCJ oder Employer (je nach referenzierender Entität) -> organisation_id
-- nullable: null = AfCJ-weiter Content (Lektionen etc.), gesetzt = Employer-Datei.
-- ============================================================
create table file_asset (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  organisation_id uuid references organisation (id) on delete cascade,
  dateiname text not null,
  dateityp text not null,
  storage_pfad text not null,
  hochgeladen_von uuid references person (id),
  hochgeladen_am timestamptz not null default now()
);

create trigger set_updated_at before update on file_asset
  for each row execute function set_updated_at();

comment on table file_asset is
  'Generische Datei-Ablage (Bilder, Dokumente, SCORM-Pakete etc.), referenzierbar von anderen Entitäten. '
  'organisation_id null = AfCJ-weiter Content. Zugriffslücke: siehe docs/open-questions.md (Q-FILE-ASSET).';
