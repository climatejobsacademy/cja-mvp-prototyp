-- 018_felder_lektion_person.test.sql
-- Kleine Felder (0029; SR-13, SR-73, SR-15, SR-48): lesson.thema,
-- lesson.live_lektion_id (Selbstlern -> Live, 1:1, gleiches Programm),
-- person.rufname (Vorbelegung, Pflicht, selbst änderbar) und der Status
-- "in Bearbeitung" beim ersten Öffnen (Insert durch die lernende Person).
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(19);

-- ------------------------------------------------------------
-- Fixtures (als Superuser)
-- 18001 Lernende A, 18002 Lernende B, 18003 AfCJ admin
-- Programm P1: Live L1, Selbstlernen S1, Live L2, Selbstlernen S2/S3.
-- Programm P2: Live L9.
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000018001', 'felder-a@example.test'),
  ('00000000-0000-0000-0000-000000018002', 'felder-b@example.test'),
  ('00000000-0000-0000-0000-000000018003', 'felder-admin@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000018011', 'Betrieb', 'employer', 'aktiv'),
  ('00000000-0000-0000-0000-000000018012', 'AfCJ', 'afcj', 'aktiv');

-- A ohne Rufname (Vorbelegung aus name), B mit eigenem Rufnamen.
insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000018001', 'felder-a@example.test', 'Lea Maria Muster', 'fd_a', 'DE'),
  ('00000000-0000-0000-0000-000000018003', 'felder-admin@example.test', 'Admin', 'fd_admin', 'DE');
insert into person (id, email, name, username, sprache, rufname) values
  ('00000000-0000-0000-0000-000000018002', 'felder-b@example.test', 'Johannes Beispiel', 'fd_b', 'DE', 'Jo');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000018001', '00000000-0000-0000-0000-000000018011'),
  ('00000000-0000-0000-0000-000000018002', '00000000-0000-0000-0000-000000018011'),
  ('00000000-0000-0000-0000-000000018003', '00000000-0000-0000-0000-000000018012');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000018001', '00000000-0000-0000-0000-000000018011', 'learner'),
  ('00000000-0000-0000-0000-000000018002', '00000000-0000-0000-0000-000000018011', 'learner'),
  ('00000000-0000-0000-0000-000000018003', '00000000-0000-0000-0000-000000018012', 'afcj_admin');

insert into programme (id, name, kuerzel, status) values
  ('00000000-0000-0000-0000-000000018021', 'Programm 1', 'FLD-P1', 'published'),
  ('00000000-0000-0000-0000-000000018022', 'Programm 2', 'FLD-P2', 'published');

