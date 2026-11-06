-- 033_praxisflow_codewort.test.sql
-- SR-65 (Migration 0060): Codewort je Kohorte nur als Hash, für Lernende
-- nicht lesbar; Fehlversuche protokolliert, Sperre nach 5, AfCJ admin hebt
-- sie auf. SR-64: Kontrollieren in Reihenfolge, Prüfungen unter Spannung
-- erst nach der Freigabe. SR-88: Kontrollieren endet erst mit Prüfprotokoll.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(27);

-- ------------------------------------------------------------
-- Fixtures (als Superuser)
-- 33001 Lernende A, 33003 AfCJ admin. Kohorte 33051, Praxistag 33081
-- (geführt) steht in Kontrollieren.
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000033001', 'pc-a@example.test'),
  ('00000000-0000-0000-0000-000000033003', 'pc-admin@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000033011', 'Betrieb', 'employer', 'aktiv'),
  ('00000000-0000-0000-0000-000000033012', 'AfCJ', 'afcj', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000033001', 'pc-a@example.test', 'Lernende A', 'pc_a', 'DE'),
  ('00000000-0000-0000-0000-000000033003', 'pc-admin@example.test', 'Admin', 'pc_admin', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000033001', '00000000-0000-0000-0000-000000033011'),
  ('00000000-0000-0000-0000-000000033003', '00000000-0000-0000-0000-000000033012');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000033001', '00000000-0000-0000-0000-000000033011', 'learner'),
  ('00000000-0000-0000-0000-000000033003', '00000000-0000-0000-0000-000000033012', 'afcj_admin');

insert into programme (id, name, kuerzel, status) values
  ('00000000-0000-0000-0000-000000033021', 'Programm', 'PC-P1', 'published');

insert into field_job_type (id, titel, programme_id, reihenfolge, status, ablauf) values
  ('00000000-0000-0000-0000-000000033041', 'Auftrag geführt', '00000000-0000-0000-0000-000000033021', 1, 'published', 'gefuehrt');

insert into cohort (id, programme_id, name, start_datum) values
  ('00000000-0000-0000-0000-000000033051', '00000000-0000-0000-0000-000000033021', 'K1', '2026-11-02');

insert into enrolment (id, organisation_id, learner_id, cohort_id, status) values
  ('00000000-0000-0000-0000-000000033061', '00000000-0000-0000-0000-000000033011', '00000000-0000-0000-0000-000000033001', '00000000-0000-0000-0000-000000033051', 'aktiv');

insert into field_job (id, organisation_id, datum, field_job_type_id, learner_id, phase) values
  ('00000000-0000-0000-0000-000000033081', '00000000-0000-0000-0000-000000033011', '2026-11-16', '00000000-0000-0000-0000-000000033041', '00000000-0000-0000-0000-000000033001', 'kontrollieren');

insert into schedule_entry (organisation_id, datum, art, reihenfolge, cohort_id, enrolment_id, live_session_id, field_job_id) values
  ('00000000-0000-0000-0000-000000033011', '2026-11-16', 'feld', 1, null, '00000000-0000-0000-0000-000000033061', null, '00000000-0000-0000-0000-000000033081');

select ok((select relrowsecurity from pg_class where oid = 'public.praxis_codewort'::regclass),
  'RLS ist auf praxis_codewort eingeschaltet');
select is(has_function_privilege('anon', 'fn_praxis_gate(uuid, text, text)', 'execute'), false,
  'anon darf fn_praxis_gate nicht ausführen');

set local role authenticated;

-- ------------------------------------------------------------
-- AfCJ admin setzt das Codewort
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000033003', 'role', 'authenticated')::text, true);
select lives_ok(
  $$select fn_praxis_codewort_setzen('00000000-0000-0000-0000-000000033051', 'Probewort')$$,
  'AfCJ admin setzt das Codewort der Kohorte'
);
select is(
  (select count(*) from praxis_codewort where hash not ilike '%probewort%'),
  1::bigint,
  'Gespeichert ist nur ein Hash, nicht das Codewort'
);

-- ------------------------------------------------------------
-- Als Lernende A
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000033001', 'role', 'authenticated')::text, true);

select is_empty($$select id from praxis_codewort$$, 'Lernende lesen weder Codewort noch Hash');
select throws_ok(
  $$insert into praxis_codewort (cohort_id, hash) values ('00000000-0000-0000-0000-000000033051', 'x')$$,
  '42501', null,
  'Lernende schreiben kein Codewort direkt'
);
select throws_ok(
  $$select fn_praxis_codewort_setzen('00000000-0000-0000-0000-000000033051', 'anderes')$$,
  '42501', null,
  'Lernende setzen kein Codewort über die Funktion'
);
select throws_ok(
  $$select fn_praxis_kontrolle_abhaken('00000000-0000-0000-0000-000000033081', 'a2')$$,
  '23514', null,
  'Prüfpunkte nur in Reihenfolge'
);
select throws_ok(
  $$select fn_praxis_gate('00000000-0000-0000-0000-000000033081', 'zuschalten', 'Probewort')$$,
  '23514', null,
  'Freigabe zum Zuschalten erst nach allen Prüfungen ohne Spannung'
);
select is(jsonb_array_length(fn_praxis_kontrolle_abhaken('00000000-0000-0000-0000-000000033081', 'a1') -> 'kontrolle'), 1, 'a1 abgehakt');
select is(jsonb_array_length(fn_praxis_kontrolle_abhaken('00000000-0000-0000-0000-000000033081', 'a2') -> 'kontrolle'), 2, 'a2 abgehakt');
select is(jsonb_array_length(fn_praxis_kontrolle_abhaken('00000000-0000-0000-0000-000000033081', 'a3') -> 'kontrolle'), 3, 'a3 abgehakt');
select is(jsonb_array_length(fn_praxis_kontrolle_abhaken('00000000-0000-0000-0000-000000033081', 'a4') -> 'kontrolle'), 4, 'a4 abgehakt');
select throws_ok(
  $$select fn_praxis_kontrolle_abhaken('00000000-0000-0000-0000-000000033081', 'c1')$$,
  '23514', null,
  'Prüfungen unter Spannung erst nach der Freigabe'
);
select is(
  fn_praxis_gate('00000000-0000-0000-0000-000000033081', 'zuschalten', 'falsch'),
  false,
  'Falsches Codewort öffnet das Gate nicht'
);
select is_empty($$select id from praxis_codewort_versuch$$, 'Lernende lesen das Protokoll der Versuche nicht');
select is(
  fn_praxis_gate('00000000-0000-0000-0000-000000033081', 'zuschalten', '  PROBEWORT '),
  true,
  'Richtiges Codewort (Groß-/Kleinschreibung und Leerzeichen egal) öffnet das Gate'
);
select is(jsonb_array_length(fn_praxis_kontrolle_abhaken('00000000-0000-0000-0000-000000033081', 'c1') -> 'kontrolle'), 5, 'c1 nach der Freigabe abgehakt');
select is(jsonb_array_length(fn_praxis_kontrolle_abhaken('00000000-0000-0000-0000-000000033081', 'c2') -> 'kontrolle'), 6, 'c2 abgehakt');
select throws_ok(
  $$select fn_praxis_weiter('00000000-0000-0000-0000-000000033081', 'kontrollieren')$$,
  '23514', null,
  'Ohne Prüfprotokoll geht es nicht zu Bewerten'
);
select lives_ok(
  $$insert into field_job_datei (organisation_id, field_job_id, learner_id, art, storage_pfad, dateiname, mime_type, groesse) values
    ('00000000-0000-0000-0000-000000033011', '00000000-0000-0000-0000-000000033081', '00000000-0000-0000-0000-000000033001',
     'protokoll', '00000000-0000-0000-0000-000000033001/00000000-0000-0000-0000-000000033081/p.pdf', 'Protokoll.pdf', 'application/pdf', 900)$$,
  'Prüfprotokoll als Datei'
);
select is(
  fn_praxis_weiter('00000000-0000-0000-0000-000000033081', 'kontrollieren'),
  'bewerten',
  'Kontrollieren -> Bewerten mit allen Prüfpunkten und Protokoll'
);
select is(
  (select count(*) from generate_series(1, 5) g
    where not fn_praxis_gate('00000000-0000-0000-0000-000000033081', 'bewertung', 'falsch' || g)),
  5::bigint,
  'Fünf Fehlversuche am Gate Bewertung'
);
select throws_ok(
  $$select fn_praxis_gate('00000000-0000-0000-0000-000000033081', 'bewertung', 'Probewort')$$,
  '42501', null,
  'Nach fünf Fehlversuchen ist das Gate gesperrt, auch mit richtigem Codewort'
);

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000033003', 'role', 'authenticated')::text, true);
select is(
  (select count(*) from praxis_codewort_versuch where art = 'fehlversuch'),
  6::bigint,
  'AfCJ admin sieht alle Fehlversuche im Protokoll'
);
select lives_ok(
  $$select fn_praxis_codewort_entsperren('00000000-0000-0000-0000-000000033081', 'bewertung')$$,
  'AfCJ admin hebt die Sperre auf'
);

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000033001', 'role', 'authenticated')::text, true);
select is(
  fn_praxis_gate('00000000-0000-0000-0000-000000033081', 'bewertung', 'Probewort'),
  true,
  'Nach der Entsperrung öffnet das richtige Codewort das Gate'
);

select * from finish();
rollback;
