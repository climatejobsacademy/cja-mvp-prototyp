-- 021_trainer_anwesenheit_pruefung.test.sql
-- Trainer:innen bestätigen Anwesenheit (SR-81) und prüfen Praxisberichte
-- (SR-82) in Kohorten mit mindestens einem eigenen Termin (E3); attendance
-- und verification sind unveränderlich, Korrektur per Storno (SR-07, E4).
-- Migration 0032.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(31);

-- ------------------------------------------------------------
-- Fixtures (als Superuser)
-- 21001 Lernende A (K1), 21002 Lernende B (K2), 21004 Trainer:in T (Termin in K1),
-- 21005 Trainer:in U (ohne Termin), 21006 Person mit trainer_id, aber ohne Rolle,
-- 21009 AfCJ admin
-- Live: S1 (K1, Trainer T), S2 (K1, ohne Trainer), S3 (K2, Person 21006)
-- Praxis: FJ_A (A, K1), FJ_B (B, K2); Berichte CA, CB
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000021001', 'tap-a@example.test'),
  ('00000000-0000-0000-0000-000000021002', 'tap-b@example.test'),
  ('00000000-0000-0000-0000-000000021004', 'tap-t@example.test'),
  ('00000000-0000-0000-0000-000000021005', 'tap-u@example.test'),
  ('00000000-0000-0000-0000-000000021006', 'tap-x@example.test'),
  ('00000000-0000-0000-0000-000000021009', 'tap-admin@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000021011', 'Betrieb', 'employer', 'aktiv'),
  ('00000000-0000-0000-0000-000000021012', 'AfCJ', 'afcj', 'aktiv'),
  ('00000000-0000-0000-0000-000000021013', 'Anderer Betrieb', 'employer', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000021001', 'tap-a@example.test', 'Anna Lernend', 'tap_a', 'DE'),
  ('00000000-0000-0000-0000-000000021002', 'tap-b@example.test', 'Ben Lernend', 'tap_b', 'DE'),
  ('00000000-0000-0000-0000-000000021004', 'tap-t@example.test', 'Tina Trainer', 'tap_t', 'DE'),
  ('00000000-0000-0000-0000-000000021005', 'tap-u@example.test', 'Ute Trainer', 'tap_u', 'DE'),
  ('00000000-0000-0000-0000-000000021006', 'tap-x@example.test', 'Xaver Ohne Rolle', 'tap_x', 'DE'),
  ('00000000-0000-0000-0000-000000021009', 'tap-admin@example.test', 'Admin', 'tap_admin', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000021001', '00000000-0000-0000-0000-000000021011'),
  ('00000000-0000-0000-0000-000000021002', '00000000-0000-0000-0000-000000021011'),
  ('00000000-0000-0000-0000-000000021004', '00000000-0000-0000-0000-000000021012'),
  ('00000000-0000-0000-0000-000000021005', '00000000-0000-0000-0000-000000021012'),
  ('00000000-0000-0000-0000-000000021009', '00000000-0000-0000-0000-000000021012');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000021001', '00000000-0000-0000-0000-000000021011', 'learner'),
  ('00000000-0000-0000-0000-000000021002', '00000000-0000-0000-0000-000000021011', 'learner'),
  ('00000000-0000-0000-0000-000000021004', '00000000-0000-0000-0000-000000021012', 'trainer'),
  ('00000000-0000-0000-0000-000000021005', '00000000-0000-0000-0000-000000021012', 'trainer'),
  ('00000000-0000-0000-0000-000000021009', '00000000-0000-0000-0000-000000021012', 'afcj_admin');

insert into programme (id, name, kuerzel, status) values
  ('00000000-0000-0000-0000-000000021021', 'Programm', 'TAP-21', 'published');

insert into course (id, programme_id, name, typ, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000021031', '00000000-0000-0000-0000-000000021021', 'Kurs', 'synchron', 1, 'published');

insert into field_job_type (id, titel, programme_id, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000021041', 'Praxisauftrag', '00000000-0000-0000-0000-000000021021', 1, 'published');

insert into competency (id, name, kompetenzbereich, quelle) values
  ('00000000-0000-0000-0000-000000021045', 'Kompetenz', 'Test', 'EFK-EE');
insert into competency_step (id, competency_id, name, typ) values
  ('00000000-0000-0000-0000-000000021046', '00000000-0000-0000-0000-000000021045', 'Praktischer Schritt', 'praktisch');
insert into field_job_type_competency_mapping (field_job_type_id, competency_step_id) values
  ('00000000-0000-0000-0000-000000021041', '00000000-0000-0000-0000-000000021046');

insert into cohort (id, programme_id, name, start_datum) values
  ('00000000-0000-0000-0000-000000021051', '00000000-0000-0000-0000-000000021021', 'K1', '2026-11-02'),
  ('00000000-0000-0000-0000-000000021052', '00000000-0000-0000-0000-000000021021', 'K2', '2026-11-02');

insert into enrolment (id, organisation_id, learner_id, cohort_id, status) values
  ('00000000-0000-0000-0000-000000021061', '00000000-0000-0000-0000-000000021011', '00000000-0000-0000-0000-000000021001', '00000000-0000-0000-0000-000000021051', 'aktiv'),
  ('00000000-0000-0000-0000-000000021062', '00000000-0000-0000-0000-000000021011', '00000000-0000-0000-0000-000000021002', '00000000-0000-0000-0000-000000021052', 'aktiv');

insert into live_session (id, course_id, datum, start, ende, trainer_id) values
  ('00000000-0000-0000-0000-000000021071', '00000000-0000-0000-0000-000000021031', '2026-11-03', '13:00', '17:00', '00000000-0000-0000-0000-000000021004'),
  ('00000000-0000-0000-0000-000000021072', '00000000-0000-0000-0000-000000021031', '2026-11-04', '13:00', '17:00', null),
  ('00000000-0000-0000-0000-000000021073', '00000000-0000-0000-0000-000000021031', '2026-11-03', '13:00', '17:00', '00000000-0000-0000-0000-000000021006');

insert into field_job (id, organisation_id, datum, field_job_type_id, learner_id, instructor_id) values
  ('00000000-0000-0000-0000-000000021081', '00000000-0000-0000-0000-000000021011', '2026-11-05', '00000000-0000-0000-0000-000000021041', '00000000-0000-0000-0000-000000021001', null),
  ('00000000-0000-0000-0000-000000021082', '00000000-0000-0000-0000-000000021011', '2026-11-05', '00000000-0000-0000-0000-000000021041', '00000000-0000-0000-0000-000000021002', null);

insert into schedule_entry (organisation_id, datum, art, reihenfolge, cohort_id, enrolment_id, live_session_id, field_job_id) values
  ('00000000-0000-0000-0000-000000021011', '2026-11-03', 'live', 1, '00000000-0000-0000-0000-000000021051', null, '00000000-0000-0000-0000-000000021071', null),
  ('00000000-0000-0000-0000-000000021011', '2026-11-04', 'live', 1, '00000000-0000-0000-0000-000000021051', null, '00000000-0000-0000-0000-000000021072', null),
  ('00000000-0000-0000-0000-000000021011', '2026-11-03', 'live', 1, '00000000-0000-0000-0000-000000021052', null, '00000000-0000-0000-0000-000000021073', null),
  ('00000000-0000-0000-0000-000000021011', '2026-11-05', 'feld', 1, null, '00000000-0000-0000-0000-000000021061', null, '00000000-0000-0000-0000-000000021081'),
  ('00000000-0000-0000-0000-000000021011', '2026-11-05', 'feld', 1, null, '00000000-0000-0000-0000-000000021062', null, '00000000-0000-0000-0000-000000021082');

insert into field_capture (id, organisation_id, learner_id, field_job_id, phase, text) values
  ('00000000-0000-0000-0000-000000021091', '00000000-0000-0000-0000-000000021011', '00000000-0000-0000-0000-000000021001', '00000000-0000-0000-0000-000000021081', 'abschluss', 'Bericht A'),
  ('00000000-0000-0000-0000-000000021092', '00000000-0000-0000-0000-000000021011', '00000000-0000-0000-0000-000000021002', '00000000-0000-0000-0000-000000021082', 'abschluss', 'Bericht B');

-- ------------------------------------------------------------
-- Schema
-- ------------------------------------------------------------
select has_column('public', 'attendance', 'bestaetigt_am', 'attendance.bestaetigt_am existiert');
select has_column('public', 'attendance', 'korrigiert_id', 'attendance.korrigiert_id existiert');
select has_column('public', 'verification', 'korrigiert_id', 'verification.korrigiert_id existiert');
select has_view('public', 'attendance_aktuell', 'View attendance_aktuell existiert');
select is(has_function_privilege('anon', 'fn_trainer_teilnehmende()', 'execute'), false,
  'anon darf fn_trainer_teilnehmende nicht ausführen');

-- ------------------------------------------------------------
-- Als Trainer:in T (Termin S1 in K1)
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000021004', 'role', 'authenticated')::text, true);

select results_eq('select fn_trainer_kohorten_ids()',
  $$values ('00000000-0000-0000-0000-000000021051'::uuid)$$,
  'T: Kohorten mit eigenem Termin = nur K1');
select results_eq('select person_id from fn_trainer_teilnehmende()',
  $$values ('00000000-0000-0000-0000-000000021001'::uuid)$$,
  'T: Teilnehmende nur aus K1');
select results_eq('select id from live_session order by datum',
  $$values ('00000000-0000-0000-0000-000000021071'::uuid), ('00000000-0000-0000-0000-000000021072'::uuid)$$,
  'T sieht S1 und S2 (K1), nicht S3 (K2)');
select is((select count(*)::int from person where id = '00000000-0000-0000-0000-000000021001'), 0,
  'T liest person der Lernenden nicht direkt');

select lives_ok(
  $$insert into attendance (id, organisation_id, learner_id, live_session_id, status, bestaetigt_von)
    values ('00000000-0000-0000-0000-0000000210a1', '00000000-0000-0000-0000-000000021011',
            '00000000-0000-0000-0000-000000021001', '00000000-0000-0000-0000-000000021072', 'anwesend',
            '00000000-0000-0000-0000-000000021004')$$,
  'T bestätigt A an S2 (Termin ohne eigene Zuordnung, gleiche Kohorte, E3)');
select throws_ok(
  $$insert into attendance (organisation_id, learner_id, live_session_id, status, bestaetigt_von)
    values ('00000000-0000-0000-0000-000000021011', '00000000-0000-0000-0000-000000021002',
            '00000000-0000-0000-0000-000000021073', 'anwesend', '00000000-0000-0000-0000-000000021004')$$,
  '42501', null, 'T bestätigt nicht in fremder Kohorte (B an S3)');
select throws_ok(
  $$insert into attendance (organisation_id, learner_id, live_session_id, status, bestaetigt_von)
    values ('00000000-0000-0000-0000-000000021011', '00000000-0000-0000-0000-000000021001',
            '00000000-0000-0000-0000-000000021071', 'anwesend', '00000000-0000-0000-0000-000000021009')$$,
  '42501', null, 'T trägt keine andere Person als bestätigend ein');
select throws_ok(
  $$insert into attendance (organisation_id, learner_id, live_session_id, status, bestaetigt_von)
    values ('00000000-0000-0000-0000-000000021013', '00000000-0000-0000-0000-000000021001',
            '00000000-0000-0000-0000-000000021071', 'anwesend', '00000000-0000-0000-0000-000000021004')$$,
  '42501', null, 'organisation_id muss die der Einschreibung sein');
select throws_ok(
  $$insert into attendance (organisation_id, learner_id, live_session_id, status, bestaetigt_von)
    values ('00000000-0000-0000-0000-000000021011', '00000000-0000-0000-0000-000000021001',
            '00000000-0000-0000-0000-000000021072', 'anwesend', '00000000-0000-0000-0000-000000021004')$$,
  '23505', null, 'zweite Ausgangszeile für dieselbe Person und denselben Termin abgelehnt');
select throws_ok(
  $$insert into attendance (organisation_id, learner_id, live_session_id, status, bestaetigt_von, korrigiert_id)
    values ('00000000-0000-0000-0000-000000021011', '00000000-0000-0000-0000-000000021001',
            '00000000-0000-0000-0000-000000021071', 'nicht anwesend', '00000000-0000-0000-0000-000000021004',
            '00000000-0000-0000-0000-0000000210a1')$$,
  '23514', null, 'Storno muss denselben Termin betreffen');
select lives_ok(
  $$insert into attendance (organisation_id, learner_id, live_session_id, status, bestaetigt_von, korrigiert_id)
    values ('00000000-0000-0000-0000-000000021011', '00000000-0000-0000-0000-000000021001',
            '00000000-0000-0000-0000-000000021072', 'nicht anwesend', '00000000-0000-0000-0000-000000021004',
            '00000000-0000-0000-0000-0000000210a1')$$,
  'T storniert die eigene Bestätigung mit einer Korrekturzeile');
select results_eq(
  $$select status from attendance_aktuell where learner_id = '00000000-0000-0000-0000-000000021001'
      and live_session_id = '00000000-0000-0000-0000-000000021072'$$,
  $$values ('nicht anwesend'::text)$$,
  'attendance_aktuell zeigt nur den korrigierten Wert');

select results_eq('select id from field_capture',
  $$values ('00000000-0000-0000-0000-000000021091'::uuid)$$,
  'T sieht nur Praxisberichte aus K1');
select lives_ok(
  $$insert into verification (id, organisation_id, field_capture_id, verifiziert_von, entscheidung)
    values ('00000000-0000-0000-0000-0000000210b1', '00000000-0000-0000-0000-000000021011',
            '00000000-0000-0000-0000-000000021091', '00000000-0000-0000-0000-000000021004', 'verified')$$,
  'T bestätigt den Bericht von A');
select throws_ok(
  $$insert into verification (organisation_id, field_capture_id, verifiziert_von, entscheidung)
    values ('00000000-0000-0000-0000-000000021011', '00000000-0000-0000-0000-000000021092',
            '00000000-0000-0000-0000-000000021004', 'verified')$$,
  '42501', null, 'T prüft keinen Bericht aus fremder Kohorte');
reset role;
select is((select status from field_capture where id = '00000000-0000-0000-0000-000000021091'), 'verified',
  'Bestätigung schreibt den Status des Berichts');
select is((select count(*)::int from competency_evidence where learner_id = '00000000-0000-0000-0000-000000021001'), 1,
  'Bestätigter Bericht zählt als Nachweis');

-- Storno der Verifizierung durch T
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000021004', 'role', 'authenticated')::text, true);
select lives_ok(
  $$insert into verification (organisation_id, field_capture_id, verifiziert_von, entscheidung, kommentar, korrigiert_id)
    values ('00000000-0000-0000-0000-000000021011', '00000000-0000-0000-0000-000000021091',
            '00000000-0000-0000-0000-000000021004', 'rejected', 'Foto fehlt', '00000000-0000-0000-0000-0000000210b1')$$,
  'T storniert die Bestätigung (Korrektur: zurückgegeben)');
reset role;
select is((select status from field_capture where id = '00000000-0000-0000-0000-000000021091'), 'rejected',
  'Storno setzt den Status des Berichts');
select is((select count(*)::int from competency_evidence where learner_id = '00000000-0000-0000-0000-000000021001'), 0,
  'Stornierte Bestätigung zählt nicht mehr als Nachweis');

-- ------------------------------------------------------------
-- Unveränderlichkeit (auch Superuser und AfCJ admin), Delete nur AfCJ admin
-- ------------------------------------------------------------
select throws_ok(
  $$update attendance set status = 'anwesend' where id = '00000000-0000-0000-0000-0000000210a1'$$,
  '42501', null, 'attendance: Update gesperrt (auch Superuser)');
select throws_ok(
  $$update verification set kommentar = 'x' where id = '00000000-0000-0000-0000-0000000210b1'$$,
  '42501', null, 'verification: Update gesperrt (auch Superuser)');

-- ------------------------------------------------------------
-- Trainer:in U ohne Termin, Person 21006 mit trainer_id ohne Rolle, Lernende A
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000021005', 'role', 'authenticated')::text, true);
select is((select count(*)::int from enrolment), 0, 'U ohne Termin sieht keine Einschreibungen');

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000021006', 'role', 'authenticated')::text, true);
select is((select count(*)::int from fn_trainer_kohorten_ids()), 0, 'Ohne Rolle trainer keine Kohorten, trotz trainer_id');

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000021001', 'role', 'authenticated')::text, true);
select throws_ok(
  $$insert into attendance (organisation_id, learner_id, live_session_id, status, bestaetigt_von)
    values ('00000000-0000-0000-0000-000000021011', '00000000-0000-0000-0000-000000021001',
            '00000000-0000-0000-0000-000000021071', 'anwesend', '00000000-0000-0000-0000-000000021001')$$,
  '42501', null, 'Lernende bestätigen ihre Anwesenheit nicht selbst');

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000021009', 'role', 'authenticated')::text, true);
select lives_ok(
  $$delete from attendance where learner_id = '00000000-0000-0000-0000-000000021001'$$,
  'AfCJ admin darf löschen (Löschweg DSGVO offen, E4)');
reset role;

select * from finish();
rollback;
