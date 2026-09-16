-- 002_learner_own_captures.test.sql
-- Review-Checkliste (data-model.md, 4e): "RLS-Tests existieren mindestens für:
-- Employer-Isolation, Learner-Zugriff nur auf eigene Captures."
--
-- Dieser Test deckt "Learner-Zugriff nur auf eigene Captures" ab, inkl. der
-- Spalten-Falle aus access-matrix.md: Learner darf Rohinhalt (text/media) einer
-- eigenen field_capture schreiben, aber niemals `status` — und AfCJ admin darf
-- field_capture überhaupt nicht direkt schreiben (nur über `verification`, die
-- den Trigger fn_apply_verification_to_capture auslöst).
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(9);

-- ------------------------------------------------------------
-- Seed: eine Organisation, zwei Learner, eine AfCJ-Admin-Person.
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'learner-a@example.test'),
  ('00000000-0000-0000-0000-000000000002', 'learner-b@example.test'),
  ('00000000-0000-0000-0000-000000000003', 'admin@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000000011', 'Energiehelden', 'employer', 'aktiv'),
  ('00000000-0000-0000-0000-000000000012', 'AfCJ', 'afcj', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000000001', 'learner-a@example.test', 'Learner A', 'learner_a', 'DE'),
  ('00000000-0000-0000-0000-000000000002', 'learner-b@example.test', 'Learner B', 'learner_b', 'DE'),
  ('00000000-0000-0000-0000-000000000003', 'admin@example.test', 'Admin', 'admin', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000011'),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000012');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'learner'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000011', 'learner'),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000012', 'afcj_admin');

insert into programme (id, name, kuerzel) values
  ('00000000-0000-0000-0000-000000000021', 'EFK Erneuerbare Energien', 'EFK-EE');

insert into field_job_type (id, titel, programme_id, reihenfolge) values
  ('00000000-0000-0000-0000-000000000041', 'Werkstatt-Übung', '00000000-0000-0000-0000-000000000021', 1);

insert into field_job (id, organisation_id, datum, field_job_type_id, learner_id) values
  ('00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000011', current_date, '00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000052', '00000000-0000-0000-0000-000000000011', current_date, '00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000002');

insert into field_capture (id, organisation_id, learner_id, field_job_id, phase, text) values
  ('00000000-0000-0000-0000-000000000071', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000051', 'abschluss', 'Bericht von Learner A'),
  ('00000000-0000-0000-0000-000000000072', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000052', 'abschluss', 'Bericht von Learner B');

-- ------------------------------------------------------------
-- Als Learner A
-- ------------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*)::int from field_capture where id = '00000000-0000-0000-0000-000000000071'),
  1,
  'Learner A sieht die eigene field_capture'
);
select is(
  (select count(*)::int from field_capture where id = '00000000-0000-0000-0000-000000000072'),
  0,
  'Learner A sieht die field_capture von Learner B nicht'
);

-- Postgres erlaubt eine datenverändernde CTE (UPDATE ... RETURNING) nur, wenn
-- das WITH selbst die oberste Anweisung ist — nicht verschachtelt als
-- Sub-Select-Ausdruck in einer anderen SELECT-Liste (wie zuvor hier
-- versucht). Deshalb hier als eigene, oberste Anweisung ausgeführt und das
-- Ergebnis über psql \gset in eine Variable geschrieben, die die Assertion
-- danach separat referenziert — inhaltlich unverändert (weiterhin: 0 Zeilen
-- betroffen).
with updated as (
  update field_capture set text = 'Übernommen von Learner A'
  where id = '00000000-0000-0000-0000-000000000072'
  returning 1
)
select count(*)::int as affected_rows from updated
\gset

select is(
  :affected_rows,
  0,
  'Learner A kann die field_capture von Learner B nicht ändern'
);

select lives_ok(
  $$ insert into field_capture (organisation_id, learner_id, field_job_id, phase, text)
     values ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001',
             '00000000-0000-0000-0000-000000000051', 'start', 'Neuer Bericht') $$,
  'Learner A darf Rohinhalt (text) der eigenen field_capture einfügen'
);

select throws_ok(
  $$ insert into field_capture (organisation_id, learner_id, field_job_id, phase, text, status)
     values ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001',
             '00000000-0000-0000-0000-000000000051', 'start', 'Versuch', 'verified') $$,
  '42501', NULL,
  'Learner darf status beim Einfügen nicht selbst setzen (nur Rohinhalt ist beschreibbar)'
);

select throws_ok(
  $$ update field_capture set status = 'verified'
     where id = '00000000-0000-0000-0000-000000000071' $$,
  '42501', NULL,
  'Learner darf status einer eigenen field_capture nicht direkt ändern'
);

-- ------------------------------------------------------------
-- Als AfCJ admin: read All, aber kein direktes Schreiben auf field_capture —
-- Status ändert sich ausschließlich über eine `verification`.
-- ------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000003', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*)::int from field_capture
   where id in ('00000000-0000-0000-0000-000000000071', '00000000-0000-0000-0000-000000000072')),
  2,
  'AfCJ admin sieht field_captures aus allen Organisationen (read All)'
);

select lives_ok(
  $$ insert into verification (organisation_id, field_capture_id, verifiziert_von, entscheidung)
     values ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000071',
             '00000000-0000-0000-0000-000000000003', 'verified') $$,
  'AfCJ admin darf eine verification anlegen'
);

select is(
  (select status from field_capture where id = '00000000-0000-0000-0000-000000000071'),
  'verified',
  'Der verification-Trigger setzt field_capture.status, weil admin die Spalte nicht direkt schreiben darf'
);

select * from finish();
rollback;
