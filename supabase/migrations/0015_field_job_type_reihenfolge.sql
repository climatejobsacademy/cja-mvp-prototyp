-- 0015_field_job_type_reihenfolge.sql
-- Ergänzung zu SR-59 (2026-09-16): field_job_type bekommt reihenfolge, damit
-- Praxis-Typen im Programm-Tab/in der Content Library in einer definierten
-- Reihenfolge statt alphabetisch nach titel sortiert werden können — analog
-- zu module.reihenfolge/course.reihenfolge (0004_qualification_structure.sql).
--
-- Gleiches Vorgehen wie 0014: erst nullable Spalte, dann Backfill für die 5
-- bestehenden Zeilen, dann not null -- sonst würde "set not null" sofort an
-- den 5 bestehenden Zeilen (reihenfolge damals noch nicht gesetzt) scheitern.

alter table field_job_type
  add column reihenfolge integer;

update field_job_type set reihenfolge = 1 where titel = 'Grundlagen der Elektrotechnik (Übungen an den ETS-Boards)';
update field_job_type set reihenfolge = 2 where titel = 'Grundlagen der Elektrotechnik (Kreatives Löten)';
update field_job_type set reihenfolge = 3 where titel = 'Kleine Messplatine';
update field_job_type set reihenfolge = 4 where titel = 'Große Messplatine';
update field_job_type set reihenfolge = 5 where titel = 'Durchgangsprüfer';

alter table field_job_type
  alter column reihenfolge set not null;
