-- 040_praxisaufgabe_hilfen.test.sql
-- SR-68 (Migration 0069): Hilfsunterlagen je Praxisaufgabe. Lernende mit einem
-- Praxisauftrag der Aufgabe lesen Zeilen und Dateien, andere Lernende nichts;
-- bei unveröffentlichter Aufgabe niemand außer AfCJ admin. Lernende schreiben
-- nichts, AfCJ admin pflegt.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(11);

-- ------------------------------------------------------------
-- Fixtures (als Superuser)
-- 40001 Lernende A (Auftrag der Aufgabe 40041), 40002 Lernende B (kein
-- Auftrag), 40003 AfCJ admin. Aufgabe 40042 ist unveröffentlicht, A hat
-- auch dort einen Auftrag.
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000040001', 'ph-a@example.test'),
  ('00000000-0000-0000-0000-000000040002', 'ph-b@example.test'),
  ('00000000-0000-0000-0000-000000040003', 'ph-admin@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000040011', 'Betrieb', 'employer', 'aktiv'),
  ('00000000-0000-0000-0000-000000040012', 'AfCJ', 'afcj', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000040001', 'ph-a@example.test', 'Lernende A', 'ph_a', 'DE'),
  ('00000000-0000-0000-0000-000000040002', 'ph-b@example.test', 'Lernende B', 'ph_b', 'DE'),
  ('00000000-0000-0000-0000-000000040003', 'ph-admin@example.test', 'Admin', 'ph_admin', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000040001', '00000000-0000-0000-0000-000000040011'),
  ('00000000-0000-0000-0000-000000040002', '00000000-0000-0000-0000-000000040011'),
  ('00000000-0000-0000-0000-000000040003', '00000000-0000-0000-0000-000000040012');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000040001', '00000000-0000-0000-0000-000000040011', 'learner'),
  ('00000000-0000-0000-0000-000000040002', '00000000-0000-0000-0000-000000040011', 'learner'),
  ('00000000-0000-0000-0000-000000040003', '00000000-0000-0000-0000-000000040012', 'afcj_admin');

insert into programme (id, name, kuerzel, status) values
  ('00000000-0000-0000-0000-000000040021', 'Programm', 'PH-P1', 'published');

insert into field_job_type (id, titel, programme_id, reihenfolge, status, ablauf) values
  ('00000000-0000-0000-0000-000000040041', 'Aufgabe', '00000000-0000-0000-0000-000000040021', 1, 'published', 'gefuehrt'),
  ('00000000-0000-0000-0000-000000040042', 'Entwurf', '00000000-0000-0000-0000-000000040021', 2, 'unpublished', 'gefuehrt');

insert into field_job (organisation_id, datum, field_job_type_id, learner_id) values
  ('00000000-0000-0000-0000-000000040011', '2026-11-16', '00000000-0000-0000-0000-000000040041', '00000000-0000-0000-0000-000000040001'),
  ('00000000-0000-0000-0000-000000040011', '2026-11-17', '00000000-0000-0000-0000-000000040042', '00000000-0000-0000-0000-000000040001');

insert into file_asset (id, dateiname, dateityp, storage_pfad) values
  ('00000000-0000-0000-0000-000000040051', 'hilfe-a.pdf', 'application/pdf', 'test/hilfe-a.pdf'),
  ('00000000-0000-0000-0000-000000040052', 'entwurf.pdf', 'application/pdf', 'test/hilfe-entwurf.pdf');

insert into field_job_type_resource (field_job_type_id, reihenfolge, typ, titel, file_asset_id, external_url) values
  ('00000000-0000-0000-0000-000000040041', 1, 'datei', 'Datenblatt', '00000000-0000-0000-0000-000000040051', null),
  ('00000000-0000-0000-0000-000000040041', 2, 'link', 'Herstellervideo', null, 'https://example.test/video'),
  ('00000000-0000-0000-0000-000000040042', 1, 'datei', 'Entwurf', '00000000-0000-0000-0000-000000040052', null);

insert into storage.objects (bucket_id, name) values
  ('lesson-resources', 'test/hilfe-a.pdf'),
  ('lesson-resources', 'test/hilfe-entwurf.pdf');

select throws_ok(
  $$insert into field_job_type_resource (field_job_type_id, reihenfolge, typ, titel, external_url)
    values ('00000000-0000-0000-0000-000000040041', 3, 'datei', 'Ohne Datei', null)$$,
  '23514', null,
  'Datei-Verweis ohne Datei wird abgelehnt'
);

-- ------------------------------------------------------------
-- Lernende A: hat einen Auftrag der Aufgabe
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000040001', 'role', 'authenticated')::text, true);

select is(
  (select count(*)::int from field_job_type_resource where field_job_type_id = '00000000-0000-0000-0000-000000040041'),
  2,
  'Lernende mit Auftrag lesen beide Unterlagen der Aufgabe'
);
select is(
  (select count(*)::int from field_job_type_resource where field_job_type_id = '00000000-0000-0000-0000-000000040042'),
  0,
  'Unterlagen einer unveröffentlichten Aufgabe bleiben unsichtbar'
);
select is(
  (select count(*)::int from storage.objects where bucket_id = 'lesson-resources' and name = 'test/hilfe-a.pdf'),
  1,
  'Lernende mit Auftrag lesen die Datei im Speicher'
);
select is(
  (select count(*)::int from storage.objects where bucket_id = 'lesson-resources' and name = 'test/hilfe-entwurf.pdf'),
  0,
  'Datei einer unveröffentlichten Aufgabe ist im Speicher unsichtbar'
);
select throws_ok(
  $$insert into field_job_type_resource (field_job_type_id, reihenfolge, typ, titel, external_url)
    values ('00000000-0000-0000-0000-000000040041', 9, 'link', 'Eigener Link', 'https://example.test/x')$$,
  '42501', null,
  'Lernende legen keine Unterlagen an'
);

-- ------------------------------------------------------------
-- Lernende B: kein Auftrag der Aufgabe
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000040002', 'role', 'authenticated')::text, true);

select is(
  (select count(*)::int from field_job_type_resource),
  0,
  'Lernende ohne Auftrag der Aufgabe lesen keine Unterlagen'
);
select is(
  (select count(*)::int from storage.objects where bucket_id = 'lesson-resources' and name like 'test/hilfe-%'),
  0,
  'Lernende ohne Auftrag lesen keine Datei im Speicher'
);

-- ------------------------------------------------------------
-- AfCJ admin
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000040003', 'role', 'authenticated')::text, true);

select is(
  (select count(*)::int from field_job_type_resource),
  3,
  'AfCJ admin liest alle Unterlagen, auch unveröffentlichter Aufgaben'
);
select lives_ok(
  $$insert into field_job_type_resource (field_job_type_id, reihenfolge, typ, titel, external_url)
    values ('00000000-0000-0000-0000-000000040041', 3, 'link', 'Norm', 'https://example.test/norm')$$,
  'AfCJ admin legt Unterlagen an'
);

-- ------------------------------------------------------------
-- Anonym
-- ------------------------------------------------------------
reset role;
set local role anon;
select throws_ok(
  $$select count(*) from field_job_type_resource$$,
  '42501', null,
  'Anonyme haben keinen Zugriff'
);

select * from finish();
rollback;
