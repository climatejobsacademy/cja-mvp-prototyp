-- 045_fachsprache_erledigt.test.sql
-- SR-84 (Migration 0074): „erledigt“ je Person und Einheit. Nur über
-- fn_fachsprache_erledigt_setzen, nur für lesbare, veröffentlichte Einheiten,
-- idempotent; Lernende lesen nur die eigenen Zeilen, schreiben nie direkt;
-- es entstehen weder unit_progress noch competency_evidence.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(12);

-- Fixtures (als Superuser): 45001 L1 (Kohorte K1), 45002 L2 (Kohorte K1),
-- 45003 L3 (Kohorte K2, anderes Programm), 45004 Trainer:in.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000045001', 'fe-l1@example.test'),
  ('00000000-0000-0000-0000-000000045002', 'fe-l2@example.test'),
  ('00000000-0000-0000-0000-000000045003', 'fe-l3@example.test'),
  ('00000000-0000-0000-0000-000000045004', 'fe-tr@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000045011', 'Betrieb A', 'employer', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000045001', 'fe-l1@example.test', 'Lernende Eins', 'fe_l1', 'DE'),
  ('00000000-0000-0000-0000-000000045002', 'fe-l2@example.test', 'Lernende Zwei', 'fe_l2', 'DE'),
  ('00000000-0000-0000-0000-000000045003', 'fe-l3@example.test', 'Lernende Drei', 'fe_l3', 'DE'),
  ('00000000-0000-0000-0000-000000045004', 'fe-tr@example.test', 'Trainerin', 'fe_tr', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000045001', '00000000-0000-0000-0000-000000045011'),
  ('00000000-0000-0000-0000-000000045002', '00000000-0000-0000-0000-000000045011'),
  ('00000000-0000-0000-0000-000000045003', '00000000-0000-0000-0000-000000045011'),
  ('00000000-0000-0000-0000-000000045004', '00000000-0000-0000-0000-000000045011');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000045001', '00000000-0000-0000-0000-000000045011', 'learner'),
  ('00000000-0000-0000-0000-000000045002', '00000000-0000-0000-0000-000000045011', 'learner'),
  ('00000000-0000-0000-0000-000000045003', '00000000-0000-0000-0000-000000045011', 'learner'),
  ('00000000-0000-0000-0000-000000045004', '00000000-0000-0000-0000-000000045011', 'trainer');

insert into programme (id, name, kuerzel, status) values
  ('00000000-0000-0000-0000-000000045021', 'Programm 1', 'FE-P1', 'published'),
  ('00000000-0000-0000-0000-000000045022', 'Programm 2', 'FE-P2', 'published');

insert into course (id, programme_id, name, typ, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000045031', '00000000-0000-0000-0000-000000045021', 'Kurs 1', 'synchron', 1, 'published');

insert into lesson (id, course_id, name, content_type, reihenfolge, status) values
  ('00000000-0000-0000-0000-0000000450a1', '00000000-0000-0000-0000-000000045031', 'LA', 'live', 1, 'published'),
  ('00000000-0000-0000-0000-0000000450a2', '00000000-0000-0000-0000-000000045031', 'LB', 'live', 2, 'published');

insert into cohort (id, programme_id, name, start_datum) values
  ('00000000-0000-0000-0000-000000045051', '00000000-0000-0000-0000-000000045021', 'K1', '2026-11-02'),
  ('00000000-0000-0000-0000-000000045052', '00000000-0000-0000-0000-000000045022', 'K2', '2026-11-02');

insert into enrolment (id, organisation_id, learner_id, cohort_id, status) values
  ('00000000-0000-0000-0000-000000045061', '00000000-0000-0000-0000-000000045011', '00000000-0000-0000-0000-000000045001', '00000000-0000-0000-0000-000000045051', 'aktiv'),
  ('00000000-0000-0000-0000-000000045062', '00000000-0000-0000-0000-000000045011', '00000000-0000-0000-0000-000000045002', '00000000-0000-0000-0000-000000045051', 'aktiv'),
  ('00000000-0000-0000-0000-000000045063', '00000000-0000-0000-0000-000000045011', '00000000-0000-0000-0000-000000045003', '00000000-0000-0000-0000-000000045052', 'aktiv');

-- EA veröffentlicht (Lektion LA), EB Entwurf (Lektion LB)
insert into fachsprache_einheit (id, lesson_id, titel, inhalt, status) values
  ('00000000-0000-0000-0000-0000000450b1', '00000000-0000-0000-0000-0000000450a1', 'Einheit A',
   '{"wortkarten":[{"wort":"die Diode","erklaerung":"Ein Bauteil.","beispiel":"Ich prüfe die Diode."}],"quiz":[{"frage":"Was ist eine Diode?","antworten":["A","B"],"richtig":0,"erklaerung":"Weil A."}],"saetze":[]}',
   'veroeffentlicht');
insert into fachsprache_einheit (id, lesson_id, titel, inhalt) values
  ('00000000-0000-0000-0000-0000000450b2', '00000000-0000-0000-0000-0000000450a2', 'Einheit B',
   '{"wortkarten":[{"wort":"der Leiter","erklaerung":"Leitet Strom.","beispiel":"Der Leiter ist aus Kupfer."}],"quiz":[{"frage":"Was leitet?","antworten":["A","B"],"richtig":0,"erklaerung":"Weil A."}],"saetze":[]}');

-- Zeilen, die ein DML-Befehl unter den Rechten des aktuellen Users trifft
create function pg_temp.zeilen(p_sql text) returns integer
language plpgsql as $$
declare n integer;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end;
$$;
grant execute on function pg_temp.zeilen(text) to public;

set local role authenticated;

-- L1
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000045001', 'role', 'authenticated')::text, true);

select is(fn_fachsprache_erledigt_setzen('00000000-0000-0000-0000-0000000450b1'), true,
  'SR-84: veröffentlichte, lesbare Einheit wird als erledigt gespeichert');
select is(fn_fachsprache_erledigt_setzen('00000000-0000-0000-0000-0000000450b1'), false,
  'SR-84: zweiter Aufruf ändert nichts (einmal je Person und Einheit)');
select is((select count(*)::int from fachsprache_erledigt), 1,
  'SR-84: Lernende sehen die eigene Zeile');
select throws_ok(
  $$select fn_fachsprache_erledigt_setzen('00000000-0000-0000-0000-0000000450b2')$$,
  'P0002', null,
  'SR-84: Einheit im Entwurf lässt sich nicht als erledigt speichern');
select throws_ok(
  $$insert into fachsprache_erledigt (organisation_id, learner_id, einheit_id)
    values ('00000000-0000-0000-0000-000000045011', '00000000-0000-0000-0000-000000045001', '00000000-0000-0000-0000-0000000450b2')$$,
  '42501', null,
  'SR-84: Lernende schreiben nicht direkt in die Tabelle');
select is(pg_temp.zeilen('delete from fachsprache_erledigt'), 0,
  'SR-84: Lernende löschen keine Zeilen');

-- L2 (gleiche Kohorte): sieht die Zeile von L1 nicht
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000045002', 'role', 'authenticated')::text, true);
select is_empty($$select 1 from fachsprache_erledigt$$,
  'SR-84: andere Lernende derselben Kohorte sehen nichts');

-- L3 (anderes Programm): darf die Einheit nicht lesen
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000045003', 'role', 'authenticated')::text, true);
select throws_ok(
  $$select fn_fachsprache_erledigt_setzen('00000000-0000-0000-0000-0000000450b1')$$,
  'P0002', null,
  'SR-84: ohne Zugang zur Lektion kein Speichern');

-- Trainer:in sieht nichts
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000045004', 'role', 'authenticated')::text, true);
select is_empty($$select 1 from fachsprache_erledigt$$,
  'SR-84: Trainer:innen sehen den Stand nicht');

reset role;

select is(
  (select organisation_id from fachsprache_erledigt where learner_id = '00000000-0000-0000-0000-000000045001'),
  '00000000-0000-0000-0000-000000045011'::uuid,
  'SR-84: Organisation kommt aus der Einschreibung');
select is_empty(
  $$select 1 from unit_progress where learner_id = '00000000-0000-0000-0000-000000045001'
    union all select 1 from competency_evidence where learner_id = '00000000-0000-0000-0000-000000045001'$$,
  'SR-84: weder unit_progress noch competency_evidence entstehen');

delete from person where id = '00000000-0000-0000-0000-000000045001';
select is_empty(
  $$select 1 from fachsprache_erledigt where learner_id = '00000000-0000-0000-0000-000000045001'$$,
  'SR-84: Löschweg entfernt den Stand mit der Person');

select * from finish();
rollback;
