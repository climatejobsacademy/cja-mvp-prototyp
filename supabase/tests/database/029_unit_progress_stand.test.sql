-- 029_unit_progress_stand.test.sql
-- 0056 (SR-85): Lernende speichern den Stand nur in der eigenen
-- unit_progress-Zeile; fremde Zeilen bleiben unsichtbar und unveränderbar.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(6);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000029101', 'stand-l1@example.test'),
  ('00000000-0000-0000-0000-000000029102', 'stand-l2@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000029111', 'Betrieb A', 'employer', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000029101', 'stand-l1@example.test', 'Lerner Eins', 'stand_l1', 'DE'),
  ('00000000-0000-0000-0000-000000029102', 'stand-l2@example.test', 'Lerner Zwei', 'stand_l2', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000029101', '00000000-0000-0000-0000-000000029111'),
  ('00000000-0000-0000-0000-000000029102', '00000000-0000-0000-0000-000000029111');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000029101', '00000000-0000-0000-0000-000000029111', 'learner'),
  ('00000000-0000-0000-0000-000000029102', '00000000-0000-0000-0000-000000029111', 'learner');

insert into programme (id, name, kuerzel, status) values
  ('00000000-0000-0000-0000-000000029121', 'Programm', 'STAND-P1', 'published');

insert into course (id, programme_id, name, typ, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000029131', '00000000-0000-0000-0000-000000029121', 'Kurs', 'asynchron', 1, 'published');

insert into lesson (id, course_id, name, content_type, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000029141', '00000000-0000-0000-0000-000000029131', 'Lektion', 'scorm', 1, 'published');

insert into unit_progress (organisation_id, learner_id, lesson_id, status) values
  ('00000000-0000-0000-0000-000000029111', '00000000-0000-0000-0000-000000029101', '00000000-0000-0000-0000-000000029141', 'in Bearbeitung'),
  ('00000000-0000-0000-0000-000000029111', '00000000-0000-0000-0000-000000029102', '00000000-0000-0000-0000-000000029141', 'in Bearbeitung');

-- Als L1
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000029101', 'role', 'authenticated')::text, true);

select lives_ok(
  $$update unit_progress set stand = '{"kap": 1, "schritt": 2, "geschafft": [0], "geloest": [], "zeit": "2026-10-20T10:00:00"}'
    where learner_id = '00000000-0000-0000-0000-000000029101'$$,
  'Lernende speichern den Stand in der eigenen Zeile');

select is(
  (select stand->>'schritt' from unit_progress where learner_id = '00000000-0000-0000-0000-000000029101'),
  '2',
  'Der eigene Stand ist lesbar');

select is(
  (select count(*)::int from unit_progress where learner_id = '00000000-0000-0000-0000-000000029102'),
  0,
  'Fremde Zeilen (und ihr Stand) sind unsichtbar');

update unit_progress set stand = '{"kap": 9}' where learner_id = '00000000-0000-0000-0000-000000029102';

select throws_ok(
  $$update unit_progress set stand = '[1, 2]' where learner_id = '00000000-0000-0000-0000-000000029101'$$,
  '23514',
  null,
  'Der Stand muss ein JSON-Objekt sein');

reset role;

select is(
  (select stand from unit_progress where learner_id = '00000000-0000-0000-0000-000000029102'),
  null,
  'Den Stand anderer kann niemand ändern');

select is(
  (select status from unit_progress where learner_id = '00000000-0000-0000-0000-000000029101'),
  'in Bearbeitung',
  'Das Speichern des Stands ändert den Status nicht');

select * from finish();
rollback;
