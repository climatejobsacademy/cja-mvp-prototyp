-- 0009_rls_policies.sql
-- RLS policies implementing docs/access-matrix.md exactly, for the two roles
-- that exist in the prototype: Learner and AfCJ admin (see 0008_rls_helpers.sql
-- for why the other matrix columns are not implemented here).
--
-- Convention: RLS restricts ROWS. Table-level GRANTs restrict which operations
-- are possible at all (and, for field_capture, which COLUMNS). Both layers are
-- needed for every table below.
--
-- anon has no access anywhere in this schema (learners and admins are always
-- authenticated). service_role bypasses RLS by default in Supabase and is used
-- for trusted backend jobs (e.g. imports) only.
--
-- Every "revoke all ... from public, anon, authenticated" below is deliberate,
-- not defensive boilerplate: Supabase's default privileges grant `authenticated`
-- broad table access on every new table, which would silently undo the
-- column-level restriction on field_capture.status further down if left in
-- place. Revoke first, then grant back exactly what the matrix allows.

-- ============================================================
-- organisation, membership
-- Matrix row "Organisation, membership": Learner read Own; write —.
--                                         AfCJ admin read All; write All.
-- ============================================================
alter table organisation enable row level security;
revoke all on organisation from public, anon, authenticated;
grant select on organisation to authenticated;
grant insert, update, delete on organisation to authenticated;

create policy organisation_learner_select on organisation
  for select to authenticated
  using (
    exists (
      select 1 from org_membership om
      where om.organisation_id = organisation.id
        and om.person_id = auth.uid()
    )
  );

create policy organisation_admin_all on organisation
  for all to authenticated
  using (fn_is_afcj_admin())
  with check (fn_is_afcj_admin());

alter table org_membership enable row level security;
revoke all on org_membership from public, anon, authenticated;
grant select, insert, update, delete on org_membership to authenticated;

create policy org_membership_learner_select on org_membership
  for select to authenticated
  using (person_id = auth.uid());

create policy org_membership_admin_all on org_membership
  for all to authenticated
  using (fn_is_afcj_admin())
  with check (fn_is_afcj_admin());

alter table role_assignment enable row level security;
revoke all on role_assignment from public, anon, authenticated;
grant select, insert, update, delete on role_assignment to authenticated;

create policy role_assignment_learner_select on role_assignment
  for select to authenticated
  using (person_id = auth.uid());

create policy role_assignment_admin_all on role_assignment
  for all to authenticated
  using (fn_is_afcj_admin())
  with check (fn_is_afcj_admin());

-- person itself is not its own matrix row; treated like "Own" data everyone can
-- read/update about themselves, admin sees/manages all (consistent with
-- Organisation/membership row and with person.Owner = Person in data-model.md).
alter table person enable row level security;
revoke all on person from public, anon, authenticated;
grant select, insert, update, delete on person to authenticated;

create policy person_self_select on person
  for select to authenticated
  using (id = auth.uid());

create policy person_self_update on person
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy person_admin_all on person
  for all to authenticated
  using (fn_is_afcj_admin())
  with check (fn_is_afcj_admin());

-- ============================================================
-- Qualification structure
-- Matrix row: Learner read All (nur veröffentlicht); write —.
--             AfCJ admin read All; write All.
-- OFFENE FRAGE (docs/open-questions.md, Q-PUBLISHED): data-model.md definiert
-- kein "veröffentlicht"-Statusfeld für diese Entitäten -> hier als read All ohne
-- Veröffentlichungsfilter umgesetzt, nicht stillschweigend ein Feld ergänzt.
-- ============================================================
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'programme', 'module', 'course', 'lesson',
    'competency', 'competency_step', 'content_competency_mapping'
  ])
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('revoke all on %I from public, anon, authenticated;', t);
    execute format('grant select on %I to authenticated;', t);
    execute format('grant insert, update, delete on %I to authenticated;', t);
    execute format(
      'create policy %I on %I for select to authenticated using (true);',
      t || '_read_all', t
    );
    execute format(
      'create policy %I on %I for all to authenticated using (fn_is_afcj_admin()) with check (fn_is_afcj_admin());',
      t || '_admin_write', t
    );
  end loop;
end $$;

