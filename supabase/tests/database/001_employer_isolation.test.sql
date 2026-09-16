-- 001_employer_isolation.test.sql
-- Review-Checkliste (data-model.md, 4e): "RLS-Tests existieren mindestens für:
-- Employer-Isolation, Learner-Zugriff nur auf eigene Captures."
--
-- Dieser Test deckt Employer-Isolation ab: eine Learner-Person in Organisation A
-- darf keine Zeilen sehen, die zu einer Person in Organisation B gehören —
-- weder über organisation_id-gescopte Tabellen (enrolment, field_job,
-- unit_progress) noch über organisation selbst.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(8);

-- ------------------------------------------------------------
-- Seed: zwei Organisationen, je eine Learner-Person, ein gemeinsames Curriculum.
-- Alle IDs sind bewusst durchnummerierte, gültige Hex-UUIDs (keine Mnemonics).
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'learner-a@example.test'),
  ('00000000-0000-0000-0000-000000000002', 'learner-b@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000000011', 'Org A', 'employer', 'aktiv'),
  ('00000000-0000-0000-0000-000000000012', 'Org B', 'employer', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000000001', 'learner-a@example.test', 'Learner A', 'learner_a', 'DE'),
  ('00000000-0000-0000-0000-000000000002', 'learner-b@example.test', 'Learner B', 'learner_b', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000012');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'learner'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000012', 'learner');

insert into programme (id, name, kuerzel) values
  ('00000000-0000-0000-0000-000000000021', 'EFK Erneuerbare Energien', 'EFK-EE');

insert into course (id, programme_id, name, typ, reihenfolge) values
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000021', 'Kurs 1', 'asynchron', 1);

insert into lesson (id, course_id, name, content_type, reihenfolge) values
  ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000022', 'Lektion 1', 'repository', 1);

insert into cohort (id, programme_id, name, start_datum) values
  ('00000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000021', 'Kohorte 1', current_date);

insert into enrolment (id, organisation_id, learner_id, cohort_id) values
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000024'),
  ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000024');

insert into field_job_type (id, titel, programme_id, reihenfolge) values
  ('00000000-0000-0000-0000-000000000041', 'Werkstatt-Übung', '00000000-0000-0000-0000-000000000021', 1);

insert into field_job (id, organisation_id, datum, field_job_type_id, learner_id) values
  ('00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000011', current_date, '00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000052', '00000000-0000-0000-0000-000000000012', current_date, '00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000002');

insert into unit_progress (id, organisation_id, learner_id, lesson_id, status) values
  ('00000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000023', 'in Bearbeitung'),
  ('00000000-0000-0000-0000-000000000062', '00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000023', 'in Bearbeitung');

-- ------------------------------------------------------------
-- Als Learner A einloggen (fakes auth.uid() über request.jwt.claims, wie es
-- Supabase's eigene auth.uid()-Definition liest).
-- ------------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*)::int from organisation where id = '00000000-0000-0000-0000-000000000011'),
  1,
  'Learner A sieht die eigene Organisation'
);
select is(
  (select count(*)::int from organisation where id = '00000000-0000-0000-0000-000000000012'),
  0,
  'Learner A sieht Organisation B nicht'
);

select is(
  (select count(*)::int from enrolment where id = '00000000-0000-0000-0000-000000000031'),
  1,
  'Learner A sieht die eigene Enrolment-Zeile'
);
select is(
  (select count(*)::int from enrolment where id = '00000000-0000-0000-0000-000000000032'),
  0,
  'Learner A sieht Enrolment von Learner B (Org B) nicht'
);

select is(
  (select count(*)::int from field_job where id = '00000000-0000-0000-0000-000000000051'),
  1,
  'Learner A sieht den eigenen field_job'
);
select is(
  (select count(*)::int from field_job where id = '00000000-0000-0000-0000-000000000052'),
  0,
  'Learner A sieht field_job von Org B nicht'
);

select is(
  (select count(*)::int from unit_progress where id = '00000000-0000-0000-0000-000000000061'),
  1,
  'Learner A sieht den eigenen unit_progress'
);
select is(
  (select count(*)::int from unit_progress where id = '00000000-0000-0000-0000-000000000062'),
  0,
  'Learner A sieht unit_progress von Org B nicht'
);

select * from finish();
rollback;
