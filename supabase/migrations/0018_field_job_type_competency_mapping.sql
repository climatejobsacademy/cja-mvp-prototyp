-- 0018_field_job_type_competency_mapping.sql
-- SR-02: field_job_type_competency_mapping (N:M field_job_type <-> praktischer
-- competency_step), analog zu content_competency_mapping (theoretische Seite,
-- 0004_qualification_structure.sql). Owner: AfCJ, wie die anderen Curriculum-
-- Tabellen -- kein organisation_id.

create table field_job_type_competency_mapping (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  field_job_type_id uuid not null references field_job_type (id) on delete cascade,
  competency_step_id uuid not null references competency_step (id) on delete cascade,

  unique (field_job_type_id, competency_step_id)
);

create trigger set_updated_at before update on field_job_type_competency_mapping
  for each row execute function set_updated_at();

comment on table field_job_type_competency_mapping is
  'N:M Field-Job-Typ <-> praktischer Teilschritt. Theoretische Teilschritte laufen '
  'stattdessen ueber content_competency_mapping (Group 2).';

-- ============================================================
-- RLS: analog field_job_type_read_published/admin_write (0009/0012) und dem
-- Kind-Tabellen-Muster von lesson_resource/scorm_package (Sichtbarkeit ueber
-- die referenzierte, status-tragende Eltern-Zeile). Kein eigener
-- access-matrix.md-Eintrag noetig -- gleiche Einordnung wie
-- content_competency_mapping ("Qualification structure"-Katalogdaten,
-- read All fuer alle Rollen, write All nur AfCJ admin).
-- ============================================================
alter table field_job_type_competency_mapping enable row level security;
revoke all on field_job_type_competency_mapping from public, anon, authenticated;
grant select on field_job_type_competency_mapping to authenticated;
grant insert, update, delete on field_job_type_competency_mapping to authenticated;

create policy field_job_type_competency_mapping_read_published on field_job_type_competency_mapping
  for select to authenticated
  using (
    exists (
      select 1 from field_job_type fjt
      where fjt.id = field_job_type_competency_mapping.field_job_type_id
        and fjt.status = 'published'
    )
  );

create policy field_job_type_competency_mapping_admin_all on field_job_type_competency_mapping
  for all to authenticated
  using (fn_is_afcj_admin())
  with check (fn_is_afcj_admin());

-- ============================================================
-- SR-02: field_capture_step_mapping automatisch aus der Vorlage ableiten,
-- statt dass AfCJ admin bei jeder Verifizierung von Hand die passenden
-- Teilschritte auswaehlen muss. Kette: field_capture -> field_job ->
-- field_job_type -> field_job_type_competency_mapping.
--
-- Bewusst bei INSERT auf field_capture (nicht erst bei verification): SR-02
-- verlangt woertlich "Learner reicht Selbstauskunft ein -> ... mind. einer
-- Teilschritt-Referenz ist gespeichert" -- also zum Einreichzeitpunkt, nicht
-- erst nach Admin-Verifizierung. competency_evidence (0006) zaehlt ohnehin
-- nur den verifizierten Fall (v.entscheidung = 'verified'), bleibt also
-- unveraendert korrekt, unabhaengig davon, wann die Mapping-Zeile entsteht.
--
-- Security definer, weil weder Learner noch AfCJ admin per bestehendem Grant
-- generischen Insert auf field_capture_step_mapping haben (Learner-Insert-
-- Policy ist auf die eigene field_capture beschraenkt, siehe
-- field_capture_step_mapping_learner_insert in 0009_rls_policies.sql; AfCJ
-- admin hat dort bisher nur select, keinen insert).
--
-- on conflict do nothing: idempotent, falls je erneut ausgeloest. Kein
-- Backfill fuer bereits bestehende field_capture-Zeilen -- fuer den Piloten
-- ausreichend, solange field_job_type_competency_mapping vor den ersten
-- echten Einsaetzen befuellt ist.
-- ============================================================
create or replace function fn_derive_field_capture_step_mapping()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into field_capture_step_mapping (organisation_id, field_capture_id, competency_step_id)
  select new.organisation_id, new.id, fjtcm.competency_step_id
  from field_job fj
  join field_job_type_competency_mapping fjtcm on fjtcm.field_job_type_id = fj.field_job_type_id
  where fj.id = new.field_job_id
  on conflict (field_capture_id, competency_step_id) do nothing;
  return new;
end;
$$;

comment on function fn_derive_field_capture_step_mapping() is
  'Leitet field_capture_step_mapping automatisch aus field_job_type_competency_mapping '
  'ab, sobald eine field_capture eingereicht wird -- schliesst SR-02, kein manuelles '
  'Auswaehlen der Teilschritte durch AfCJ admin mehr noetig.';

create trigger derive_field_capture_step_mapping
  after insert on field_capture
  for each row execute function fn_derive_field_capture_step_mapping();
