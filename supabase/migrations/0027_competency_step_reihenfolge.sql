-- 0027_competency_step_reihenfolge.sql
-- SR-69 (N:M Kompetenz <-> Teilschritt), SR-62 (Anzeige der Teilschritte):
-- Reihenfolge der Kompetenzschritte je Kompetenz. Datenlücke Nr. 3.
-- Nummer 0027, weil 0025 (PR #80) und 0026 (PR #84) belegt sind.
--
-- Entschieden 2026-10-12 (Vera):
--   - reihenfolge liegt auf competency_competency_step, nicht auf
--     competency_step: derselbe Schritt kann in verschiedenen Kompetenzen an
--     verschiedener Stelle stehen.
--   - Pflichtfeld, eindeutig je Kompetenz, Eindeutigkeit erst am Ende der
--     Transaktion geprüft (deferrable), damit sich Positionen tauschen lassen.
--   - Backfill wie bisher nach Lehrplan, aber vollständig: (Modul, Kurs,
--     Lektion) der frühesten zugeordneten Lektion; Praxisschritte nach den
--     Theorieschritten ihres Moduls, dann nach field_job_type.reihenfolge;
--     Schritte ohne Zuordnung ans Ende, dann nach Name.
--
-- RLS: keine neue Policy. competency_competency_step_read_all (0019) gibt die
-- Spalte allen Eingeloggten frei, schreiben nur über
-- competency_competency_step_admin_write.

alter table competency_competency_step add column reihenfolge integer;

with theorie as (
  select ccm.competency_step_id as step_id,
         min(array[coalesce(mo.reihenfolge, 0), co.reihenfolge, le.reihenfolge]) as pos
  from content_competency_mapping ccm
  join lesson le on le.id = ccm.lesson_id
  join course co on co.id = le.course_id
  left join module mo on mo.id = co.module_id
  group by 1
), praxis as (
  select m.competency_step_id as step_id,
         min(array[coalesce(mo.reihenfolge, 0), 1000000, t.reihenfolge]) as pos
  from field_job_type_competency_mapping m
  join field_job_type t on t.id = m.field_job_type_id
  left join module mo on mo.id = t.module_id
  group by 1
), nummeriert as (
  select ccs.id,
         row_number() over (
           partition by ccs.competency_id
           order by coalesce(th.pos, pr.pos) nulls last, s.name, s.id
         ) as nr
  from competency_competency_step ccs
  join competency_step s on s.id = ccs.competency_step_id
  left join theorie th on th.step_id = ccs.competency_step_id
  left join praxis pr on pr.step_id = ccs.competency_step_id
)
update competency_competency_step c
set reihenfolge = n.nr
from nummeriert n
where n.id = c.id;

alter table competency_competency_step
  alter column reihenfolge set not null,
  add constraint competency_competency_step_reihenfolge_positiv check (reihenfolge > 0),
  add constraint competency_competency_step_reihenfolge_eindeutig
    unique (competency_id, reihenfolge) deferrable initially deferred;

comment on column competency_competency_step.reihenfolge is
  'Position des Schritts innerhalb der Kompetenz (1, 2, …); eindeutig je Kompetenz (deferrable).';
