-- 0019_competency_competency_step.sql
-- SR-65: competency <-> competency_step wird von 1:N (competency_step.competency_id)
-- auf N:M umgestellt: ein Teilschritt kann künftig auf mehrere Kompetenzen
-- einzahlen. Neue Junction-Tabelle competency_competency_step, bestehende
-- Zuordnungen werden 1:1 übernommen.
--
-- Zwei-Schritt-Umstellung: competency_step.competency_id bleibt in dieser
-- Migration bewusst noch stehen (inkl. not null), damit bis zum Deployment
-- des neuen Codes nichts bricht, der die Spalte noch liest. Das
-- "drop column" folgt in einer eigenen Migration, sobald der Code, der
-- ausschließlich competency_competency_step nutzt, auf prod läuft. Bis dahin
-- ist competency_competency_step die maßgebliche Zuordnung; competency_id
-- wird nicht mehr gelesen.
-- Owner: AfCJ, wie die anderen Curriculum-Tabellen -- kein organisation_id.

create table competency_competency_step (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  competency_id uuid not null references competency (id) on delete cascade,
  competency_step_id uuid not null references competency_step (id) on delete cascade,

  unique (competency_id, competency_step_id)
);

create trigger set_updated_at before update on competency_competency_step
  for each row execute function set_updated_at();

comment on table competency_competency_step is
  'N:M Kompetenz <-> Teilschritt. Löst competency_step.competency_id (1:N) ab.';

-- ============================================================
-- RLS: identisch zu competency/competency_step (0009_rls_policies.sql,
-- Schleife über die Qualification-structure-Tabellen) -- read All für alle
-- eingeloggten Rollen, write All nur AfCJ admin.
-- ============================================================
alter table competency_competency_step enable row level security;
revoke all on competency_competency_step from public, anon, authenticated;
grant select on competency_competency_step to authenticated;
grant insert, update, delete on competency_competency_step to authenticated;

create policy competency_competency_step_read_all on competency_competency_step
  for select to authenticated
  using (true);

create policy competency_competency_step_admin_write on competency_competency_step
  for all to authenticated
  using (fn_is_afcj_admin())
  with check (fn_is_afcj_admin());

-- ============================================================
-- Bestehende 1:N-Zuordnungen übernehmen.
-- ============================================================
insert into competency_competency_step (competency_id, competency_step_id)
select competency_id, id from competency_step where competency_id is not null;

comment on column competency_step.competency_id is
  'Veraltet seit 0019 (SR-65) -- abgelöst durch competency_competency_step, '
  'wird nicht mehr gelesen. Entfällt mit der Folge-Migration (drop column).';
