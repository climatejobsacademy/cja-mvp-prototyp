-- 023_trainer_praxisberichte.test.sql
-- Abnahme SR-82 (Paket G3): Trainer:innen prüfen Praxisberichte ihrer
-- Kohorten. Freigeben lässt den praktischen Teilschritt über
-- competency_evidence zählen, Storno nimmt es zurück; Trainer:innen ohne
-- Termin in der Kohorte lesen und prüfen keinen Bericht; Lernende sehen
-- Entscheidung und Kommentar. Baut auf 0032 auf, keine eigene Migration.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(18);

-- ------------------------------------------------------------
-- Fixtures (als Superuser)
-- 23001 Lernende A (K1), 23004 Trainer:in T (Praxistag in K1),
-- 23005 Trainer:in U (Live-Termin nur in K2)
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000023001', 'g3-a@example.test'),
  ('00000000-0000-0000-0000-000000023004', 'g3-t@example.test'),
  ('00000000-0000-0000-0000-000000023005', 'g3-u@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000023011', 'Betrieb', 'employer', 'aktiv'),
  ('00000000-0000-0000-0000-000000023012', 'AfCJ', 'afcj', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000023001', 'g3-a@example.test', 'Anna Lernend', 'g3_a', 'DE'),
  ('00000000-0000-0000-0000-000000023004', 'g3-t@example.test', 'Tina Trainer', 'g3_t', 'DE'),
  ('00000000-0000-0000-0000-000000023005', 'g3-u@example.test', 'Ute Trainer', 'g3_u', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000023001', '00000000-0000-0000-0000-000000023011'),
  ('00000000-0000-0000-0000-000000023004', '00000000-0000-0000-0000-000000023012'),
  ('00000000-0000-0000-0000-000000023005', '00000000-0000-0000-0000-000000023012');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000023001', '00000000-0000-0000-0000-000000023011', 'learner'),
  ('00000000-0000-0000-0000-000000023004', '00000000-0000-0000-0000-000000023012', 'trainer'),
  ('00000000-0000-0000-0000-000000023005', '00000000-0000-0000-0000-000000023012', 'trainer');

insert into programme (id, name, kuerzel, status) values
  ('00000000-0000-0000-0000-000000023021', 'Programm', 'TAP-23', 'published');
insert into course (id, programme_id, name, typ, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000023031', '00000000-0000-0000-0000-000000023021', 'Kurs', 'synchron', 1, 'published');
insert into field_job_type (id, titel, programme_id, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000023041', 'Auftrag', '00000000-0000-0000-0000-000000023021', 1, 'published');
insert into field_job_type_frage (id, field_job_type_id, phase, reihenfolge, frage_text, antwortoptionen) values
  ('00000000-0000-0000-0000-000000023042', '00000000-0000-0000-0000-000000023041', 'abschluss', 1, 'Wie lief es?', array['gut', 'mittel', 'schlecht']);
insert into competency (id, name, kompetenzbereich, quelle) values
  ('00000000-0000-0000-0000-000000023045', 'Kompetenz', 'Test', 'EFK-EE');
insert into competency_step (id, competency_id, name, typ) values
  ('00000000-0000-0000-0000-000000023046', '00000000-0000-0000-0000-000000023045', 'Praktischer Schritt', 'praktisch');
insert into competency_competency_step (competency_id, competency_step_id, reihenfolge) values
  ('00000000-0000-0000-0000-000000023045', '00000000-0000-0000-0000-000000023046', 1);
insert into field_job_type_competency_mapping (field_job_type_id, competency_step_id) values
  ('00000000-0000-0000-0000-000000023041', '00000000-0000-0000-0000-000000023046');

insert into cohort (id, programme_id, name, start_datum) values
  ('00000000-0000-0000-0000-000000023051', '00000000-0000-0000-0000-000000023021', 'K1', '2026-11-02'),
  ('00000000-0000-0000-0000-000000023052', '00000000-0000-0000-0000-000000023021', 'K2', '2026-11-02');
insert into enrolment (id, organisation_id, learner_id, cohort_id, status) values
  ('00000000-0000-0000-0000-000000023061', '00000000-0000-0000-0000-000000023011', '00000000-0000-0000-0000-000000023001', '00000000-0000-0000-0000-000000023051', 'aktiv');

-- U hat nur einen Live-Termin in K2
insert into live_session (id, course_id, datum, start, ende, trainer_id) values
  ('00000000-0000-0000-0000-000000023071', '00000000-0000-0000-0000-000000023031', '2026-11-03', '13:00', '17:00', '00000000-0000-0000-0000-000000023005');
insert into field_job (id, organisation_id, datum, field_job_type_id, learner_id, instructor_id) values
  ('00000000-0000-0000-0000-000000023081', '00000000-0000-0000-0000-000000023011', '2026-11-05', '00000000-0000-0000-0000-000000023041', '00000000-0000-0000-0000-000000023001', '00000000-0000-0000-0000-000000023004');
insert into schedule_entry (organisation_id, datum, art, reihenfolge, cohort_id, enrolment_id, live_session_id, field_job_id) values
  ('00000000-0000-0000-0000-000000023011', '2026-11-03', 'live', 1, '00000000-0000-0000-0000-000000023052', null, '00000000-0000-0000-0000-000000023071', null),
  ('00000000-0000-0000-0000-000000023011', '2026-11-05', 'feld', 1, null, '00000000-0000-0000-0000-000000023061', null, '00000000-0000-0000-0000-000000023081');

-- Bericht von A (Abschluss): Trigger legt die Teilschritt-Zuordnung an
insert into field_capture (id, organisation_id, learner_id, field_job_id, phase, text) values
  ('00000000-0000-0000-0000-000000023091', '00000000-0000-0000-0000-000000023011', '00000000-0000-0000-0000-000000023001', '00000000-0000-0000-0000-000000023081', 'abschluss', 'Bericht A');
insert into field_capture_antwort (organisation_id, field_capture_id, field_job_type_frage_id, gewaehlte_option) values
  ('00000000-0000-0000-0000-000000023011', '00000000-0000-0000-0000-000000023091', '00000000-0000-0000-0000-000000023042', 'gut');

select is((select count(*)::int from field_capture_step_mapping where field_capture_id = '00000000-0000-0000-0000-000000023091'), 1,
  'Bericht belegt den praktischen Teilschritt (Trigger)');

-- ------------------------------------------------------------
-- U: Termin nur in K2 -> sieht und prüft den Bericht aus K1 nicht
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000023005', 'role', 'authenticated')::text, true);

select is((select count(*)::int from field_capture), 0, 'U liest keinen Bericht aus K1');
select is((select count(*)::int from field_capture_antwort), 0, 'U liest keine Antworten aus K1');
select is((select count(*)::int from field_capture_step_mapping), 0, 'U liest keine Teilschritte des Berichts');
select is((select count(*)::int from field_job), 0, 'U liest keinen Praxistag aus K1');
select throws_ok(
  $$insert into verification (organisation_id, field_capture_id, verifiziert_von, entscheidung)
    values ('00000000-0000-0000-0000-000000023011', '00000000-0000-0000-0000-000000023091',
            '00000000-0000-0000-0000-000000023005', 'verified')$$,
  '42501', null, 'U prüft keinen Bericht aus K1');

-- ------------------------------------------------------------
-- T: Praxistag in K1 -> liest und gibt frei
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000023004', 'role', 'authenticated')::text, true);

select is((select text from field_capture where id = '00000000-0000-0000-0000-000000023091'), 'Bericht A', 'T liest den Bericht');
select is((select gewaehlte_option from field_capture_antwort where field_capture_id = '00000000-0000-0000-0000-000000023091'), 'gut',
  'T liest die Reflexion');
select lives_ok(
  $$insert into verification (id, organisation_id, field_capture_id, verifiziert_von, entscheidung)
    values ('00000000-0000-0000-0000-0000000230b1', '00000000-0000-0000-0000-000000023011',
            '00000000-0000-0000-0000-000000023091', '00000000-0000-0000-0000-000000023004', 'verified')$$,
  'T gibt den Bericht frei');
select is((select count(*)::int from field_capture where id = '00000000-0000-0000-0000-000000023091' and status = 'submitted'), 0,
  'Status des Berichts ist nicht mehr eingereicht');

reset role;
select results_eq(
  $$select competency_step_id from competency_evidence where learner_id = '00000000-0000-0000-0000-000000023001'$$,
  $$values ('00000000-0000-0000-0000-000000023046'::uuid)$$,
  'Freigabe: praktischer Teilschritt zählt in competency_evidence');
select is(
  (select erfuellt from competency_fulfilment where learner_id = '00000000-0000-0000-0000-000000023001'),
  true, 'Freigabe: Kompetenz mit einem Teilschritt gilt als erfüllt');

-- Storno durch T: zurückgeben mit Kommentar
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000023004', 'role', 'authenticated')::text, true);
select lives_ok(
  $$insert into verification (organisation_id, field_capture_id, verifiziert_von, entscheidung, kommentar, korrigiert_id)
    values ('00000000-0000-0000-0000-000000023011', '00000000-0000-0000-0000-000000023091',
            '00000000-0000-0000-0000-000000023004', 'rejected', 'Messwerte fehlen', '00000000-0000-0000-0000-0000000230b1')$$,
  'T storniert die Freigabe (zurückgegeben mit Kommentar)');
-- T hat keine Update-Policy: das Update trifft keine Zeile (Sperre per Trigger für alle Rollen: Test 021).
update verification set kommentar = 'anders' where field_capture_id = '00000000-0000-0000-0000-000000023091';

reset role;
select is((select count(*)::int from verification where kommentar = 'anders'), 0,
  'Verifizierung bleibt unverändert (T kann nicht ändern)');
select is((select count(*)::int from competency_evidence where learner_id = '00000000-0000-0000-0000-000000023001'), 0,
  'Storno: Teilschritt zählt nicht mehr');
select is((select status from field_capture where id = '00000000-0000-0000-0000-000000023091'), 'rejected',
  'Storno: Bericht steht auf zurückgegeben');

-- ------------------------------------------------------------
-- Lernende A: sieht Entscheidung und Kommentar, prüft nicht selbst
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000023001', 'role', 'authenticated')::text, true);
select results_eq(
  $$select entscheidung, kommentar from verification_aktuell where field_capture_id = '00000000-0000-0000-0000-000000023091'$$,
  $$values ('rejected'::text, 'Messwerte fehlen'::text)$$,
  'A sieht die aktuelle Entscheidung mit Kommentar');
select throws_ok(
  $$insert into verification (organisation_id, field_capture_id, verifiziert_von, entscheidung)
    values ('00000000-0000-0000-0000-000000023011', '00000000-0000-0000-0000-000000023091',
            '00000000-0000-0000-0000-000000023001', 'verified')$$,
  '42501', null, 'A gibt den eigenen Bericht nicht frei');
reset role;

select * from finish();
rollback;