-- ============================================================
-- field_job_type
-- Kein eigener Zeile in docs/access-matrix.md -> als Katalogdaten wie
-- Qualification structure behandelt (read All / write All admin). Siehe
-- docs/open-questions.md, Q-FIELD-JOB-TYPE-ACCESS.
-- ============================================================
alter table field_job_type enable row level security;
revoke all on field_job_type from public, anon, authenticated;
grant select on field_job_type to authenticated;
grant insert, update, delete on field_job_type to authenticated;

create policy field_job_type_read_all on field_job_type
  for select to authenticated
  using (true);

create policy field_job_type_admin_write on field_job_type
  for all to authenticated
  using (fn_is_afcj_admin())
  with check (fn_is_afcj_admin());

-- ============================================================
-- Cohort, schedule, live sessions
-- Matrix row: Learner read Own; write —. AfCJ admin read All; write All.
-- ============================================================
alter table cohort enable row level security;
revoke all on cohort from public, anon, authenticated;
grant select on cohort to authenticated;
grant insert, update, delete on cohort to authenticated;

create policy cohort_learner_select on cohort
  for select to authenticated
  using (id in (select fn_current_cohort_ids()));

create policy cohort_admin_all on cohort
  for all to authenticated
  using (fn_is_afcj_admin())
  with check (fn_is_afcj_admin());

alter table live_session enable row level security;
revoke all on live_session from public, anon, authenticated;
grant select on live_session to authenticated;
grant insert, update, delete on live_session to authenticated;

create policy live_session_learner_select on live_session
  for select to authenticated
  using (
    exists (
      select 1 from schedule_entry se
      where se.live_session_id = live_session.id
        and se.cohort_id in (select fn_current_cohort_ids())
    )
  );

create policy live_session_admin_all on live_session
  for all to authenticated
  using (fn_is_afcj_admin())
  with check (fn_is_afcj_admin());

alter table schedule_entry enable row level security;
revoke all on schedule_entry from public, anon, authenticated;
grant select on schedule_entry to authenticated;
grant insert, update, delete on schedule_entry to authenticated;

create policy schedule_entry_learner_select on schedule_entry
  for select to authenticated
  using (
    cohort_id in (select fn_current_cohort_ids())
    or enrolment_id in (select fn_current_enrolment_ids())
  );

create policy schedule_entry_admin_all on schedule_entry
  for all to authenticated
  using (fn_is_afcj_admin())
  with check (fn_is_afcj_admin());

-- ============================================================
-- Enrolment
-- Matrix row: Learner read Own; write —. AfCJ admin read All; write All.
-- ============================================================
alter table enrolment enable row level security;
revoke all on enrolment from public, anon, authenticated;
grant select on enrolment to authenticated;
grant insert, update, delete on enrolment to authenticated;

create policy enrolment_learner_select on enrolment
  for select to authenticated
  using (learner_id = auth.uid());

create policy enrolment_admin_all on enrolment
  for all to authenticated
  using (fn_is_afcj_admin())
  with check (fn_is_afcj_admin());

-- ============================================================
-- Field job
-- Matrix row: Learner read Own; write —. AfCJ admin read All; write All.
--
-- NACHTRAG (Claude Code, 2026-09-10, beim Bauen des Praxistag-Flows
-- entdeckt): docs/design-specifications.md Abschnitt 2.1 sieht einen
-- Learner-Button "Einsatz erledigt" vor, der genau auf
-- field_job.status/durchgefuehrt_bestaetigt_am schreibt — das widerspricht
-- wörtlich "write —" für Learner in dieser Zeile. Siehe docs/open-questions.md,
-- Q-FIELD-JOB-LEARNER-CONFIRM. Bis das geklärt ist: engste mögliche Policy,
-- nur die zwei für den Button nötigen Spalten, nur geplant -> durchgeführt.
-- ============================================================
alter table field_job enable row level security;
revoke all on field_job from public, anon, authenticated;
grant select on field_job to authenticated;
grant insert, delete on field_job to authenticated;
grant update (status, durchgefuehrt_bestaetigt_am) on field_job to authenticated;

create policy field_job_learner_select on field_job
  for select to authenticated
  using (learner_id = auth.uid());

create policy field_job_learner_confirm on field_job
  for update to authenticated
  using (learner_id = auth.uid() and status = 'geplant')
  with check (learner_id = auth.uid() and status = 'durchgeführt');

create policy field_job_admin_all on field_job
  for all to authenticated
  using (fn_is_afcj_admin())
  with check (fn_is_afcj_admin());

