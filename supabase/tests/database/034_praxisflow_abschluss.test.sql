-- 034_praxisflow_abschluss.test.sql
-- SR-89 (Migration 0061): Selbst-, Peer- und Trainer-Einschätzung in
-- Reihenfolge, Skala je Kriterium, Trainer-Einschätzung nur mit dem
-- Codewort im selben Aufruf und nur einmal; nur ein K.-o.-Kriterium mit 0 in der
-- Trainer-Einschätzung verhindert die Anrechnung.
-- SR-03: automatische Verifizierung beim Abschluss mit der Trainer:in des
-- Praxistags; ohne Trainer:in keine.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(21);

-- ------------------------------------------------------------
-- Fixtures (als Superuser)
-- 34001 Lernende A, 34004 Trainer:in T. Kohorte 34051 mit Codewort.
-- 34081 Praxistag (Trainer:in T), 34082 Praxistag (Trainer:in T, K.-o.),
-- 34083 Praxistag ohne Trainer:in. Alle in Bewerten.
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000034001', 'pa-a@example.test'),
  ('00000000-0000-0000-0000-000000034004', 'pa-t@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000034011', 'Betrieb', 'employer', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000034001', 'pa-a@example.test', 'Lernende A', 'pa_a', 'DE'),
  ('00000000-0000-0000-0000-000000034004', 'pa-t@example.test', 'Trainer', 'pa_t', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000034001', '00000000-0000-0000-0000-000000034011'),
  ('00000000-0000-0000-0000-000000034004', '00000000-0000-0000-0000-000000034011');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000034001', '00000000-0000-0000-0000-000000034011', 'learner'),
  ('00000000-0000-0000-0000-000000034004', '00000000-0000-0000-0000-000000034011', 'trainer');

insert into programme (id, name, kuerzel, status) values
  ('00000000-0000-0000-0000-000000034021', 'Programm', 'PA-P1', 'published');

insert into field_job_type (id, titel, programme_id, reihenfolge, status, ablauf) values
  ('00000000-0000-0000-0000-000000034041', 'Auftrag geführt', '00000000-0000-0000-0000-000000034021', 1, 'published', 'gefuehrt');

insert into cohort (id, programme_id, name, start_datum) values
  ('00000000-0000-0000-0000-000000034051', '00000000-0000-0000-0000-000000034021', 'K1', '2026-11-02');

insert into enrolment (id, organisation_id, learner_id, cohort_id, status) values
  ('00000000-0000-0000-0000-000000034061', '00000000-0000-0000-0000-000000034011', '00000000-0000-0000-0000-000000034001', '00000000-0000-0000-0000-000000034051', 'aktiv');

insert into praxis_codewort (cohort_id, hash) values
  ('00000000-0000-0000-0000-000000034051', extensions.crypt('probewort', extensions.gen_salt('bf')));

insert into field_job (id, organisation_id, datum, field_job_type_id, learner_id, instructor_id, phase) values
  ('00000000-0000-0000-0000-000000034081', '00000000-0000-0000-0000-000000034011', '2026-11-16', '00000000-0000-0000-0000-000000034041', '00000000-0000-0000-0000-000000034001', '00000000-0000-0000-0000-000000034004', 'bewerten'),
  ('00000000-0000-0000-0000-000000034082', '00000000-0000-0000-0000-000000034011', '2026-11-17', '00000000-0000-0000-0000-000000034041', '00000000-0000-0000-0000-000000034001', '00000000-0000-0000-0000-000000034004', 'bewerten'),
  ('00000000-0000-0000-0000-000000034083', '00000000-0000-0000-0000-000000034011', '2026-11-18', '00000000-0000-0000-0000-000000034041', '00000000-0000-0000-0000-000000034001', null, 'bewerten');

insert into schedule_entry (organisation_id, datum, art, reihenfolge, cohort_id, enrolment_id, live_session_id, field_job_id) values
  ('00000000-0000-0000-0000-000000034011', '2026-11-16', 'feld', 1, null, '00000000-0000-0000-0000-000000034061', null, '00000000-0000-0000-0000-000000034081');

-- 34082 und 34083: Einschätzungen und Freigabe schon vorhanden.
update field_job
set praxisflow = jsonb_build_object(
  'bewertung_freigegeben_am', now(),
  'einschaetzung', jsonb_build_object(
    'selbst', '{"funktion": 10, "ausfuehrung": 9, "schutz": 10, "protokoll": 7, "unterlagen": 10}'::jsonb,
    'peer', '{"funktion": 10, "ausfuehrung": 9, "schutz": 10, "protokoll": 7, "unterlagen": 10}'::jsonb,
    'trainer', case id
      when '00000000-0000-0000-0000-000000034082' then '{"funktion": 0, "ausfuehrung": 9, "schutz": 10, "protokoll": 7, "unterlagen": 10}'::jsonb
      else '{"funktion": 10, "ausfuehrung": 9, "schutz": 10, "protokoll": 7, "unterlagen": 10}'::jsonb
    end
  )
)
where id in ('00000000-0000-0000-0000-000000034082', '00000000-0000-0000-0000-000000034083');

select is(has_function_privilege('anon', 'fn_praxis_abschliessen(uuid, text)', 'execute'), false,
  'anon darf fn_praxis_abschliessen nicht ausführen');

-- ------------------------------------------------------------
-- Als Lernende A
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000034001', 'role', 'authenticated')::text, true);

select lives_ok(
  $$select fn_praxis_einschaetzen('00000000-0000-0000-0000-000000034081', 'peer', '{"funktion": 10, "ausfuehrung": 9, "schutz": 10, "protokoll": 7, "unterlagen": 10}')$$,
  'Peer-Einschätzung geht auch ohne Selbsteinschätzung (beide optional, 0063)'
);
select throws_ok(
  $$select fn_praxis_einschaetzen('00000000-0000-0000-0000-000000034081', 'selbst', '{"funktion": 10, "ausfuehrung": 9}')$$,
  '23514', null,
  'Unvollständige Einschätzung wird abgelehnt'
);
select throws_ok(
  $$select fn_praxis_einschaetzen('00000000-0000-0000-0000-000000034081', 'selbst',
    '{"funktion": 5, "ausfuehrung": 9, "schutz": 10, "protokoll": 7, "unterlagen": 10}')$$,
  '23514', null,
  'Punkte außerhalb der Skala des Kriteriums (Ja/Nein: 10 oder 0) werden abgelehnt'
);
select throws_ok(
  $$select fn_praxis_einschaetzen('00000000-0000-0000-0000-000000034081', 'trainer', '{"funktion": 10, "ausfuehrung": 9, "schutz": 10, "protokoll": 7, "unterlagen": 10}')$$,
  '22023', null,
  'Die Trainer-Einschätzung geht nicht über fn_praxis_einschaetzen'
);
select lives_ok(
  $$select fn_praxis_einschaetzen('00000000-0000-0000-0000-000000034081', 'selbst',
    '{"funktion": 10, "ausfuehrung": 7, "schutz": 10, "protokoll": 9, "unterlagen": 10}')$$,
  'Selbsteinschätzung speichern'
);
select throws_ok(
  $$select fn_praxis_trainer_einschaetzen('00000000-0000-0000-0000-000000034081', '{"funktion": 10, "ausfuehrung": 9}', 'probewort')$$,
  '23514', null,
  'Unvollständige Trainer-Einschätzung wird abgelehnt'
);
select lives_ok(
  $$select fn_praxis_einschaetzen('00000000-0000-0000-0000-000000034081', 'peer', '{"funktion": 10, "ausfuehrung": 9, "schutz": 10, "protokoll": 7, "unterlagen": 10}')$$,
  'Peer-Einschätzung speichern'
);
select throws_ok(
  $$select fn_praxis_abschliessen('00000000-0000-0000-0000-000000034081', null)$$,
  '23514', null,
  'Abschluss erst mit Trainer-Einschätzung'
);
select is(
  fn_praxis_trainer_einschaetzen('00000000-0000-0000-0000-000000034081', '{"funktion": 10, "ausfuehrung": 9, "schutz": 10, "protokoll": 7, "unterlagen": 10}', 'falsch'),
  false,
  'Ohne richtiges Codewort wird die Trainer-Einschätzung nicht gespeichert'
);
select ok(
  (select praxisflow #> '{einschaetzung,trainer}' is null from field_job where id = '00000000-0000-0000-0000-000000034081'),
  'Nach falschem Codewort liegt keine Trainer-Einschätzung vor'
);
select is(
  fn_praxis_trainer_einschaetzen('00000000-0000-0000-0000-000000034081',
    '{"funktion": 10, "ausfuehrung": 9, "schutz": 10, "protokoll": 7, "unterlagen": 9}', 'probewort'),
  true,
  'Trainer-Einschätzung mit Codewort im selben Aufruf speichern'
);
select throws_ok(
  $$select fn_praxis_trainer_einschaetzen('00000000-0000-0000-0000-000000034081',
    '{"funktion": 10, "ausfuehrung": 10, "schutz": 10, "protokoll": 10, "unterlagen": 10}', 'probewort')$$,
  '23514', null,
  'Die Trainer-Einschätzung lässt sich nicht überschreiben, auch nicht mit Codewort'
);
select throws_ok(
  $$select fn_praxis_einschaetzen('00000000-0000-0000-0000-000000034081', 'selbst',
    '{"funktion": 10, "ausfuehrung": 10, "schutz": 10, "protokoll": 10, "unterlagen": 10}')$$,
  '23514', null,
  'Nach der Trainer-Einschätzung ist die Selbsteinschätzung fest'
);
select is(
  fn_praxis_abschliessen('00000000-0000-0000-0000-000000034081', 'Leitung vorher messen'),
  'angerechnet',
  'Abschluss ohne K.-o. mit Trainer:in: angerechnet'
);
select is(
  (select status from field_capture where field_job_id = '00000000-0000-0000-0000-000000034081' and phase = 'abschluss'),
  'verified',
  'Der Praxisbericht ist automatisch verifiziert'
);
select is(
  fn_praxis_abschliessen('00000000-0000-0000-0000-000000034081', null),
  'angerechnet',
  'Wiederholter Abschluss ändert nichts (SR-08)'
);
select is(
  fn_praxis_abschliessen('00000000-0000-0000-0000-000000034082', 'Funktion prüfen'),
  'ko',
  'K.-o.-Kriterium mit 0 in der Trainer-Einschätzung: keine Anrechnung (Rücksprung prüft 036)'
);
select is(
  fn_praxis_abschliessen('00000000-0000-0000-0000-000000034083', 'Sauberer arbeiten'),
  'ohne_trainer',
  'Ohne zugeordnete Trainer:in: keine Verifizierung'
);

-- ------------------------------------------------------------
-- Prüfung als Superuser
-- ------------------------------------------------------------
reset role;
select is(
  (select v.verifiziert_von from verification v
     join field_capture c on c.id = v.field_capture_id
    where c.field_job_id = '00000000-0000-0000-0000-000000034081'),
  '00000000-0000-0000-0000-000000034004'::uuid,
  'Prüfer:in der automatischen Verifizierung ist die Trainer:in des Praxistags'
);
select is(
  (select count(*) from verification v
     join field_capture c on c.id = v.field_capture_id
    where c.field_job_id in ('00000000-0000-0000-0000-000000034082', '00000000-0000-0000-0000-000000034083')),
  0::bigint,
  'Bei K.-o. und ohne Trainer:in entsteht keine Verifizierung'
);

select * from finish();
rollback;
