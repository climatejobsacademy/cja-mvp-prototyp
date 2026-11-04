-- 0057_funktionen_absichern.sql
-- Aufräumen nach dem Supabase Security Advisor (Betrieb, keine SR).
-- Keine neue Tabelle, keine Policy, keine Datenänderung.
--
-- 1. Fester Suchpfad für Funktionen, die bisher keinen hatten
--    (Advisor: "Function Search Path Mutable"). pg_catalog wird immer
--    zuerst durchsucht; auth.uid() ist voll qualifiziert.
-- 2. Nicht angemeldete Rollen (anon, public) dürfen Hilfs- und
--    Triggerfunktionen nicht direkt aufrufen. Die Schutzregeln, die
--    fn_is_afcj_admin, fn_current_cohort_ids und fn_current_enrolment_ids
--    nutzen, gelten alle nur für authenticated; für authenticated bleibt
--    das Ausführungsrecht ausdrücklich bestehen.
--    Triggerfunktionen prüft Postgres nur beim Anlegen des Triggers auf
--    EXECUTE, nicht beim Auslösen; deshalb verlieren sie das Recht auch
--    für authenticated.
-- 3. rls_auto_enable() stammt nicht aus einer Migration (runbook.md,
--    Abschnitt 5) und fehlt in frisch aufgesetzten Datenbanken; deshalb
--    nur, wenn sie existiert.

-- 1. Suchpfad
alter function set_updated_at() set search_path = public;
alter function fn_current_person_id() set search_path = public;
alter function fn_derive_field_job_status() set search_path = public;
alter function fn_unveraenderlich() set search_path = public;
alter function fn_fachsprache_bild_gueltig(jsonb, jsonb) set search_path = public;
alter function fn_fachsprache_inhalt_gueltig(jsonb) set search_path = public;
alter function fn_fachsprache_inhalt_geaendert() set search_path = public;

-- 2a. Triggerfunktionen: kein direkter Aufruf über die API
revoke execute on function fn_apply_verification_to_capture() from public, anon, authenticated;
revoke execute on function fn_derive_field_capture_step_mapping() from public, anon, authenticated;
revoke execute on function fn_validate_field_capture_antwort() from public, anon, authenticated;

-- 2b. Hilfsfunktionen der Schutzregeln: nur für Angemeldete
revoke execute on function fn_current_cohort_ids() from public, anon;
revoke execute on function fn_current_enrolment_ids() from public, anon;
revoke execute on function fn_is_afcj_admin() from public, anon;
grant execute on function fn_current_cohort_ids() to authenticated;
grant execute on function fn_current_enrolment_ids() to authenticated;
grant execute on function fn_is_afcj_admin() to authenticated;

-- 3. Von Supabase angelegte Funktion, nur falls vorhanden
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end
$$;
