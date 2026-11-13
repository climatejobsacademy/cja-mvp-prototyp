-- 044_praxisflow_rueckblick.test.sql
-- SR-64 (Migration 0073, geändert 13.11.2026): Bewerten ist der Rückblick
-- auf die vollständige Handlung. Nur in Bewerten, nur mit allen fünf Phasen,
-- nur für eigene Praxisaufträge; ohne Rückblick kein Abschluss.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(8);

-- Fixtures (als Superuser): 44001 Lernende A, 44002 Lernende B.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000044001', 'rb-a@example.test'),
  ('00000000-0000-0000-0000-000000044002', 'rb-b@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000044011', 'Betrieb', 'employer', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000044001', 'rb-a@example.test', 'Lernende A', 'rb_a', 'DE'),
  ('00000000-0000-0000-0000-000000044002', 'rb-b@example.test', 'Lernende B', 'rb_b', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000044001', '00000000-0000-0000-0000-000000044011'),
  ('00000000-0000-0000-0000-000000044002', '00000000-0000-0000-0000-000000044011');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000044001', '00000000-0000-0000-0000-000000044011', 'learner'),
  ('00000000-0000-0000-0000-000000044002', '00000000-0000-0000-0000-000000044011', 'learner');

insert into programme (id, name, kuerzel, status) values
  ('00000000-0000-0000-0000-000000044021', 'Programm', 'RB-P1', 'published');

insert into field_job_type (id, titel, programme_id, reihenfolge, status, ablauf) values
  ('00000000-0000-0000-0000-000000044041', 'Auftrag geführt', '00000000-0000-0000-0000-000000044021', 1, 'published', 'gefuehrt');

-- 44081 in Bewerten mit Trainer-Einschätzung, 44082 noch in Kontrollieren.
insert into field_job (id, organisation_id, datum, field_job_type_id, learner_id, phase, praxisflow) values
  ('00000000-0000-0000-0000-000000044081', '00000000-0000-0000-0000-000000044011', '2026-11-16',
   '00000000-0000-0000-0000-000000044041', '00000000-0000-0000-0000-000000044001', 'bewerten',
   '{"einschaetzung": {"trainer": {"funktion": 10, "ausfuehrung": 9, "schutz": 10, "protokoll": 7, "unterlagen": 10}},
     "bewertung_freigegeben_am": "2026-11-16T11:00:00Z"}'::jsonb),
  ('00000000-0000-0000-0000-000000044082', '00000000-0000-0000-0000-000000044011', '2026-11-17',
   '00000000-0000-0000-0000-000000044041', '00000000-0000-0000-0000-000000044001', 'kontrollieren', '{}'::jsonb);

select is(has_function_privilege('anon', 'fn_praxis_rueckblick_speichern(uuid, text[])', 'execute'), false,
  'SR-64: anon darf den Rückblick nicht speichern');

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000044001', 'role', 'authenticated')::text, true);

select throws_ok(
  $$select fn_praxis_abschliessen('00000000-0000-0000-0000-000000044081', 'Vorher messen')$$,
  '23514', null,
  'SR-64: ohne Rückblick kein Abschluss'
);
select throws_ok(
  $$select fn_praxis_rueckblick_speichern('00000000-0000-0000-0000-000000044082',
    array['informieren', 'planen', 'entscheiden', 'ausfuehren', 'kontrollieren'])$$,
  '23514', null,
  'SR-64: Rückblick nur in der Phase Bewerten'
);
select throws_ok(
  $$select fn_praxis_rueckblick_speichern('00000000-0000-0000-0000-000000044081',
    array['informieren', 'planen', 'entscheiden', 'ausfuehren'])$$,
  '23514', null,
  'SR-64: alle fünf Phasen müssen bestätigt sein'
);
select ok(
  (fn_praxis_rueckblick_speichern('00000000-0000-0000-0000-000000044081',
    array['informieren', 'planen', 'entscheiden', 'ausfuehren', 'kontrollieren'])) ? 'rueckblick_am',
  'SR-64: mit allen fünf Phasen ist der Rückblick gespeichert'
);

-- Lernende B: fremder Praxisauftrag
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000044002', 'role', 'authenticated')::text, true);
select throws_ok(
  $$select fn_praxis_rueckblick_speichern('00000000-0000-0000-0000-000000044081',
    array['informieren', 'planen', 'entscheiden', 'ausfuehren', 'kontrollieren'])$$,
  'P0002', null,
  'SR-64: kein Rückblick für fremde Praxisaufträge'
);

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000044001', 'role', 'authenticated')::text, true);
select is(
  fn_praxis_abschliessen('00000000-0000-0000-0000-000000044081', 'Vorher messen'),
  'ohne_trainer',
  'SR-64: mit Rückblick lässt sich abschließen'
);

reset role;
select is(
  (select count(*)::int from field_job fj, jsonb_array_elements(fj.praxisflow -> 'verlauf') e
     where fj.id = '00000000-0000-0000-0000-000000044081' and e ->> 'ereignis' = 'rueckblick'),
  1,
  'SR-64: der Rückblick steht einmal im Verlauf'
);

select * from finish();
rollback;
