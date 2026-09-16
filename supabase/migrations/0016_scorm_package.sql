-- 0016_scorm_package.sql
-- SR-50/51/52/57 (SCORM-Architektur-Entscheidung 2026-09-16): SCORM-1.2-Paket-
-- Anbindung an lesson (content_type = 'scorm'). scorm_package haengt an
-- genau einer lesson, analog zum bestehenden lesson_resource-Muster.
-- lesson.inhalt bleibt fuer scorm ab jetzt endgueltig ungenutzt (siehe
-- open-questions.md Q-LESSON-INHALT).
--
-- Entpackt wird clientseitig beim Abspielen, nicht serverseitig beim Upload
-- (Entscheidung 2026-09-16, siehe data-model.md) -- deshalb zeigt
-- file_asset_id auf die rohe Zip-Datei, nicht auf einzelne entpackte Dateien.

create table scorm_package (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  lesson_id uuid not null unique references lesson (id) on delete cascade,
  file_asset_id uuid not null references file_asset (id),
  entry_point_pfad text not null,
  manifest_titel text
);

create trigger set_updated_at before update on scorm_package
  for each row execute function set_updated_at();

comment on table scorm_package is
  'SCORM-1.2-Paket zu genau einer Lektion (content_type=''scorm''). file_asset_id zeigt auf die hochgeladene Zip-Datei in Supabase Storage (Bucket scorm-packages); wird clientseitig beim Abspielen entpackt, nicht serverseitig beim Upload.';
comment on column scorm_package.entry_point_pfad is
  'Relativer Pfad der SCO-Einstiegsdatei innerhalb des Pakets, aus imsmanifest.xml extrahiert (z. B. "scormcontent/index.html").';

-- RLS: 1:1-Analog zu lesson_resource (0012_rls_updates_2026-09-11.sql) --
-- Sichtbarkeit ueber die referenzierte lesson, Schreibzugriff nur AfCJ admin.
alter table scorm_package enable row level security;
revoke all on scorm_package from public, anon, authenticated;
grant select on scorm_package to authenticated;
grant insert, update, delete on scorm_package to authenticated;

create policy scorm_package_read_published on scorm_package
  for select to authenticated
  using (
    exists (
      select 1 from lesson l
      where l.id = scorm_package.lesson_id
        and l.status = 'published'
    )
  );

create policy scorm_package_admin_all on scorm_package
  for all to authenticated
  using (fn_is_afcj_admin())
  with check (fn_is_afcj_admin());

-- Storage-Bucket fuer SCORM-Zip-Dateien: privat, kein Public-Read. Bewusst
-- keine storage.objects-Policies fuer anon/authenticated (Default-Deny
-- reicht, da Auslieferung ausschliesslich ueber Service-Role-signierte
-- URLs laeuft, die am RLS vorbeigehen).
insert into storage.buckets (id, name, public)
values ('scorm-packages', 'scorm-packages', false)
on conflict (id) do nothing;
