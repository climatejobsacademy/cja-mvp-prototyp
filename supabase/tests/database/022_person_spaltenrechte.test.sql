-- 022_person_spaltenrechte.test.sql
-- Eigene person-Zeile (0033, SR-77): Rufname und Profilfoto selbst änderbar,
-- alle anderen Spalten nicht; fremde Zeilen weiterhin nicht.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(11);

-- ------------------------------------------------------------
-- Fixtures (als Superuser): 22001 Lernende A, 22002 Lernende B
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000022001', 'spalten-a@example.test'),
  ('00000000-0000-0000-0000-000000022002', 'spalten-b@example.test');

insert into person (id, email, name, username, sprache, vorerfahrung) values
  ('00000000-0000-0000-0000-000000022001', 'spalten-a@example.test', 'Anna Muster', 'sp_a', 'DE', 'keine'),
  ('00000000-0000-0000-0000-000000022002', 'spalten-b@example.test', 'Ben Beispiel', 'sp_b', 'DE', null);

select is(has_column_privilege('authenticated', 'person', 'rufname', 'update'), true, 'rufname: Update-Recht');
select is(has_column_privilege('authenticated', 'person', 'email', 'update'), false, 'email: kein Update-Recht');

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000022001', 'role', 'authenticated')::text, true);

select lives_ok($$update person set rufname = 'Anni' where id = '00000000-0000-0000-0000-000000022001'$$,
  'A ändert den eigenen Rufnamen');
select lives_ok($$update person set foto_pfad = null where id = '00000000-0000-0000-0000-000000022001'$$,
  'A entfernt das eigene Foto');
select throws_ok($$update person set email = 'neu@example.test' where id = '00000000-0000-0000-0000-000000022001'$$,
  '42501', null, 'A ändert die eigene E-Mail nicht');
select throws_ok($$update person set name = 'Anders' where id = '00000000-0000-0000-0000-000000022001'$$,
  '42501', null, 'A ändert den eigenen Namen nicht');
select throws_ok($$update person set username = 'neu' where id = '00000000-0000-0000-0000-000000022001'$$,
  '42501', null, 'A ändert den Benutzernamen nicht');
select throws_ok($$update person set geburtsdatum = '2000-01-01' where id = '00000000-0000-0000-0000-000000022001'$$,
  '42501', null, 'A ändert das Geburtsdatum nicht');
select throws_ok($$update person set vorerfahrung = 'viel' where id = '00000000-0000-0000-0000-000000022001'$$,
  '42501', null, 'A ändert die Vorerfahrung nicht (folgt ggf. mit der Profilseite)');

update person set rufname = 'Fremd' where id = '00000000-0000-0000-0000-000000022002';
reset role;

select is((select rufname from person where id = '00000000-0000-0000-0000-000000022002'), 'Ben',
  'Fremder Rufname bleibt unverändert');
select is((select rufname from person where id = '00000000-0000-0000-0000-000000022001'), 'Anni',
  'Eigener Rufname gespeichert');

select * from finish();
rollback;
