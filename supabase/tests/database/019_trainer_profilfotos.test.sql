-- 019_trainer_profilfotos.test.sql
-- Trainer:innen je Termin und Profilfotos (0030; SR-77, SR-78): Rolle
-- trainer, person.foto_pfad nur im eigenen Ordner, privater Bucket
-- profilfotos, fn_meine_trainer (nur Personen mit Rolle trainer aus dem
-- eigenen Plan) und die Storage-Policies: Lernende sehen ihr eigenes Foto
-- und die Fotos ihrer Trainer:innen. Seit 0034 (Kohortensicht, SR-30) auch
-- die Fotos der Lernenden aus derselben Kohorte und Organisation.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(20);

-- ------------------------------------------------------------
-- Fixtures (als Superuser)
-- 19001 Lernende A (K1), 19002 Lernende B (K1), 19003 AfCJ admin,
-- 19004 Trainer:in T1 (Live K1), 19005 Trainer:in T2 (Praxistag von A),
-- 19006 Trainer:in T3 (Live K2, nicht im Plan von A/B).
-- Live-Session S3 (K1) trägt B als trainer_id, B hat aber keine Rolle
-- trainer -> erscheint nicht.
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000019001', 'foto-a@example.test'),
  ('00000000-0000-0000-0000-000000019002', 'foto-b@example.test'),
  ('00000000-0000-0000-0000-000000019003', 'foto-admin@example.test'),
  ('00000000-0000-0000-0000-000000019004', 'foto-t1@example.test'),
  ('00000000-0000-0000-0000-000000019005', 'foto-t2@example.test'),
  ('00000000-0000-0000-0000-000000019006', 'foto-t3@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000019011', 'Betrieb', 'employer', 'aktiv'),
  ('00000000-0000-0000-0000-000000019012', 'AfCJ', 'afcj', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000019001', 'foto-a@example.test', 'Lernende A', 'ft_a', 'DE'),
  ('00000000-0000-0000-0000-000000019002', 'foto-b@example.test', 'Lernende B', 'ft_b', 'DE'),
  ('00000000-0000-0000-0000-000000019003', 'foto-admin@example.test', 'Admin', 'ft_admin', 'DE'),
  ('00000000-0000-0000-0000-000000019004', 'foto-t1@example.test', 'Trainer Eins', 'ft_t1', 'DE'),
  ('00000000-0000-0000-0000-000000019005', 'foto-t2@example.test', 'Trainerin Zwei', 'ft_t2', 'DE'),
  ('00000000-0000-0000-0000-000000019006', 'foto-t3@example.test', 'Trainer Drei', 'ft_t3', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000019001', '00000000-0000-0000-0000-000000019011'),
  ('00000000-0000-0000-0000-000000019002', '00000000-0000-0000-0000-000000019011'),
  ('00000000-0000-0000-0000-000000019003', '00000000-0000-0000-0000-000000019012'),
  ('00000000-0000-0000-0000-000000019004', '00000000-0000-0000-0000-000000019012'),
  ('00000000-0000-0000-0000-000000019005', '00000000-0000-0000-0000-000000019011'),
  ('00000000-0000-0000-0000-000000019006', '00000000-0000-0000-0000-000000019012');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000019001', '00000000-0000-0000-0000-000000019011', 'learner'),
  ('00000000-0000-0000-0000-000000019002', '00000000-0000-0000-0000-000000019011', 'learner'),
  ('00000000-0000-0000-0000-000000019003', '00000000-0000-0000-0000-000000019012', 'afcj_admin'),
  ('00000000-0000-0000-0000-000000019005', '00000000-0000-0000-0000-000000019011', 'trainer'),
  ('00000000-0000-0000-0000-000000019006', '00000000-0000-0000-0000-000000019012', 'trainer');

insert into programme (id, name, kuerzel, status) values
  ('00000000-0000-0000-0000-000000019021', 'Programm', 'FOTO-P1', 'published');

insert into course (id, programme_id, name, typ, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000019031', '00000000-0000-0000-0000-000000019021', 'Kurs', 'synchron', 1, 'published');

insert into field_job_type (id, titel, programme_id, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000019041', 'Praxisauftrag', '00000000-0000-0000-0000-000000019021', 1, 'published');

insert into cohort (id, programme_id, name, start_datum) values
  ('00000000-0000-0000-0000-000000019051', '00000000-0000-0000-0000-000000019021', 'K1', '2026-11-02'),
  ('00000000-0000-0000-0000-000000019052', '00000000-0000-0000-0000-000000019021', 'K2', '2026-11-02');

insert into enrolment (id, organisation_id, learner_id, cohort_id, status) values
  ('00000000-0000-0000-0000-000000019061', '00000000-0000-0000-0000-000000019011', '00000000-0000-0000-0000-000000019001', '00000000-0000-0000-0000-000000019051', 'aktiv'),
  ('00000000-0000-0000-0000-000000019062', '00000000-0000-0000-0000-000000019011', '00000000-0000-0000-0000-000000019002', '00000000-0000-0000-0000-000000019051', 'aktiv');

insert into live_session (id, course_id, datum, start, ende, trainer_id) values
  ('00000000-0000-0000-0000-000000019071', '00000000-0000-0000-0000-000000019031', '2026-11-03', '09:00', '12:00', '00000000-0000-0000-0000-000000019004'),
  ('00000000-0000-0000-0000-000000019072', '00000000-0000-0000-0000-000000019031', '2026-11-03', '09:00', '12:00', '00000000-0000-0000-0000-000000019006'),
  ('00000000-0000-0000-0000-000000019073', '00000000-0000-0000-0000-000000019031', '2026-11-04', '09:00', '12:00', '00000000-0000-0000-0000-000000019002');

insert into field_job (id, organisation_id, datum, field_job_type_id, learner_id, instructor_id) values
  ('00000000-0000-0000-0000-000000019081', '00000000-0000-0000-0000-000000019011', '2026-11-05', '00000000-0000-0000-0000-000000019041', '00000000-0000-0000-0000-000000019001', '00000000-0000-0000-0000-000000019005');

insert into schedule_entry (organisation_id, datum, art, reihenfolge, cohort_id, enrolment_id, live_session_id, field_job_id) values
  ('00000000-0000-0000-0000-000000019011', '2026-11-03', 'live', 1, '00000000-0000-0000-0000-000000019051', null, '00000000-0000-0000-0000-000000019071', null),
  ('00000000-0000-0000-0000-000000019011', '2026-11-03', 'live', 1, '00000000-0000-0000-0000-000000019052', null, '00000000-0000-0000-0000-000000019072', null),
  ('00000000-0000-0000-0000-000000019011', '2026-11-04', 'live', 1, '00000000-0000-0000-0000-000000019051', null, '00000000-0000-0000-0000-000000019073', null),
  ('00000000-0000-0000-0000-000000019011', '2026-11-05', 'feld', 1, null, '00000000-0000-0000-0000-000000019061', null, '00000000-0000-0000-0000-000000019081');

insert into storage.objects (bucket_id, name) values
  ('profilfotos', '00000000-0000-0000-0000-000000019001/00000000-0000-0000-0000-0000000190a1.jpg'),
  ('profilfotos', '00000000-0000-0000-0000-000000019002/00000000-0000-0000-0000-0000000190a2.jpg'),
  ('profilfotos', '00000000-0000-0000-0000-000000019004/00000000-0000-0000-0000-0000000190a4.jpg'),
  ('profilfotos', '00000000-0000-0000-0000-000000019006/00000000-0000-0000-0000-0000000190a6.jpg');

-- ------------------------------------------------------------
-- Schema, Rolle, Bucket
-- ------------------------------------------------------------
select has_column('public', 'person', 'foto_pfad', 'person.foto_pfad existiert');
select is(
  (select public from storage.buckets where id = 'profilfotos'),
  false,
  'Bucket profilfotos ist privat'
);
select is(
  (select file_size_limit from storage.buckets where id = 'profilfotos'),
  1048576::bigint,
  'Bucket profilfotos nimmt höchstens 1 MB je Datei an'
);
select lives_ok(
  $$insert into role_assignment (person_id, organisation_id, rolle)
    values ('00000000-0000-0000-0000-000000019004', '00000000-0000-0000-0000-000000019012', 'trainer')$$,
  'Rolle trainer lässt sich vergeben'
);
select throws_ok(
  $$insert into role_assignment (person_id, organisation_id, rolle)
    values ('00000000-0000-0000-0000-000000019004', '00000000-0000-0000-0000-000000019012', 'manager')$$,
  '23514', null,
  'Unbekannte Rollen werden weiter abgelehnt'
);
select throws_ok(
  $$update person set foto_pfad = '00000000-0000-0000-0000-000000019004/00000000-0000-0000-0000-0000000190a4.jpg'
     where id = '00000000-0000-0000-0000-000000019001'$$,
  '23514', null,
  'foto_pfad muss im eigenen Ordner liegen'
);
select is(has_function_privilege('anon', 'fn_meine_trainer()', 'execute'), false,
  'anon darf fn_meine_trainer nicht ausführen');

-- Neuere Storage-Versionen sperren DELETE direkt auf storage.objects
-- (protect_delete); im Test geht es nur um die Policies.
select set_config('storage.allow_delete_query', 'true', true);

-- ------------------------------------------------------------
-- Als Lernende A
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000019001', 'role', 'authenticated')::text, true);

select results_eq(
  $$select person_id, rufname from fn_meine_trainer() order by person_id$$,
  $$values ('00000000-0000-0000-0000-000000019004'::uuid, 'Trainer'::text),
           ('00000000-0000-0000-0000-000000019005'::uuid, 'Trainerin'::text)$$,
  'Learner sehen ihre Trainer:innen aus Live-Terminen und Praxistagen, nur mit Rolle trainer'
);
select is_empty(
  $$select id from person where id = '00000000-0000-0000-0000-000000019004'$$,
  'Die Tabelle person bleibt für Learner auf die eigene Zeile beschränkt'
);
select results_eq(
  $$select name from storage.objects where bucket_id = 'profilfotos' order by name$$,
  $$values ('00000000-0000-0000-0000-000000019001/00000000-0000-0000-0000-0000000190a1.jpg'::text),
           ('00000000-0000-0000-0000-000000019002/00000000-0000-0000-0000-0000000190a2.jpg'::text),
           ('00000000-0000-0000-0000-000000019004/00000000-0000-0000-0000-0000000190a4.jpg'::text)$$,
  'Learner sehen das eigene Foto, die Fotos ihrer Trainer:innen und seit 0034 (SR-30) das Foto von B aus derselben Kohorte und Organisation'
);
select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'profilfotos' and name like '00000000-0000-0000-0000-000000019002/%'),
  1,
  'Seit 0034 (SR-30): Learner sehen Fotos anderer Lernender derselben Kohorte und Organisation'
);
select lives_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('profilfotos', '00000000-0000-0000-0000-000000019001/00000000-0000-0000-0000-0000000190b1.jpg')$$,
  'Learner laden ein Foto in den eigenen Ordner hoch'
);
select throws_like(
  $$insert into storage.objects (bucket_id, name)
    values ('profilfotos', '00000000-0000-0000-0000-000000019002/00000000-0000-0000-0000-0000000190b2.jpg')$$,
  '%row-level security%',
  'Learner laden nicht in einen fremden Ordner hoch'
);
select results_eq(
  $$update person set foto_pfad = '00000000-0000-0000-0000-000000019001/00000000-0000-0000-0000-0000000190b1.jpg'
     where id = '00000000-0000-0000-0000-000000019001' returning foto_pfad$$,
  $$values ('00000000-0000-0000-0000-000000019001/00000000-0000-0000-0000-0000000190b1.jpg'::text)$$,
  'Learner setzen den eigenen Fotopfad'
);
select results_eq(
  $$delete from storage.objects
     where bucket_id = 'profilfotos' and name = '00000000-0000-0000-0000-000000019001/00000000-0000-0000-0000-0000000190a1.jpg'
     returning name$$,
  $$values ('00000000-0000-0000-0000-000000019001/00000000-0000-0000-0000-0000000190a1.jpg'::text)$$,
  'Learner löschen das eigene alte Foto'
);
select is_empty(
  $$delete from storage.objects
     where bucket_id = 'profilfotos' and name = '00000000-0000-0000-0000-000000019004/00000000-0000-0000-0000-0000000190a4.jpg'
     returning name$$,
  'Learner löschen keine Fotos ihrer Trainer:innen'
);

-- ------------------------------------------------------------
-- Als Lernende B (gleiche Kohorte, kein eigener Praxistag mit Trainer:in)
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000019002', 'role', 'authenticated')::text, true);

select results_eq(
  $$select person_id from fn_meine_trainer()$$,
  $$values ('00000000-0000-0000-0000-000000019004'::uuid)$$,
  'Begleitung eines fremden Praxistags zählt nicht als eigene Trainer:in'
);
select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'profilfotos' and name like '00000000-0000-0000-0000-000000019001/%'),
  1,
  'Auch umgekehrt: B sieht das Foto von A (gleiche Kohorte und Organisation, 0034)'
);

-- ------------------------------------------------------------
-- Als AfCJ admin
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000019003', 'role', 'authenticated')::text, true);

select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'profilfotos' and name like '00000000-0000-0000-0000-000000019002/%'),
  1,
  'AfCJ admin sieht alle Fotos'
);
select lives_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('profilfotos', '00000000-0000-0000-0000-000000019005/00000000-0000-0000-0000-0000000190b5.jpg')$$,
  'AfCJ admin lädt Fotos für Trainer:innen hoch'
);

reset role;

select * from finish();
rollback;
