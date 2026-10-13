-- 015_field_job_uhrzeit.test.sql
-- Uhrzeit des Praxistags (0026, SR-13): field_job.start/ende sind time und
-- nullable, nur paarweise gesetzt und ende > start. Lernende lesen die
-- eigenen Zeiten, nicht die anderer, und dürfen sie nicht ändern (Spalten-
-- Grant aus 0012 unverändert). AfCJ admin liest alle Zeiten; gesetzt werden
-- sie über Dashboard/SQL (hier: Superuser).
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(17);

-- ------------------------------------------------------------
-- Fixtures (als Superuser)
-- 1501 und 1502 Learner im Betrieb, 1503 AfCJ admin
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000001501', 'praxis-a@example.test'),
  ('00000000-0000-0000-0000-000000001502', 'praxis-b@example.test'),
  ('00000000-0000-0000-0000-000000001503', 'praxis-admin@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000001511', 'Betrieb', 'employer', 'aktiv'),
  ('00000000-0000-0000-0000-000000001512', 'AfCJ', 'afcj', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000001501', 'praxis-a@example.test', 'Praxis A', 'praxis_a', 'DE'),
  ('00000000-0000-0000-0000-000000001502', 'praxis-b@example.test', 'Praxis B', 'praxis_b', 'DE'),
  ('00000000-0000-0000-0000-000000001503', 'praxis-admin@example.test', 'Praxis Admin', 'praxis_admin', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000001501', '00000000-0000-0000-0000-000000001511'),
  ('00000000-0000-0000-0000-000000001502', '00000000-0000-0000-0000-000000001511'),
  ('00000000-0000-0000-0000-000000001503', '00000000-0000-0000-0000-000000001512');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000001501', '00000000-0000-0000-0000-000000001511', 'learner'),
  ('00000000-0000-0000-0000-000000001502', '00000000-0000-0000-0000-000000001511', 'learner'),
  ('00000000-0000-0000-0000-000000001503', '00000000-0000-0000-0000-000000001512', 'afcj_admin');

insert into programme (id, name, kuerzel, status) values
  ('00000000-0000-0000-0000-000000001521', 'Programm Praxis', 'PRG-P', 'published');

insert into field_job_type (id, titel, status, programme_id, reihenfolge) values
  ('00000000-0000-0000-0000-000000001531', 'Praxistyp', 'published', '00000000-0000-0000-0000-000000001521', 1);

-- 1541: Learner A mit Uhrzeit, 1542: Learner B mit Uhrzeit, 1543: Learner A ohne Uhrzeit
insert into field_job (id, organisation_id, datum, standort, start, ende, field_job_type_id, learner_id) values
  ('00000000-0000-0000-0000-000000001541', '00000000-0000-0000-0000-000000001511', current_date, 'Werkstatt', '08:00', '15:30',
   '00000000-0000-0000-0000-000000001531', '00000000-0000-0000-0000-000000001501'),
  ('00000000-0000-0000-0000-000000001542', '00000000-0000-0000-0000-000000001511', current_date, 'Betrieb B', '07:00', '14:00',
   '00000000-0000-0000-0000-000000001531', '00000000-0000-0000-0000-000000001502'),
  ('00000000-0000-0000-0000-000000001543', '00000000-0000-0000-0000-000000001511', current_date + 1, null, null, null,
   '00000000-0000-0000-0000-000000001531', '00000000-0000-0000-0000-000000001501');

-- ------------------------------------------------------------
-- Schema
-- ------------------------------------------------------------
select has_column('public', 'field_job', 'start', 'field_job hat start');
select has_column('public', 'field_job', 'ende', 'field_job hat ende');
select col_type_is('public', 'field_job', 'start', 'time without time zone', 'start ist time');
select col_type_is('public', 'field_job', 'ende', 'time without time zone', 'ende ist time');
select col_is_null('public', 'field_job', 'start', 'start ist nullable');
select col_is_null('public', 'field_job', 'ende', 'ende ist nullable');

-- ------------------------------------------------------------
-- Check-Constraints (als Superuser)
-- ------------------------------------------------------------
select throws_ok(
  $$update field_job set start = '15:00', ende = '15:00' where id = '00000000-0000-0000-0000-000000001541'$$,
  '23514',
  null,
  'ende gleich start wird abgelehnt'
);
select throws_ok(
  $$update field_job set start = '16:00', ende = '09:00' where id = '00000000-0000-0000-0000-000000001541'$$,
  '23514',
  null,
  'ende vor start wird abgelehnt'
);
select throws_ok(
  $$update field_job set start = '08:00' where id = '00000000-0000-0000-0000-000000001543'$$,
  '23514',
  null,
  'nur start ohne ende wird abgelehnt'
);
select throws_ok(
  $$update field_job set ende = '16:00' where id = '00000000-0000-0000-0000-000000001543'$$,
  '23514',
  null,
  'nur ende ohne start wird abgelehnt'
);

-- ------------------------------------------------------------
-- Als Learner A
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000001501', 'role', 'authenticated')::text, true);

select results_eq(
  $$select start::text, ende::text from field_job where id = '00000000-0000-0000-0000-000000001541'$$,
  $$values ('08:00:00', '15:30:00')$$,
  'Learner liest die eigenen Zeiten'
);
select is(
  (select count(*)::int from field_job where id = '00000000-0000-0000-0000-000000001542'),
  0,
  'Learner sieht den Praxistag (und die Zeiten) einer anderen Person nicht'
);
select throws_ok(
  $$update field_job set start = '09:00', ende = '12:00' where id = '00000000-0000-0000-0000-000000001541'$$,
  '42501',
  null,
  'Learner darf die eigenen Zeiten nicht ändern'
);
select lives_ok(
  $$update field_job set ergebnis = 'erledigt' where id = '00000000-0000-0000-0000-000000001541'$$,
  'Learner-Schreibrecht auf ergebnis bleibt unverändert'
);

-- ------------------------------------------------------------
-- Als AfCJ admin: liest alle Zeiten, darf sie über die App aber
-- ebensowenig ändern (Spalten-Grant gilt für die ganze Rolle)
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000001503', 'role', 'authenticated')::text, true);

select is(
  (select count(*)::int from field_job
   where id in ('00000000-0000-0000-0000-000000001541', '00000000-0000-0000-0000-000000001542') and start is not null),
  2,
  'AfCJ admin liest die Zeiten aller Praxistage'
);

-- ------------------------------------------------------------
-- Über Dashboard/SQL (Superuser): Zeiten setzen
-- ------------------------------------------------------------
reset role;

select lives_ok(
  $$update field_job set start = '08:30', ende = '16:00' where id = '00000000-0000-0000-0000-000000001543'$$,
  'Zeiten lassen sich über Dashboard/SQL setzen'
);
select results_eq(
  $$select start::text, ende::text from field_job where id = '00000000-0000-0000-0000-000000001543'$$,
  $$values ('08:30:00', '16:00:00')$$,
  'Gesetzte Zeiten sind gespeichert'
);

select * from finish();
rollback;
