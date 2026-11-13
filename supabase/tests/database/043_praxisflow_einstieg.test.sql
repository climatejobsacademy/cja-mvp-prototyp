-- 043_praxisflow_einstieg.test.sql
-- SR-92 (Migration 0072): Beim Öffnen eines Praxisauftrags meldet die App
-- „auftrag_geoeffnet“ mit dem Einstieg als Schritt. Nur Einstiege aus der
-- festen Liste, nur für eigene Praxisaufträge im geführten Ablauf; Lernende
-- lesen die Ereignisse weiter nicht.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(7);

-- Fixtures (als Superuser): 43001 Lernende A, 43002 Lernende B.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000043001', 'ein-a@example.test'),
  ('00000000-0000-0000-0000-000000043002', 'ein-b@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000043011', 'Betrieb', 'employer', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000043001', 'ein-a@example.test', 'Lernende A', 'ein_a', 'DE'),
  ('00000000-0000-0000-0000-000000043002', 'ein-b@example.test', 'Lernende B', 'ein_b', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000043001', '00000000-0000-0000-0000-000000043011'),
  ('00000000-0000-0000-0000-000000043002', '00000000-0000-0000-0000-000000043011');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000043001', '00000000-0000-0000-0000-000000043011', 'learner'),
  ('00000000-0000-0000-0000-000000043002', '00000000-0000-0000-0000-000000043011', 'learner');

insert into programme (id, name, kuerzel, status) values
  ('00000000-0000-0000-0000-000000043021', 'Programm', 'EIN-P1', 'published');

insert into field_job_type (id, titel, programme_id, reihenfolge, status, ablauf) values
  ('00000000-0000-0000-0000-000000043041', 'Auftrag geführt', '00000000-0000-0000-0000-000000043021', 1, 'published', 'gefuehrt');

insert into field_job (id, organisation_id, datum, field_job_type_id, learner_id) values
  ('00000000-0000-0000-0000-000000043081', '00000000-0000-0000-0000-000000043011', '2026-11-16', '00000000-0000-0000-0000-000000043041', '00000000-0000-0000-0000-000000043001');

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000043001', 'role', 'authenticated')::text, true);

select is(
  fn_praxis_ereignis_melden('00000000-0000-0000-0000-000000043081', '[{"art": "auftrag_geoeffnet", "schritt": "stundenplan"}]'),
  1,
  'SR-92: Öffnen mit Einstieg Stundenplan wird gespeichert'
);
select is(
  fn_praxis_ereignis_melden('00000000-0000-0000-0000-000000043081',
    '[{"art": "auftrag_geoeffnet", "schritt": "home"}, {"art": "auftrag_geoeffnet", "schritt": "direkt"}]'),
  2,
  'SR-92: Einstiege Home und direkt werden gespeichert'
);
select throws_ok(
  $$select fn_praxis_ereignis_melden('00000000-0000-0000-0000-000000043081', '[{"art": "auftrag_geoeffnet", "schritt": "newsletter"}]')$$,
  '22023', null,
  'SR-92: Einstieg außerhalb der festen Liste wird abgelehnt'
);
select is_empty(
  $$select 1 from praxis_ereignis$$,
  'SR-92: Lernende lesen auch die eigenen Ereignisse nicht'
);

-- Lernende B: fremder Praxisauftrag
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000043002', 'role', 'authenticated')::text, true);
select throws_ok(
  $$select fn_praxis_ereignis_melden('00000000-0000-0000-0000-000000043081', '[{"art": "auftrag_geoeffnet", "schritt": "home"}]')$$,
  'P0002', null,
  'SR-92: kein Ereignis für fremde Praxisaufträge'
);

reset role;
select is(
  (select count(*)::int from praxis_ereignis where field_job_id = '00000000-0000-0000-0000-000000043081' and art = 'auftrag_geoeffnet'),
  3,
  'SR-92: drei Öffnungen gespeichert'
);
select is(
  (select array_agg(schritt order by schritt) from praxis_ereignis where art = 'auftrag_geoeffnet'),
  array['direkt', 'home', 'stundenplan'],
  'SR-92: Einstieg steht im Schritt'
);

select * from finish();
rollback;
