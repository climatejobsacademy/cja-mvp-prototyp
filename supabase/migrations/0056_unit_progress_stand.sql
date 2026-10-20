-- 0056_unit_progress_stand.sql
-- SR-85 (native Selbstlern-Ansicht), Wunsch Anna 2026-10-20: Wer eine
-- Selbstlern-Lektion unterbricht, macht später dort weiter, wo er aufgehört
-- hat, auch auf einem anderen Gerät. Dafür speichert unit_progress den Stand
-- in der Lektion (Kapitel, Schritt, abgeschlossene Kapitel, gelöste Fragen)
-- als kleines JSON-Objekt. Form und Prüfung: src/lib/lernstand.ts.
--
-- Nur additiv: eine neue, nullable Spalte. Rechte bleiben wie in 0009 --
-- Lernende lesen und schreiben nur die eigene Zeile (unit_progress_learner_*),
-- der Tabellen-Grant (select, insert, update) gilt auch für die neue Spalte.
-- Der Stand ist kein Nachweis: Kompetenzen zählen weiter nur über
-- status = 'abgeschlossen' (Regel 6).

alter table unit_progress
  add column stand jsonb
    check (stand is null or (jsonb_typeof(stand) = 'object' and pg_column_size(stand) <= 16384));

comment on column unit_progress.stand is
  'Stand in einer Selbstlern-Lektion (SR-85): {kap, schritt, geschafft[], geloest[], zeit}. Kein Nachweis.';
