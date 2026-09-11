-- 004_content_visibility.test.sql
-- Team-Entscheidung 2026-09-11 (docs/open-questions.md, Q-PUBLISHED):
-- Lernende sehen nur Content mit status = 'published' — course, lesson,
-- field_job_type direkt über die eigene status-Spalte, content_competency_mapping
-- indirekt über die referenzierte lesson. AfCJ admin ist von der Filterung
-- nicht betroffen und sieht published wie unpublished.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(9);

-- ------------------------------------------------------------
-- Seed: ein Programm mit je einem veröffentlichten und einem
-- unveröffentlichten Kurs/Lektion/field_job_type, plus eine
-- content_competency_mapping je Lektion.
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'learner-a@example.test'),
  ('00000000-0000-0000-0000-000000000002', 'admin@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000000011', 'Energiehelden', 'employer', 'aktiv'),
  ('00000000-0000-0000-0000-000000000012', 'AfCJ', 'afcj', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000000001', 'learner-a@example.test', 'Learner A', 'learner_a', 'DE'),
  ('00000000-0000-0000-0000-000000000002', 'admin@example.test', 'Admin', 'admin', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000012');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'learner'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000012', 'afcj_admin');

insert into programme (id, name, kuerzel) values
  ('00000000-0000-0000-0000-000000000021', 'EFK Erneuerbare Energien', 'EFK-EE');

insert into course (id, programme_id, name, typ, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000021', 'Veröffentlichter Kurs', 'asynchron', 1, 'published'),
  ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000021', 'Unveröffentlichter Kurs', 'asynchron', 2, 'unpublished');

insert into lesson (id, course_id, name, content_type, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000022', 'Veröffentlichte Lektion', 'repository', 1, 'published'),
  ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000023', 'Unveröffentlichte Lektion', 'repository', 1, 'unpublished');

insert into competency (id, name, kompetenzbereich, quelle) values
  ('00000000-0000-0000-0000-000000000041', 'Testkompetenz', 'Elektro', 'EFK-EE');

insert into competency_step (id, competency_id, name, typ) values
  ('00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000041', 'Teilschritt', 'theoretisch');

insert into content_competency_mapping (lesson_id, competency_step_id) values
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000042'),
  ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000042');

insert into field_job_type (id, titel, status) values
  ('00000000-0000-0000-0000-000000000051', 'Veröffentlichter Field Job Type', 'published'),
  ('00000000-0000-0000-0000-000000000052', 'Unveröffentlichter Field Job Type', 'unpublished');

-- ------------------------------------------------------------
-- Als Learner A
-- ------------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*)::int from lesson where id = '00000000-0000-0000-0000-000000000031'),
  1,
  'Learner sieht die veröffentlichte Lektion'
);
select is(
  (select count(*)::int from lesson where id = '00000000-0000-0000-0000-000000000032'),
  0,
  'Learner sieht die unveröffentlichte Lektion nicht'
);

select is(
  (select count(*)::int from course where id = '00000000-0000-0000-0000-000000000022'),
  1,
  'Learner sieht den veröffentlichten Kurs'
);
select is(
  (select count(*)::int from course where id = '00000000-0000-0000-0000-000000000023'),
  0,
  'Learner sieht den unveröffentlichten Kurs nicht'
);

select is(
  (select count(*)::int from field_job_type where id = '00000000-0000-0000-0000-000000000051'),
  1,
  'Learner sieht den veröffentlichten field_job_type'
);
select is(
  (select count(*)::int from field_job_type where id = '00000000-0000-0000-0000-000000000052'),
  0,
  'Learner sieht den unveröffentlichten field_job_type nicht'
);

select is(
  (select count(*)::int from content_competency_mapping where lesson_id = '00000000-0000-0000-0000-000000000031'),
  1,
  'Learner sieht das Mapping der veröffentlichten Lektion'
);
select is(
  (select count(*)::int from content_competency_mapping where lesson_id = '00000000-0000-0000-0000-000000000032'),
  0,
  'Learner sieht das Mapping der unveröffentlichten Lektion nicht'
);

-- ------------------------------------------------------------
-- Als AfCJ admin: read All, unabhängig vom Veröffentlichungsstatus.
-- ------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*)::int from lesson
   where id in ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000032')),
  2,
  'AfCJ admin sieht veröffentlichte und unveröffentlichte Lektionen gleichermaßen'
);

select * from finish();
rollback;