insert into course (id, programme_id, name, typ, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000018031', '00000000-0000-0000-0000-000000018021', 'Kurs P1', 'asynchron', 1, 'published'),
  ('00000000-0000-0000-0000-000000018032', '00000000-0000-0000-0000-000000018022', 'Kurs P2', 'asynchron', 1, 'published');

insert into lesson (id, course_id, name, content_type, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000018041', '00000000-0000-0000-0000-000000018031', 'Grundlagen (Der Transistor)', 'live', 1, 'published'),
  ('00000000-0000-0000-0000-000000018042', '00000000-0000-0000-0000-000000018031', 'Grundlagen (Der Transistor)', 'scorm', 2, 'published'),
  ('00000000-0000-0000-0000-000000018043', '00000000-0000-0000-0000-000000018031', 'Messen', 'live', 3, 'published'),
  ('00000000-0000-0000-0000-000000018044', '00000000-0000-0000-0000-000000018031', 'Messen', 'scorm', 4, 'published'),
  ('00000000-0000-0000-0000-000000018045', '00000000-0000-0000-0000-000000018031', 'Messen vertiefen', 'repository', 5, 'published'),
  ('00000000-0000-0000-0000-000000018049', '00000000-0000-0000-0000-000000018032', 'Anderes Programm', 'live', 1, 'published');

insert into cohort (id, programme_id, name, start_datum) values
  ('00000000-0000-0000-0000-000000018051', '00000000-0000-0000-0000-000000018021', 'K1', '2026-11-02');

insert into enrolment (id, organisation_id, learner_id, cohort_id, status) values
  ('00000000-0000-0000-0000-000000018061', '00000000-0000-0000-0000-000000018011', '00000000-0000-0000-0000-000000018001', '00000000-0000-0000-0000-000000018051', 'aktiv'),
  ('00000000-0000-0000-0000-000000018062', '00000000-0000-0000-0000-000000018011', '00000000-0000-0000-0000-000000018002', '00000000-0000-0000-0000-000000018051', 'aktiv');

-- ------------------------------------------------------------
-- Schema, Rufname-Vorbelegung, Thema
-- ------------------------------------------------------------
select has_column('public', 'lesson', 'thema', 'lesson.thema existiert');
select col_not_null('public', 'person', 'rufname', 'person.rufname ist Pflicht');
select is(
  (select rufname from person where id = '00000000-0000-0000-0000-000000018001'),
  'Lea',
  'Ohne Angabe wird der Rufname mit dem ersten Wort des Namens vorbelegt'
);
select is(
  (select rufname from person where id = '00000000-0000-0000-0000-000000018002'),
  'Jo',
  'Ein angegebener Rufname bleibt erhalten'
);
select throws_ok(
  $$update lesson set thema = '  ' where id = '00000000-0000-0000-0000-000000018041'$$,
  '23514', null,
  'Leeres Thema wird abgelehnt'
);

-- ------------------------------------------------------------
-- Selbstlernen -> Live (1:1, gleiches Programm)
-- ------------------------------------------------------------
select lives_ok(
  $$update lesson set live_lektion_id = '00000000-0000-0000-0000-000000018041'
     where id = '00000000-0000-0000-0000-000000018042'$$,
  'Selbstlern-Lektion lässt sich mit ihrer Live-Lektion verknüpfen'
);
select throws_ok(
  $$update lesson set live_lektion_id = '00000000-0000-0000-0000-000000018041'
     where id = '00000000-0000-0000-0000-000000018044'$$,
  '23505', null,
  'Eine Live-Lektion hat höchstens eine Selbstlern-Lektion (1:1)'
);
select throws_ok(
  $$update lesson set live_lektion_id = '00000000-0000-0000-0000-000000018044'
     where id = '00000000-0000-0000-0000-000000018045'$$,
  '23514', null,
  'Ziel muss eine Live-Lektion sein'
);
select throws_ok(
  $$update lesson set live_lektion_id = '00000000-0000-0000-0000-000000018041'
     where id = '00000000-0000-0000-0000-000000018043'$$,
  '23514', null,
  'Eine Live-Lektion verweist nicht selbst auf eine Live-Lektion'
);
select throws_ok(
  $$update lesson set live_lektion_id = '00000000-0000-0000-0000-000000018049'
     where id = '00000000-0000-0000-0000-000000018044'$$,
  '23514', null,
  'Selbstlern- und Live-Lektion müssen zum selben Programm gehören'
);

update lesson set live_lektion_id = '00000000-0000-0000-0000-000000018043'
 where id = '00000000-0000-0000-0000-000000018044';
delete from lesson where id = '00000000-0000-0000-0000-000000018043';
select is(
  (select live_lektion_id from lesson where id = '00000000-0000-0000-0000-000000018044'),
  null,
  'Wird die Live-Lektion gelöscht, bleibt die Selbstlern-Lektion ohne Verknüpfung bestehen'
);

-- ------------------------------------------------------------
-- Als Lernende A
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000018001', 'role', 'authenticated')::text, true);

select results_eq(
  $$select live_lektion_id from lesson where id = '00000000-0000-0000-0000-000000018042'$$,
  $$values ('00000000-0000-0000-0000-000000018041'::uuid)$$,
  'Learner lesen die Verknüpfung Selbstlernen -> Live'
);
select is_empty(
  $$update lesson set thema = 'Von Learner' where id = '00000000-0000-0000-0000-000000018041' returning id$$,
  'Learner ändern das Thema einer Lektion nicht'
);
select results_eq(
  $$update person set rufname = 'Lea M.' where id = '00000000-0000-0000-0000-000000018001' returning rufname$$,
  $$values ('Lea M.'::text)$$,
  'Learner ändern den eigenen Rufnamen'
);
select throws_ok(
  $$update person set rufname = '   ' where id = '00000000-0000-0000-0000-000000018001'$$,
  '23514', null,
  'Leerer Rufname wird abgelehnt'
);
select is_empty(
  $$update person set rufname = 'Fremd' where id = '00000000-0000-0000-0000-000000018002' returning id$$,
  'Learner ändern keinen fremden Rufnamen'
);
select lives_ok(
  $$insert into unit_progress (organisation_id, learner_id, lesson_id, status)
    values ('00000000-0000-0000-0000-000000018011', '00000000-0000-0000-0000-000000018001',
            '00000000-0000-0000-0000-000000018042', 'in Bearbeitung')$$,
  'Beim ersten Öffnen legt die lernende Person "in Bearbeitung" an'
);
select throws_ok(
  $$insert into unit_progress (organisation_id, learner_id, lesson_id, status)
    values ('00000000-0000-0000-0000-000000018011', '00000000-0000-0000-0000-000000018001',
            '00000000-0000-0000-0000-000000018042', 'in Bearbeitung')$$,
  '23505', null,
  'Beim zweiten Öffnen kein zweiter Eintrag (die App ignoriert den Konflikt)'
);
select throws_ok(
  $$insert into unit_progress (organisation_id, learner_id, lesson_id, status)
    values ('00000000-0000-0000-0000-000000018011', '00000000-0000-0000-0000-000000018002',
            '00000000-0000-0000-0000-000000018042', 'in Bearbeitung')$$,
  '42501', null,
  'Learner legen keinen Fortschritt für andere an'
);

reset role;

select * from finish();
rollback;
