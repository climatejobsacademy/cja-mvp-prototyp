-- 017_modul_ebene.test.sql
-- Modul-Ebene (0028, SR-05): Tabelle modul über den Wochen in module,
-- Wochentyp/Lage, Kompetenzen je Modul (modul_competency) und Zeitraum je
-- Modul aus dem Stundenplan (fn_modul_zeitraum). Learner lesen nur
-- veröffentlichte Module, schreiben nichts; AfCJ admin schreibt.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(21);

-- ------------------------------------------------------------
-- Fixtures (als Superuser)
-- 17001 Lernende A, 17002 Lernende B (beide Kohorte K1), 17003 AfCJ admin
-- Programm P1: Modul I (Woche 1, Theorie), Modul II (Woche 2, Praxis),
-- Abschluss (unveröffentlicht, Woche 3 ohne Termine). Programm P2: ein Modul.
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000017001', 'modul-a@example.test'),
  ('00000000-0000-0000-0000-000000017002', 'modul-b@example.test'),
  ('00000000-0000-0000-0000-000000017003', 'modul-admin@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000017011', 'Betrieb', 'employer', 'aktiv'),
  ('00000000-0000-0000-0000-000000017012', 'AfCJ', 'afcj', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000017001', 'modul-a@example.test', 'Lernende A', 'md_a', 'DE'),
  ('00000000-0000-0000-0000-000000017002', 'modul-b@example.test', 'Lernende B', 'md_b', 'DE'),
  ('00000000-0000-0000-0000-000000017003', 'modul-admin@example.test', 'Admin', 'md_admin', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000017001', '00000000-0000-0000-0000-000000017011'),
  ('00000000-0000-0000-0000-000000017002', '00000000-0000-0000-0000-000000017011'),
  ('00000000-0000-0000-0000-000000017003', '00000000-0000-0000-0000-000000017012');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000017001', '00000000-0000-0000-0000-000000017011', 'learner'),
  ('00000000-0000-0000-0000-000000017002', '00000000-0000-0000-0000-000000017011', 'learner'),
  ('00000000-0000-0000-0000-000000017003', '00000000-0000-0000-0000-000000017012', 'afcj_admin');

insert into programme (id, name, kuerzel, status) values
  ('00000000-0000-0000-0000-000000017021', 'Programm 1', 'MOD-P1', 'published'),
  ('00000000-0000-0000-0000-000000017022', 'Programm 2', 'MOD-P2', 'published');

insert into modul (id, programme_id, ueberzeile, name, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000017031', '00000000-0000-0000-0000-000000017021', 'Modul I', 'Grundlagen', 1, 'published'),
  ('00000000-0000-0000-0000-000000017032', '00000000-0000-0000-0000-000000017021', 'Modul II', 'Installation', 2, 'published'),
  ('00000000-0000-0000-0000-000000017033', '00000000-0000-0000-0000-000000017021', 'Abschluss', 'Prüfungsvorbereitung', 3, 'unpublished'),
  ('00000000-0000-0000-0000-000000017034', '00000000-0000-0000-0000-000000017022', 'Modul I', 'Anderes Programm', 1, 'published');

insert into module (id, programme_id, modul_id, name, reihenfolge, status, wochentyp, lage) values
  ('00000000-0000-0000-0000-000000017041', '00000000-0000-0000-0000-000000017021', '00000000-0000-0000-0000-000000017031', 'Woche 1 – Theorie (online)', 1, 'published', 'theorie', 'online'),
  ('00000000-0000-0000-0000-000000017042', '00000000-0000-0000-0000-000000017021', '00000000-0000-0000-0000-000000017032', 'Woche 2 – Praxis (präsenz)', 2, 'published', 'praxis', 'praesenz'),
  ('00000000-0000-0000-0000-000000017043', '00000000-0000-0000-0000-000000017021', '00000000-0000-0000-0000-000000017033', 'Woche 3 – Theorie (online)', 3, 'published', 'theorie', 'online');

insert into course (id, module_id, name, typ, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000017051', '00000000-0000-0000-0000-000000017041', 'Kurs Woche 1', 'asynchron', 1, 'published');

insert into lesson (id, course_id, name, content_type, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000017052', '00000000-0000-0000-0000-000000017051', 'Lektion Woche 1', 'scorm', 1, 'published');

insert into field_job_type (id, titel, module_id, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000017061', 'Praxisauftrag Woche 2', '00000000-0000-0000-0000-000000017042', 1, 'published');

insert into cohort (id, programme_id, name, start_datum) values
  ('00000000-0000-0000-0000-000000017071', '00000000-0000-0000-0000-000000017021', 'K1', '2026-11-02');

insert into enrolment (id, organisation_id, learner_id, cohort_id, status) values
  ('00000000-0000-0000-0000-000000017081', '00000000-0000-0000-0000-000000017011', '00000000-0000-0000-0000-000000017001', '00000000-0000-0000-0000-000000017071', 'aktiv'),
  ('00000000-0000-0000-0000-000000017082', '00000000-0000-0000-0000-000000017011', '00000000-0000-0000-0000-000000017002', '00000000-0000-0000-0000-000000017071', 'aktiv');

insert into field_job (id, organisation_id, datum, field_job_type_id, learner_id) values
  ('00000000-0000-0000-0000-000000017091', '00000000-0000-0000-0000-000000017011', '2026-11-16', '00000000-0000-0000-0000-000000017061', '00000000-0000-0000-0000-000000017001'),
  ('00000000-0000-0000-0000-000000017092', '00000000-0000-0000-0000-000000017011', '2026-11-27', '00000000-0000-0000-0000-000000017061', '00000000-0000-0000-0000-000000017002');

-- Kohortenweit: Lektion am 02.11., Kurs am 06.11. (Modul I).
-- Persönlich: Praxistag A am 16.11., Praxistag B am 27.11. (Modul II).
insert into schedule_entry (organisation_id, datum, art, reihenfolge, cohort_id, enrolment_id, lesson_id, course_id, field_job_id) values
  ('00000000-0000-0000-0000-000000017011', '2026-11-02', 'asynchron', 1, '00000000-0000-0000-0000-000000017071', null, '00000000-0000-0000-0000-000000017052', null, null),
  ('00000000-0000-0000-0000-000000017011', '2026-11-06', 'asynchron', 1, '00000000-0000-0000-0000-000000017071', null, null, '00000000-0000-0000-0000-000000017051', null),
  ('00000000-0000-0000-0000-000000017011', '2026-11-16', 'feld', 1, null, '00000000-0000-0000-0000-000000017081', null, null, '00000000-0000-0000-0000-000000017091'),
  ('00000000-0000-0000-0000-000000017011', '2026-11-27', 'feld', 1, null, '00000000-0000-0000-0000-000000017082', null, null, '00000000-0000-0000-0000-000000017092');

insert into competency (id, name, kompetenzbereich, quelle) values
  ('00000000-0000-0000-0000-000000017101', 'Kompetenz 1', 'Bereich', 'EFK-EE'),
  ('00000000-0000-0000-0000-000000017102', 'Kompetenz 2', 'Bereich', 'EFK-EE');

insert into modul_competency (modul_id, competency_id, kuerzel, reihenfolge) values
  ('00000000-0000-0000-0000-000000017031', '00000000-0000-0000-0000-000000017101', 'M1.01', 1),
  ('00000000-0000-0000-0000-000000017033', '00000000-0000-0000-0000-000000017102', 'A.01', 1);

-- ------------------------------------------------------------
-- Schema und Konsistenz
-- ------------------------------------------------------------
select has_table('public', 'modul', 'Tabelle modul existiert');
select has_table('public', 'modul_competency', 'Tabelle modul_competency existiert');
select col_not_null('public', 'module', 'modul_id', 'module.modul_id ist Pflicht');
select col_not_null('public', 'module', 'wochentyp', 'module.wochentyp ist Pflicht');
select col_not_null('public', 'module', 'lage', 'module.lage ist Pflicht');

select throws_ok(
  $$insert into module (programme_id, modul_id, name, reihenfolge, wochentyp, lage)
    values ('00000000-0000-0000-0000-000000017021', '00000000-0000-0000-0000-000000017031', 'Woche X', 9, 'gemischt', 'online')$$,
  '23514', null,
  'Unbekannter Wochentyp wird abgelehnt'
);
select throws_ok(
  $$insert into module (programme_id, modul_id, name, reihenfolge, wochentyp, lage)
    values ('00000000-0000-0000-0000-000000017021', '00000000-0000-0000-0000-000000017031', 'Woche X', 9, 'theorie', 'betrieb')$$,
  '23514', null,
  'Lage betrieb nur bei Praxiswochen'
);
select throws_ok(
  $$insert into module (programme_id, modul_id, name, reihenfolge, wochentyp, lage)
    values ('00000000-0000-0000-0000-000000017021', '00000000-0000-0000-0000-000000017034', 'Woche X', 9, 'theorie', 'online')$$,
  '23503', null,
  'Woche und Modul müssen zum selben Programm gehören'
);
select throws_ok(
  $$delete from modul where id = '00000000-0000-0000-0000-000000017031'$$,
  '23503', null,
  'Ein Modul mit Wochen lässt sich nicht löschen (kein Kaskadieren auf Kurse und Fortschritt)'
);

-- Reihenfolge tauschen in einer Transaktion (deferrable), danach eindeutig.
update modul set reihenfolge = 2 where id = '00000000-0000-0000-0000-000000017031';
update modul set reihenfolge = 1 where id = '00000000-0000-0000-0000-000000017032';
select lives_ok(
  $$set constraints modul_reihenfolge_eindeutig immediate$$,
  'Modul-Reihenfolge lässt sich in einer Transaktion tauschen'
);
select throws_ok(
  $$insert into modul (programme_id, ueberzeile, name, reihenfolge)
    values ('00000000-0000-0000-0000-000000017021', 'Modul X', 'Doppelt', 1)$$,
  '23505', null,
  'Modul-Reihenfolge ist je Programm eindeutig'
);
select throws_ok(
  $$insert into modul_competency (modul_id, competency_id, kuerzel, reihenfolge)
    values ('00000000-0000-0000-0000-000000017031', '00000000-0000-0000-0000-000000017102', 'M1.01', 2)$$,
  '23505', null,
  'Kürzel einer Kompetenz ist je Modul eindeutig'
);

select results_eq(
  $$select modul_id, von, bis from fn_modul_zeitraum('00000000-0000-0000-0000-000000017071') order by modul_id$$,
  $$values ('00000000-0000-0000-0000-000000017031'::uuid, '2026-11-02'::date, '2026-11-06'::date),
           ('00000000-0000-0000-0000-000000017032'::uuid, '2026-11-16'::date, '2026-11-27'::date)$$,
  'Zeitraum je Modul aus Lektion, Kurs und Praxistagen; Modul ohne Termine fehlt'
);
select is(has_function_privilege('anon', 'fn_modul_zeitraum(uuid)', 'execute'), false,
  'anon darf fn_modul_zeitraum nicht ausführen');

-- ------------------------------------------------------------
-- Als Lernende A
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000017001', 'role', 'authenticated')::text, true);

select results_eq(
  $$select id from modul where programme_id = '00000000-0000-0000-0000-000000017021' order by id$$,
  $$values ('00000000-0000-0000-0000-000000017031'::uuid), ('00000000-0000-0000-0000-000000017032'::uuid)$$,
  'Learner sehen nur veröffentlichte Module'
);
select results_eq(
  $$select kuerzel from modul_competency$$,
  $$values ('M1.01'::text)$$,
  'Learner sehen Kompetenzen nur an veröffentlichten Modulen'
);
select results_eq(
  $$select modul_id, von, bis from fn_modul_zeitraum('00000000-0000-0000-0000-000000017071') order by modul_id$$,
  $$values ('00000000-0000-0000-0000-000000017031'::uuid, '2026-11-02'::date, '2026-11-06'::date),
           ('00000000-0000-0000-0000-000000017032'::uuid, '2026-11-16'::date, '2026-11-16'::date)$$,
  'Learner bekommen den Zeitraum aus dem eigenen Stundenplan (fremder Praxistag zählt nicht)'
);
select throws_ok(
  $$insert into modul (programme_id, ueberzeile, name, reihenfolge)
    values ('00000000-0000-0000-0000-000000017022', 'Modul II', 'Von Learner', 2)$$,
  '42501', null,
  'Learner legen keine Module an'
);
select is_empty(
  $$update modul set name = 'Geändert' where id = '00000000-0000-0000-0000-000000017031' returning id$$,
  'Learner ändern keine Module'
);

-- ------------------------------------------------------------
-- Als AfCJ admin
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000017003', 'role', 'authenticated')::text, true);

select lives_ok(
  $$insert into modul (programme_id, ueberzeile, name, reihenfolge)
    values ('00000000-0000-0000-0000-000000017022', 'Modul II', 'Vom Admin', 2)$$,
  'AfCJ admin legt Module an'
);
select results_eq(
  $$select modul_id, von, bis from fn_modul_zeitraum('00000000-0000-0000-0000-000000017071') order by modul_id$$,
  $$values ('00000000-0000-0000-0000-000000017031'::uuid, '2026-11-02'::date, '2026-11-06'::date),
           ('00000000-0000-0000-0000-000000017032'::uuid, '2026-11-16'::date, '2026-11-27'::date)$$,
  'AfCJ admin bekommt den Zeitraum über alle Einträge der Kohorte'
);

reset role;

select * from finish();
rollback;
