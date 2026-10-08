-- 014_organisation_logo.test.sql
-- Organisations-Logo (0025, SR-76): organisation.logo_pfad folgt den
-- bestehenden Regeln für organisation (0009): Lernende lesen nur die eigene
-- Organisation (SR-06), ändern nichts; AfCJ admin liest und setzt alles;
-- anon hat keinen Zugriff. Bucket org-logos ist öffentlich, nur PNG/WebP/JPEG
-- bis 512000 Byte, ohne Schreib-Policy.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(20);

-- ------------------------------------------------------------
-- Fixtures (als Superuser)
-- 601 Learner in Betrieb A (mit Logo), 602 Learner in Betrieb B (ohne Logo),
-- 603 AfCJ admin
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000601', 'logo-a@example.test'),
  ('00000000-0000-0000-0000-000000000602', 'logo-b@example.test'),
  ('00000000-0000-0000-0000-000000000603', 'logo-admin@example.test');

insert into organisation (id, name, typ, status, logo_pfad) values
  ('00000000-0000-0000-0000-000000000611', 'Betrieb A', 'employer', 'aktiv', '3f2b8c1e-0d4a-4b6e-9c7f-1a2b3c4d5e6f.png'),
  ('00000000-0000-0000-0000-000000000612', 'Betrieb B', 'employer', 'aktiv', null),
  ('00000000-0000-0000-0000-000000000613', 'AfCJ', 'afcj', 'aktiv', null);

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000000601', 'logo-a@example.test', 'Anna Logo', 'lb_logo_a', 'DE'),
  ('00000000-0000-0000-0000-000000000602', 'logo-b@example.test', 'Bernd Logo', 'lb_logo_b', 'DE'),
  ('00000000-0000-0000-0000-000000000603', 'logo-admin@example.test', 'Ada Logo', 'lb_logo_admin', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000611'),
  ('00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000612'),
  ('00000000-0000-0000-0000-000000000603', '00000000-0000-0000-0000-000000000613');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000611', 'learner'),
  ('00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000612', 'learner'),
  ('00000000-0000-0000-0000-000000000603', '00000000-0000-0000-0000-000000000613', 'afcj_admin');

-- ------------------------------------------------------------
-- Schema und Format von logo_pfad
-- ------------------------------------------------------------
select col_is_null('public', 'organisation', 'logo_pfad', 'organisation.logo_pfad ist optional');
select lives_ok(
  $$update organisation set logo_pfad = '3f2b8c1e-0d4a-4b6e-9c7f-1a2b3c4d5e6f.jpeg'
    where id = '00000000-0000-0000-0000-000000000612'$$,
  'UUID mit .jpeg ist ein gültiger Pfad'
);
select throws_ok(
  $$update organisation set logo_pfad = 'energiehelden-logo.png'
    where id = '00000000-0000-0000-0000-000000000612'$$,
  '23514', null,
  'Dateiname ohne UUID wird abgelehnt'
);
select throws_ok(
  $$update organisation set logo_pfad = '3f2b8c1e-0d4a-4b6e-9c7f-1a2b3c4d5e6f.svg'
    where id = '00000000-0000-0000-0000-000000000612'$$,
  '23514', null,
  'SVG wird abgelehnt'
);
select throws_ok(
  $$update organisation set logo_pfad = 'logos/3f2b8c1e-0d4a-4b6e-9c7f-1a2b3c4d5e6f.png'
    where id = '00000000-0000-0000-0000-000000000612'$$,
  '23514', null,
  'Unterordner werden abgelehnt'
);
select throws_ok(
  $$update organisation set logo_pfad = '3F2B8C1E-0D4A-4B6E-9C7F-1A2B3C4D5E6F.png'
    where id = '00000000-0000-0000-0000-000000000612'$$,
  '23514', null,
  'UUID in Großbuchstaben wird abgelehnt'
);
update organisation set logo_pfad = null where id = '00000000-0000-0000-0000-000000000612';

-- ------------------------------------------------------------
-- Bucket org-logos
-- ------------------------------------------------------------
select is(
  (select public from storage.buckets where id = 'org-logos'),
  true,
  'Bucket org-logos ist öffentlich'
);
select is(
  (select file_size_limit from storage.buckets where id = 'org-logos'),
  512000::bigint,
  'Bucket org-logos hat ein Limit von 512000 Byte'
);
select is(
  (select array(select unnest(allowed_mime_types) order by 1) from storage.buckets where id = 'org-logos'),
  array['image/jpeg', 'image/png', 'image/webp'],
  'Bucket org-logos erlaubt nur JPEG, PNG und WebP'
);
select is(
  (select count(*)::int from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and (coalesce(qual, '') like '%org-logos%' or coalesce(with_check, '') like '%org-logos%')),
  0,
  'Keine Policy auf storage.objects für org-logos (kein Schreiben über die API)'
);

-- ------------------------------------------------------------
-- Als Learner in Betrieb A
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000601', 'role', 'authenticated')::text, true);

select is(
  (select logo_pfad from organisation where id = '00000000-0000-0000-0000-000000000611'),
  '3f2b8c1e-0d4a-4b6e-9c7f-1a2b3c4d5e6f.png',
  'Learner sehen den Logo-Pfad der eigenen Organisation'
);
select is(
  (select count(*)::int from organisation where id = '00000000-0000-0000-0000-000000000612'),
  0,
  'Learner sehen die Organisation eines anderen Betriebs nicht (SR-06)'
);
update organisation set logo_pfad = null where id = '00000000-0000-0000-0000-000000000611';
select is(
  (select logo_pfad from organisation where id = '00000000-0000-0000-0000-000000000611'),
  '3f2b8c1e-0d4a-4b6e-9c7f-1a2b3c4d5e6f.png',
  'Learner können den Logo-Pfad der eigenen Organisation nicht ändern'
);
select throws_like(
  $$insert into storage.objects (bucket_id, name) values ('org-logos', '3f2b8c1e-0d4a-4b6e-9c7f-1a2b3c4d5e6f.png')$$,
  '%row-level security%',
  'Learner können nicht in den Bucket org-logos hochladen'
);

-- ------------------------------------------------------------
-- Als Learner in Betrieb B: sieht weder Zeile noch Pfad von A
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000602', 'role', 'authenticated')::text, true);

select is(
  (select count(*)::int from organisation where id = '00000000-0000-0000-0000-000000000611'),
  0,
  'Learner aus Betrieb B sehen die Organisation A nicht'
);
select is(
  (select count(*)::int from organisation where logo_pfad = '3f2b8c1e-0d4a-4b6e-9c7f-1a2b3c4d5e6f.png'),
  0,
  'Learner aus Betrieb B finden den Logo-Pfad von A nicht'
);
select is(
  (select count(*)::int from organisation where id = '00000000-0000-0000-0000-000000000612' and logo_pfad is null),
  1,
  'Learner aus Betrieb B sehen die eigene Organisation ohne Logo'
);

-- ------------------------------------------------------------
-- Als AfCJ admin: liest alles, setzt Pfade
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000603', 'role', 'authenticated')::text, true);

select is(
  (select count(*)::int from organisation where id in ('00000000-0000-0000-0000-000000000611', '00000000-0000-0000-0000-000000000612')),
  2,
  'AfCJ admin sieht beide Organisationen'
);
update organisation set logo_pfad = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d.webp'
where id = '00000000-0000-0000-0000-000000000612';
select is(
  (select logo_pfad from organisation where id = '00000000-0000-0000-0000-000000000612'),
  '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d.webp',
  'AfCJ admin kann den Logo-Pfad setzen'
);

-- ------------------------------------------------------------
-- Anonym: kein Zugriff auf organisation
-- ------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);

select throws_ok(
  $$select logo_pfad from organisation$$,
  '42501', null,
  'anon kann organisation nicht lesen'
);

select * from finish();
rollback;
