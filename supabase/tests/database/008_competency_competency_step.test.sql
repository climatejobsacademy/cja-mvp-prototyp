-- 008_competency_competency_step.test.sql
-- SR-65 (0019): competency_competency_step (N:M competency <-> competency_step)
-- ist Katalogdaten wie competency/competency_step -- read All für alle
-- eingeloggten Rollen, write nur AfCJ admin. Zusätzlich: ein Teilschritt kann
-- an mehreren Kompetenzen hängen (eigentlicher Zweck der Umstellung).
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(6);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000301', 'learner-ccs@example.test'),
  ('00000000-0000-0000-0000-000000000302', 'admin-ccs@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000000311', 'Energiehelden', 'employer', 'aktiv'),
  ('00000000-0000-0000-0000-000000000312', 'AfCJ', 'afcj', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000000301', 'learner-ccs@example.test', 'Learner Ccs', 'learner_ccs', 'DE'),
  ('00000000-0000-0000-0000-000000000302', 'admin-ccs@example.test', 'Admin Ccs', 'admin_ccs', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000311'),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000312');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000311', 'learner'),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000312', 'afcj_admin');

insert into competency (id, name, kompetenzbereich, quelle) values
  ('00000000-0000-0000-0000-000000000321', 'Testkompetenz A', 'Elektro', 'EFK-EE'),
  ('00000000-0000-0000-0000-000000000322', 'Testkompetenz B', 'Elektro', 'EFK-EE');

-- competency_id ist bis zur Drop-Column-Folgemigration noch not null und
-- muss deshalb gesetzt werden, ist aber nicht mehr maßgeblich (SR-65).
insert into competency_step (id, competency_id, name, typ) values
  ('00000000-0000-0000-0000-000000000331', '00000000-0000-0000-0000-000000000321', 'Geteilter Teilschritt', 'theoretisch');

-- Derselbe Teilschritt an zwei Kompetenzen -- mit dem alten 1:N-Schema
-- (competency_step.competency_id) nicht abbildbar.
insert into competency_competency_step (id, competency_id, competency_step_id) values
  ('00000000-0000-0000-0000-000000000341', '00000000-0000-0000-0000-000000000321', '00000000-0000-0000-0000-000000000331'),
  ('00000000-0000-0000-0000-000000000342', '00000000-0000-0000-0000-000000000322', '00000000-0000-0000-0000-000000000331');

select throws_ok(
  $$ insert into competency_competency_step (competency_id, competency_step_id) values
     ('00000000-0000-0000-0000-000000000321', '00000000-0000-0000-0000-000000000331') $$,
  '23505', NULL,
  'Dieselbe Kombination Kompetenz/Teilschritt lässt sich nicht doppelt anlegen'
);

-- ------------------------------------------------------------
-- Als Learner: read All, kein Schreiben.
-- ------------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000301', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*)::int from competency_competency_step
   where competency_step_id = '00000000-0000-0000-0000-000000000331'),
  2,
  'Learner sieht beide Kompetenz-Zuordnungen des geteilten Teilschritts'
);

select throws_ok(
  $$ insert into competency_competency_step (competency_id, competency_step_id) values
     ('00000000-0000-0000-0000-000000000321', '00000000-0000-0000-0000-000000000331') $$,
  '42501', NULL,
  'Learner darf keine Zuordnung anlegen'
);

select is_empty(
  $$ delete from competency_competency_step
     where id = '00000000-0000-0000-0000-000000000341' returning id $$,
  'Learner kann keine Zuordnung löschen (RLS filtert die Zeile weg)'
);

-- ------------------------------------------------------------
-- Als AfCJ admin: write All.
-- ------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000302', 'role', 'authenticated')::text,
  true
);

select lives_ok(
  $$ delete from competency_competency_step
     where id = '00000000-0000-0000-0000-000000000342' $$,
  'AfCJ admin darf eine Zuordnung löschen'
);

select lives_ok(
  $$ insert into competency_competency_step (competency_id, competency_step_id) values
     ('00000000-0000-0000-0000-000000000322', '00000000-0000-0000-0000-000000000331') $$,
  'AfCJ admin darf eine Zuordnung anlegen'
);

select * from finish();
rollback;
