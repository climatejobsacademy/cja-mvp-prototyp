-- 003_field_job_learner_write_scope.test.sql
-- Team-Entscheidung 2026-09-11 (docs/open-questions.md,
-- Q-FIELD-JOB-LEARNER-CONFIRM): Learner darf an field_job ausschließlich
-- durchgefuehrt_bestaetigt_am, ergebnis und problem_beschreibung schreiben,
-- sonst nichts — auch nicht auf der eigenen Zeile.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(8);

-- ------------------------------------------------------------
-- Seed: eine Organisation, ein Learner, zwei field_jobs (einer "eigen" für die
-- Positiv-/Negativ-Spaltentests, einer für den Fremdzugriffs-Test).
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'learner-a@example.test'),
  ('00000000-0000-0000-0000-000000000002', 'learner-b@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000000011', 'Energiehelden', 'employer', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000000001', 'learner-a@example.test', 'Learner A', 'learner_a', 'DE'),
  ('00000000-0000-0000-0000-000000000002', 'learner-b@example.test', 'Learner B', 'learner_b', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000011');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'learner'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000011', 'learner');

insert into field_job_type (id, titel) values
  ('00000000-0000-0000-0000-000000000041', 'Werkstatt-Übung');

insert into field_job (id, organisation_id, datum, field_job_type_id, learner_id, status) values
  ('00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000011', current_date, '00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000001', 'geplant'),
  ('00000000-0000-0000-0000-000000000052', '00000000-0000-0000-0000-000000000011', current_date, '00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000002', 'geplant');

-- ------------------------------------------------------------
-- Als Learner A
-- ------------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text,
  true
);

select lives_ok(
  $$ update field_job set durchgefuehrt_bestaetigt_am = now(), ergebnis = 'erledigt'
     where id = '00000000-0000-0000-0000-000000000051' $$,
  'Learner A darf die drei erlaubten Felder auf dem eigenen field_job schreiben'
);

select is(
  (select status from field_job where id = '00000000-0000-0000-0000-000000000051'),
  'durchgeführt',
  'fn_derive_field_job_status setzt status automatisch, sobald durchgefuehrt_bestaetigt_am gesetzt ist'
);

select throws_ok(
  $$ update field_job set standort = 'Werkstatt Nord'
     where id = '00000000-0000-0000-0000-000000000051' $$,
  '42501', NULL,
  'Learner A darf standort nicht schreiben'
);

select throws_ok(
  $$ update field_job set instructor_id = '00000000-0000-0000-0000-000000000002'
     where id = '00000000-0000-0000-0000-000000000051' $$,
  '42501', NULL,
  'Learner A darf instructor_id nicht schreiben'
);

select throws_ok(
  $$ update field_job set datum = current_date + 1
     where id = '00000000-0000-0000-0000-000000000051' $$,
  '42501', NULL,
  'Learner A darf datum nicht schreiben'
);

select throws_ok(
  $$ update field_job set status = 'geplant'
     where id = '00000000-0000-0000-0000-000000000051' $$,
  '42501', NULL,
  'Learner A darf status nicht direkt schreiben (nur über den Trigger abgeleitet)'
);

-- Postgres erlaubt eine datenverändernde CTE (UPDATE ... RETURNING) nur, wenn
-- das WITH selbst die oberste Anweisung ist — nicht verschachtelt als
-- Sub-Select-Ausdruck in einer anderen SELECT-Liste. Deshalb hier als eigene,
-- oberste Anweisung ausgeführt und das Ergebnis über psql \gset in eine
-- Variable geschrieben, die die Assertion danach separat referenziert —
-- inhaltlich unverändert (weiterhin: 0 Zeilen betroffen). Gleiches Muster wie
-- in 002_learner_own_captures.test.sql.
with updated as (
  update field_job set ergebnis = 'erledigt'
  where id = '00000000-0000-0000-0000-000000000052'
  returning 1
)
select count(*)::int as affected_rows from updated
\gset

select is(
  :affected_rows,
  0,
  'Learner A kann field_job von Learner B nicht ändern, auch nicht in den drei erlaubten Feldern'
);

select throws_ok(
  $$ update field_job set problem_beschreibung = 'Werkzeug kaputt'
     where id = '00000000-0000-0000-0000-000000000051' $$,
  '23514', NULL,
  'problem_beschreibung ohne ergebnis = problem verletzt den Constraint'
);

select * from finish();
rollback;
