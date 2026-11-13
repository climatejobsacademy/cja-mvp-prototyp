-- 042_zweite_trainerin.test.sql
-- SR-78 (Migration 0071): Die zweite Trainer:in eines Praxistags erscheint
-- für die lernende Person in fn_meine_trainer (Name, Foto), nicht für
-- andere Lernende. Sie bekommt keine Rechte: Den Praxisauftrag liest im
-- Trainer-Bereich weiter nur die zuständige Trainer:in (instructor_id).
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(5);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000042001', 'zt-a@example.test'),
  ('00000000-0000-0000-0000-000000042002', 'zt-b@example.test'),
  ('00000000-0000-0000-0000-000000042004', 'zt-t1@example.test'),
  ('00000000-0000-0000-0000-000000042005', 'zt-t2@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000042011', 'Betrieb', 'employer', 'aktiv');

insert into person (id, email, name, rufname, username, sprache) values
  ('00000000-0000-0000-0000-000000042001', 'zt-a@example.test', 'Lernende A', 'A', 'zt_a', 'DE'),
  ('00000000-0000-0000-0000-000000042002', 'zt-b@example.test', 'Lernende B', 'B', 'zt_b', 'DE'),
  ('00000000-0000-0000-0000-000000042004', 'zt-t1@example.test', 'Trainer Eins', 'Eins', 'zt_t1', 'DE'),
  ('00000000-0000-0000-0000-000000042005', 'zt-t2@example.test', 'Trainer Zwei', 'Zwei', 'zt_t2', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000042001', '00000000-0000-0000-0000-000000042011'),
  ('00000000-0000-0000-0000-000000042002', '00000000-0000-0000-0000-000000042011'),
  ('00000000-0000-0000-0000-000000042004', '00000000-0000-0000-0000-000000042011'),
  ('00000000-0000-0000-0000-000000042005', '00000000-0000-0000-0000-000000042011');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000042001', '00000000-0000-0000-0000-000000042011', 'learner'),
  ('00000000-0000-0000-0000-000000042002', '00000000-0000-0000-0000-000000042011', 'learner'),
  ('00000000-0000-0000-0000-000000042004', '00000000-0000-0000-0000-000000042011', 'trainer'),
  ('00000000-0000-0000-0000-000000042005', '00000000-0000-0000-0000-000000042011', 'trainer');

insert into programme (id, name, kuerzel, status) values
  ('00000000-0000-0000-0000-000000042021', 'Programm', 'ZT-P1', 'published');

insert into field_job_type (id, titel, programme_id, reihenfolge, status, ablauf) values
  ('00000000-0000-0000-0000-000000042041', 'Aufgabe', '00000000-0000-0000-0000-000000042021', 1, 'published', 'gefuehrt');

insert into field_job (id, organisation_id, datum, field_job_type_id, learner_id, instructor_id, zweit_trainer_id) values
  ('00000000-0000-0000-0000-000000042081', '00000000-0000-0000-0000-000000042011', '2026-11-16',
   '00000000-0000-0000-0000-000000042041', '00000000-0000-0000-0000-000000042001',
   '00000000-0000-0000-0000-000000042004', '00000000-0000-0000-0000-000000042005');

insert into cohort (id, programme_id, name, start_datum) values
  ('00000000-0000-0000-0000-000000042051', '00000000-0000-0000-0000-000000042021', 'K1', '2026-11-02');

insert into enrolment (id, organisation_id, learner_id, cohort_id, status) values
  ('00000000-0000-0000-0000-000000042061', '00000000-0000-0000-0000-000000042011', '00000000-0000-0000-0000-000000042001', '00000000-0000-0000-0000-000000042051', 'aktiv');

insert into schedule_entry (organisation_id, datum, art, reihenfolge, enrolment_id, field_job_id) values
  ('00000000-0000-0000-0000-000000042011', '2026-11-16', 'feld', 1, '00000000-0000-0000-0000-000000042061', '00000000-0000-0000-0000-000000042081');

set local role authenticated;

-- Lernende A: beide Trainer:innen
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000042001', 'role', 'authenticated')::text, true);
select is(
  (select count(*)::int from fn_meine_trainer()),
  2,
  'Lernende sehen zuständige und zweite Trainer:in ihres Praxistags'
);
select is(
  (select rufname from fn_meine_trainer() where person_id = '00000000-0000-0000-0000-000000042005'),
  'Zwei',
  'Rufname der zweiten Trainer:in ist lesbar'
);

-- Lernende B: kein eigener Praxistag
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000042002', 'role', 'authenticated')::text, true);
select is(
  (select count(*)::int from fn_meine_trainer()),
  0,
  'Andere Lernende sehen die Trainer:innen nicht'
);

-- Zweite Trainer:in: keine Rechte am Praxisauftrag
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000042005', 'role', 'authenticated')::text, true);
select is(
  (select count(*)::int from field_job where id = '00000000-0000-0000-0000-000000042081'),
  0,
  'Die zweite Trainer:in liest den Praxisauftrag nicht (nur Anzeige)'
);

-- Zuständige Trainer:in: unverändert
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000042004', 'role', 'authenticated')::text, true);
select is(
  (select count(*)::int from field_job where id = '00000000-0000-0000-0000-000000042081'),
  1,
  'Die zuständige Trainer:in liest den Praxisauftrag wie bisher'
);

select * from finish();
rollback;
