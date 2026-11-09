-- 035_praxisflow_planfreigabe.test.sql
-- SR-65, SR-64 (Migration 0062): Plan-Freigabe durch die Trainer:in mit
-- Codewort am Ende von Entscheiden. Ohne Freigabe kein Ausführen; wer den
-- Plan noch einmal ändert, braucht eine neue Freigabe.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(17);

-- ------------------------------------------------------------
-- Fixtures (als Superuser)
-- 35001 Lernende A, 35002 Lernende B. Kohorte 35051 mit Codewort,
-- Praxisauftrag 35081 (geführt) steht in Entscheiden, mit zwei Schritten.
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000035001', 'pp-a@example.test'),
  ('00000000-0000-0000-0000-000000035002', 'pp-b@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000035011', 'Betrieb', 'employer', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000035001', 'pp-a@example.test', 'Lernende A', 'pp_a', 'DE'),
  ('00000000-0000-0000-0000-000000035002', 'pp-b@example.test', 'Lernende B', 'pp_b', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000035001', '00000000-0000-0000-0000-000000035011'),
  ('00000000-0000-0000-0000-000000035002', '00000000-0000-0000-0000-000000035011');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000035001', '00000000-0000-0000-0000-000000035011', 'learner'),
  ('00000000-0000-0000-0000-000000035002', '00000000-0000-0000-0000-000000035011', 'learner');

insert into programme (id, name, kuerzel, status) values
  ('00000000-0000-0000-0000-000000035021', 'Programm', 'PP-P1', 'published');

insert into field_job_type (id, titel, programme_id, reihenfolge, status, ablauf) values
  ('00000000-0000-0000-0000-000000035041', 'Auftrag geführt', '00000000-0000-0000-0000-000000035021', 1, 'published', 'gefuehrt');

insert into cohort (id, programme_id, name, start_datum) values
  ('00000000-0000-0000-0000-000000035051', '00000000-0000-0000-0000-000000035021', 'K1', '2026-11-02');

insert into enrolment (id, organisation_id, learner_id, cohort_id, status) values
  ('00000000-0000-0000-0000-000000035061', '00000000-0000-0000-0000-000000035011', '00000000-0000-0000-0000-000000035001', '00000000-0000-0000-0000-000000035051', 'aktiv');

insert into praxis_codewort (cohort_id, hash) values
  ('00000000-0000-0000-0000-000000035051', extensions.crypt('probewort', extensions.gen_salt('bf')));

insert into field_job (id, organisation_id, datum, field_job_type_id, learner_id, phase, praxisflow) values
  ('00000000-0000-0000-0000-000000035081', '00000000-0000-0000-0000-000000035011', '2026-11-16',
   '00000000-0000-0000-0000-000000035041', '00000000-0000-0000-0000-000000035001', 'entscheiden',
   '{"schritte": [{"id": "s1", "text": "Leitung abmanteln"}, {"id": "s2", "text": "Klemmen setzen"}]}'::jsonb);

insert into schedule_entry (organisation_id, datum, art, reihenfolge, cohort_id, enrolment_id, live_session_id, field_job_id) values
  ('00000000-0000-0000-0000-000000035011', '2026-11-16', 'feld', 1, null, '00000000-0000-0000-0000-000000035061', null, '00000000-0000-0000-0000-000000035081');

set local role authenticated;

-- ------------------------------------------------------------
-- Lernende B: kein Zugriff auf den Praxisauftrag von A
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000035002', 'role', 'authenticated')::text, true);
select throws_ok(
  $$select fn_praxis_gate('00000000-0000-0000-0000-000000035081', 'plan', 'probewort')$$,
  'P0002', null,
  'Fremder Praxisauftrag: keine Plan-Freigabe'
);

-- ------------------------------------------------------------
-- Lernende A
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000035001', 'role', 'authenticated')::text, true);

select throws_ok(
  $$select fn_praxis_gate('00000000-0000-0000-0000-000000035081', 'unbekannt', 'probewort')$$,
  '22023', null,
  'Unbekanntes Gate wird abgelehnt'
);
select throws_ok(
  $$select fn_praxis_weiter('00000000-0000-0000-0000-000000035081', 'entscheiden')$$,
  '23514', null,
  'Ohne Plan-Freigabe kein Ausführen'
);
select is(
  fn_praxis_gate('00000000-0000-0000-0000-000000035081', 'plan', 'falsch'),
  false,
  'Falsches Codewort gibt den Plan nicht frei'
);
select ok(
  not (select praxisflow ? 'plan_freigegeben_am' from field_job where id = '00000000-0000-0000-0000-000000035081'),
  'Nach falschem Codewort ist nichts freigegeben'
);
select is(
  fn_praxis_gate('00000000-0000-0000-0000-000000035081', 'plan', ' Probewort '),
  true,
  'Richtiges Codewort gibt den Plan frei'
);
select ok(
  (select praxisflow ? 'plan_freigegeben_am' from field_job where id = '00000000-0000-0000-0000-000000035081'),
  'Plan-Freigabe ist gespeichert'
);
select is(
  fn_praxis_gate('00000000-0000-0000-0000-000000035081', 'plan', 'egal'),
  true,
  'Wiederholter Aufruf bei offenem Gate ändert nichts'
);
select is(
  fn_praxis_zurueck_zum_plan('00000000-0000-0000-0000-000000035081'),
  'planen',
  'Zurück zum Plan'
);
select ok(
  not (select praxisflow ? 'plan_freigegeben_am' from field_job where id = '00000000-0000-0000-0000-000000035081'),
  'Wer den Plan ändert, verliert die Plan-Freigabe'
);
select throws_ok(
  $$select fn_praxis_gate('00000000-0000-0000-0000-000000035081', 'plan', 'probewort')$$,
  '23514', null,
  'Plan-Freigabe nur in Entscheiden'
);
select is(
  fn_praxis_weiter('00000000-0000-0000-0000-000000035081', 'planen'),
  'entscheiden',
  'Planen -> Entscheiden'
);
select throws_ok(
  $$select fn_praxis_weiter('00000000-0000-0000-0000-000000035081', 'entscheiden')$$,
  '23514', null,
  'Der geänderte Plan braucht eine neue Freigabe'
);
select is(
  fn_praxis_gate('00000000-0000-0000-0000-000000035081', 'plan', 'probewort'),
  true,
  'Neue Plan-Freigabe'
);
select is(
  fn_praxis_weiter('00000000-0000-0000-0000-000000035081', 'entscheiden'),
  'ausfuehren',
  'Mit Plan-Freigabe: Entscheiden -> Ausführen'
);

-- ------------------------------------------------------------
-- Protokoll (als Superuser)
-- ------------------------------------------------------------
reset role;
select is(
  (select array_agg(art order by created_at) from praxis_codewort_versuch
    where field_job_id = '00000000-0000-0000-0000-000000035081' and gate = 'plan'),
  array['fehlversuch', 'erfolg', 'erfolg']::text[],
  'Versuche am Gate Plan sind protokolliert'
);
select ok(
  (select exists (
    select 1 from jsonb_array_elements(praxisflow -> 'verlauf') e where e ->> 'ereignis' = 'gate:plan')
   from field_job where id = '00000000-0000-0000-0000-000000035081'),
  'Die Plan-Freigabe steht im Verlauf'
);

select * from finish();
rollback;
