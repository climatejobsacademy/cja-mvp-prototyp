-- 031_praxisflow_ablauf.test.sql
-- SR-64 (Phasen in Reihenfolge, serverseitig), SR-08 (wiederholter Aufruf
-- ändert nichts): Migration 0058. Ablauf je Aufgabentyp, Phase und
-- Fortschritt je Praxistag, Schreiben nur über fn_praxis_*.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(31);

-- ------------------------------------------------------------
-- Fixtures (als Superuser)
-- 31001 Lernende A, 31002 Lernende B.
-- Typ G (gefuehrt), Typ E (einfach, Standard).
-- 31081 Praxistag A/G, 31082 Praxistag A/E, 31083 Praxistag B/G.
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000031001', 'pf-a@example.test'),
  ('00000000-0000-0000-0000-000000031002', 'pf-b@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000031011', 'Betrieb', 'employer', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000031001', 'pf-a@example.test', 'Lernende A', 'pf_a', 'DE'),
  ('00000000-0000-0000-0000-000000031002', 'pf-b@example.test', 'Lernende B', 'pf_b', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000031001', '00000000-0000-0000-0000-000000031011'),
  ('00000000-0000-0000-0000-000000031002', '00000000-0000-0000-0000-000000031011');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000031001', '00000000-0000-0000-0000-000000031011', 'learner'),
  ('00000000-0000-0000-0000-000000031002', '00000000-0000-0000-0000-000000031011', 'learner');

insert into programme (id, name, kuerzel, status) values
  ('00000000-0000-0000-0000-000000031021', 'Programm', 'PF-P1', 'published');

insert into field_job_type (id, titel, programme_id, reihenfolge, status, ablauf) values
  ('00000000-0000-0000-0000-000000031041', 'Auftrag geführt', '00000000-0000-0000-0000-000000031021', 1, 'published', 'gefuehrt');
insert into field_job_type (id, titel, programme_id, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000031042', 'Auftrag einfach', '00000000-0000-0000-0000-000000031021', 2, 'published');

insert into field_job (id, organisation_id, datum, field_job_type_id, learner_id) values
  ('00000000-0000-0000-0000-000000031081', '00000000-0000-0000-0000-000000031011', '2026-11-16', '00000000-0000-0000-0000-000000031041', '00000000-0000-0000-0000-000000031001'),
  ('00000000-0000-0000-0000-000000031082', '00000000-0000-0000-0000-000000031011', '2026-11-16', '00000000-0000-0000-0000-000000031042', '00000000-0000-0000-0000-000000031001'),
  ('00000000-0000-0000-0000-000000031083', '00000000-0000-0000-0000-000000031011', '2026-11-16', '00000000-0000-0000-0000-000000031041', '00000000-0000-0000-0000-000000031002');

-- Seit 0059 (SR-88) endet Informieren erst mit einem hochgeladenen Auftrag.
insert into field_job_datei (organisation_id, field_job_id, learner_id, art, storage_pfad, dateiname, mime_type, groesse) values
  ('00000000-0000-0000-0000-000000031011', '00000000-0000-0000-0000-000000031081', '00000000-0000-0000-0000-000000031001',
   'auftrag', '00000000-0000-0000-0000-000000031001/00000000-0000-0000-0000-000000031081/auftrag.pdf', 'auftrag.pdf', 'application/pdf', 1000);

-- ------------------------------------------------------------
-- Schema und Standardwerte
-- ------------------------------------------------------------
select is(
  (select ablauf from field_job_type where id = '00000000-0000-0000-0000-000000031042'),
  'einfach',
  'Ablauf ist ohne Angabe einfach (bisheriger Praxistag)'
);
select is(
  (select phase from field_job where id = '00000000-0000-0000-0000-000000031081'),
  'informieren',
  'Ein neuer Praxistag beginnt in Informieren'
);
select throws_ok(
  $$update field_job_type set ablauf = 'anders' where id = '00000000-0000-0000-0000-000000031042'$$,
  '23514', null,
  'Unbekannter Ablauf wird abgelehnt'
);
select is(has_function_privilege('anon', 'fn_praxis_weiter(uuid, text)', 'execute'), false,
  'anon darf fn_praxis_weiter nicht ausführen');
select is(has_function_privilege('authenticated', 'fn_praxis_eigener_job(uuid)', 'execute'), false,
  'Hilfsfunktion fn_praxis_eigener_job ist nicht über die API aufrufbar');

-- ------------------------------------------------------------
-- Als Lernende A
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000031001', 'role', 'authenticated')::text, true);

select throws_ok(
  $$update field_job set phase = 'bewerten' where id = '00000000-0000-0000-0000-000000031081'$$,
  '42501', null,
  'Lernende setzen die Phase nicht direkt'
);
select throws_ok(
  $$update field_job set praxisflow = '{"erledigt": []}' where id = '00000000-0000-0000-0000-000000031081'$$,
  '42501', null,
  'Lernende schreiben den Fortschritt nicht direkt'
);
select throws_ok(
  $$select fn_praxis_plan_speichern('00000000-0000-0000-0000-000000031081', array['Zange'], array[]::text[], array['Schritt'])$$,
  '23514', null,
  'Planen geht erst in der Phase Planen'
);
select is(
  fn_praxis_weiter('00000000-0000-0000-0000-000000031081', 'informieren'),
  'planen',
  'Informieren -> Planen'
);
select is(
  fn_praxis_weiter('00000000-0000-0000-0000-000000031081', 'informieren'),
  'planen',
  'Wiederholter Aufruf aus Informieren ändert nichts (SR-08)'
);
select throws_ok(
  $$select fn_praxis_weiter('00000000-0000-0000-0000-000000031081', 'planen')$$,
  '23514', null,
  'Ohne Arbeitsschritt geht es nicht zu Entscheiden'
);
select throws_ok(
  $$select fn_praxis_plan_speichern('00000000-0000-0000-0000-000000031081', array[repeat('x', 301)], array[]::text[], array['Schritt'])$$,
  '23514', null,
  'Einträge über 300 Zeichen werden abgelehnt'
);
select is(
  jsonb_array_length(fn_praxis_plan_speichern(
    '00000000-0000-0000-0000-000000031081',
    array['Seitenschneider', ' '],
    array['NYM-J 3x1,5'],
    array['Leitung abmanteln', 'Klemmen setzen']
  ) -> 'schritte'),
  2,
  'Plan wird gespeichert, leere Einträge entfallen'
);
select is(
  (select jsonb_array_length(praxisflow -> 'werkzeuge') from field_job where id = '00000000-0000-0000-0000-000000031081'),
  1,
  'Werkzeugliste ohne leeren Eintrag'
);
select is(
  fn_praxis_weiter('00000000-0000-0000-0000-000000031081', 'planen'),
  'entscheiden',
  'Planen -> Entscheiden'
);
select is(
  fn_praxis_zurueck_zum_plan('00000000-0000-0000-0000-000000031081'),
  'planen',
  'Entscheiden -> zurück zum Plan'
);
select is(
  fn_praxis_weiter('00000000-0000-0000-0000-000000031081', 'planen'),
  'entscheiden',
  'erneut Planen -> Entscheiden'
);
select throws_ok(
  $$select fn_praxis_weiter('00000000-0000-0000-0000-000000031081', 'entscheiden')$$,
  '23514', null,
  'Ohne Plan-Freigabe der Trainer:in geht es nicht zu Ausführen (0062)'
);
-- Die Plan-Freigabe selbst (Codewort) prüft 035; hier nur der Stand danach.
reset role;
update field_job set praxisflow = praxisflow || jsonb_build_object('plan_freigegeben_am', now())
where id = '00000000-0000-0000-0000-000000031081';
set local role authenticated;
select is(
  fn_praxis_weiter('00000000-0000-0000-0000-000000031081', 'entscheiden'),
  'ausfuehren',
  'Entscheiden -> Ausführen'
);
select ok(
  (select praxisflow ? 'plan_bestaetigt_am' from field_job where id = '00000000-0000-0000-0000-000000031081'),
  'Bestätigung des Plans ist gespeichert'
);
select throws_ok(
  $$select fn_praxis_schritt_abhaken(
      '00000000-0000-0000-0000-000000031081',
      (select praxisflow -> 'schritte' -> 1 ->> 'id' from field_job where id = '00000000-0000-0000-0000-000000031081'))$$,
  '23514', null,
  'Der zweite Arbeitsschritt lässt sich nicht vor dem ersten abhaken'
);
select throws_ok(
  $$select fn_praxis_weiter('00000000-0000-0000-0000-000000031081', 'ausfuehren')$$,
  '23514', null,
  'Ohne alle Haken geht es nicht zu Kontrollieren'
);

select is(
  jsonb_array_length(fn_praxis_schritt_abhaken(
    '00000000-0000-0000-0000-000000031081',
    (select praxisflow -> 'schritte' -> 0 ->> 'id' from field_job where id = '00000000-0000-0000-0000-000000031081')) -> 'erledigt'),
  1,
  'Erster Arbeitsschritt abgehakt'
);
select is(
  jsonb_array_length(fn_praxis_schritt_abhaken(
    '00000000-0000-0000-0000-000000031081',
    (select praxisflow -> 'schritte' -> 0 ->> 'id' from field_job where id = '00000000-0000-0000-0000-000000031081')) -> 'erledigt'),
  1,
  'Wiederholtes Abhaken desselben Schritts ändert nichts (SR-08)'
);
select is(
  jsonb_array_length(fn_praxis_schritt_abhaken(
    '00000000-0000-0000-0000-000000031081',
    (select praxisflow -> 'schritte' -> 1 ->> 'id' from field_job where id = '00000000-0000-0000-0000-000000031081')) -> 'erledigt'),
  2,
  'Zweiter Arbeitsschritt abgehakt'
);

select throws_ok(
  $$select fn_praxis_weiter('00000000-0000-0000-0000-000000031081', 'ausfuehren')$$,
  '23514', null,
  'Ausführen endet erst nach dem Messen (Variante B, 0065)'
);
-- Messen selbst prüfen 033 und 038; hier nur der Stand danach.
reset role;
update field_job set praxisflow = praxisflow || jsonb_build_object('kontrolle',
  (select jsonb_agg(jsonb_build_object('id', p.id, 'am', now())) from fn_praxis_pruefliste() p))
where id = '00000000-0000-0000-0000-000000031081';
insert into field_job_datei (organisation_id, field_job_id, learner_id, art, storage_pfad, dateiname, mime_type, groesse) values
  ('00000000-0000-0000-0000-000000031011', '00000000-0000-0000-0000-000000031081', '00000000-0000-0000-0000-000000031001',
   'protokoll', '00000000-0000-0000-0000-000000031001/00000000-0000-0000-0000-000000031081/protokoll.pdf', 'protokoll.pdf', 'application/pdf', 1000);
set local role authenticated;
select is(
  fn_praxis_weiter('00000000-0000-0000-0000-000000031081', 'ausfuehren'),
  'kontrollieren',
  'Ausführen -> Kontrollieren mit Arbeitsschritten, Messungen und Prüfprotokoll'
);
select is(
  (select status from field_job where id = '00000000-0000-0000-0000-000000031081'),
  'durchgeführt',
  'Ende von Ausführen setzt den Praxistag auf durchgeführt'
);
select throws_ok(
  $$select fn_praxis_weiter('00000000-0000-0000-0000-000000031081', 'kontrollieren')$$,
  '23514', null,
  'Kontrollieren endet erst mit einer Deutung zu jedem Prüfpunkt (seit 0065)'
);
select throws_ok(
  $$select fn_praxis_weiter('00000000-0000-0000-0000-000000031083', 'informieren')$$,
  'P0002', null,
  'Fremde Praxistage gelten als nicht gefunden'
);
select throws_ok(
  $$select fn_praxis_weiter('00000000-0000-0000-0000-000000031082', 'informieren')$$,
  'P0002', null,
  'Praxistage im einfachen Ablauf nutzen den Praxisflow nicht'
);

select * from finish();
rollback;
