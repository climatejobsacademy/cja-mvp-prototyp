-- 012_lesson_resources_access.test.sql
-- Lernmaterialien (0023, SR folgt): Bucket lesson-resources und lesson_resource
-- sind für Lernende nur bei veröffentlichter Lektion und Einschreibung
-- (aktiv/abgeschlossen) in das Programm der Lektion lesbar. Anonyme sehen
-- nichts, Lernende schreiben nichts, AfCJ admin liest alles.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(25);

-- ------------------------------------------------------------
-- Fixtures (als Superuser)
-- 701 aktiv in Programm A, 702 eingeschrieben nur in Programm B,
-- 703 abgebrochen in Programm A, 704 abgeschlossen in Programm A, 705 admin
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000701', 'aktiv@example.test'),
  ('00000000-0000-0000-0000-000000000702', 'anderes-programm@example.test'),
  ('00000000-0000-0000-0000-000000000703', 'abgebrochen@example.test'),
  ('00000000-0000-0000-0000-000000000704', 'abgeschlossen@example.test'),
  ('00000000-0000-0000-0000-000000000705', 'admin@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000000711', 'Betrieb', 'employer', 'aktiv'),
  ('00000000-0000-0000-0000-000000000712', 'AfCJ', 'afcj', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000000701', 'aktiv@example.test', 'Aktiv', 'lr_aktiv', 'DE'),
  ('00000000-0000-0000-0000-000000000702', 'anderes-programm@example.test', 'Anderes Programm', 'lr_anderes', 'DE'),
  ('00000000-0000-0000-0000-000000000703', 'abgebrochen@example.test', 'Abgebrochen', 'lr_abgebrochen', 'DE'),
  ('00000000-0000-0000-0000-000000000704', 'abgeschlossen@example.test', 'Abgeschlossen', 'lr_abgeschlossen', 'DE'),
  ('00000000-0000-0000-0000-000000000705', 'admin@example.test', 'Admin', 'lr_admin', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000711'),
  ('00000000-0000-0000-0000-000000000702', '00000000-0000-0000-0000-000000000711'),
  ('00000000-0000-0000-0000-000000000703', '00000000-0000-0000-0000-000000000711'),
  ('00000000-0000-0000-0000-000000000704', '00000000-0000-0000-0000-000000000711'),
  ('00000000-0000-0000-0000-000000000705', '00000000-0000-0000-0000-000000000712');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000711', 'learner'),
  ('00000000-0000-0000-0000-000000000702', '00000000-0000-0000-0000-000000000711', 'learner'),
  ('00000000-0000-0000-0000-000000000703', '00000000-0000-0000-0000-000000000711', 'learner'),
  ('00000000-0000-0000-0000-000000000704', '00000000-0000-0000-0000-000000000711', 'learner'),
  ('00000000-0000-0000-0000-000000000705', '00000000-0000-0000-0000-000000000712', 'afcj_admin');

insert into programme (id, name, kuerzel) values
  ('00000000-0000-0000-0000-000000000721', 'Programm A', 'PRG-A'),
  ('00000000-0000-0000-0000-000000000722', 'Programm B', 'PRG-B');

insert into module (id, programme_id, name, reihenfolge) values
  ('00000000-0000-0000-0000-000000000723', '00000000-0000-0000-0000-000000000721', 'Modul A', 1);

-- Kurs 724 hängt über das Modul an Programm A, Kurs 725 direkt an Programm A.
insert into course (id, module_id, programme_id, name, typ, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000000724', '00000000-0000-0000-0000-000000000723', null, 'Kurs über Modul', 'asynchron', 1, 'published'),
  ('00000000-0000-0000-0000-000000000725', null, '00000000-0000-0000-0000-000000000721', 'Kurs direkt', 'asynchron', 2, 'published');

insert into lesson (id, course_id, name, content_type, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000000731', '00000000-0000-0000-0000-000000000724', 'Veröffentlicht (Modul)', 'repository', 1, 'published'),
  ('00000000-0000-0000-0000-000000000732', '00000000-0000-0000-0000-000000000724', 'Unveröffentlicht', 'live', 2, 'unpublished'),
  ('00000000-0000-0000-0000-000000000733', '00000000-0000-0000-0000-000000000725', 'Veröffentlicht (direkt)', 'scorm', 1, 'published');

insert into cohort (id, programme_id, name, start_datum) values
  ('00000000-0000-0000-0000-000000000741', '00000000-0000-0000-0000-000000000721', 'Kohorte A', current_date),
  ('00000000-0000-0000-0000-000000000742', '00000000-0000-0000-0000-000000000722', 'Kohorte B', current_date);

insert into enrolment (organisation_id, learner_id, cohort_id, status) values
  ('00000000-0000-0000-0000-000000000711', '00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000741', 'aktiv'),
  ('00000000-0000-0000-0000-000000000711', '00000000-0000-0000-0000-000000000702', '00000000-0000-0000-0000-000000000742', 'aktiv'),
  ('00000000-0000-0000-0000-000000000711', '00000000-0000-0000-0000-000000000703', '00000000-0000-0000-0000-000000000741', 'abgebrochen'),
  ('00000000-0000-0000-0000-000000000711', '00000000-0000-0000-0000-000000000704', '00000000-0000-0000-0000-000000000741', 'abgeschlossen');

insert into file_asset (id, dateiname, dateityp, storage_pfad) values
  ('00000000-0000-0000-0000-000000000751', 'datenblatt-a.pdf', 'application/pdf', 'test/datenblatt-a.pdf'),
  ('00000000-0000-0000-0000-000000000752', 'entwurf-b.pdf', 'application/pdf', 'test/entwurf-b.pdf'),
  ('00000000-0000-0000-0000-000000000753', 'folien-c.pdf', 'application/pdf', 'test/folien-c.pdf');

insert into lesson_resource (id, lesson_id, reihenfolge, typ, file_asset_id, external_url, titel) values
  ('00000000-0000-0000-0000-000000000761', '00000000-0000-0000-0000-000000000731', 1, 'datei', '00000000-0000-0000-0000-000000000751', null, 'Datenblatt'),
  ('00000000-0000-0000-0000-000000000762', '00000000-0000-0000-0000-000000000732', 1, 'datei', '00000000-0000-0000-0000-000000000752', null, 'Entwurf'),
  ('00000000-0000-0000-0000-000000000763', '00000000-0000-0000-0000-000000000733', 1, 'datei', '00000000-0000-0000-0000-000000000753', null, 'Folien'),
  ('00000000-0000-0000-0000-000000000764', '00000000-0000-0000-0000-000000000731', 2, 'link', null, 'https://example.test/video', 'Herstellervideo');

-- Objekte im Bucket; dazu ein gleichnamiges Objekt in scorm-packages, das über
-- die neue Policy nicht sichtbar werden darf.
insert into storage.objects (bucket_id, name) values
  ('lesson-resources', 'test/datenblatt-a.pdf'),
  ('lesson-resources', 'test/entwurf-b.pdf'),
  ('lesson-resources', 'test/folien-c.pdf'),
  ('scorm-packages', 'test/datenblatt-a.pdf');

-- ------------------------------------------------------------
-- Schema und Bucket-Einstellungen
-- ------------------------------------------------------------
select is(
  (select public from storage.buckets where id = 'lesson-resources'),
  false,
  'Bucket lesson-resources ist privat'
);
select is(
  (select file_size_limit from storage.buckets where id = 'lesson-resources'),
  52428800::bigint,
  'Bucket lesson-resources hat ein Limit von 52428800 Byte'
);
select is(
  (select array(select unnest(allowed_mime_types) order by 1) from storage.buckets where id = 'lesson-resources'),
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp'
  ],
  'Bucket lesson-resources erlaubt genau PDF, PNG, JPEG, WebP, DOCX, PPTX, XLSX'
);
select throws_ok(
  $$insert into lesson_resource (lesson_id, reihenfolge, typ, external_url)
    values ('00000000-0000-0000-0000-000000000731', 9, 'link', 'https://example.test/ohne-titel')$$,
  '23502',
  null,
  'lesson_resource ohne titel wird abgelehnt'
);
select throws_ok(
  $$insert into lesson_resource (lesson_id, reihenfolge, typ, external_url, titel)
    values ('00000000-0000-0000-0000-000000000731', 9, 'link', 'https://example.test/leer', '  ')$$,
  '23514',
  null,
  'lesson_resource mit leerem titel wird abgelehnt'
);
select is(
  has_function_privilege('anon', 'fn_kann_lektion_lesen(uuid)', 'execute'),
  false,
  'anon darf fn_kann_lektion_lesen nicht ausführen'
);
select is(
  has_function_privilege('authenticated', 'fn_kann_lektion_lesen(uuid)', 'execute'),
  true,
  'authenticated darf fn_kann_lektion_lesen ausführen'
);

-- ------------------------------------------------------------
-- Als Learner, eingeschrieben (aktiv) in Programm A
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000701', 'role', 'authenticated')::text, true);

select is(
  (select count(*)::int from lesson_resource where id in (
    '00000000-0000-0000-0000-000000000761', '00000000-0000-0000-0000-000000000763', '00000000-0000-0000-0000-000000000764')),
  3,
  'Eingeschriebene Learner sehen Materialien veröffentlichter Lektionen (über Modul und direkt am Programm, Datei und Link)'
);
select is(
  (select count(*)::int from lesson_resource where id = '00000000-0000-0000-0000-000000000762'),
  0,
  'Eingeschriebene Learner sehen Materialien unveröffentlichter Lektionen nicht'
);
select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'lesson-resources' and name in ('test/datenblatt-a.pdf', 'test/folien-c.pdf')),
  2,
  'Eingeschriebene Learner sehen die Objekte veröffentlichter Lektionen'
);
select is(
  (select count(*)::int from storage.objects where bucket_id = 'lesson-resources' and name = 'test/entwurf-b.pdf'),
  0,
  'Eingeschriebene Learner sehen das Objekt einer unveröffentlichten Lektion nicht'
);
select is(
  (select count(*)::int from storage.objects where bucket_id = 'scorm-packages' and name = 'test/datenblatt-a.pdf'),
  0,
  'Gleichnamiges Objekt in scorm-packages wird über die Lernmaterial-Policy nicht sichtbar'
);
select throws_like(
  $$insert into lesson_resource (lesson_id, reihenfolge, typ, external_url, titel)
    values ('00000000-0000-0000-0000-000000000731', 3, 'link', 'https://example.test/eigener-link', 'Eigener Link')$$,
  '%row-level security%',
  'Learner kann kein lesson_resource anlegen'
);
select is(
  (with geaendert as (
     update lesson_resource set titel = 'Geändert'
     where id = '00000000-0000-0000-0000-000000000761' returning 1)
   select count(*)::int from geaendert),
  0,
  'Learner kann lesson_resource nicht ändern'
);
select is(
  (with geloescht as (
     delete from lesson_resource
     where id = '00000000-0000-0000-0000-000000000761' returning 1)
   select count(*)::int from geloescht),
  0,
  'Learner kann lesson_resource nicht löschen'
);
select throws_like(
  $$insert into storage.objects (bucket_id, name) values ('lesson-resources', 'test/eigener-upload.pdf')$$,
  '%row-level security%',
  'Learner kann nicht in den Bucket lesson-resources hochladen'
);

-- ------------------------------------------------------------
-- Als Learner mit abgeschlossener Einschreibung in Programm A: sieht alles
-- Veröffentlichte
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000704', 'role', 'authenticated')::text, true);

select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'lesson-resources' and name in ('test/datenblatt-a.pdf', 'test/folien-c.pdf')),
  2,
  'Learner mit abgeschlossener Einschreibung sehen die Objekte veröffentlichter Lektionen'
);

