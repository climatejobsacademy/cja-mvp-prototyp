-- 028_scorm_entpackt_access.test.sql
-- SR-50/SR-85, Migration 0055: Ausgepackte Paket-Medien unter
-- '<file_asset.storage_pfad>.entpackt/' im Bucket scorm-packages sind für
-- Angemeldete lesbar, wenn die Lektion des Pakets veröffentlicht ist (gleiche
-- Bedingung wie scorm_packages_read_published, 0017). Präfix-Tricks, andere
-- Buckets, Platzhalter im Pfad und Anonyme bekommen nichts; Lernende
-- schreiben nichts.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(16);

-- ------------------------------------------------------------
-- Fixtures (als Superuser)
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000028001', 'learner-entpackt@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000028011', 'Betrieb Entpackt', 'employer', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000028001', 'learner-entpackt@example.test', 'Learner Entpackt', 'lr_entpackt', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000028001', '00000000-0000-0000-0000-000000028011');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000028001', '00000000-0000-0000-0000-000000028011', 'learner');

insert into programme (id, name, kuerzel) values
  ('00000000-0000-0000-0000-000000028021', 'Programm Entpackt', 'PRG-ENT');

insert into course (id, programme_id, name, typ, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000028022', '00000000-0000-0000-0000-000000028021', 'Selbstlernen', 'asynchron', 1, 'published');

-- A veröffentlicht, B unveröffentlicht, C veröffentlicht (Pfad mit '_').
insert into lesson (id, course_id, name, content_type, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000028031', '00000000-0000-0000-0000-000000028022', 'Paket A', 'scorm', 1, 'published'),
  ('00000000-0000-0000-0000-000000028032', '00000000-0000-0000-0000-000000028022', 'Paket B', 'scorm', 2, 'unpublished'),
  ('00000000-0000-0000-0000-000000028033', '00000000-0000-0000-0000-000000028022', 'Paket C', 'scorm', 3, 'published');

insert into file_asset (id, dateiname, dateityp, storage_pfad) values
  ('00000000-0000-0000-0000-000000028041', 'paket-a.zip', 'application/zip', 'test/paket-a.zip'),
  ('00000000-0000-0000-0000-000000028042', 'paket-b.zip', 'application/zip', 'test/paket-b.zip'),
  ('00000000-0000-0000-0000-000000028043', 'paket_c.zip', 'application/zip', 'test/paket_c.zip');

insert into scorm_package (id, lesson_id, file_asset_id, entry_point_pfad) values
  ('00000000-0000-0000-0000-000000028051', '00000000-0000-0000-0000-000000028031', '00000000-0000-0000-0000-000000028041', 'scormcontent/index.html'),
  ('00000000-0000-0000-0000-000000028052', '00000000-0000-0000-0000-000000028032', '00000000-0000-0000-0000-000000028042', 'scormcontent/index.html'),
  ('00000000-0000-0000-0000-000000028053', '00000000-0000-0000-0000-000000028033', '00000000-0000-0000-0000-000000028043', 'scormcontent/index.html');

insert into storage.objects (bucket_id, name) values
  ('scorm-packages', 'test/paket-a.zip'),
  ('scorm-packages', 'test/paket-a.zip.entpackt/assets/images/x.jpg'),
  ('scorm-packages', 'test/paket-a.zip.entpackt/assets/audio/u/u.m4a'),
  ('scorm-packages', 'test/paket-b.zip.entpackt/assets/images/x.jpg'),
  -- Präfix-Tricks: dürfen über Paket A nicht lesbar werden.
  ('scorm-packages', 'test/paket-a.zipX/assets/images/x.jpg'),
  ('scorm-packages', 'test/paket-a.zip.entpacktX/assets/images/x.jpg'),
  ('scorm-packages', 'andere/test/paket-a.zip.entpackt/assets/images/x.jpg'),
  ('scorm-packages', 'test/paket-a.zip.entpackt'),
  -- '_' in Paket C darf kein Platzhalter sein.
  ('scorm-packages', 'test/paket_c.zip.entpackt/assets/images/x.jpg'),
  ('scorm-packages', 'test/paketXc.zip.entpackt/assets/images/x.jpg'),
  -- Gleicher Name in einem anderen Bucket.
  ('lesson-resources', 'test/paket-a.zip.entpackt/assets/images/x.jpg');

-- ------------------------------------------------------------
-- Policies
-- ------------------------------------------------------------
select is(
  (select count(*)::int from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and policyname::text = 'scorm_packages_entpackt_read_published'
     and cmd::text = 'SELECT'
     and roles = array['authenticated']::name[]),
  1,
  'Policy scorm_packages_entpackt_read_published existiert, nur SELECT, nur authenticated'
);
select is(
  (select count(*)::int from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and cmd::text <> 'SELECT'
     and (coalesce(qual, '') like '%scorm-packages%' or coalesce(with_check, '') like '%scorm-packages%')),
  0,
  'Keine Schreib-Policy auf storage.objects für scorm-packages'
);

-- ------------------------------------------------------------
-- Als Learner
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000028001', 'role', 'authenticated')::text, true);

select is(
  (select count(*)::int from storage.objects where bucket_id = 'scorm-packages' and name = 'test/paket-a.zip'),
  1,
  'Learner liest die Zip einer veröffentlichten Lektion weiter (0017 unverändert)'
);
select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'scorm-packages'
     and name in ('test/paket-a.zip.entpackt/assets/images/x.jpg', 'test/paket-a.zip.entpackt/assets/audio/u/u.m4a')),
  2,
  'Learner liest ausgepackte Dateien einer veröffentlichten Lektion (Bild und umgewandeltes Audio)'
);
select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'scorm-packages' and name = 'test/paket-b.zip.entpackt/assets/images/x.jpg'),
  0,
  'Learner liest keine ausgepackte Datei einer unveröffentlichten Lektion'
);
select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'scorm-packages' and name = 'test/paket-a.zipX/assets/images/x.jpg'),
  0,
  'Präfix <pfad>X wird nicht gelesen'
);
select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'scorm-packages' and name = 'test/paket-a.zip.entpacktX/assets/images/x.jpg'),
  0,
  'Präfix <pfad>.entpacktX/ wird nicht gelesen'
);
select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'scorm-packages' and name = 'andere/test/paket-a.zip.entpackt/assets/images/x.jpg'),
  0,
  'Pfad mit anderem Präfix davor wird nicht gelesen'
);
select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'scorm-packages' and name = 'test/paket-a.zip.entpackt'),
  0,
  'Objekt <pfad>.entpackt ohne Schrägstrich wird nicht gelesen'
);
select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'lesson-resources' and name = 'test/paket-a.zip.entpackt/assets/images/x.jpg'),
  0,
  'Gleichnamiges Objekt in lesson-resources wird über die neue Policy nicht lesbar'
);
select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'scorm-packages' and name = 'test/paket_c.zip.entpackt/assets/images/x.jpg'),
  1,
  'Pfad mit Unterstrich: die eigene ausgepackte Datei ist lesbar'
);
select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'scorm-packages' and name = 'test/paketXc.zip.entpackt/assets/images/x.jpg'),
  0,
  'Unterstrich im Pfad ist kein Platzhalter (starts_with statt like)'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('scorm-packages', 'test/paket-a.zip.entpackt/assets/images/eigen.jpg')$$,
  '42501', null,
  'Learner kann keine ausgepackte Datei hochladen'
);

-- ------------------------------------------------------------
-- Anonym: kein Zugriff
-- ------------------------------------------------------------
reset role;
set local role anon;
select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);

select is(
  (select count(*)::int from storage.objects where bucket_id = 'scorm-packages'),
  0,
  'Anonyme sehen keine Objekte im Bucket scorm-packages'
);

-- ------------------------------------------------------------
-- Lektion A zurückgezogen: ausgepackte Dateien und Zip nicht mehr lesbar
-- ------------------------------------------------------------
reset role;
update lesson set status = 'unpublished' where id = '00000000-0000-0000-0000-000000028031';

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000028001', 'role', 'authenticated')::text, true);

select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'scorm-packages' and name like 'test/paket-a.zip.entpackt/%'),
  0,
  'Nach dem Zurückziehen der Lektion liest der Learner keine ausgepackte Datei mehr'
);
select is(
  (select count(*)::int from storage.objects where bucket_id = 'scorm-packages' and name = 'test/paket-a.zip'),
  0,
  'Nach dem Zurückziehen der Lektion liest der Learner auch die Zip nicht mehr'
);

select * from finish();
rollback;
