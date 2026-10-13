-- 010_migration_c.test.sql
-- Migration C (0021):
-- SR-71: content_competency_mapping nimmt nur theoretische, field_job_type_
-- competency_mapping nur praktische Teilschritte auf (Trigger
-- check_competency_step_typ, auch bei UPDATE von competency_step_id).
-- SR-72: competency_fulfilment -- eine Kompetenz gilt erst als erfüllt, wenn
-- ALLE ihr zugeordneten Teilschritte erfüllt sind (AND-Logik).
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(11);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000501', 'learner-mc@example.test'),
  ('00000000-0000-0000-0000-000000000502', 'admin-mc@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000000511', 'Energiehelden', 'employer', 'aktiv'),
  ('00000000-0000-0000-0000-000000000512', 'AfCJ', 'afcj', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000000501', 'learner-mc@example.test', 'Learner Mc', 'learner_mc', 'DE'),
  ('00000000-0000-0000-0000-000000000502', 'admin-mc@example.test', 'Admin Mc', 'admin_mc', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000511'),
  ('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000512');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000511', 'learner'),
  ('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000512', 'afcj_admin');

insert into programme (id, name, kuerzel, status) values
  ('00000000-0000-0000-0000-000000000521', 'EFK Erneuerbare Energien', 'EFK-EE', 'published');

insert into course (id, programme_id, name, typ, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000000522', '00000000-0000-0000-0000-000000000521', 'Kurs Mc', 'asynchron', 1, 'published');

insert into lesson (id, course_id, name, content_type, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000000531', '00000000-0000-0000-0000-000000000522', 'Lektion 1', 'repository', 1, 'published'),
  ('00000000-0000-0000-0000-000000000532', '00000000-0000-0000-0000-000000000522', 'Lektion 2', 'repository', 2, 'published');

insert into field_job_type (id, titel, status, programme_id, reihenfolge) values
  ('00000000-0000-0000-0000-000000000541', 'Field Job Type Mc', 'published', '00000000-0000-0000-0000-000000000521', 1);

insert into competency (id, name, kompetenzbereich, quelle) values
  ('00000000-0000-0000-0000-000000000551', 'Kompetenz mit zwei Teilschritten', 'Elektro', 'EFK-EE');

-- competency_id ist bis zur Drop-Column-Folgemigration noch not null
-- (SR-69, 0019) -- maßgeblich ist competency_competency_step.
insert into competency_step (id, competency_id, name, typ) values
  ('00000000-0000-0000-0000-000000000561', '00000000-0000-0000-0000-000000000551', 'Theorie 1', 'theoretisch'),
  ('00000000-0000-0000-0000-000000000562', '00000000-0000-0000-0000-000000000551', 'Theorie 2', 'theoretisch'),
  ('00000000-0000-0000-0000-000000000563', '00000000-0000-0000-0000-000000000551', 'Praxis 1', 'praktisch');

insert into competency_competency_step (competency_id, competency_step_id) values
  ('00000000-0000-0000-0000-000000000551', '00000000-0000-0000-0000-000000000561'),
  ('00000000-0000-0000-0000-000000000551', '00000000-0000-0000-0000-000000000562');

-- ------------------------------------------------------------
-- SR-71: Typ-Regel der Trigger
-- ------------------------------------------------------------
select lives_ok(
  $$ insert into content_competency_mapping (lesson_id, competency_step_id) values
     ('00000000-0000-0000-0000-000000000531', '00000000-0000-0000-0000-000000000561'),
     ('00000000-0000-0000-0000-000000000532', '00000000-0000-0000-0000-000000000562') $$,
  'Theoretischer Teilschritt lässt sich einer Lektion zuordnen'
);

select lives_ok(
  $$ insert into field_job_type_competency_mapping (field_job_type_id, competency_step_id) values
     ('00000000-0000-0000-0000-000000000541', '00000000-0000-0000-0000-000000000563') $$,
  'Praktischer Teilschritt lässt sich einem Field-Job-Typ zuordnen'
);

select throws_ok(
  $$ insert into field_job_type_competency_mapping (field_job_type_id, competency_step_id) values
     ('00000000-0000-0000-0000-000000000541', '00000000-0000-0000-0000-000000000561') $$,
  '23514', NULL,
  'Theoretischer Teilschritt in field_job_type_competency_mapping schlägt fehl'
);

select throws_ok(
  $$ insert into content_competency_mapping (lesson_id, competency_step_id) values
     ('00000000-0000-0000-0000-000000000531', '00000000-0000-0000-0000-000000000563') $$,
  '23514', NULL,
  'Praktischer Teilschritt in content_competency_mapping schlägt fehl'
);

select throws_ok(
  $$ update content_competency_mapping
     set competency_step_id = '00000000-0000-0000-0000-000000000563'
     where competency_step_id = '00000000-0000-0000-0000-000000000561' $$,
  '23514', NULL,
  'Nachträgliches Umhängen einer Lektions-Zuordnung auf einen praktischen Teilschritt schlägt fehl'
);

-- ------------------------------------------------------------
-- SR-72: AND-Logik in competency_fulfilment
-- ------------------------------------------------------------
select is_empty(
  $$ select 1 from competency_fulfilment
     where learner_id = '00000000-0000-0000-0000-000000000501'
       and competency_id = '00000000-0000-0000-0000-000000000551' $$,
  'Ohne erfüllten Teilschritt gibt es keine Zeile (nicht erfüllt)'
);

-- Lektion 1 abgeschlossen -> Teilschritt "Theorie 1" erfüllt, "Theorie 2" offen.
insert into unit_progress (id, organisation_id, learner_id, lesson_id, status, abgeschlossen_am) values
  ('00000000-0000-0000-0000-000000000571', '00000000-0000-0000-0000-000000000511', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000531', 'abgeschlossen', now());

select is(
  (select erfuellt from competency_fulfilment
   where learner_id = '00000000-0000-0000-0000-000000000501'
     and competency_id = '00000000-0000-0000-0000-000000000551'),
  false,
  'Kompetenz gilt nicht als erfüllt, wenn nur einer von zwei Teilschritten erfüllt ist'
);

select results_eq(
  $$ select teilschritte_erfuellt, teilschritte_gesamt from competency_fulfilment
     where learner_id = '00000000-0000-0000-0000-000000000501'
       and competency_id = '00000000-0000-0000-0000-000000000551' $$,
  $$ values (1, 2) $$,
  'competency_fulfilment zählt 1 von 2 Teilschritten'
);

-- Lektion 2 abgeschlossen -> beide Teilschritte erfüllt.
insert into unit_progress (id, organisation_id, learner_id, lesson_id, status, abgeschlossen_am) values
  ('00000000-0000-0000-0000-000000000572', '00000000-0000-0000-0000-000000000511', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000532', 'abgeschlossen', now());

select is(
  (select erfuellt from competency_fulfilment
   where learner_id = '00000000-0000-0000-0000-000000000501'
     and competency_id = '00000000-0000-0000-0000-000000000551'),
  true,
  'Kompetenz gilt als erfüllt, wenn alle zugeordneten Teilschritte erfüllt sind'
);

-- ------------------------------------------------------------
-- security_invoker: Learner sieht die eigene Zeile, kein anderer Learner-
-- Kontext nötig -- geprüft wird, dass die View für die Rolle lesbar ist und
-- dasselbe Ergebnis liefert wie ohne RLS.
-- ------------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000501', 'role', 'authenticated')::text,
  true
);

select is(
  (select erfuellt from competency_fulfilment
   where competency_id = '00000000-0000-0000-0000-000000000551'),
  true,
  'Learner sieht den eigenen Erfüllungsstatus über competency_fulfilment'
);

-- Kein fester errcode: Postgres lehnt das Löschen aus einer aggregierenden
-- View schon im Rewriter ab (55000), noch bevor die fehlende Berechtigung
-- (42501) geprüft wird -- beides ist hier richtig.
select throws_ok(
  $$ delete from competency_fulfilment $$,
  NULL, NULL,
  'competency_fulfilment ist für Learner nicht beschreibbar'
);

select * from finish();
rollback;
