-- 0059_praxisflow_dateien.sql
-- SR-88: Lernende laden im Praxisflow Dateien zum eigenen Praxistag hoch
-- (Arbeitsauftrag, Hilfen, Pläne, Prüfprotokoll), sehen sie und können sie
-- bis zum Abschluss löschen. In der Plattform sieht sonst niemand die Dateien,
-- auch keine Trainer:in und kein AfCJ admin (Entscheidung 06.11.2026,
-- decisions.md). Formate wie demo, höchstens 50 MB je Datei.
--
-- Nur additiv: Bucket praxis-dateien, Tabelle field_job_datei, Policies,
-- Ersatz von fn_praxis_pruefe_informieren (0058): Informieren endet erst
-- mit mindestens einer Datei "auftrag".

-- ============================================================
-- Bucket praxis-dateien (privat)
-- CAD- und 3D-Formate setzt die App beim Hochladen nach der Endung, weil
-- Browser dafür oft keinen Typ liefern.
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'praxis-dateien', 'praxis-dateien', false, 52428800,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    'application/pdf',
    'text/csv', 'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/vnd.dwg', 'image/vnd.dxf', 'model/gltf-binary'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================
-- fn_praxis_datei_offen
-- Darf die eingeloggte Person zu diesem Praxistag Dateien hochladen oder
-- löschen? Nur eigener Praxistag im geführten Ablauf, noch nicht
-- abgeschlossen. Parameter als Text, damit die Storage-Policy den
-- Ordnernamen ohne Umwandlung übergeben kann.
-- ============================================================
create or replace function fn_praxis_datei_offen(p_job text)
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
    where fj.id::text = p_job
      and fj.learner_id = auth.uid()
      and t.ablauf = 'gefuehrt'
      and fj.phase <> 'abgeschlossen'
  );
$$;

comment on function fn_praxis_datei_offen(text) is
  'SR-88: eigener Praxistag im geführten Ablauf, nicht abgeschlossen -> Dateien hochladen oder löschen erlaubt.';

revoke execute on function fn_praxis_datei_offen(text) from public, anon;
grant execute on function fn_praxis_datei_offen(text) to authenticated;

-- ============================================================
-- field_job_datei
-- ============================================================
create table field_job_datei (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  organisation_id uuid not null references organisation (id) on delete cascade,
  field_job_id uuid not null references field_job (id) on delete cascade,
  learner_id uuid not null references person (id) on delete cascade,
  art text not null check (art in ('auftrag', 'hilfe', 'plan', 'protokoll')),
  storage_pfad text not null unique,
  dateiname text not null check (char_length(dateiname) between 1 and 255),
  mime_type text not null,
  groesse bigint not null check (groesse > 0 and groesse <= 52428800),

  constraint field_job_datei_pfad check (
    storage_pfad like learner_id::text || '/' || field_job_id::text || '/%'
  ),
  constraint field_job_datei_cad_nur_plan check (
    mime_type not in ('image/vnd.dwg', 'image/vnd.dxf', 'model/gltf-binary') or art = 'plan'
  )
);

create index field_job_datei_field_job_idx on field_job_datei (field_job_id);

create trigger set_updated_at before update on field_job_datei
  for each row execute function set_updated_at();

comment on table field_job_datei is
  'SR-88: Dateien der Lernenden im Praxisflow. Nur die lernende Person selbst liest, legt an und löscht (bis zum Abschluss).';

alter table field_job_datei enable row level security;

revoke all on field_job_datei from public, anon, authenticated;
grant select, insert, delete on field_job_datei to authenticated;

create policy field_job_datei_eigene_lesen on field_job_datei
  for select to authenticated
  using (learner_id = auth.uid());

create policy field_job_datei_eigene_anlegen on field_job_datei
  for insert to authenticated
  with check (
    learner_id = auth.uid()
    and fn_praxis_datei_offen(field_job_id::text)
    and exists (
      select 1 from field_job fj
      where fj.id = field_job_id
        and fj.organisation_id = field_job_datei.organisation_id
    )
  );

create policy field_job_datei_eigene_loeschen on field_job_datei
  for delete to authenticated
  using (learner_id = auth.uid() and fn_praxis_datei_offen(field_job_id::text));

-- Bewusst keine Policy für Trainer:innen und AfCJ admin (SR-88).

-- ============================================================
-- storage.objects: Policies für praxis-dateien
-- Pfad <learner_id>/<field_job_id>/<uuid>.<endung>. Kein Überschreiben.
-- ============================================================
create policy praxis_dateien_eigene_lesen on storage.objects
  for select to authenticated
  using (
    bucket_id = 'praxis-dateien'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy praxis_dateien_eigene_anlegen on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'praxis-dateien'
    and (storage.foldername(name))[1] = auth.uid()::text
    and fn_praxis_datei_offen((storage.foldername(name))[2])
  );

create policy praxis_dateien_eigene_loeschen on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'praxis-dateien'
    and (storage.foldername(name))[1] = auth.uid()::text
    and fn_praxis_datei_offen((storage.foldername(name))[2])
  );

-- ============================================================
-- Informieren endet erst mit dem hochgeladenen Arbeitsauftrag (SR-88).
-- Ersetzt die Fassung aus 0058.
-- ============================================================
create or replace function fn_praxis_pruefe_informieren(v field_job)
returns void
language plpgsql
stable
set search_path = public
as $$
begin
  if not exists (
    select 1 from field_job_datei d
    where d.field_job_id = v.id and d.art = 'auftrag'
  ) then
    raise exception 'Erst den Arbeitsauftrag hochladen' using errcode = '23514';
  end if;
end;
$$;

revoke execute on function fn_praxis_pruefe_informieren(field_job) from public, anon, authenticated;
