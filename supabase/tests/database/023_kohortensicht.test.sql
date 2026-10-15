-- 023_kohortensicht.test.sql
-- Kohortensicht (0034; SR-30): fn_meine_kohorte() liefert die anderen
-- Lernenden der eigenen Kohorte -- nur gleiche Kohorte UND gleiche
-- Organisation, nur aktive Einschreibungen -- mit Anzeigename (Rufname plus
-- Initial) und Fotopfad; fn_darf_foto_sehen und die Storage-Policy
-- profilfotos_lesen erlauben das Foto der Kohortenmitglieder. Keine
-- Lockerung von person, keine Fotos für Trainer:innen.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(22);

-- ------------------------------------------------------------
-- Fixtures (als Superuser)
-- Betrieb A (…23011): L1, L2 (mit Foto), L3 (abgebrochen), L5 (andere Kohorte), L6 (Name mit einem Wort)
-- Betrieb B (…23012): L4 in derselben Kohorte K1
-- 23006 AfCJ admin, 23007 Trainer:in T1 (Live in K1)
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000023001', 'kohorte-l1@example.test'),
  ('00000000-0000-0000-0000-000000023002', 'kohorte-l2@example.test'),
  ('00000000-0000-0000-0000-000000023003', 'kohorte-l3@example.test'),
  ('00000000-0000-0000-0000-000000023004', 'kohorte-l4@example.test'),
  ('00000000-0000-0000-0000-000000023005', 'kohorte-l5@example.test'),
  ('00000000-0000-0000-0000-000000023006', 'kohorte-admin@example.test'),
  ('00000000-0000-0000-0000-000000023007', 'kohorte-t1@example.test'),
  ('00000000-0000-0000-0000-000000023008', 'kohorte-l6@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000023011', 'Betrieb A', 'employer', 'aktiv'),
  ('00000000-0000-0000-0000-000000023012', 'Betrieb B', 'employer', 'aktiv'),
  ('00000000-0000-0000-0000-000000023013', 'AfCJ', 'afcj', 'aktiv');

-- rufname: L2 eigener Rufname, die übrigen werden aus dem ersten Wort von name vorbelegt.
insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000023001', 'kohorte-l1@example.test', 'Lea Maria Muster', 'kh_l1', 'DE'),
  ('00000000-0000-0000-0000-000000023003', 'kohorte-l3@example.test', 'Abbruch Ex', 'kh_l3', 'DE'),
  ('00000000-0000-0000-0000-000000023004', 'kohorte-l4@example.test', 'Fremd Betrieb', 'kh_l4', 'DE'),
  ('00000000-0000-0000-0000-000000023005', 'kohorte-l5@example.test', 'Andere Kohorte', 'kh_l5', 'DE'),
  ('00000000-0000-0000-0000-000000023006', 'kohorte-admin@example.test', 'Admin', 'kh_admin', 'DE'),
  ('00000000-0000-0000-0000-000000023007', 'kohorte-t1@example.test', 'Trainer Eins', 'kh_t1', 'DE'),
  ('00000000-0000-0000-0000-000000023008', 'kohorte-l6@example.test', 'Cem', 'kh_l6', 'DE');
insert into person (id, email, name, username, sprache, rufname) values
  ('00000000-0000-0000-0000-000000023002', 'kohorte-l2@example.test', 'Johannes Beispiel Berger', 'kh_l2', 'DE', 'Jo');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000023001', '00000000-0000-0000-0000-000000023011'),
  ('00000000-0000-0000-0000-000000023002', '00000000-0000-0000-0000-000000023011'),
  ('00000000-0000-0000-0000-000000023003', '00000000-0000-0000-0000-000000023011'),
  ('00000000-0000-0000-0000-000000023004', '00000000-0000-0000-0000-000000023012'),
  ('00000000-0000-0000-0000-000000023005', '00000000-0000-0000-0000-000000023011'),
  ('00000000-0000-0000-0000-000000023006', '00000000-0000-0000-0000-000000023013'),
  ('00000000-0000-0000-0000-000000023007', '00000000-0000-0000-0000-000000023013'),
  ('00000000-0000-0000-0000-000000023008', '00000000-0000-0000-0000-000000023011');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000023001', '00000000-0000-0000-0000-000000023011', 'learner'),
  ('00000000-0000-0000-0000-000000023002', '00000000-0000-0000-0000-000000023011', 'learner'),
  ('00000000-0000-0000-0000-000000023003', '00000000-0000-0000-0000-000000023011', 'learner'),
  ('00000000-0000-0000-0000-000000023004', '00000000-0000-0000-0000-000000023012', 'learner'),
  ('00000000-0000-0000-0000-000000023005', '00000000-0000-0000-0000-000000023011', 'learner'),
  ('00000000-0000-0000-0000-000000023008', '00000000-0000-0000-0000-000000023011', 'learner'),
  ('00000000-0000-0000-0000-000000023006', '00000000-0000-0000-0000-000000023013', 'afcj_admin'),
  ('00000000-0000-0000-0000-000000023007', '00000000-0000-0000-0000-000000023013', 'trainer');

