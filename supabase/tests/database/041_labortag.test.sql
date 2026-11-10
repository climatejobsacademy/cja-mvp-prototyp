-- 041_labortag.test.sql
-- SR-94 (Migration 0070): Eine Praxisaufgabe kann ein Labortag sein
-- (ablauf labor). Ein Labortag hat keinen Praxisflow: die Funktionen
-- fn_praxis_* lehnen ihn ab. Die Unterlagen der Aufgabe (SR-68) lesen
-- Lernende mit eigenem Labortag wie beim Praxistag.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(7);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000041001', 'lt-a@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000041011', 'Betrieb', 'employer', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000041001', 'lt-a@example.test', 'Lernende A', 'lt_a', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000041001', '00000000-0000-0000-0000-000000041011');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000041001', '00000000-0000-0000-0000-000000041011', 'learner');

insert into programme (id, name, kuerzel, status) values
  ('00000000-0000-0000-0000-000000041021', 'Programm', 'LT-P1', 'published');

select throws_ok(
  $$insert into field_job_type (titel, programme_id, reihenfolge, status, ablauf)
    values ('Unbekannt', '00000000-0000-0000-0000-000000041021', 9, 'published', 'frei')$$,
  '23514', null,
  'Unbekannter Ablauf wird abgelehnt'
);
select lives_ok(
  $$insert into field_job_type (id, titel, programme_id, reihenfolge, status, ablauf)
    values ('00000000-0000-0000-0000-000000041041', 'Labortag', '00000000-0000-0000-0000-000000041021', 1, 'published', 'labor')$$,
  'Praxisaufgabe als Labortag anlegen'
);

insert into field_job (id, organisation_id, datum, field_job_type_id, learner_id) values
  ('00000000-0000-0000-0000-000000041081', '00000000-0000-0000-0000-000000041011', '2026-11-18',
   '00000000-0000-0000-0000-000000041041', '00000000-0000-0000-0000-000000041001');

insert into field_job_type_resource (field_job_type_id, reihenfolge, typ, titel, external_url) values
  ('00000000-0000-0000-0000-000000041041', 1, 'link', 'Laborunterlage', 'https://example.test/labor');

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000041001', 'role', 'authenticated')::text, true);

select is(
  (select count(*)::int from field_job where id = '00000000-0000-0000-0000-000000041081'),
  1,
  'Lernende sehen den eigenen Labortag'
);
select is(
  (select count(*)::int from field_job_type_resource where field_job_type_id = '00000000-0000-0000-0000-000000041041'),
  1,
  'Lernende lesen die Unterlagen des eigenen Labortags'
);
select throws_ok(
  $$select fn_praxis_weiter('00000000-0000-0000-0000-000000041081', 'informieren')$$,
  'P0002', null,
  'Ein Labortag hat keinen Praxisflow'
);
select throws_ok(
  $$select fn_praxis_abschliessen('00000000-0000-0000-0000-000000041081', 'Reflexion')$$,
  'P0002', null,
  'Ein Labortag lässt sich nicht abschließen, also kein Nachweis'
);
select throws_ok(
  $$select fn_praxis_ereignis_melden('00000000-0000-0000-0000-000000041081', '[{"art": "hilfe_geoeffnet", "schritt": "hilfe"}]'::jsonb)$$,
  'P0002', null,
  'Für einen Labortag werden keine Praxisflow-Ereignisse gemeldet'
);

select * from finish();
rollback;