-- ============================================================
-- Unit progress
-- Matrix row: Learner read Own; write Own. AfCJ admin read All; write All.
-- ============================================================
alter table unit_progress enable row level security;
revoke all on unit_progress from public, anon, authenticated;
grant select, insert, update on unit_progress to authenticated;

create policy unit_progress_learner_select on unit_progress
  for select to authenticated
  using (learner_id = auth.uid());

create policy unit_progress_learner_write on unit_progress
  for insert to authenticated
  with check (
    learner_id = auth.uid()
    and exists (
      select 1 from org_membership om
      where om.person_id = auth.uid() and om.organisation_id = unit_progress.organisation_id
    )
  );

create policy unit_progress_learner_update on unit_progress
  for update to authenticated
  using (learner_id = auth.uid())
  with check (
    learner_id = auth.uid()
    and exists (
      select 1 from org_membership om
      where om.person_id = auth.uid() and om.organisation_id = unit_progress.organisation_id
    )
  );

create policy unit_progress_admin_all on unit_progress
  for all to authenticated
  using (fn_is_afcj_admin())
  with check (fn_is_afcj_admin());

-- ============================================================
-- Attendance
-- Matrix row: Learner read Own; write —. AfCJ admin read All; write All.
-- ============================================================
alter table attendance enable row level security;
revoke all on attendance from public, anon, authenticated;
grant select on attendance to authenticated;
grant insert, update, delete on attendance to authenticated;

create policy attendance_learner_select on attendance
  for select to authenticated
  using (learner_id = auth.uid());

create policy attendance_admin_all on attendance
  for all to authenticated
  using (fn_is_afcj_admin())
  with check (fn_is_afcj_admin());

-- ============================================================
-- Field capture — Status/Ergebnis vs. Rohinhalt (text/media)
-- Matrix: Learner read Own auf beiden; write Own nur auf Rohinhalt (nicht status).
--         AfCJ admin read All auf beiden; write — auf beiden (Admin ändert
--         field_capture nie direkt, nur über `verification`).
--
-- Zeilenebene (RLS): Learner sieht/erstellt/ändert nur eigene Zeilen; Admin sieht
-- alle, schreibt keine.
-- Spaltenebene (GRANT): Learner darf `status` weder einfügen noch ändern — die
-- Spalte wird ausschließlich durch den Trigger unten (aus `verification`
-- abgeleitet) gesetzt, mit den Rechten des Funktionsbesitzers (security definer).
-- ============================================================
alter table field_capture enable row level security;
revoke all on field_capture from public, anon, authenticated;

grant select on field_capture to authenticated;
grant insert (organisation_id, learner_id, field_job_id, text, media, eingereicht_am)
  on field_capture to authenticated;
grant update (text, media)
  on field_capture to authenticated;
-- Kein delete, kein Zugriff (auch nicht select) auf die Spalte "status" außerhalb
-- des Trigger-Funktionsbesitzers ist über GRANT nicht separat verweigerbar
-- (SELECT ist immer zeilenweise, nicht spaltenweise beschränkbar ohne View) —
-- Lesen von status ist unkritisch, nur das Schreiben ist eingeschränkt.

create policy field_capture_learner_select on field_capture
  for select to authenticated
  using (learner_id = auth.uid());

create policy field_capture_learner_insert on field_capture
  for insert to authenticated
  with check (
    learner_id = auth.uid()
    and exists (
      select 1 from org_membership om
      where om.person_id = auth.uid() and om.organisation_id = field_capture.organisation_id
    )
  );

create policy field_capture_learner_update on field_capture
  for update to authenticated
  using (learner_id = auth.uid())
  with check (learner_id = auth.uid());

create policy field_capture_admin_select on field_capture
  for select to authenticated
  using (fn_is_afcj_admin());

-- Kein field_capture_admin_all: AfCJ admin hat laut Matrix "write —" auf
-- field_capture (weder Status/Ergebnis noch Rohinhalt) und bekommt daher keine
-- Insert/Update/Delete-Policy.

-- ============================================================
-- field_capture_step_mapping
-- Nicht separat in der Matrix aufgeführt -> wie field_capture behandelt (Teil
-- derselben Selbstauskunft-Einreichung).
-- ============================================================
alter table field_capture_step_mapping enable row level security;
revoke all on field_capture_step_mapping from public, anon, authenticated;
grant select, insert on field_capture_step_mapping to authenticated;

