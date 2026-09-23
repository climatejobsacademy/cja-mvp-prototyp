-- 009_competency_programme.test.sql
-- SR-66 (0020): competency_programme (N:M competency <-> programme) ist
-- sichtbar, wenn das referenzierte Programm 'published' ist (analog
-- content_competency_mapping/field_job_type_competency_mapping) -- AfCJ admin
-- sieht und schreibt alles. Zusätzlich: eine Kompetenz kann an mehreren
-- Programmen hängen (eigentlicher Zweck der Umstellung).
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(8);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000401', 'learner-cp@example.test'),
  ('00000000-0000-0000-0000-000000000402', 'admin-cp@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000000411', 'Energiehelden', 'employer', 'aktiv'),
  ('00000000-0000-0000-0000-000000000412', 'AfCJ', 'afcj', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000000401', 'learner-cp@example.test', 'Learner Cp', 'learner_cp', 'DE'),
  ('00000000-0000-0000-0000-000000000402', 'admin-cp@example.test', 'Admin Cp', 'admin_cp', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000411'),
  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000412');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000411', 'learner'),
  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000412', 'afcj_admin');

insert into programme (id, name, kuerzel, status) values
  ('00000000-0000-0000-0000-000000000421', 'EFK Erneuerbare Energien', 'EFK-EE', 'published'),
  ('00000000-0000-0000-0000-000000000422', 'EFK für festgelegte Tätigkeiten', 'EFKffT', 'published'),
  ('00000000-0000-0000-0000-000000000423', 'Unveröffentlichtes Programm', 'TQ-EGT', 'unpublished');

insert into competency (id, name, kompetenzbereich, quelle) values
  ('00000000-0000-0000-0000-000000000431', 'Testkompetenz Cp', 'Elektro', 'EFK-EE');

-- Dieselbe Kompetenz an zwei veröffentlichten und einem unveröffentlichten
-- Programm -- mit dem alten Schema (competency.quelle, ein Wert) nicht
-- abbildbar.
insert into competency_programme (id, competency_id, programme_id) values
  ('00000000-0000-0000-0000-000000000441', '00000000-0000-0000-0000-000000000431', '00000000-0000-0000-0000-000000000421'),
  ('00000000-0000-0000-0000-000000000442', '00000000-0000-0000-0000-000000000431', '00000000-0000-0000-0000-000000000422'),
  ('00000000-0000-0000-0000-000000000443', '00000000-0000-0000-0000-000000000431', '00000000-0000-0000-0000-000000000423');

select throws_ok(
  $$ insert into competency_programme (competency_id, programme_id) values
     ('00000000-0000-0000-0000-000000000431', '00000000-0000-0000-0000-000000000421') $$,
  '23505', NULL,
  'Dieselbe Kombination Kompetenz/Programm lässt sich nicht doppelt anlegen'
);

-- ------------------------------------------------------------
-- Als Learner: nur Zuordnungen zu veröffentlichten Programmen, kein Schreiben.
-- ------------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000401', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*)::int from competency_programme
   where id in ('00000000-0000-0000-0000-000000000441', '00000000-0000-0000-0000-000000000442')),
  2,
  'Learner sieht beide Programm-Zuordnungen der Kompetenz zu veröffentlichten Programmen'
);

select is(
  (select count(*)::int from competency_programme where id = '00000000-0000-0000-0000-000000000443'),
  0,
  'Learner sieht die Zuordnung zum unveröffentlichten Programm nicht'
);

select throws_ok(
  $$ insert into competency_programme (competency_id, programme_id) values
     ('00000000-0000-0000-0000-000000000431', '00000000-0000-0000-0000-000000000423') $$,
  '42501', NULL,
  'Learner darf keine Zuordnung anlegen'
);

select is_empty(
  $$ delete from competency_programme
     where id = '00000000-0000-0000-0000-000000000441' returning id $$,
  'Learner kann keine Zuordnung löschen (RLS filtert die Zeile weg)'
);

-- ------------------------------------------------------------
-- Als AfCJ admin: read All unabhängig vom Veröffentlichungsstatus, write All.
-- ------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000402', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*)::int from competency_programme
   where competency_id = '00000000-0000-0000-0000-000000000431'),
  3,
  'AfCJ admin sieht Zuordnungen zu veröffentlichten und unveröffentlichten Programmen'
);

select lives_ok(
  $$ delete from competency_programme
     where id = '00000000-0000-0000-0000-000000000443' $$,
  'AfCJ admin darf eine Zuordnung löschen'
);

select lives_ok(
  $$ insert into competency_programme (competency_id, programme_id) values
     ('00000000-0000-0000-0000-000000000431', '00000000-0000-0000-0000-000000000423') $$,
  'AfCJ admin darf eine Zuordnung anlegen'
);

select * from finish();
rollback;