-- ------------------------------------------------------------
-- Als Learner mit abgebrochener Einschreibung in Programm A: sieht nichts
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000703', 'role', 'authenticated')::text, true);

select is(
  (select count(*)::int from lesson_resource where id::text like '00000000-0000-0000-0000-00000000076%'),
  0,
  'Learner mit abgebrochener Einschreibung sehen keine Materialien'
);
select is(
  (select count(*)::int from storage.objects where bucket_id = 'lesson-resources'),
  0,
  'Learner mit abgebrochener Einschreibung sehen keine Objekte'
);

-- ------------------------------------------------------------
-- Als Learner, nur in Programm B eingeschrieben: sieht nichts aus Programm A
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000702', 'role', 'authenticated')::text, true);

select is(
  (select count(*)::int from lesson_resource where id::text like '00000000-0000-0000-0000-00000000076%'),
  0,
  'Learner ohne Einschreibung in das Programm sehen keine Materialien'
);
select is(
  (select count(*)::int from storage.objects where bucket_id = 'lesson-resources'),
  0,
  'Learner ohne Einschreibung in das Programm sehen keine Objekte'
);

-- ------------------------------------------------------------
-- Als AfCJ admin: liest alles, auch Unveröffentlichtes
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000705', 'role', 'authenticated')::text, true);

select is(
  (select count(*)::int from lesson_resource where id::text like '00000000-0000-0000-0000-00000000076%'),
  4,
  'AfCJ admin sieht alle Materialien'
);
select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'lesson-resources' and name like 'test/%'),
  3,
  'AfCJ admin sieht alle Objekte im Bucket lesson-resources'
);

-- ------------------------------------------------------------
-- Anonym: kein Zugriff
-- ------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);

select is(
  (select count(*)::int from storage.objects where bucket_id = 'lesson-resources'),
  0,
  'Anonyme sehen keine Objekte im Bucket lesson-resources'
);
select throws_ok(
  $$select count(*) from lesson_resource$$,
  '42501',
  null,
  'Anonyme haben keinen Zugriff auf lesson_resource'
);

select * from finish();
rollback;
