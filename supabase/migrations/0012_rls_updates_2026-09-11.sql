-- 0012_rls_updates_2026-09-11.sql
-- RLS-Anpassungen für die Team-Entscheidungen vom 2026-09-11
-- (docs/access-matrix.md, Stand 2026-09-11). Siehe docs/open-questions.md für
-- die Zuordnung zu den neun ursprünglich offenen Fragen.

-- ============================================================
-- Qualification structure: Learner sehen nur status = 'published'.
-- Betrifft programme/module/course/lesson (haben jetzt ein status-Feld,
-- 0010_content_status_and_lesson_resource.sql). competency/competency_step
-- bleiben ungefiltert (kein eigenes Status-Feld, siehe data-model.md Group 2,
-- Entscheidung 2026-09-11). content_competency_mapping wird über die
-- referenzierte lesson gefiltert.
--
-- AfCJ admin ist von dieser Änderung nicht betroffen: <t>_admin_write bleibt
-- unverändert ("for all ... using (fn_is_afcj_admin())") und deckt admin
-- weiterhin vollständig ab, unabhängig vom status.
-- ============================================================
do $$
declare
  t text;
begin
  for t in select unnest(array['programme', 'module', 'course', 'lesson'])
  loop
    execute format('drop policy %I on %I;', t || '_read_all', t);
    execute format(
      'create policy %I on %I for select to authenticated using (status = ''published'');',
      t || '_read_published', t
    );
  end loop;
end $$;

drop policy content_competency_mapping_read_all on content_competency_mapping;

create policy content_competency_mapping_read_published on content_competency_mapping
  for select to authenticated
  using (
    exists (
      select 1 from lesson l
      where l.id = content_competency_mapping.lesson_id
        and l.status = 'published'
    )
  );

-- ============================================================
-- field_job_type: dieselbe Umstellung (hat jetzt ebenfalls status).
-- ============================================================
drop policy field_job_type_read_all on field_job_type;

create policy field_job_type_read_published on field_job_type
  for select to authenticated
  using (status = 'published');

-- ============================================================
-- field_job: Learner-Write jetzt auf genau drei Felder erweitert/korrigiert
-- (access-matrix.md, 2026-09-11: "write Own (nur durchgeführt_bestätigt_am,
-- ergebnis, problem_beschreibung — sonst nichts)"). status ist bewusst NICHT
-- mehr Teil der Learner-Grant-Spalten — wird per Trigger abgeleitet (siehe
-- 0011_field_job_praxistag_erfassung.sql, fn_derive_field_job_status).
-- ============================================================
drop policy field_job_learner_confirm on field_job;

revoke update on field_job from authenticated;
grant update (durchgefuehrt_bestaetigt_am, ergebnis, problem_beschreibung) on field_job to authenticated;

create policy field_job_learner_confirm on field_job
  for update to authenticated
  using (learner_id = auth.uid())
  with check (learner_id = auth.uid());

-- ============================================================
-- lesson_resource
-- Matrix: Teil von "Qualification structure" (Curriculum) -> read All (nur
-- veröffentlicht, hier über die referenzierte lesson), write nur AfCJ admin.
-- ============================================================
alter table lesson_resource enable row level security;
revoke all on lesson_resource from public, anon, authenticated;
grant select on lesson_resource to authenticated;
grant insert, update, delete on lesson_resource to authenticated;

create policy lesson_resource_read_published on lesson_resource
  for select to authenticated
  using (
    exists (
      select 1 from lesson l
      where l.id = lesson_resource.lesson_id
        and l.status = 'published'
    )
  );

create policy lesson_resource_admin_all on lesson_resource
  for all to authenticated
  using (fn_is_afcj_admin())
  with check (fn_is_afcj_admin());

-- ============================================================
-- field_job_type_frage
-- Matrix-Zeile "Field job type, Field job type frage": read All (nur
-- published, hier über den referenzierten field_job_type), write nur AfCJ
-- admin.
-- ============================================================
alter table field_job_type_frage enable row level security;
revoke all on field_job_type_frage from public, anon, authenticated;
grant select on field_job_type_frage to authenticated;
grant insert, update, delete on field_job_type_frage to authenticated;

create policy field_job_type_frage_read_published on field_job_type_frage
  for select to authenticated
  using (
    exists (
      select 1 from field_job_type ft
      where ft.id = field_job_type_frage.field_job_type_id
        and ft.status = 'published'
    )
  );

create policy field_job_type_frage_admin_all on field_job_type_frage
  for all to authenticated
  using (fn_is_afcj_admin())
  with check (fn_is_afcj_admin());

-- ============================================================
-- field_capture_antwort
-- Matrix-Zeile "Field capture — Rohinhalt/Antworten": Learner read/write Own
-- (über die eigene field_capture), AfCJ admin read All, write — (genau wie
-- field_capture selbst — Admin ändert Antworten nie direkt).
-- ============================================================
alter table field_capture_antwort enable row level security;
revoke all on field_capture_antwort from public, anon, authenticated;
grant select, insert, update on field_capture_antwort to authenticated;

create policy field_capture_antwort_learner_select on field_capture_antwort
  for select to authenticated
  using (
    exists (
      select 1 from field_capture fc
      where fc.id = field_capture_antwort.field_capture_id
        and fc.learner_id = auth.uid()
    )
  );

create policy field_capture_antwort_learner_insert on field_capture_antwort
  for insert to authenticated
  with check (
    exists (
      select 1 from field_capture fc
      where fc.id = field_capture_antwort.field_capture_id
        and fc.learner_id = auth.uid()
    )
  );

-- "write Own" wie bei field_capture selbst — Learner darf eine eigene Antwort
-- vor der Verifizierung noch korrigieren.
create policy field_capture_antwort_learner_update on field_capture_antwort
  for update to authenticated
  using (
    exists (
      select 1 from field_capture fc
      where fc.id = field_capture_antwort.field_capture_id
        and fc.learner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from field_capture fc
      where fc.id = field_capture_antwort.field_capture_id
        and fc.learner_id = auth.uid()
    )
  );

create policy field_capture_antwort_admin_select on field_capture_antwort
  for select to authenticated
  using (fn_is_afcj_admin());

-- Kein field_capture_antwort_admin_all: AfCJ admin hat laut Matrix "write —"
-- auf Field capture Rohinhalt/Antworten, exakt wie bei field_capture selbst.
