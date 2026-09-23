-- 0020_competency_programme.sql
-- SR-66 (Entscheidung 2026-09-23): competency <-> programme als N:M. Eine
-- Kompetenz kann mehreren Qualifizierungsprogrammen zugeordnet sein.
-- Neue Junction-Tabelle competency_programme, bestehende Zuordnungen werden
-- aus competency.quelle übernommen (Abgleich mit programme.kuerzel).
--
-- Zwei-Schritt-Umstellung analog 0019 (competency_step.competency_id):
-- competency.quelle bleibt vorerst stehen (inkl. not null und CHECK) und
-- entfällt erst mit einer eigenen Drop-Column-Migration.
-- Owner: AfCJ, wie die anderen Curriculum-Tabellen -- kein organisation_id.

create table competency_programme (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  competency_id uuid not null references competency (id) on delete cascade,
  programme_id uuid not null references programme (id) on delete cascade,

  unique (competency_id, programme_id)
);

create trigger set_updated_at before update on competency_programme
  for each row execute function set_updated_at();

comment on table competency_programme is
  'N:M Kompetenz <-> Programm (SR-66). Löst competency.quelle ab.';

-- ============================================================
-- RLS: Sichtbarkeit über das referenzierte, status-tragende Programm --
-- gleiches Muster wie content_competency_mapping (0012, über lesson) und
-- field_job_type_competency_mapping (0018, über field_job_type). Learner
-- sehen damit keine Zuordnungen zu unveröffentlichten Programmen, analog
-- programme_read_published. Write All nur AfCJ admin.
-- ============================================================
alter table competency_programme enable row level security;
revoke all on competency_programme from public, anon, authenticated;
grant select on competency_programme to authenticated;
grant insert, update, delete on competency_programme to authenticated;

create policy competency_programme_read_published on competency_programme
  for select to authenticated
  using (
    exists (
      select 1 from programme p
      where p.id = competency_programme.programme_id
        and p.status = 'published'
    )
  );

create policy competency_programme_admin_write on competency_programme
  for all to authenticated
  using (fn_is_afcj_admin())
  with check (fn_is_afcj_admin());

-- ============================================================
-- Bestehende Zuordnungen übernehmen. competency.quelle enthält Kürzel
-- (TQ-ARP / EFKffT / EFK-EE), deshalb Abgleich mit programme.kuerzel,
-- nicht programme.name.
-- ============================================================
insert into competency_programme (competency_id, programme_id)
select c.id, p.id
from competency c
join programme p on p.kuerzel = c.quelle
where c.quelle is not null;

comment on column competency.quelle is
  'Veraltet seit 0020 (SR-66) -- Programm-Zuordnung läuft über '
  'competency_programme. Entfällt mit der Folge-Migration (drop column).';
