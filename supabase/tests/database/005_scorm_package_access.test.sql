-- 005_scorm_package_access.test.sql
-- SR-50/51/52 (SCORM-Architektur-Entscheidung 2026-09-16): scorm_package ist
-- sichtbar, wenn die referenzierte lesson 'published' ist (analog
-- lesson_resource) -- AfCJ admin sieht read All. Schreibzugriff ist trotz
-- Tabellen-Grant (0016) durch RLS auf Admin beschränkt (keine
-- Learner-Schreib-Policy vorhanden, nur scorm_package_admin_all).
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(4);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000101', 'learner-scorm@example.test'),
  ('00000000-0000-0000-0000-000000000102', 'admin-scorm@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000000111', 'Energiehelden', 'employer', 'aktiv'),
  ('00000000-0000-0000-0000-000000000112', 'AfCJ', 'afcj', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000000101', 'learner-scorm@example.test', 'Learner Scorm', 'learner_scorm', 'DE'),
  ('00000000-0000-0000-0000-000000000102', 'admin-scorm@example.test', 'Admin Scorm', 'admin_scorm', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000111'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000112');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000111', 'learner'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000112', 'afcj_admin');

insert into programme (id, name, kuerzel) values
  ('00000000-0000-0000-0000-000000000121', 'EFK Erneuerbare Energien', 'EFK-EE');

insert into course (id, programme_id, name, typ, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000000122', '00000000-0000-0000-0000-000000000121', 'SCORM-Kurs', 'asynchron', 1, 'published');

insert into lesson (id, course_id, name, content_type, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000000131', '00000000-0000-0000-0000-000000000122', 'Veröffentlichte SCORM-Lektion', 'scorm', 1, 'published'),
  ('00000000-0000-0000-0000-000000000132', '00000000-0000-0000-0000-000000000122', 'Unveröffentlichte SCORM-Lektion', 'scorm', 2, 'unpublished');

insert into file_asset (id, dateiname, dateityp, storage_pfad) values
  ('00000000-0000-0000-0000-000000000141', 'testpaket-a.zip', 'application/zip', 'testpaket-a.zip'),
  ('00000000-0000-0000-0000-000000000142', 'testpaket-b.zip', 'application/zip', 'testpaket-b.zip');

insert into scorm_package (id, lesson_id, file_asset_id, entry_point_pfad) values
  ('00000000-0000-0000-0000-000000000151', '00000000-0000-0000-0000-000000000131', '00000000-0000-0000-0000-000000000141', 'index.html'),
  ('00000000-0000-0000-0000-000000000152', '00000000-0000-0000-0000-000000000132', '00000000-0000-0000-0000-000000000142', 'index.html');

-- ------------------------------------------------------------
-- Als Learner
-- ------------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000101', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*)::int from scorm_package where id = '00000000-0000-0000-0000-000000000151'),
  1,
  'Learner sieht scorm_package der veröffentlichten Lektion'
);
select is(
  (select count(*)::int from scorm_package where id = '00000000-0000-0000-0000-000000000152'),
  0,
  'Learner sieht scorm_package der unveröffentlichten Lektion nicht'
);

-- ------------------------------------------------------------
-- Als AfCJ admin: read All, unabhängig vom Veröffentlichungsstatus.
-- ------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000102', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*)::int from scorm_package
   where id in ('00000000-0000-0000-0000-000000000151', '00000000-0000-0000-0000-000000000152')),
  2,
  'AfCJ admin sieht veröffentlichte und unveröffentlichte scorm_package gleichermaßen'
);

-- ------------------------------------------------------------
-- Zurueck als Learner: kein Schreibzugriff trotz Tabellen-Grant (0016) --
-- RLS kennt keine Learner-Schreib-Policy, nur scorm_package_admin_all.
-- ------------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000101', 'role', 'authenticated')::text,
  true
);

select throws_like(
  $$insert into scorm_package (lesson_id, file_asset_id, entry_point_pfad)
    values ('00000000-0000-0000-0000-000000000131', '00000000-0000-0000-0000-000000000141', 'anderer-pfad.html')$$,
  '%row-level security%',
  'Learner kann kein scorm_package anlegen (keine Learner-Schreib-Policy)'
);

select * from finish();
rollback;
