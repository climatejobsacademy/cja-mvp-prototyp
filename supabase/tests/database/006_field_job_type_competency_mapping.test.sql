-- 006_field_job_type_competency_mapping.test.sql
-- SR-02 (2026-09-18): field_job_type_competency_mapping ist sichtbar, wenn der
-- referenzierte field_job_type 'published' ist (analog lesson_resource/
-- scorm_package) -- AfCJ admin sieht read All. Zusaetzlich: der Trigger
-- derive_field_capture_step_mapping leitet field_capture_step_mapping
-- automatisch aus der Vorlage ab, sobald die Abschluss-Selbstauskunft
-- (phase=abschluss) einer field_capture eingereicht wird -- die Start-
-- Selbstauskunft (phase=start) loest ihn bewusst nicht aus (WHEN-Klausel).
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(5);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000201', 'learner-fjtcm@example.test'),
  ('00000000-0000-0000-0000-000000000202', 'admin-fjtcm@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000000211', 'Energiehelden', 'employer', 'aktiv'),
  ('00000000-0000-0000-0000-000000000212', 'AfCJ', 'afcj', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000000201', 'learner-fjtcm@example.test', 'Learner Fjtcm', 'learner_fjtcm', 'DE'),
  ('00000000-0000-0000-0000-000000000202', 'admin-fjtcm@example.test', 'Admin Fjtcm', 'admin_fjtcm', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000211'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000212');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000211', 'learner'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000212', 'afcj_admin');

insert into programme (id, name, kuerzel) values
  ('00000000-0000-0000-0000-000000000221', 'EFK Erneuerbare Energien', 'EFK-EE');

insert into competency (id, name, kompetenzbereich, quelle) values
  ('00000000-0000-0000-0000-000000000231', 'Testkompetenz Fjtcm', 'Elektro', 'EFK-EE');

-- competency_id nur noch, weil die Spalte bis zur Drop-Column-Folgemigration
-- not null ist -- maßgeblich ist competency_competency_step (SR-65, 0019).
insert into competency_step (id, competency_id, name, typ) values
  ('00000000-0000-0000-0000-000000000232', '00000000-0000-0000-0000-000000000231', 'Praktischer Teilschritt', 'praktisch');

insert into competency_competency_step (id, competency_id, competency_step_id) values
  ('00000000-0000-0000-0000-000000000233', '00000000-0000-0000-0000-000000000231', '00000000-0000-0000-0000-000000000232');

insert into field_job_type (id, titel, status, programme_id, reihenfolge) values
  ('00000000-0000-0000-0000-000000000241', 'Veröffentlichter Field Job Type', 'published', '00000000-0000-0000-0000-000000000221', 1),
  ('00000000-0000-0000-0000-000000000242', 'Unveröffentlichter Field Job Type', 'unpublished', '00000000-0000-0000-0000-000000000221', 2);

insert into field_job_type_competency_mapping (id, field_job_type_id, competency_step_id) values
  ('00000000-0000-0000-0000-000000000251', '00000000-0000-0000-0000-000000000241', '00000000-0000-0000-0000-000000000232'),
  ('00000000-0000-0000-0000-000000000252', '00000000-0000-0000-0000-000000000242', '00000000-0000-0000-0000-000000000232');

-- ------------------------------------------------------------
-- Als Learner
-- ------------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000201', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*)::int from field_job_type_competency_mapping where id = '00000000-0000-0000-0000-000000000251'),
  1,
  'Learner sieht das Mapping des veröffentlichten field_job_type'
);
select is(
  (select count(*)::int from field_job_type_competency_mapping where id = '00000000-0000-0000-0000-000000000252'),
  0,
  'Learner sieht das Mapping des unveröffentlichten field_job_type nicht'
);

-- ------------------------------------------------------------
-- Als AfCJ admin: read All, unabhängig vom Veröffentlichungsstatus.
-- ------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000202', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*)::int from field_job_type_competency_mapping
   where id in ('00000000-0000-0000-0000-000000000251', '00000000-0000-0000-0000-000000000252')),
  2,
  'AfCJ admin sieht veröffentlichte und unveröffentlichte Mappings gleichermaßen'
);

-- ------------------------------------------------------------
-- Trigger-Verhalten: field_job (published field_job_type) + field_capture
-- des Learners anlegen -> field_capture_step_mapping muss automatisch
-- entstehen, ohne dass die App sie selbst einfügt.
--
-- field_job wird bewusst als AfCJ admin angelegt, nicht als Learner: laut
-- 0009_rls_policies.sql hat nur field_job_admin_all ein Insert-Recht auf
-- field_job, der Learner-Grant deckt ausschließlich select
-- (field_job_learner_select) und ein eng begrenztes confirm-update
-- (field_job_learner_confirm) ab.
-- ------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000202', 'role', 'authenticated')::text,
  true
);

insert into field_job (id, organisation_id, datum, field_job_type_id, learner_id) values
  ('00000000-0000-0000-0000-000000000261', '00000000-0000-0000-0000-000000000211', current_date, '00000000-0000-0000-0000-000000000241', '00000000-0000-0000-0000-000000000201');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000201', 'role', 'authenticated')::text,
  true
);

-- Kein explizites id in der Spaltenliste: die spaltenbeschränkte Insert-Grant
-- für Learner (0009/0013_fix_field_capture_phase_grant.sql) deckt id nicht ab
-- -- genau wie im echten App-Insert (submitReflection(), actions.ts), das die
-- DB per Default gen_random_uuid() erzeugen lässt. id wird stattdessen per
-- RETURNING/\gset eingesammelt.
insert into field_capture (organisation_id, learner_id, field_job_id, phase, text)
  values ('00000000-0000-0000-0000-000000000211', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000261', 'abschluss', 'Testbericht')
  returning id as capture_id
\gset

select is(
  (select competency_step_id from field_capture_step_mapping where field_capture_id = :'capture_id'),
  '00000000-0000-0000-0000-000000000232',
  'Trigger derive_field_capture_step_mapping leitet den Teilschritt automatisch aus field_job_type_competency_mapping ab'
);

-- ------------------------------------------------------------
-- WHEN-Klausel: die Start-Selbstauskunft (phase=start) desselben field_job
-- darf den Trigger NICHT auslösen -- SR-02 spricht wörtlich von "einer
-- abgeschlossenen Praxisaufgabe", das ist die Abschluss-Selbstauskunft.
-- ------------------------------------------------------------
insert into field_capture (organisation_id, learner_id, field_job_id, phase, text)
  values ('00000000-0000-0000-0000-000000000211', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000261', 'start', 'Vorab-Bericht')
  returning id as start_capture_id
\gset

select is(
  (select count(*)::int from field_capture_step_mapping where field_capture_id = :'start_capture_id'),
  0,
  'Trigger derive_field_capture_step_mapping feuert nicht bei der Start-Selbstauskunft (phase=start)'
);

select * from finish();
rollback;