create policy field_capture_step_mapping_learner_select on field_capture_step_mapping
  for select to authenticated
  using (
    exists (
      select 1 from field_capture fc
      where fc.id = field_capture_step_mapping.field_capture_id
        and fc.learner_id = auth.uid()
    )
  );

create policy field_capture_step_mapping_learner_insert on field_capture_step_mapping
  for insert to authenticated
  with check (
    exists (
      select 1 from field_capture fc
      where fc.id = field_capture_step_mapping.field_capture_id
        and fc.learner_id = auth.uid()
    )
  );

create policy field_capture_step_mapping_admin_select on field_capture_step_mapping
  for select to authenticated
  using (fn_is_afcj_admin());

-- ============================================================
-- Verification
-- Matrix row: Learner read Own; write —. AfCJ admin read All; write All.
-- "Own" für Learner = Verifications zu den eigenen field_captures.
-- ============================================================
alter table verification enable row level security;
revoke all on verification from public, anon, authenticated;
grant select on verification to authenticated;
grant insert, update, delete on verification to authenticated;

create policy verification_learner_select on verification
  for select to authenticated
  using (
    exists (
      select 1 from field_capture fc
      where fc.id = verification.field_capture_id
        and fc.learner_id = auth.uid()
    )
  );

create policy verification_admin_all on verification
  for all to authenticated
  using (fn_is_afcj_admin())
  with check (fn_is_afcj_admin());

-- Trigger: eine verification schreibt den abgeleiteten status auf field_capture
-- zurück (verified/rejected), weil AfCJ admin keine direkte Schreibrechte auf
-- field_capture hat (siehe oben). Security definer, damit der Trigger unabhängig
-- von den eingeschränkten Spalten-Grants schreiben kann.
create or replace function fn_apply_verification_to_capture()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update field_capture
  set status = new.entscheidung
  where id = new.field_capture_id;
  return new;
end;
$$;

comment on function fn_apply_verification_to_capture() is
  'Spiegelt verification.entscheidung nach field_capture.status, weil field_capture '
  'laut Zugriffsmatrix für keine Rolle direkt beschreibbar ist (write — für Status).';

create trigger apply_verification_to_capture
  after insert or update on verification
  for each row execute function fn_apply_verification_to_capture();

-- ============================================================
-- competency_evidence: keine Policies nötig/möglich — es ist eine
-- security_invoker-View ohne eigene RLS, siehe 0006_progress_and_evidence.sql.
-- Zugriff erbt sich aus unit_progress/verification/field_capture(_step_mapping).
-- ============================================================

-- ============================================================
-- file_asset
-- Ursprünglich nicht separat in der Matrix aufgeführt (Q-FILE-ASSET); seit
-- Entschieden 2026-09-11 eigene Matrixzeile "File assets": read All; write —
-- für alle Rollen außer AfCJ admin (read All; write All) — exakt das, was
-- hier schon stand, keine Code-Änderung nötig. Aktuell nur AfCJ-weiter Content
-- aktiv genutzt (Lektionen, field_job_type-Bilder, knowledge_source). Siehe
-- docs/open-questions.md, Q-FILE-ASSET, zur Governance sobald Employer-/
-- Learner-eigene Medien (field_capture.media) aktiv werden.
-- ============================================================
alter table file_asset enable row level security;
revoke all on file_asset from public, anon, authenticated;
grant select on file_asset to authenticated;
grant insert, update, delete on file_asset to authenticated;

create policy file_asset_read_all on file_asset
  for select to authenticated
  using (true);

create policy file_asset_admin_write on file_asset
  for all to authenticated
  using (fn_is_afcj_admin())
  with check (fn_is_afcj_admin());

-- ============================================================
-- Knowledge sources
-- Matrix row: Learner —; — (kein Zugriff). AfCJ admin read All; write All.
-- Keine Learner-Policy -> RLS verweigert Learnern jeden Zugriff standardmäßig.
-- ============================================================
alter table knowledge_source enable row level security;
revoke all on knowledge_source from public, anon, authenticated;
grant select, insert, update, delete on knowledge_source to authenticated;

create policy knowledge_source_admin_all on knowledge_source
  for all to authenticated
  using (fn_is_afcj_admin())
  with check (fn_is_afcj_admin());
