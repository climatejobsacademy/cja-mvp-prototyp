-- 025_kompetenz_anwesenheit.test.sql
-- SR-63 ergänzt (0051): Live-Lektionen zählen für einen theoretischen
-- Teilschritt als erledigt, sobald die Anwesenheit bestätigt ist (aktueller
-- Wert über attendance_aktuell). AND-Logik bleibt: erst Live UND Selbstlernen
-- erfüllen den Teilschritt. Eine Korrektur auf "nicht anwesend" nimmt das
-- zurück. Learner sehen nur ihre eigene Zeile.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(6);

-- ------------------------------------------------------------
-- Fixtures (als Superuser)
-- L1, L2 Learner in K1 (Betrieb E), A1 AfCJ admin (bestätigt)
-- Teilschritt S hängt an Live-Lektion LL und Selbstlern-Lektion LS
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000025001', 'ka-l1@example.test'),
  ('00000000-0000-0000-0000-000000025002', 'ka-l2@example.test'),
  ('00000000-0000-0000-0000-000000025003', 'ka-admin@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000025011', 'Betrieb E', 'employer', 'aktiv'),
  ('00000000-0000-0000-0000-000000025012', 'AfCJ', 'afcj', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000025001', 'ka-l1@example.test', 'Lea Eins', 'ka_l1', 'DE'),
  ('00000000-0000-0000-0000-000000025002', 'ka-l2@example.test', 'Ben Zwei', 'ka_l2', 'DE'),
  ('00000000-0000-0000-0000-000000025003', 'ka-admin@example.test', 'Admin', 'ka_admin', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000025001', '00000000-0000-0000-0000-000000025011'),
  ('00000000-0000-0000-0000-000000025002', '00000000-0000-0000-0000-000000025011'),
  ('00000000-0000-0000-0000-000000025003', '00000000-0000-0000-0000-000000025012');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000025001', '00000000-0000-0000-0000-000000025011', 'learner'),
  ('00000000-0000-0000-0000-000000025002', '00000000-0000-0000-0000-000000025011', 'learner'),
  ('00000000-0000-0000-0000-000000025003', '00000000-0000-0000-0000-000000025012', 'afcj_admin');

insert into programme (id, name, kuerzel, status) values
  ('00000000-0000-0000-0000-000000025021', 'Programm', 'KA-P1', 'published');

insert into course (id, programme_id, name, typ, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000025031', '00000000-0000-0000-0000-000000025021', 'Kurs', 'synchron', 1, 'published');

insert into lesson (id, course_id, name, content_type, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000025041', '00000000-0000-0000-0000-000000025031', 'Live-Lektion', 'live', 1, 'published'),
  ('00000000-0000-0000-0000-000000025042', '00000000-0000-0000-0000-000000025031', 'Selbstlern-Lektion', 'repository', 2, 'published');

insert into cohort (id, programme_id, name, start_datum) values
  ('00000000-0000-0000-0000-000000025051', '00000000-0000-0000-0000-000000025021', 'K1', '2026-11-02');

insert into enrolment (id, organisation_id, learner_id, cohort_id, status) values
  ('00000000-0000-0000-0000-000000025061', '00000000-0000-0000-0000-000000025011', '00000000-0000-0000-0000-000000025001', '00000000-0000-0000-0000-000000025051', 'aktiv'),
  ('00000000-0000-0000-0000-000000025062', '00000000-0000-0000-0000-000000025011', '00000000-0000-0000-0000-000000025002', '00000000-0000-0000-0000-000000025051', 'aktiv');

insert into live_session (id, lesson_id, course_id, datum, start, ende) values
  ('00000000-0000-0000-0000-000000025071', '00000000-0000-0000-0000-000000025041', '00000000-0000-0000-0000-000000025031', '2026-11-03', '09:00', '12:00');
insert into schedule_entry (organisation_id, datum, art, reihenfolge, cohort_id, enrolment_id, live_session_id, field_job_id) values
  ('00000000-0000-0000-0000-000000025011', '2026-11-03', 'live', 1, '00000000-0000-0000-0000-000000025051', null, '00000000-0000-0000-0000-000000025071', null);

insert into competency (id, name, kompetenzbereich, quelle) values
  ('00000000-0000-0000-0000-000000025081', 'Kompetenz', 'Elektro', 'KA-P1');
insert into competency_step (id, competency_id, name, typ) values
  ('00000000-0000-0000-0000-000000025091', '00000000-0000-0000-0000-000000025081', 'Theorie Live + Selbstlernen', 'theoretisch');
insert into competency_competency_step (competency_id, competency_step_id, reihenfolge) values
  ('00000000-0000-0000-0000-000000025081', '00000000-0000-0000-0000-000000025091', 1);
insert into content_competency_mapping (lesson_id, competency_step_id) values
  ('00000000-0000-0000-0000-000000025041', '00000000-0000-0000-0000-000000025091'),
  ('00000000-0000-0000-0000-000000025042', '00000000-0000-0000-0000-000000025091');

-- ------------------------------------------------------------
-- Nur Selbstlernen erledigt: Teilschritt offen (AND)
-- ------------------------------------------------------------
insert into unit_progress (organisation_id, learner_id, lesson_id, status, abgeschlossen_am) values
  ('00000000-0000-0000-0000-000000025011', '00000000-0000-0000-0000-000000025001', '00000000-0000-0000-0000-000000025042', 'abgeschlossen', now());

select is_empty(
  $$ select 1 from competency_fulfilment
     where learner_id = '00000000-0000-0000-0000-000000025001' $$,
  'Nur Selbstlernen erledigt: Teilschritt mit Live-Lektion noch nicht erfüllt'
);

-- ------------------------------------------------------------
-- Anwesenheit bestätigt: Live-Lektion zählt, Teilschritt erfüllt
-- ------------------------------------------------------------
insert into attendance (id, organisation_id, learner_id, live_session_id, status, bestaetigt_von) values
  ('00000000-0000-0000-0000-0000000250a1', '00000000-0000-0000-0000-000000025011', '00000000-0000-0000-0000-000000025001',
   '00000000-0000-0000-0000-000000025071', 'anwesend', '00000000-0000-0000-0000-000000025003');

select results_eq(
  $$ select teilschritte_erfuellt, teilschritte_gesamt, erfuellt from competency_fulfilment
     where learner_id = '00000000-0000-0000-0000-000000025001' $$,
  $$ values (1, 1, true) $$,
  'Bestätigte Anwesenheit plus Selbstlernen erfüllen den Teilschritt'
);

-- ------------------------------------------------------------
-- Korrektur auf "nicht anwesend": zählt nicht mehr
-- ------------------------------------------------------------
insert into attendance (id, organisation_id, learner_id, live_session_id, status, bestaetigt_von, korrigiert_id) values
  ('00000000-0000-0000-0000-0000000250a2', '00000000-0000-0000-0000-000000025011', '00000000-0000-0000-0000-000000025001',
   '00000000-0000-0000-0000-000000025071', 'nicht anwesend', '00000000-0000-0000-0000-000000025003',
   '00000000-0000-0000-0000-0000000250a1');

select is_empty(
  $$ select 1 from competency_fulfilment
     where learner_id = '00000000-0000-0000-0000-000000025001' $$,
  'Nach Korrektur auf "nicht anwesend" ist der Teilschritt wieder offen'
);

-- Erneute Korrektur auf "anwesend"
insert into attendance (id, organisation_id, learner_id, live_session_id, status, bestaetigt_von, korrigiert_id) values
  ('00000000-0000-0000-0000-0000000250a3', '00000000-0000-0000-0000-000000025011', '00000000-0000-0000-0000-000000025001',
   '00000000-0000-0000-0000-000000025071', 'anwesend', '00000000-0000-0000-0000-000000025003',
   '00000000-0000-0000-0000-0000000250a2');

-- ------------------------------------------------------------
-- Sicht der Learner (RLS über security_invoker)
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000025001', 'role', 'authenticated')::text, true);

select results_eq(
  $$ select erfuellt from competency_fulfilment where learner_id = '00000000-0000-0000-0000-000000025001' $$,
  $$ values (true) $$,
  'L1 sieht den eigenen erfüllten Stand (Anwesenheit nach erneuter Korrektur wieder anwesend)'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000025002', 'role', 'authenticated')::text, true);

select is_empty(
  $$ select 1 from competency_fulfilment where learner_id = '00000000-0000-0000-0000-000000025001' $$,
  'L2 sieht den Stand von L1 nicht'
);
select is_empty(
  $$ select 1 from competency_fulfilment where learner_id = '00000000-0000-0000-0000-000000025002' $$,
  'L2 ohne Anwesenheit und ohne Lektion: kein Fortschritt'
);

select * from finish();
rollback;
