-- 020_kompetenz_kann_satz.test.sql
-- competency.kann_satz (0031, SR-80): Spalte nullable, leerer Text
-- abgelehnt; Lernende lesen den Kann-Satz, schreiben ihn aber nicht;
-- AfCJ admin schreibt ihn (bestehende Policies aus 0009).
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(7);

-- ------------------------------------------------------------
-- Fixtures (als Superuser)
-- 20001 Lernende A, 20003 AfCJ admin
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000020001', 'kannsatz-a@example.test'),
  ('00000000-0000-0000-0000-000000020003', 'kannsatz-admin@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000020011', 'Betrieb', 'employer', 'aktiv'),
  ('00000000-0000-0000-0000-000000020012', 'AfCJ', 'afcj', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000020001', 'kannsatz-a@example.test', 'Lernende A', 'ks_a', 'DE'),
  ('00000000-0000-0000-0000-000000020003', 'kannsatz-admin@example.test', 'Admin', 'ks_admin', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000020001', '00000000-0000-0000-0000-000000020011'),
  ('00000000-0000-0000-0000-000000020003', '00000000-0000-0000-0000-000000020012');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000020001', '00000000-0000-0000-0000-000000020011', 'learner'),
  ('00000000-0000-0000-0000-000000020003', '00000000-0000-0000-0000-000000020012', 'afcj_admin');

insert into competency (id, name, kompetenzbereich, quelle, kann_satz) values
  ('00000000-0000-0000-0000-000000020021', 'Sicher löten', 'Löttechnik', 'EFK-EE', 'Kann sicher löten.'),
  ('00000000-0000-0000-0000-000000020022', 'Ohne Kann-Satz', 'Test', 'EFK-EE', null);

-- ------------------------------------------------------------
-- Schema
-- ------------------------------------------------------------
select has_column('public', 'competency', 'kann_satz', 'competency.kann_satz existiert');
select col_is_null('public', 'competency', 'kann_satz', 'kann_satz ist nullable');

select throws_ok(
  $$ insert into competency (name, kompetenzbereich, quelle, kann_satz) values ('Leer', 'Test', 'EFK-EE', '  ') $$,
  '23514', null, 'leerer Kann-Satz wird abgelehnt'
);

-- ------------------------------------------------------------
-- Lernende: lesen ja, schreiben nein
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000020001", "role": "authenticated"}', true);

select is(
  (select kann_satz from competency where id = '00000000-0000-0000-0000-000000020021'),
  'Kann sicher löten.',
  'Lernende lesen den Kann-Satz'
);

update competency set kann_satz = 'Geändert.' where id = '00000000-0000-0000-0000-000000020021';
reset role;
select is(
  (select kann_satz from competency where id = '00000000-0000-0000-0000-000000020021'),
  'Kann sicher löten.',
  'Lernende ändern den Kann-Satz nicht (keine Zeile betroffen)'
);

-- ------------------------------------------------------------
-- AfCJ admin: schreiben ja
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000020003", "role": "authenticated"}', true);

select lives_ok(
  $$ update competency set kann_satz = 'Kann etwas Neues.' where id = '00000000-0000-0000-0000-000000020022' $$,
  'AfCJ admin setzt den Kann-Satz'
);
reset role;
select is(
  (select kann_satz from competency where id = '00000000-0000-0000-0000-000000020022'),
  'Kann etwas Neues.',
  'Kann-Satz von AfCJ admin gespeichert'
);

select * from finish();
rollback;
