-- 036_praxisflow_ko_ruecksprung.test.sql
-- SR-89, SR-64, SR-03 (Migration 0063): Trainer-Einschätzung ohne Selbst-
-- und Peer-Einschätzung; ein K.-o. führt denselben Praxisauftrag zurück zu
-- Informieren, ohne Abschluss und ohne Verifizierung. Dateien und Verlauf
-- bleiben, der Durchlauf ist abgelegt. Erst der erfolgreiche Wiederholungs-
-- durchlauf legt Abschluss und Verifizierung an.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(17);

-- ------------------------------------------------------------
-- Fixtures (als Superuser)
-- 36001 Lernende A, 36004 Trainer:in. Praxisauftrag 36081 (geführt) steht
-- in Bewerten, mit Plan, Haken und Freigaben, ohne Einschätzungen.
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000036001', 'pk-a@example.test'),
  ('00000000-0000-0000-0000-000000036004', 'pk-t@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000036011', 'Betrieb', 'employer', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000036001', 'pk-a@example.test', 'Lernende A', 'pk_a', 'DE'),
  ('00000000-0000-0000-0000-000000036004', 'pk-t@example.test', 'Trainer', 'pk_t', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000036001', '00000000-0000-0000-0000-000000036011'),
  ('00000000-0000-0000-0000-000000036004', '00000000-0000-0000-0000-000000036011');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000036001', '00000000-0000-0000-0000-000000036011', 'learner'),
  ('00000000-0000-0000-0000-000000036004', '00000000-0000-0000-0000-000000036011', 'trainer');

insert into programme (id, name, kuerzel, status) values
  ('00000000-0000-0000-0000-000000036021', 'Programm', 'PK-P1', 'published');

insert into field_job_type (id, titel, programme_id, reihenfolge, status, ablauf) values
  ('00000000-0000-0000-0000-000000036041', 'Auftrag geführt', '00000000-0000-0000-0000-000000036021', 1, 'published', 'gefuehrt');

insert into cohort (id, programme_id, name, start_datum) values
  ('00000000-0000-0000-0000-000000036051', '00000000-0000-0000-0000-000000036021', 'K1', '2026-11-02');

insert into enrolment (id, organisation_id, learner_id, cohort_id, status) values
  ('00000000-0000-0000-0000-000000036061', '00000000-0000-0000-0000-000000036011', '00000000-0000-0000-0000-000000036001', '00000000-0000-0000-0000-000000036051', 'aktiv');

insert into praxis_codewort (cohort_id, hash) values
  ('00000000-0000-0000-0000-000000036051', extensions.crypt('probewort', extensions.gen_salt('bf')));

insert into field_job (id, organisation_id, datum, field_job_type_id, learner_id, instructor_id, phase, praxisflow) values
  ('00000000-0000-0000-0000-000000036081', '00000000-0000-0000-0000-000000036011', '2026-11-16',
   '00000000-0000-0000-0000-000000036041', '00000000-0000-0000-0000-000000036001', '00000000-0000-0000-0000-000000036004', 'bewerten',
   jsonb_build_object(
     'schritte', '[{"id": "s1", "text": "Leitung abmanteln"}, {"id": "s2", "text": "Klemmen setzen"}]'::jsonb,
     'erledigt', '[{"id": "s1", "am": "2026-11-16T09:00:00Z"}, {"id": "s2", "am": "2026-11-16T09:30:00Z"}]'::jsonb,
     'plan_bestaetigt_am', '2026-11-16T08:30:00Z',
     'plan_freigegeben_am', '2026-11-16T08:30:00Z',
     'kontrolle', '[{"id": "a1", "am": "2026-11-16T10:00:00Z"}]'::jsonb,
     'zuschalten_freigegeben_am', '2026-11-16T10:10:00Z',
     'rueckblick_am', '2026-11-16T11:00:00Z'));

insert into schedule_entry (organisation_id, datum, art, reihenfolge, cohort_id, enrolment_id, live_session_id, field_job_id) values
  ('00000000-0000-0000-0000-000000036011', '2026-11-16', 'feld', 1, null, '00000000-0000-0000-0000-000000036061', null, '00000000-0000-0000-0000-000000036081');

insert into field_job_datei (organisation_id, field_job_id, learner_id, art, storage_pfad, dateiname, mime_type, groesse) values
  ('00000000-0000-0000-0000-000000036011', '00000000-0000-0000-0000-000000036081', '00000000-0000-0000-0000-000000036001',
   'auftrag', '00000000-0000-0000-0000-000000036001/00000000-0000-0000-0000-000000036081/auftrag.pdf', 'auftrag.pdf', 'application/pdf', 1000);

-- ------------------------------------------------------------
-- Erster Durchlauf: K.-o. (Funktion 0), ohne Selbst- und Peer-Einschätzung
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000036001', 'role', 'authenticated')::text, true);

select is(
  fn_praxis_trainer_einschaetzen('00000000-0000-0000-0000-000000036081',
    '{"funktion": 0, "ausfuehrung": 7, "schutz": 10, "protokoll": 7, "unterlagen": 9}', 'probewort'),
  true,
  'Trainer-Einschätzung ohne Selbst- und Peer-Einschätzung'
);
select is(
  fn_praxis_abschliessen('00000000-0000-0000-0000-000000036081', 'Funktion vorher prüfen'),
  'ko',
  'K.-o. in der Trainer-Einschätzung'
);
select is(
  fn_praxis_abschliessen('00000000-0000-0000-0000-000000036081', null),
  'ko',
  'Wiederholter Aufruf direkt danach ändert nichts (SR-08)'
);

reset role;
select is(
  (select phase from field_job where id = '00000000-0000-0000-0000-000000036081'),
  'informieren',
  'Derselbe Praxisauftrag steht wieder in Informieren'
);
select is(
  (select count(*) from field_capture where field_job_id = '00000000-0000-0000-0000-000000036081'),
  0::bigint,
  'Kein Abschluss und damit keine Verifizierung nach K.-o.'
);
select ok(
  (select not (praxisflow ?| array['erledigt', 'plan_freigegeben_am', 'kontrolle', 'zuschalten_freigegeben_am',
                                   'bewertung_freigegeben_am', 'einschaetzung', 'rueckblick_am'])
     from field_job where id = '00000000-0000-0000-0000-000000036081'),
  'Haken, Freigaben, Einschätzungen und Rückblick (0073) sind für den neuen Durchlauf leer'
);
select is(
  (select jsonb_array_length(praxisflow -> 'schritte') from field_job where id = '00000000-0000-0000-0000-000000036081'),
  2,
  'Der Plan bleibt als Ausgangspunkt'
);
select is(
  (select (praxisflow #>> '{durchlaeufe,0,einschaetzung,trainer,funktion}')::int
     from field_job where id = '00000000-0000-0000-0000-000000036081'),
  0,
  'Der K.-o.-Durchlauf ist mit Einschätzung abgelegt'
);
select is(
  (select praxisflow #>> '{durchlaeufe,0,naechstes_mal}' from field_job where id = '00000000-0000-0000-0000-000000036081'),
  'Funktion vorher prüfen',
  'Der Freitext des Durchlaufs ist abgelegt'
);
select ok(
  (select exists (select 1 from jsonb_array_elements(praxisflow -> 'verlauf') e where e ->> 'ereignis' = 'einschaetzung:trainer')
      and praxisflow -> 'verlauf' -> -1 ->> 'ereignis' = 'ko:informieren'
     from field_job where id = '00000000-0000-0000-0000-000000036081'),
  'Der Verlauf bleibt und endet mit dem Rücksprung'
);
select is(
  (select count(*) from field_job_datei where field_job_id = '00000000-0000-0000-0000-000000036081'),
  1::bigint,
  'Dateien bleiben'
);

-- ------------------------------------------------------------
-- Zweiter Durchlauf: ohne K.-o. (Phase für den Test direkt auf Bewerten)
-- ------------------------------------------------------------
update field_job set phase = 'bewerten', praxisflow = praxisflow || jsonb_build_object('rueckblick_am', now())
where id = '00000000-0000-0000-0000-000000036081';
set local role authenticated;

select throws_ok(
  $$select fn_praxis_abschliessen('00000000-0000-0000-0000-000000036081', null)$$,
  '23514', null,
  'Im neuen Durchlauf zählt die alte Trainer-Einschätzung nicht'
);
select is(
  fn_praxis_trainer_einschaetzen('00000000-0000-0000-0000-000000036081',
    '{"funktion": 10, "ausfuehrung": 9, "schutz": 10, "protokoll": 9, "unterlagen": 10}', 'probewort'),
  true,
  'Neue Trainer-Einschätzung im zweiten Durchlauf'
);
select throws_ok(
  $$select fn_praxis_abschliessen('00000000-0000-0000-0000-000000036081', '  ')$$,
  '23514', null,
  'Ohne Reflexion kein Abschluss (SR-90, 0066)'
);
select is(
  fn_praxis_abschliessen('00000000-0000-0000-0000-000000036081', 'Diesmal vorher gemessen'),
  'angerechnet',
  'Erfolgreicher Wiederholungsdurchlauf wird angerechnet'
);

reset role;
select is(
  (select c.status from field_capture c where c.field_job_id = '00000000-0000-0000-0000-000000036081' and c.phase = 'abschluss'),
  'verified',
  'Erst jetzt entstehen Abschluss und automatische Verifizierung'
);
select is(
  (select jsonb_array_length(praxisflow -> 'durchlaeufe') from field_job where id = '00000000-0000-0000-0000-000000036081'),
  1,
  'Der K.-o.-Durchlauf bleibt sichtbar'
);

select * from finish();
rollback;
