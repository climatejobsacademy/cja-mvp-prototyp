-- 006_field_job_type_competency_mapping.test.sql
-- SR-02 (2026-09-18): field_job_type_competency_mapping ist sichtbar, wenn der
-- referenzierte field_job_type 'published' ist (analog lesson_resource/
-- scorm_package) -- AfCJ admin sieht read All. Zusaetzlich: der Trigger
-- derive_field_capture_step_mapping leitet field_capture_step_mapping
-- automatisch aus der Vorlage ab, sobald eine field_capture eingereicht wird.
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

insert into competency_step (id, competency_id, name, typ) values
  ('00000000-0000-0000-0000-000000000232', '00000000-0000-0000-0000-000000000231', 'Praktischer Teilschritt', 'praktisch');

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
-- ------------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000201', 'role', 'authenticated')::text,
  true
);

insert into field_job (id, organisation_id, datum, field_job_type_id, learner_id) values
  ('00000000-0000-0000-0000-000000000261', '00000000-0000-0000-0000-000000000211', current_date, '00000000-0000-0000-0000-000000000241', '00000000-0000-0000-0000-000000000201');

insert into field_capture (id, organisation_id, learner_id, field_job_id, phase, text) values
  ('00000000-0000-0000-0000-000000000271', '00000000-0000-0000-0000-000000000211', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000261', 'abschluss', 'Testbericht');

select is(
  (select competency_step_id from field_capture_step_mapping where field_capture_id = '00000000-0000-0000-0000-000000000271'),
  '00000000-0000-0000-0000-000000000232',
  'Trigger derive_field_capture_step_mapping leitet den Teilschritt automatisch aus field_job_type_competency_mapping ab'
);

select * from finish();
rollback;
