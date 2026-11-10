-- 0069_praxisaufgabe_hilfen.sql
-- SR-68 (Notion, Acceptance Check am 10.11.2026 ergänzt): Hilfsunterlagen je
-- Praxisaufgabe. AfCJ hängt Dateien und Links an eine Praxisaufgabe
-- (field_job_type); sie gelten für alle Lernenden mit einem Praxisauftrag
-- dieser Aufgabe gleich und erscheinen im Praxisflow unter „Hilfen“. Später
-- nutzt der Labortag (SR-94) dieselben Unterlagen.
--
-- Aufbau wie lesson_resource (0010, 0023): Verweis auf file_asset, Dateien im
-- privaten Bucket lesson-resources (dieselben Formate und 50 MB), Upload nur
-- durch AfCJ. Curriculum-Tabelle ohne organisation_id, wie lesson_resource.
--
-- Lesen: nur Lernende, die selbst einen Praxisauftrag dieser Aufgabe haben,
-- und nur bei veröffentlichter Aufgabe (fn_kann_praxisaufgabe_lesen).
-- AfCJ admin: alles. Andere Rollen: kein Zugriff (access-matrix.md).

-- ============================================================
-- Tabelle
-- ============================================================
create table field_job_type_resource (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  field_job_type_id uuid not null references field_job_type (id) on delete cascade,
  reihenfolge integer not null,
  typ text not null check (typ in ('datei', 'link')),
  titel text not null check (btrim(titel) <> ''),
  file_asset_id uuid references file_asset (id),
  external_url text,

  constraint field_job_type_resource_typ_passt check (
    (typ = 'datei' and file_asset_id is not null and external_url is null)
    or (typ = 'link' and external_url is not null and file_asset_id is null)
  ),
  constraint field_job_type_resource_reihenfolge_eindeutig unique (field_job_type_id, reihenfolge)
);

create trigger set_updated_at before update on field_job_type_resource
  for each row execute function set_updated_at();

comment on table field_job_type_resource is
  'SR-68: Hilfsunterlagen (Datei oder Link) einer Praxisaufgabe, von AfCJ gepflegt, '
  'für alle Lernenden mit einem Praxisauftrag dieser Aufgabe gleich. Dateien im '
  'Bucket lesson-resources.';

-- ============================================================
-- Sichtbarkeitsregel an genau einer Stelle
-- ============================================================
create or replace function fn_kann_praxisaufgabe_lesen(p_field_job_type_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from field_job fj
    join field_job_type t on t.id = fj.field_job_type_id
    where t.id = p_field_job_type_id
      and t.status = 'published'
      and fj.learner_id = auth.uid()
  );
$$;

comment on function fn_kann_praxisaufgabe_lesen(uuid) is
  'True, wenn die Praxisaufgabe veröffentlicht ist und die eingeloggte Person einen '
  'eigenen Praxisauftrag dieser Aufgabe hat (SR-68). Einzige Stelle für diese Regel.';

revoke execute on function fn_kann_praxisaufgabe_lesen(uuid) from public, anon;
grant execute on function fn_kann_praxisaufgabe_lesen(uuid) to authenticated;

-- ============================================================
-- RLS
-- ============================================================
alter table field_job_type_resource enable row level security;

revoke all on field_job_type_resource from public, anon, authenticated;
grant select, insert, update, delete on field_job_type_resource to authenticated;

create policy field_job_type_resource_lernende_lesen on field_job_type_resource
  for select to authenticated
  using (fn_kann_praxisaufgabe_lesen(field_job_type_id));

create policy field_job_type_resource_admin_all on field_job_type_resource
  for all to authenticated
  using (fn_is_afcj_admin())
  with check (fn_is_afcj_admin());

-- ============================================================
-- storage.objects im Bucket lesson-resources: zusätzlich lesbar, was über
-- field_job_type_resource an einer für die Person lesbaren Praxisaufgabe
-- hängt. Die Policies aus 0023 bleiben unverändert. Keine Schreib-Policy.
-- ============================================================
create policy praxisaufgabe_hilfen_lesen on storage.objects
  for select to authenticated
  using (
    bucket_id = 'lesson-resources'
    and exists (
      select 1
      from field_job_type_resource r
      join file_asset fa on fa.id = r.file_asset_id
      where fa.storage_pfad = storage.objects.name
        and fn_kann_praxisaufgabe_lesen(r.field_job_type_id)
    )
  );
