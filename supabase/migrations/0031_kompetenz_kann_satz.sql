-- 0031_kompetenz_kann_satz.sql
-- competency.kann_satz: ausformulierter Kann-Satz einer Kompetenz ("Kann …")
-- neben dem Kurztitel in competency.name (Entscheidung 2026-10-13, SR folgt).
-- Quelle ist die Importvorlage von Content & Learning (Tab Kompetenzen,
-- Spalte "Titel (Kann …)"); gefüllt durch scripts/import-plan.mjs. Die
-- Anzeige in der Kompetenz-Detailansicht folgt in einem eigenen PR.
--
-- Nullable: bestehende Kompetenzen haben noch keinen Kann-Satz.
-- Keine neuen Policies: competency ist für alle Eingeloggten lesbar
-- (competency_read_all) und nur für AfCJ admin schreibbar
-- (competency_admin_write, beide 0009) -- die neue Spalte fällt darunter.

alter table competency
  add column kann_satz text,
  add constraint competency_kann_satz_nicht_leer check (kann_satz is null or btrim(kann_satz) <> '');

comment on column competency.kann_satz is
  'Ausformulierter Kann-Satz der Kompetenz ("Kann …"), Anzeige in der Detailansicht; '
  'name bleibt der Kurztitel. Null = noch nicht gepflegt (Entscheidung 2026-10-13).';
