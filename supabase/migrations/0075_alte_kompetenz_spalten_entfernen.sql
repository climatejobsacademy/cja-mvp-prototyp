-- 0075_alte_kompetenz_spalten_entfernen.sql
-- Technische Schulden (kein neues Verhalten, keine SR): zwei Spalten, die seit
-- dem Umbau auf N:M-Zuordnungen nichts mehr bedeuten, werden entfernt.
--
-- - competency.quelle: abgelöst durch competency_programme (0020, SR-70);
--   die Spalte blieb bisher mit not null und CHECK stehen.
-- - competency_step.competency_id: abgelöst durch competency_competency_step
--   (0019, SR-69; Kompetenz <-> Teilschritt N:M); die App liest die Zuordnung nur von dort.
--
-- Keine View, keine Funktion und keine Policy hängt an den Spalten (auf
-- Staging am 27.11.2026 geprüft). Der Plan-Import schreibt sie nur noch,
-- solange sie existieren (scripts/import-plan/import.sql).
--
-- NICHT ADDITIV: Ein Plan-Import mit altem Stand von import.sql würde nach
-- dieser Migration scheitern. Reihenfolge im Release: erst den neuen Stand
-- (mit diesem PR) mergen und den Release-Ordner aktualisieren, dann die
-- Migration einspielen (docs/release.md, „nicht additiv“).

alter table competency drop column quelle;
alter table competency_step drop column competency_id;
