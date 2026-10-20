-- 0026_field_job_uhrzeit.sql
-- SR-13 (Tagesansicht mit Uhrzeit): Uhrzeit des Praxistags. Datenlücke Nr. 2.
-- Nummer 0026, weil 0025 durch PR #80 (organisation.logo_pfad) belegt ist.
--
-- Entschieden 2026-10-12 (Vera):
--   - Uhrzeit pro Person auf field_job (field_job ist schon pro Learner;
--     ein für die ganze Kohorte gleicher Praxistag bekommt in jeder Zeile
--     dieselben Werte, wie heute schon das Datum).
--   - Spaltennamen start/ende wie live_session (time, Berliner Ortszeit).
--   - Ort bleibt field_job.standort (Freitext, vorhanden).
--   - Beide Werte oder keiner; null = noch nicht festgelegt, die Oberfläche
--     zeigt den Praxistag dann ganztägig ohne Uhrzeit.
--
-- RLS: keine neue Policy. field_job_learner_select gibt die eigene Zeile
-- ganz frei (also auch start/ende). Der Spalten-Grant aus 0012 lässt die
-- Rolle authenticated weiterhin nur durchgefuehrt_bestaetigt_am, ergebnis
-- und problem_beschreibung schreiben -- start/ende kann also niemand über
-- die App ändern. AfCJ setzt sie wie die übrigen Praxistag-Daten über
-- Dashboard bzw. SQL (Terminal-Prinzip, design-specifications.md §3).

alter table field_job
  add column start time,
  add column ende time;

alter table field_job
  add constraint field_job_zeit_paarweise
    check ((start is null) = (ende is null)),
  add constraint field_job_ende_nach_beginn
    check (ende is null or ende > start);

comment on column field_job.start is
  'Beginn des Praxistags (Berliner Ortszeit); null = noch nicht festgelegt, Anzeige ganztägig ohne Uhrzeit.';
comment on column field_job.ende is
  'Ende des Praxistags (Berliner Ortszeit); nur zusammen mit start, muss nach start liegen.';
