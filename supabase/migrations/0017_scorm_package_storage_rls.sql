-- 0017_scorm_package_storage_rls.sql
-- Korrektur zu 0016_scorm_package.sql: statt "Default-Deny + Service-Role-
-- signierte URLs" bekommt der Bucket scorm-packages eine echte RLS-Policy
-- auf storage.objects, analog zu scorm_package_read_published. Dadurch kann
-- der Browser mit dem normalen authenticated-Key selbst eine Signed URL
-- anfordern -- kein Service-Role-Key im Server-Code noetig, Zugriffslogik
-- bleibt vollstaendig in der DB/RLS statt in App-Code.

create policy scorm_packages_read_published on storage.objects
  for select to authenticated
  using (
    bucket_id = 'scorm-packages'
    and exists (
      select 1
      from scorm_package sp
      join lesson l on l.id = sp.lesson_id
      join file_asset fa on fa.id = sp.file_asset_id
      where fa.storage_pfad = storage.objects.name
        and l.status = 'published'
    )
  );

comment on policy scorm_packages_read_published on storage.objects is
  'Lernende duerfen die SCORM-Zip-Datei lesen (fuer eine Signed URL), wenn die zugehoerige Lektion published ist -- Ersatz fuer den in 0016 vorgesehenen Service-Role-Weg.';

comment on column file_asset.storage_pfad is
  'Bucket-relativer Pfad, wie von storage.objects.name erwartet (kein Bucket-Name als Praefix, keine volle URL) -- verbindliche Konvention seit 0017, damit Storage-RLS-Policies wie scorm_packages_read_published korrekt matchen.';
