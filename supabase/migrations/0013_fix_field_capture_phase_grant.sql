-- 0013_fix_field_capture_phase_grant.sql
-- Fix: `phase` fehlte in der INSERT-Spalten-Grant-Liste für field_capture.
-- 0011_field_job_praxistag_erfassung.sql hat `phase` als NOT NULL-Spalte
-- ergänzt, aber die Grant-Liste aus 0009_rls_policies.sql nie nachgezogen —
-- dadurch konnte kein Learner mehr eine field_capture einfügen (weder mit
-- `phase` in der Spaltenliste: 42501 permission denied, noch ohne:
-- NOT-NULL-Verletzung). Gefunden über Test 4 in
-- supabase/tests/database/002_learner_own_captures.test.sql ("Learner A darf
-- Rohinhalt (text) der eigenen field_capture einfügen").
--
-- GRANT auf einzelne Spalten ist additiv — dieser Grant ergänzt `phase` zur
-- bestehenden Spaltenliste, ersetzt sie nicht; die übrigen Spalten aus 0009
-- bleiben unverändert erlaubt.
grant insert (organisation_id, learner_id, field_job_id, phase, text, media, eingereicht_am)
  on field_capture to authenticated;
