-- 0070_labortag.sql
-- SR-94 (Notion, neu am 10.11.2026): Labortag. Ein Tag in der Praxisphase
-- mit Ort, Uhrzeit und Trainer:innen wie ein Praxistag, aber ohne
-- Praxisflow. Lernende öffnen ihn aus Stundenplan und Home und sehen die
-- Unterlagen der Aufgabe (field_job_type_resource, SR-68, 0069).
--
-- Abbildung: Ein Labortag ist ein Praxisauftrag (field_job) einer
-- Praxisaufgabe mit ablauf = 'labor'. Damit gelten Datum, Uhrzeit, Ort,
-- Trainer:in, Stundenplan-Eintrag und RLS wie beim Praxistag, ohne neue
-- Tabelle. Die Funktionen fn_praxis_* nehmen nur ablauf = 'gefuehrt' an
-- (fn_praxis_eigener_job, 0068; fn_praxis_ereignis_melden, 0064) und
-- lehnen einen Labortag deshalb ab: kein Flow, kein Codewort, keine
-- Einschätzung, kein Abschluss und damit kein Kompetenznachweis.
-- SR-64 (am 10.11.2026 ergänzt): Labortage sind vom geführten Ablauf
-- ausgenommen.

alter table field_job_type drop constraint field_job_type_ablauf_check;
alter table field_job_type
  add constraint field_job_type_ablauf_check check (ablauf in ('einfach', 'gefuehrt', 'labor'));

comment on column field_job_type.ablauf is
  'SR-64: gefuehrt = Praxisflow (Standard, seit 0068 für alle Praxisaufgaben); '
  'labor = Labortag ohne Praxisflow, nur Unterlagen (SR-94, 0070). einfach wird nicht mehr vergeben.';
