-- 0014_field_job_type_module_programme.sql
-- SR-58/SR-59 (2026-09-16): Praxis-Anteile im Programm-Tab sichtbar machen.
-- field_job_type bekommt dieselbe module_id/programme_id-XOR-Anbindung wie
-- course (0004_qualification_structure.sql, course_hangs_off_module_xor_programme)
-- -- damit ein Modul sowohl Kurse als auch Field-Job-Typen als Kinder hat, und
-- Field-Job-Typen wie Kurse auch direkt an einem Programm ohne Module hängen
-- können. Siehe docs/data-model.md, Group 3.
--
-- Keine RLS-Anpassung nötig (siehe access-matrix.md/0009+0012): die Learner-
-- Sichtbarkeit läuft ausschließlich über field_job_type.status
-- (field_job_type_read_published, 0012), und der Admin-Grant ist bereits
-- whole-row (grant insert, update, delete on field_job_type to authenticated,
-- 0009), nicht spaltenbeschränkt -- beides bleibt von den neuen Spalten
-- unberührt.

alter table field_job_type
  add column module_id uuid references module (id) on delete cascade,
  add column programme_id uuid references programme (id) on delete cascade;

-- Backfill der 5 am 2026-09-15 geseedeten field_job_type-Zeilen (siehe
-- seed-field-jobs-praxistage.sql), BEVOR der Constraint unten sie sonst
-- ablehnen würde (weder module_id noch programme_id gesetzt).
--
-- Bewusst auf module_id = "Modul I: Theorie" statt programme_id = EFK-EE:
-- diese 5 Praxis-Typen gehören zeitlich/inhaltlich zu genau diesem Modul
-- (12.-30.10., dieselbe Kohorte wie die zehn Modul-I-Kurse). Ein Backfill auf
-- programme_id hätte sie als freistehende Top-Level-Phase neben dem Modul
-- gezeigt, nicht als Geschwister der Modul-I-Kurse -- das widerspräche dem
-- Ziel von SR-58/SR-59 (ein Modul zeigt beide Kindtypen zusammen). Falls Vera
-- nach dem Daily zwei getrennte Module will, ist das später ein einzeiliges
-- UPDATE.
update field_job_type
set module_id = (
  select m.id from module m
  where m.name = 'Modul I: Theorie'
    and m.programme_id = (select id from programme where kuerzel = 'EFK-EE')
)
where titel in (
  'Grundlagen der Elektrotechnik (Übungen an den ETS-Boards)',
  'Grundlagen der Elektrotechnik (Kreatives Löten)',
  'Kleine Messplatine',
  'Große Messplatine',
  'Durchgangsprüfer'
);

alter table field_job_type
  add constraint field_job_type_hangs_off_module_xor_programme check (
    (module_id is not null and programme_id is null)
    or (module_id is null and programme_id is not null)
  );

comment on column field_job_type.module_id is 'Entschieden 2026-09-16 (SR-58): XOR mit programme_id, analog course.';
comment on column field_job_type.programme_id is 'Entschieden 2026-09-16 (SR-58): XOR mit module_id, analog course.';
