-- 029_kohorte_moderation_kohorte_lesen.test.sql
-- 0056 (SR-83, SR-75): Moderierende (kohorte_moderation) lesen die Kohorte,
-- die sie moderieren, und moderieren dort den Chat; sonst nichts Neues.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(8);

-- Fixtures: M1 Rolle trainer ohne Termine, moderiert K1; T2 Rolle trainer ohne Termine, ohne Moderation
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000029001', 'mod-m1@example.test'),
  ('00000000-0000-0000-0000-000000029002', 'mod-t2@example.test'),
  ('00000000-0000-0000-0000-000000029003', 'mod-l1@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000029011', 'Betrieb A', 'employer', 'aktiv'),
  ('00000000-0000-0000-0000-000000029013', 'AfCJ', 'afcj', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000029001', 'mod-m1@example.test', 'Moderation Eins', 'mod_m1', 'DE'),
  ('00000000-0000-0000-0000-000000029002', 'mod-t2@example.test', 'Trainer Ohne', 'mod_t2', 'DE'),
  ('00000000-0000-0000-0000-000000029003', 'mod-l1@example.test', 'Lerner Eins', 'mod_l1', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000029001', '00000000-0000-0000-0000-000000029013'),
  ('00000000-0000-0000-0000-000000029002', '00000000-0000-0000-0000-000000029013'),
  ('00000000-0000-0000-0000-000000029003', '00000000-0000-0000-0000-000000029011');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000029001', '00000000-0000-0000-0000-000000029013', 'trainer'),
  ('00000000-0000-0000-0000-000000029002', '00000000-0000-0000-0000-000000029013', 'trainer'),
  ('00000000-0000-0000-0000-000000029003', '00000000-0000-0000-0000-000000029011', 'learner');

insert into programme (id, name, kuerzel, status) values
  ('00000000-0000-0000-0000-000000029021', 'Programm', 'MOD-P1', 'published');

insert into cohort (id, programme_id, name, start_datum, chat_aktiv) values
  ('00000000-0000-0000-0000-000000029051', '00000000-0000-0000-0000-000000029021', 'K1', '2026-11-02', true),
  ('00000000-0000-0000-0000-000000029052', '00000000-0000-0000-0000-000000029021', 'K2', '2026-11-02', true);

insert into enrolment (organisation_id, learner_id, cohort_id, status) values
  ('00000000-0000-0000-0000-000000029011', '00000000-0000-0000-0000-000000029003', '00000000-0000-0000-0000-000000029051', 'aktiv');

insert into kohorte_moderation (cohort_id, person_id) values
  ('00000000-0000-0000-0000-000000029051', '00000000-0000-0000-0000-000000029001');

-- Als M1
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000029001', 'role', 'authenticated')::text, true);

select is((select count(*)::int from cohort where id = '00000000-0000-0000-0000-000000029051'), 1,
  'Moderierende lesen die moderierte Kohorte');
select is((select count(*)::int from cohort where id = '00000000-0000-0000-0000-000000029052'), 0,
  'Moderierende lesen keine andere Kohorte');
select ok(fn_chat_moderiert('00000000-0000-0000-0000-000000029051'),
  'Moderierende moderieren den Chat der Kohorte');
select lives_ok(
  $$insert into chat_nachricht (cohort_id, kanal, text)
    values ('00000000-0000-0000-0000-000000029051', 'ankuendigungen', 'Hallo zusammen')$$,
  'Moderierende schreiben in Ankündigungen');
select is((select count(*)::int from enrolment), 0,
  'Moderierende lesen keine Einschreibungen');
select is((select count(*)::int from schedule_entry), 0,
  'Moderierende lesen keine Stundenplan-Einträge');

-- Als T2 (Trainer-Rolle ohne Termine und ohne Moderation)
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000029002', 'role', 'authenticated')::text, true);

select is((select count(*)::int from cohort), 0,
  'Trainer:innen ohne Termin und ohne Moderation lesen keine Kohorte');
select ok(not fn_chat_moderiert('00000000-0000-0000-0000-000000029051'),
  'Trainer:innen ohne Termin und ohne Moderation moderieren nicht');

select * from finish();
rollback;
