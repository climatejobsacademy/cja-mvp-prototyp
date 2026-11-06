-- 032_praxisflow_dateien.test.sql
-- SR-88 (Migration 0059): Dateien im Praxisflow sieht nur die lernende
-- Person selbst; löschen bis zum Abschluss; Bucket praxis-dateien privat,
-- 50 MB; Informieren endet erst mit dem Arbeitsauftrag.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(36);

-- ------------------------------------------------------------
-- Fixtures (als Superuser)
-- 32001 Lernende A, 32002 Lernende B, 32003 AfCJ admin, 32004 Trainer:in.
-- 32081 Praxistag A (geführt, Trainer:in 32004), 32082 Praxistag A (einfach),
-- 32083 Praxistag B (geführt).
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000032001', 'pd-a@example.test'),
  ('00000000-0000-0000-0000-000000032002', 'pd-b@example.test'),
  ('00000000-0000-0000-0000-000000032003', 'pd-admin@example.test'),
  ('00000000-0000-0000-0000-000000032004', 'pd-t@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000032011', 'Betrieb', 'employer', 'aktiv'),
  ('00000000-0000-0000-0000-000000032012', 'AfCJ', 'afcj', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000032001', 'pd-a@example.test', 'Lernende A', 'pd_a', 'DE'),
  ('00000000-0000-0000-0000-000000032002', 'pd-b@example.test', 'Lernende B', 'pd_b', 'DE'),
  ('00000000-0000-0000-0000-000000032003', 'pd-admin@example.test', 'Admin', 'pd_admin', 'DE'),
  ('00000000-0000-0000-0000-000000032004', 'pd-t@example.test', 'Trainer', 'pd_t', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000032001', '00000000-0000-0000-0000-000000032011'),
  ('00000000-0000-0000-0000-000000032002', '00000000-0000-0000-0000-000000032011'),
  ('00000000-0000-0000-0000-000000032003', '00000000-0000-0000-0000-000000032012'),
  ('00000000-0000-0000-0000-000000032004', '00000000-0000-0000-0000-000000032011');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000032001', '00000000-0000-0000-0000-000000032011', 'learner'),
  ('00000000-0000-0000-0000-000000032002', '00000000-0000-0000-0000-000000032011', 'learner'),
  ('00000000-0000-0000-0000-000000032003', '00000000-0000-0000-0000-000000032012', 'afcj_admin'),
  ('00000000-0000-0000-0000-000000032004', '00000000-0000-0000-0000-000000032011', 'trainer');

insert into programme (id, name, kuerzel, status) values
  ('00000000-0000-0000-0000-000000032021', 'Programm', 'PD-P1', 'published');

insert into field_job_type (id, titel, programme_id, reihenfolge, status, ablauf) values
  ('00000000-0000-0000-0000-000000032041', 'Auftrag geführt', '00000000-0000-0000-0000-000000032021', 1, 'published', 'gefuehrt'),
  ('00000000-0000-0000-0000-000000032042', 'Auftrag einfach', '00000000-0000-0000-0000-000000032021', 2, 'published', 'einfach');

insert into field_job (id, organisation_id, datum, field_job_type_id, learner_id, instructor_id) values
  ('00000000-0000-0000-0000-000000032081', '00000000-0000-0000-0000-000000032011', '2026-11-16', '00000000-0000-0000-0000-000000032041', '00000000-0000-0000-0000-000000032001', '00000000-0000-0000-0000-000000032004'),
  ('00000000-0000-0000-0000-000000032082', '00000000-0000-0000-0000-000000032011', '2026-11-17', '00000000-0000-0000-0000-000000032042', '00000000-0000-0000-0000-000000032001', null),
  ('00000000-0000-0000-0000-000000032083', '00000000-0000-0000-0000-000000032011', '2026-11-16', '00000000-0000-0000-0000-000000032041', '00000000-0000-0000-0000-000000032002', null);

-- ------------------------------------------------------------
-- Schema
-- ------------------------------------------------------------
select is((select public from storage.buckets where id = 'praxis-dateien'), false,
  'Bucket praxis-dateien ist privat');
select is((select file_size_limit from storage.buckets where id = 'praxis-dateien'), 52428800::bigint,
  'Bucket praxis-dateien nimmt höchstens 50 MB je Datei an');
select ok((select relrowsecurity from pg_class where oid = 'public.field_job_datei'::regclass),
  'RLS ist auf field_job_datei eingeschaltet');
select policies_are('public', 'field_job_datei',
  array['field_job_datei_eigene_lesen', 'field_job_datei_eigene_anlegen', 'field_job_datei_eigene_loeschen'],
  'Auf field_job_datei gibt es nur die drei Policies für die eigene Person (SR-88)');

select set_config('storage.allow_delete_query', 'true', true);

-- ------------------------------------------------------------
-- Als Lernende A
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000032001', 'role', 'authenticated')::text, true);

select throws_ok(
  $$select fn_praxis_weiter('00000000-0000-0000-0000-000000032081', 'informieren')$$,
  '23514', null,
  'Ohne hochgeladenen Arbeitsauftrag geht es nicht zu Planen'
);
select lives_ok(
  $$insert into storage.objects (bucket_id, name) values
    ('praxis-dateien', '00000000-0000-0000-0000-000000032001/00000000-0000-0000-0000-000000032081/a1.pdf'),
    ('praxis-dateien', '00000000-0000-0000-0000-000000032001/00000000-0000-0000-0000-000000032081/a2.pdf')$$,
  'Dateien in den eigenen Ordner des eigenen Praxistags hochladen'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values
    ('praxis-dateien', '00000000-0000-0000-0000-000000032002/00000000-0000-0000-0000-000000032083/x.pdf')$$,
  '42501', null,
  'Kein Upload in den Ordner einer anderen Person'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values
    ('praxis-dateien', '00000000-0000-0000-0000-000000032001/00000000-0000-0000-0000-000000032083/x.pdf')$$,
  '42501', null,
  'Kein Upload zu einem fremden Praxistag, auch im eigenen Ordner'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values
    ('praxis-dateien', '00000000-0000-0000-0000-000000032001/00000000-0000-0000-0000-000000032082/x.pdf')$$,
  '42501', null,
  'Kein Upload zu einem Praxistag im einfachen Ablauf'
);
select lives_ok(
  $$update storage.objects set name = '00000000-0000-0000-0000-000000032001/00000000-0000-0000-0000-000000032081/neu.pdf'
    where bucket_id = 'praxis-dateien' and name = '00000000-0000-0000-0000-000000032001/00000000-0000-0000-0000-000000032081/a1.pdf'$$,
  'Umbenennen einer Datei im Speicher wird ohne Wirkung ausgeführt'
);
select ok(
  exists (select 1 from storage.objects where bucket_id = 'praxis-dateien' and name = '00000000-0000-0000-0000-000000032001/00000000-0000-0000-0000-000000032081/a1.pdf'),
  'Dateien im Speicher lassen sich nicht überschreiben oder umbenennen'
);
select throws_ok(
  $$insert into field_job_datei (organisation_id, field_job_id, learner_id, art, storage_pfad, dateiname, mime_type, groesse) values
    ('00000000-0000-0000-0000-000000032012', '00000000-0000-0000-0000-000000032081', '00000000-0000-0000-0000-000000032001',
     'hilfe', '00000000-0000-0000-0000-000000032001/00000000-0000-0000-0000-000000032081/o.pdf', 'o.pdf', 'application/pdf', 10)$$,
  '42501', null,
  'Organisation der Dateizeile muss zum Praxistag passen'
);
select throws_ok(
  $$insert into field_job_datei (organisation_id, field_job_id, learner_id, art, storage_pfad, dateiname, mime_type, groesse) values
    ('00000000-0000-0000-0000-000000032011', '00000000-0000-0000-0000-000000032081', '00000000-0000-0000-0000-000000032001',
     'hilfe', '00000000-0000-0000-0000-000000032001/00000000-0000-0000-0000-000000032081/z.zip', 'z.zip', 'application/zip', 10)$$,
  '23514', null,
  'Nicht erlaubte Formate werden abgelehnt'
);
select lives_ok(
  $$insert into field_job_datei (organisation_id, field_job_id, learner_id, art, storage_pfad, dateiname, mime_type, groesse) values
    ('00000000-0000-0000-0000-000000032011', '00000000-0000-0000-0000-000000032081', '00000000-0000-0000-0000-000000032001',
     'auftrag', '00000000-0000-0000-0000-000000032001/00000000-0000-0000-0000-000000032081/a1.pdf', 'Auftrag.pdf', 'application/pdf', 2048),
    ('00000000-0000-0000-0000-000000032011', '00000000-0000-0000-0000-000000032081', '00000000-0000-0000-0000-000000032001',
     'hilfe', '00000000-0000-0000-0000-000000032001/00000000-0000-0000-0000-000000032081/a2.pdf', 'Handbuch.pdf', 'application/pdf', 4096)$$,
  'Dateizeilen zum eigenen Praxistag anlegen'
);
select throws_ok(
  $$insert into field_job_datei (organisation_id, field_job_id, learner_id, art, storage_pfad, dateiname, mime_type, groesse) values
    ('00000000-0000-0000-0000-000000032011', '00000000-0000-0000-0000-000000032081', '00000000-0000-0000-0000-000000032001',
     'auftrag', '00000000-0000-0000-0000-000000032001/00000000-0000-0000-0000-000000032081/a3.dwg', 'Plan.dwg', 'image/vnd.dwg', 4096)$$,
  '23514', null,
  'CAD-Dateien nur als Plan'
);
select throws_ok(
  $$insert into field_job_datei (organisation_id, field_job_id, learner_id, art, storage_pfad, dateiname, mime_type, groesse) values
    ('00000000-0000-0000-0000-000000032011', '00000000-0000-0000-0000-000000032081', '00000000-0000-0000-0000-000000032001',
     'plan', '00000000-0000-0000-0000-000000032001/00000000-0000-0000-0000-000000032081/gross.pdf', 'gross.pdf', 'application/pdf', 52428801)$$,
  '23514', null,
  'Dateien über 50 MB werden abgelehnt'
);
select throws_ok(
  $$insert into field_job_datei (organisation_id, field_job_id, learner_id, art, storage_pfad, dateiname, mime_type, groesse) values
    ('00000000-0000-0000-0000-000000032011', '00000000-0000-0000-0000-000000032083', '00000000-0000-0000-0000-000000032001',
     'auftrag', '00000000-0000-0000-0000-000000032001/00000000-0000-0000-0000-000000032083/f.pdf', 'f.pdf', 'application/pdf', 10)$$,
  '42501', null,
  'Keine Dateizeile zum Praxistag einer anderen Person'
);
select is((select count(*) from field_job_datei), 2::bigint, 'Lernende sehen ihre eigenen Dateizeilen');
select is(
  fn_praxis_weiter('00000000-0000-0000-0000-000000032081', 'informieren'),
  'planen',
  'Mit hochgeladenem Arbeitsauftrag geht es zu Planen'
);
select lives_ok(
  $$delete from field_job_datei where storage_pfad = '00000000-0000-0000-0000-000000032001/00000000-0000-0000-0000-000000032081/a2.pdf'$$,
  'Eigene Dateizeile vor dem Abschluss löschen'
);
select is_empty(
  $$select id from field_job_datei where storage_pfad = '00000000-0000-0000-0000-000000032001/00000000-0000-0000-0000-000000032081/a2.pdf'$$,
  'Die gelöschte Dateizeile ist weg'
);
select lives_ok(
  $$delete from storage.objects where bucket_id = 'praxis-dateien' and name = '00000000-0000-0000-0000-000000032001/00000000-0000-0000-0000-000000032081/a2.pdf'$$,
  'Eigene Datei vor dem Abschluss aus dem Speicher löschen'
);
select is_empty(
  $$select name from storage.objects where bucket_id = 'praxis-dateien' and name = '00000000-0000-0000-0000-000000032001/00000000-0000-0000-0000-000000032081/a2.pdf'$$,
  'Die gelöschte Datei ist weg'
);

-- ------------------------------------------------------------
-- Andere Personen sehen nichts
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000032002', 'role', 'authenticated')::text, true);
select is_empty($$select id from field_job_datei$$, 'Andere Lernende sehen keine Dateizeilen');
select is_empty($$select name from storage.objects where bucket_id = 'praxis-dateien'$$,
  'Andere Lernende sehen keine Dateien im Speicher');
select lives_ok(
  $$delete from field_job_datei$$,
  'Löschversuch anderer Lernender läuft ohne Wirkung (Prüfung unten)'
);

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000032003', 'role', 'authenticated')::text, true);
select is_empty($$select id from field_job_datei$$, 'AfCJ admin sieht in der Plattform keine Dateizeilen (SR-88)');
select throws_ok(
  $$insert into field_job_datei (organisation_id, field_job_id, learner_id, art, storage_pfad, dateiname, mime_type, groesse) values
    ('00000000-0000-0000-0000-000000032011', '00000000-0000-0000-0000-000000032081', '00000000-0000-0000-0000-000000032001',
     'hilfe', '00000000-0000-0000-0000-000000032001/00000000-0000-0000-0000-000000032081/adm.pdf', 'adm.pdf', 'application/pdf', 10)$$,
  '42501', null,
  'AfCJ admin legt in der Plattform keine Dateizeilen für Lernende an'
);
select is_empty($$select name from storage.objects where bucket_id = 'praxis-dateien'$$,
  'AfCJ admin sieht in der Plattform keine Dateien im Speicher (SR-88)');

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000032004', 'role', 'authenticated')::text, true);
select is_empty($$select id from field_job_datei$$, 'Trainer:in des Praxistags sieht keine Dateizeilen (SR-88)');
select is_empty($$select name from storage.objects where bucket_id = 'praxis-dateien'$$,
  'Trainer:in des Praxistags sieht keine Dateien im Speicher (SR-88)');

-- ------------------------------------------------------------
-- Nach dem Abschluss: nicht mehr löschen, nichts mehr hochladen
-- ------------------------------------------------------------
reset role;
update field_job set phase = 'abgeschlossen' where id = '00000000-0000-0000-0000-000000032081';
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000032001', 'role', 'authenticated')::text, true);

select lives_ok(
  $$delete from field_job_datei$$,
  'Löschversuch nach dem Abschluss läuft ohne Wirkung'
);
select is(
  (select count(*) from field_job_datei),
  1::bigint,
  'Nach dem Abschluss lassen sich Dateizeilen nicht mehr löschen; andere Lernende haben auch nichts gelöscht'
);
select lives_ok(
  $$delete from storage.objects where bucket_id = 'praxis-dateien'$$,
  'Löschversuch im Speicher nach dem Abschluss läuft ohne Wirkung'
);
select is(
  (select count(*) from storage.objects where bucket_id = 'praxis-dateien'),
  1::bigint,
  'Nach dem Abschluss lassen sich Dateien im Speicher nicht mehr löschen'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values
    ('praxis-dateien', '00000000-0000-0000-0000-000000032001/00000000-0000-0000-0000-000000032081/spaet.pdf')$$,
  '42501', null,
  'Nach dem Abschluss kein Upload mehr'
);

select * from finish();
rollback;
