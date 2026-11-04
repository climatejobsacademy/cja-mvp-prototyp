-- 030_funktionen_absichern.test.sql
-- 0057: Nicht angemeldete Rollen rufen Hilfs- und Triggerfunktionen nicht
-- auf; Angemeldete behalten die Hilfsfunktionen der Schutzregeln; die
-- Funktionen ohne Suchpfad haben jetzt einen festen.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(19);

-- anon: kein Aufruf
select ok(not has_function_privilege('anon', 'public.fn_is_afcj_admin()', 'execute'),
  'anon darf fn_is_afcj_admin nicht ausführen');
select ok(not has_function_privilege('anon', 'public.fn_current_cohort_ids()', 'execute'),
  'anon darf fn_current_cohort_ids nicht ausführen');
select ok(not has_function_privilege('anon', 'public.fn_current_enrolment_ids()', 'execute'),
  'anon darf fn_current_enrolment_ids nicht ausführen');
select ok(not has_function_privilege('anon', 'public.fn_apply_verification_to_capture()', 'execute'),
  'anon darf fn_apply_verification_to_capture nicht ausführen');
select ok(not has_function_privilege('anon', 'public.fn_derive_field_capture_step_mapping()', 'execute'),
  'anon darf fn_derive_field_capture_step_mapping nicht ausführen');
select ok(not has_function_privilege('anon', 'public.fn_validate_field_capture_antwort()', 'execute'),
  'anon darf fn_validate_field_capture_antwort nicht ausführen');

-- authenticated: Hilfsfunktionen der Schutzregeln bleiben, Trigger nicht direkt
select ok(has_function_privilege('authenticated', 'public.fn_is_afcj_admin()', 'execute'),
  'authenticated darf fn_is_afcj_admin ausführen');
select ok(has_function_privilege('authenticated', 'public.fn_current_cohort_ids()', 'execute'),
  'authenticated darf fn_current_cohort_ids ausführen');
select ok(has_function_privilege('authenticated', 'public.fn_current_enrolment_ids()', 'execute'),
  'authenticated darf fn_current_enrolment_ids ausführen');
select ok(not has_function_privilege('authenticated', 'public.fn_apply_verification_to_capture()', 'execute'),
  'authenticated ruft fn_apply_verification_to_capture nicht direkt auf');
select ok(not has_function_privilege('authenticated', 'public.fn_derive_field_capture_step_mapping()', 'execute'),
  'authenticated ruft fn_derive_field_capture_step_mapping nicht direkt auf');
select ok(not has_function_privilege('authenticated', 'public.fn_validate_field_capture_antwort()', 'execute'),
  'authenticated ruft fn_validate_field_capture_antwort nicht direkt auf');

-- Fester Suchpfad
select ok(
  (select proconfig @> array['search_path=public'] from pg_proc where oid = f::regprocedure),
  'Suchpfad fest: ' || f)
from unnest(array[
  'public.set_updated_at()',
  'public.fn_current_person_id()',
  'public.fn_derive_field_job_status()',
  'public.fn_unveraenderlich()',
  'public.fn_fachsprache_bild_gueltig(jsonb, jsonb)',
  'public.fn_fachsprache_inhalt_gueltig(jsonb)',
  'public.fn_fachsprache_inhalt_geaendert()'
]) as f;

select * from finish();
rollback;
