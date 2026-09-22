-- 007_field_job_type_constraints.test.sql
-- SR-58 (2026-09-16): field_job_type_hangs_off_module_xor_programme
-- (0014_field_job_type_module_programme.sql) stellt sicher, dass
-- field_job_type wie course entweder an einem module ODER einem programme
-- hängt, nie beide, nie keins. 0014 selbst begründet, warum das keinen
-- RLS-Test braucht (field_job_type_read_published aus 0012 bleibt
-- unverändert, bereits über 004_content_visibility.test.sql abgedeckt) --
-- diese Datei deckt ausschließlich die CHECK-Constraint ab.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(2);

-- ------------------------------------------------------------
-- Seed: ein Programm + ein Modul darin, nur als Fremdschlüssel für die
-- beiden Inserts unten benötigt.
-- ------------------------------------------------------------
insert into programme (id, name, kuerzel) values
  ('00000000-0000-0000-0000-000000000001', 'Testprogramm XOR', 'TEST-XOR');

insert into module (id, programme_id, name, reihenfolge) values
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Testmodul', 1);

-- Test 1: module_id UND programme_id gleichzeitig gesetzt -> Constraint
-- schlägt fehl. reihenfolge wird mitgegeben (not null, kein Default) --
-- sonst würde die NOT-NULL-Verletzung die XOR-Verletzung verdecken.
select throws_ok(
  $$ insert into field_job_type (titel, module_id, programme_id, reihenfolge)
     values ('Test-Typ (beide gesetzt)',
             '00000000-0000-0000-0000-000000000002',
             '00000000-0000-0000-0000-000000000001',
             99) $$,
  '23514', NULL,
  'field_job_type_hangs_off_module_xor_programme verhindert module_id UND programme_id gleichzeitig'
);

-- Test 2: weder module_id noch programme_id gesetzt -> Constraint schlägt
-- fehl. status bleibt bewusst weg (Default 'unpublished' ist gültig) --
-- ein expliziter Wert wie 'draft' wäre selbst ein CHECK-Verstoß und würde
-- den Test unbemerkt sinnlos machen (falscher Grund, gleiche SQLSTATE).
select throws_ok(
  $$ insert into field_job_type (titel, reihenfolge)
     values ('Test-Typ (keins gesetzt)', 99) $$,
  '23514', NULL,
  'field_job_type_hangs_off_module_xor_programme verhindert weder module_id noch programme_id'
);

select * from finish();
rollback;
