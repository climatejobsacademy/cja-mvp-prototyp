-- 011_step_and_logic.test.sql
-- SR-63 (0022): AND-Logik auf Teilschritt-Ebene in competency_fulfilment.
-- Ein theoretischer Teilschritt ist erst erfüllt, wenn ALLE zugeordneten
-- Lektionen abgeschlossen sind; ein praktischer erst, wenn zu ALLEN
-- zugeordneten Field-Job-Typen eine verifizierte Selbstauskunft vorliegt.
-- Selbstauskünfte zu nicht zugeordneten Typen zählen nicht.
-- competency_evidence bleibt unverändert bei Teilnachweisen (OR).
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(7);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000601', 'learner-sal@example.test'),
  ('00000000-0000-0000-0000-000000000602', 'admin-sal@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000000611', 'Energiehelden', 'employer', 'aktiv'),
  ('00000000-0000-0000-0000-000000000612', 'AfCJ', 'afcj', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000000601', 'learner-sal@example.test', 'Learner Sal', 'learner_sal', 'DE'),
  ('00000000-0000-0000-0000-000000000602', 'admin-sal@example.test', 'Admin Sal', 'admin_sal', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000611'),
  ('00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000612');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000611', 'learner'),
  ('00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000612', 'afcj_admin');

insert into programme (id, name, kuerzel, status) values
  ('00000000-0000-0000-0000-000000000621', 'EFK Erneuerbare Energien', 'EFK-EE', 'published');

insert into course (id, programme_id, name, typ, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000000622', '00000000-0000-0000-0000-000000000621', 'Kurs Sal', 'asynchron', 1, 'published');

insert into lesson (id, course_id, name, content_type, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000000631', '00000000-0000-0000-0000-000000000622', 'Lektion A', 'repository', 1, 'published'),
  ('00000000-0000-0000-0000-000000000632', '00000000-0000-0000-0000-000000000622', 'Lektion B', 'repository', 2, 'published');

insert into field_job_type (id, titel, status, programme_id, reihenfolge) values
  ('00000000-0000-0000-0000-000000000641', 'Zugeordneter Typ', 'published', '00000000-0000-0000-0000-000000000621', 1),
  ('00000000-0000-0000-0000-000000000642', 'Nicht zugeordneter Typ', 'published', '00000000-0000-0000-0000-000000000621', 2);

insert into competency (id, name, kompetenzbereich, quelle) values
  ('00000000-0000-0000-0000-000000000651', 'Kompetenz Sal', 'Elektro', 'EFK-EE');

-- competency_id ist bis zur Drop-Column-Folgemigration noch not null
-- (SR-69, 0019) -- maßgeblich ist competency_competency_step.
insert into competency_step (id, competency_id, name, typ) values
  ('00000000-0000-0000-0000-000000000661', '00000000-0000-0000-0000-000000000651', 'Theorie mit zwei Lektionen', 'theoretisch'),
  ('00000000-0000-0000-0000-000000000662', '00000000-0000-0000-0000-000000000651', 'Praxis mit einem Typ', 'praktisch');

insert into competency_competency_step (competency_id, competency_step_id) values
  ('00000000-0000-0000-0000-000000000651', '00000000-0000-0000-0000-000000000661'),
  ('00000000-0000-0000-0000-000000000651', '00000000-0000-0000-0000-000000000662');

insert into content_competency_mapping (lesson_id, competency_step_id) values
  ('00000000-0000-0000-0000-000000000631', '00000000-0000-0000-0000-000000000661'),
  ('00000000-0000-0000-0000-000000000632', '00000000-0000-0000-0000-000000000661');

insert into field_job_type_competency_mapping (field_job_type_id, competency_step_id) values
  ('00000000-0000-0000-0000-000000000641', '00000000-0000-0000-0000-000000000662');

-- ------------------------------------------------------------
-- Theoretisch: 1 von 2 Lektionen
-- ------------------------------------------------------------
insert into unit_progress (organisation_id, learner_id, lesson_id, status, abgeschlossen_am) values
  ('00000000-0000-0000-0000-000000000611', '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000631', 'abgeschlossen', now());

select is_empty(
  $$ select 1 from competency_fulfilment
     where learner_id = '00000000-0000-0000-0000-000000000601'
       and competency_id = '00000000-0000-0000-0000-000000000651' $$,
  'Theoretischer Teilschritt ist nach 1 von 2 Lektionen nicht erfüllt (keine Zeile, 0 Teilschritte)'
);

select isnt_empty(
  $$ select 1 from competency_evidence
     where learner_id = '00000000-0000-0000-0000-000000000601'
       and competency_step_id = '00000000-0000-0000-0000-000000000661' $$,
  'competency_evidence liefert weiterhin einen Teilnachweis nach der ersten Lektion (unverändert OR)'
);

-- ------------------------------------------------------------
-- Theoretisch: 2 von 2 Lektionen
-- ------------------------------------------------------------
insert into unit_progress (organisation_id, learner_id, lesson_id, status, abgeschlossen_am) values
  ('00000000-0000-0000-0000-000000000611', '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000632', 'abgeschlossen', now());

select results_eq(
  $$ select teilschritte_erfuellt, teilschritte_gesamt, erfuellt from competency_fulfilment
     where learner_id = '00000000-0000-0000-0000-000000000601'
       and competency_id = '00000000-0000-0000-0000-000000000651' $$,
  $$ values (1, 2, false) $$,
  'Nach 2 von 2 Lektionen ist der theoretische Teilschritt erfüllt, die Kompetenz noch nicht'
);

-- ------------------------------------------------------------
-- Praktisch: verifizierte Selbstauskunft zu einem NICHT zugeordneten Typ
-- ------------------------------------------------------------
insert into field_job (id, organisation_id, datum, field_job_type_id, learner_id) values
  ('00000000-0000-0000-0000-000000000671', '00000000-0000-0000-0000-000000000611', current_date, '00000000-0000-0000-0000-000000000642', '00000000-0000-0000-0000-000000000601'),
  ('00000000-0000-0000-0000-000000000672', '00000000-0000-0000-0000-000000000611', current_date, '00000000-0000-0000-0000-000000000641', '00000000-0000-0000-0000-000000000601');

insert into field_capture (id, organisation_id, learner_id, field_job_id, phase, text) values
  ('00000000-0000-0000-0000-000000000681', '00000000-0000-0000-0000-000000000611', '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000671', 'abschluss', 'Bericht anderer Typ'),
  ('00000000-0000-0000-0000-000000000682', '00000000-0000-0000-0000-000000000611', '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000672', 'abschluss', 'Bericht zugeordneter Typ');

-- Status wird wie in der App nur über verification gesetzt
-- (apply_verification_to_capture, 0009).
insert into verification (organisation_id, field_capture_id, verifiziert_von, entscheidung) values
  ('00000000-0000-0000-0000-000000000611', '00000000-0000-0000-0000-000000000681', '00000000-0000-0000-0000-000000000602', 'verified');

select is(
  (select status from field_capture where id = '00000000-0000-0000-0000-000000000681'),
  'verified',
  'Fixture: verification setzt field_capture.status auf verified'
);

select is(
  (select teilschritte_erfuellt from competency_fulfilment
   where learner_id = '00000000-0000-0000-0000-000000000601'
     and competency_id = '00000000-0000-0000-0000-000000000651'),
  1,
  'Verifizierte Selbstauskunft zu einem nicht zugeordneten Typ erfüllt den praktischen Teilschritt nicht'
);

-- ------------------------------------------------------------
-- Praktisch: verifizierte Selbstauskunft zum zugeordneten Typ
-- ------------------------------------------------------------
insert into verification (organisation_id, field_capture_id, verifiziert_von, entscheidung) values
  ('00000000-0000-0000-0000-000000000611', '00000000-0000-0000-0000-000000000682', '00000000-0000-0000-0000-000000000602', 'verified');

select results_eq(
  $$ select teilschritte_erfuellt, teilschritte_gesamt, erfuellt from competency_fulfilment
     where learner_id = '00000000-0000-0000-0000-000000000601'
       and competency_id = '00000000-0000-0000-0000-000000000651' $$,
  $$ values (2, 2, true) $$,
  'Mit verifizierter Selbstauskunft zum zugeordneten Typ sind beide Teilschritte und die Kompetenz erfüllt'
);

-- ------------------------------------------------------------
-- security_invoker: Learner sieht dasselbe Ergebnis über RLS
-- ------------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000601', 'role', 'authenticated')::text,
  true
);

select results_eq(
  $$ select teilschritte_erfuellt, erfuellt from competency_fulfilment
     where competency_id = '00000000-0000-0000-0000-000000000651' $$,
  $$ values (2, true) $$,
  'Learner sieht den eigenen AND-Erfüllungsstatus über competency_fulfilment'
);

select * from finish();
rollback;
