-- 0023_lesson_resources_bucket.sql
-- Lernmaterialien, PR 1 von 2 (nur Schema; Anzeige für Lernende folgt in PR 2).
-- SR-68 (Notion). Bis 08.10.2026 als "SR folgt" geführt, weil SR-68 im Repo
-- damals anders belegt war (siehe docs/traceability.md, Legacy-Nummern).
--
-- Entschieden 2026-10-07 (Learning Designer und Vera):
--   - privater Bucket lesson-resources, 50 MB (52428800 Byte) je Datei
--   - erlaubt: PDF, PNG, JPEG, WebP, DOCX, PPTX, XLSX; nicht: SVG, ZIP, .doc,
--     .xls, Videos (Videos nur als Link, lesson_resource.typ = 'link')
--   - Materialien an allen Lektionstypen (repository, live, scorm)
--   - Lernende sehen sie nur bei veröffentlichter Lektion UND Einschreibung
--     (Status aktiv oder abgeschlossen) in das Programm der Lektion
--   - Upload nur durch AfCJ (Dashboard), nie durch Lernende
--   - titel ist Pflicht; der Dateiname wird aus dem Storage-Pfad abgeleitet
--
-- Aufbau gespiegelt von scorm-packages (0016/0017): privater Bucket,
-- Storage-Policy auf storage.objects über file_asset.storage_pfad.
-- Größe und MIME-Typ liegen bereits in storage.objects.metadata (size,
-- mimetype) -- deshalb keine eigenen Spalten dafür.

-- ============================================================
-- Bucket
-- on conflict do update statt do nothing (anders als 0016): falls der Bucket
-- schon angelegt wurde, gelten trotzdem genau diese Einstellungen.
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-resources',
  'lesson-resources',
  false,
  52428800,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================
-- lesson_resource.titel
-- Kein Backfill nötig: lesson_resource hat auf Staging und Production 0 Zeilen
-- (gezählt 2026-10-07).
-- ============================================================
alter table lesson_resource
  add column titel text not null;

alter table lesson_resource
  add constraint lesson_resource_titel_nicht_leer check (btrim(titel) <> '');

comment on column lesson_resource.titel is
  'Anzeigename für Lernende (Pflicht, nicht der Dateiname). Der Dateiname wird '
  'aus file_asset.storage_pfad abgeleitet (Entscheidung 2026-10-07).';

comment on table lesson_resource is
  'Ein Datei- oder Link-Verweis an einer Lektion beliebigen Typs (repository, '
  'live, scorm; erweitert 2026-10-07). Dateien liegen im Bucket lesson-resources, '
  'Videos nur als Link.';

-- ============================================================
-- Sichtbarkeitsregel an genau einer Stelle
-- Veröffentlichungsbedingung exakt wie lesson_read_published (0012:
-- status = 'published'), dazu die Einschreibung in das Programm der Lektion
-- (Kurs direkt am Programm oder über das Modul). Gezählte Statuswerte von
-- enrolment.status ('aktiv', 'abgeschlossen', 'abgebrochen', 0005) nur hier
-- ändern.
-- ============================================================
create or replace function fn_kann_lektion_lesen(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from lesson l
    join course c on c.id = l.course_id
    left join module m on m.id = c.module_id
    join cohort co on co.programme_id = coalesce(c.programme_id, m.programme_id)
    join enrolment e on e.cohort_id = co.id
    where l.id = p_lesson_id
      and l.status = 'published'
      and e.learner_id = auth.uid()
      and e.status in ('aktiv', 'abgeschlossen')
  );
$$;

comment on function fn_kann_lektion_lesen(uuid) is
  'True, wenn die Lektion veröffentlicht ist und die eingeloggte Person in einer '
  'Kohorte ihres Programms mit Status aktiv oder abgeschlossen eingeschrieben ist. '
  'Einzige Stelle für diese Regel (Lernmaterialien, 2026-10-07).';

revoke execute on function fn_kann_lektion_lesen(uuid) from public, anon;
grant execute on function fn_kann_lektion_lesen(uuid) to authenticated;

-- ============================================================
-- lesson_resource: Lesen nur noch mit Einschreibung (vorher: nur published,
-- 0012). Grants und lesson_resource_admin_all bleiben unverändert.
-- ============================================================
drop policy lesson_resource_read_published on lesson_resource;

create policy lesson_resource_read_enrolled on lesson_resource
  for select to authenticated
  using (fn_kann_lektion_lesen(lesson_id));

-- ============================================================
-- storage.objects im Bucket lesson-resources
-- Lernende: lesen nur Objekte, die über lesson_resource -> file_asset an einer
-- für sie lesbaren Lektion hängen. AfCJ admin: alles im Bucket lesen
-- (Vorschau; Upload läuft über das Dashboard). Anonyme: keine Policy, also
-- kein Zugriff. Keine Insert-/Update-/Delete-Policy: Lernende schreiben nie.
-- ============================================================
create policy lesson_resources_read_enrolled on storage.objects
  for select to authenticated
  using (
    bucket_id = 'lesson-resources'
    and exists (
      select 1
      from lesson_resource lr
      join file_asset fa on fa.id = lr.file_asset_id
      where fa.storage_pfad = storage.objects.name
        and fn_kann_lektion_lesen(lr.lesson_id)
    )
  );

create policy lesson_resources_admin_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'lesson-resources'
    and fn_is_afcj_admin()
  );