insert into programme (id, name, kuerzel, status) values
  ('00000000-0000-0000-0000-000000023021', 'Programm', 'KH-P1', 'published');

insert into course (id, programme_id, name, typ, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000023031', '00000000-0000-0000-0000-000000023021', 'Kurs', 'synchron', 1, 'published');

insert into cohort (id, programme_id, name, start_datum) values
  ('00000000-0000-0000-0000-000000023051', '00000000-0000-0000-0000-000000023021', 'K1', '2026-11-02'),
  ('00000000-0000-0000-0000-000000023052', '00000000-0000-0000-0000-000000023021', 'K2', '2026-11-02');

insert into enrolment (id, organisation_id, learner_id, cohort_id, status) values
  ('00000000-0000-0000-0000-000000023061', '00000000-0000-0000-0000-000000023011', '00000000-0000-0000-0000-000000023001', '00000000-0000-0000-0000-000000023051', 'aktiv'),
  ('00000000-0000-0000-0000-000000023062', '00000000-0000-0000-0000-000000023011', '00000000-0000-0000-0000-000000023002', '00000000-0000-0000-0000-000000023051', 'aktiv'),
  ('00000000-0000-0000-0000-000000023063', '00000000-0000-0000-0000-000000023011', '00000000-0000-0000-0000-000000023003', '00000000-0000-0000-0000-000000023051', 'abgebrochen'),
  ('00000000-0000-0000-0000-000000023064', '00000000-0000-0000-0000-000000023012', '00000000-0000-0000-0000-000000023004', '00000000-0000-0000-0000-000000023051', 'aktiv'),
  ('00000000-0000-0000-0000-000000023065', '00000000-0000-0000-0000-000000023011', '00000000-0000-0000-0000-000000023005', '00000000-0000-0000-0000-000000023052', 'aktiv'),
  ('00000000-0000-0000-0000-000000023066', '00000000-0000-0000-0000-000000023011', '00000000-0000-0000-0000-000000023008', '00000000-0000-0000-0000-000000023051', 'aktiv');

-- T1 hält einen Live-Termin in K1 (damit fn_meine_trainer für L1 nicht leer ist).
insert into live_session (id, course_id, datum, start, ende, trainer_id) values
  ('00000000-0000-0000-0000-000000023071', '00000000-0000-0000-0000-000000023031', '2026-11-03', '09:00', '12:00', '00000000-0000-0000-0000-000000023007');
insert into schedule_entry (organisation_id, datum, art, reihenfolge, cohort_id, enrolment_id, live_session_id, field_job_id) values
  ('00000000-0000-0000-0000-000000023011', '2026-11-03', 'live', 1, '00000000-0000-0000-0000-000000023051', null, '00000000-0000-0000-0000-000000023071', null);

-- Foto von L2 (der Upload ist die Freigabe), L6 hat keins.
update person set foto_pfad = '00000000-0000-0000-0000-000000023002/00000000-0000-0000-0000-0000000230a2.jpg'
 where id = '00000000-0000-0000-0000-000000023002';

insert into storage.objects (bucket_id, name) values
  ('profilfotos', '00000000-0000-0000-0000-000000023001/00000000-0000-0000-0000-0000000230a1.jpg'),
  ('profilfotos', '00000000-0000-0000-0000-000000023002/00000000-0000-0000-0000-0000000230a2.jpg'),
  ('profilfotos', '00000000-0000-0000-0000-000000023003/00000000-0000-0000-0000-0000000230a3.jpg'),
  ('profilfotos', '00000000-0000-0000-0000-000000023004/00000000-0000-0000-0000-0000000230a4.jpg'),
  ('profilfotos', '00000000-0000-0000-0000-000000023005/00000000-0000-0000-0000-0000000230a5.jpg'),
  ('profilfotos', '00000000-0000-0000-0000-000000023007/00000000-0000-0000-0000-0000000230a7.jpg');

-- ------------------------------------------------------------
-- Schema und Grants
-- ------------------------------------------------------------
select has_function('public', 'fn_meine_kohorte', array[]::text[], 'fn_meine_kohorte existiert');
select is(has_function_privilege('anon', 'fn_meine_kohorte()', 'execute'), false,
  'anon darf fn_meine_kohorte nicht ausführen');
select is(has_function_privilege('authenticated', 'fn_meine_kohorte()', 'execute'), true,
  'angemeldete Personen dürfen fn_meine_kohorte ausführen');
select is(
  (select proargnames from pg_proc where proname = 'fn_meine_kohorte'),
  array['person_id', 'anzeigename', 'foto_pfad']::text[],
  'fn_meine_kohorte liefert nur person_id, Anzeigename und Fotopfad -- keine E-Mail, kein Geburtsdatum'
);

-- ------------------------------------------------------------
-- Als Lernende L1 (Betrieb A, K1)
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000023001', 'role', 'authenticated')::text, true);

select results_eq(
  $$select anzeigename from fn_meine_kohorte()$$,
  $$values ('Cem'::text), ('Jo B.'::text)$$,
  'L1 sieht nur L2 und L6, mit Rufname plus Initial (ein Wort: nur Rufname)'
);
select is(
  (select count(*)::int from fn_meine_kohorte() where person_id = '00000000-0000-0000-0000-000000023001'),
  0,
  'Die eigene Person steht nicht in der Liste'
);
select is(
  (select count(*)::int from fn_meine_kohorte() where person_id in (
     '00000000-0000-0000-0000-000000023003',
     '00000000-0000-0000-0000-000000023004',
     '00000000-0000-0000-0000-000000023005')),
  0,
  'Abgebrochene Einschreibung, andere Organisation und andere Kohorte bleiben unsichtbar'
);
select ok(
  (select foto_pfad is not null from fn_meine_kohorte() where person_id = '00000000-0000-0000-0000-000000023002'),
  'Hat ein Mitglied ein Foto hochgeladen, liefert die Funktion den Pfad'
);
select is(
  (select foto_pfad from fn_meine_kohorte() where person_id = '00000000-0000-0000-0000-000000023008'),
  null,
  'Ohne Foto ist der Pfad leer'
);
select is_empty(
  $$select id from person where id = '00000000-0000-0000-0000-000000023002'$$,
  'Die Tabelle person bleibt für Lernende geschlossen'
);
select is(fn_darf_foto_sehen('00000000-0000-0000-0000-000000023002'), true,
  'L1 darf das Foto von L2 (gleiche Kohorte und Organisation) sehen');
select is(
  fn_darf_foto_sehen('00000000-0000-0000-0000-000000023004')
    or fn_darf_foto_sehen('00000000-0000-0000-0000-000000023005')
    or fn_darf_foto_sehen('00000000-0000-0000-0000-000000023003'),
  false,
  'Fotos aus anderer Organisation, anderer Kohorte oder abgebrochener Einschreibung bleiben gesperrt'
);
select results_eq(
  $$select split_part(name, '/', 1) from storage.objects where bucket_id = 'profilfotos' order by 1$$,
  $$values ('00000000-0000-0000-0000-000000023001'::text),
           ('00000000-0000-0000-0000-000000023002'::text),
           ('00000000-0000-0000-0000-000000023007'::text)$$,
  'Die Storage-Policy zeigt L1 das eigene Foto, das von L2 und das der eigenen Trainer:in -- sonst keins'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('profilfotos', '00000000-0000-0000-0000-000000023002/00000000-0000-0000-0000-0000000230b1.jpg')$$,
  '42501', null,
  'In den Ordner eines Kohortenmitglieds darf niemand schreiben'
);

-- ------------------------------------------------------------
-- Als Lernende L4 (Betrieb B, gleiche Kohorte K1)
-- ------------------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000023004', 'role', 'authenticated')::text, true);

select is_empty(
  $$select person_id from fn_meine_kohorte()$$,
  'L4 (andere Organisation) sieht niemanden aus Betrieb A, obwohl die Kohorte dieselbe ist'
);
select results_eq(
  $$select split_part(name, '/', 1) from storage.objects where bucket_id = 'profilfotos' order by 1$$,
  $$values ('00000000-0000-0000-0000-000000023004'::text),
           ('00000000-0000-0000-0000-000000023007'::text)$$,
  'L4 sieht das eigene Foto und das der Trainer:in seiner Kohorte, aber keins aus Betrieb A'
);

-- ------------------------------------------------------------
-- Als Lernende L3 (Einschreibung abgebrochen)
-- ------------------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000023003', 'role', 'authenticated')::text, true);

select is_empty(
  $$select person_id from fn_meine_kohorte()$$,
  'Mit abgebrochener Einschreibung sieht L3 niemanden'
);

-- ------------------------------------------------------------
-- Als Trainer:in T1
-- ------------------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000023007', 'role', 'authenticated')::text, true);

select is_empty(
  $$select person_id from fn_meine_kohorte()$$,
  'Trainer:innen haben keine Kohortenliste (keine Einschreibung)'
);
select is(fn_darf_foto_sehen('00000000-0000-0000-0000-000000023002'), false,
  'Trainer:innen sehen über diese Regel keine Fotos von Lernenden');

-- ------------------------------------------------------------
-- Als AfCJ admin
-- ------------------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000023006', 'role', 'authenticated')::text, true);

select is(fn_darf_foto_sehen('00000000-0000-0000-0000-000000023002'), true,
  'AfCJ admin darf alle Fotos sehen');

-- ------------------------------------------------------------
-- Foto entfernen = Freigabe zurück
-- ------------------------------------------------------------
reset role;
update person set foto_pfad = null where id = '00000000-0000-0000-0000-000000023002';
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000023001', 'role', 'authenticated')::text, true);

select is(
  (select foto_pfad from fn_meine_kohorte() where person_id = '00000000-0000-0000-0000-000000023002'),
  null,
  'Nach dem Entfernen des Fotos liefert die Funktion keinen Pfad mehr'
);

-- ------------------------------------------------------------
-- Ohne Anmeldung
-- ------------------------------------------------------------
reset role;
set local role anon;
select throws_ok(
  $$select * from fn_meine_kohorte()$$,
  '42501', null,
  'Ohne Anmeldung ist die Kohortenliste gesperrt'
);

reset role;

select * from finish();
rollback;
