-- 0055_scorm_entpackt.sql
-- SR-50 (SCORM-Paket einspielen) und SR-85 (native Selbstlern-Ansicht):
-- Das Einspiel-Skript legt die Medien eines Elephant-Pakets zusätzlich
-- ausgepackt in den Bucket scorm-packages, damit Bilder, Audio und Video
-- direkt aus Storage kommen statt durch die Serverless-Funktion (Antwort-
-- grenze 4,5 MB bei Vercel). Die Zip bleibt, wo sie ist (Rückfall).
--
-- Pfad-Schema (verbindlich, auch für scripts/scorm-einspielen.mjs):
--   Zip:          file_asset.storage_pfad                     (wie bisher, 0017)
--   Ausgepackt:   <storage_pfad>.entpackt/<innerer Zip-Pfad>
--                 z. B. x/paket.zip.entpackt/assets/images/a.jpg
--   Audio, das nicht MP3/M4A ist (z. B. WAV), liegt umgewandelt als M4A mit
--   ersetzter Endung: .../assets/audio/u/u.wav -> .../assets/audio/u/u.m4a
--
-- Diese Policy erlaubt nur das Lesen. Bedingung wie scorm_packages_read_published
-- (0017, unverändert): Lektion veröffentlicht. Statt Gleichheit mit dem
-- Zip-Pfad zählt hier das Präfix '<storage_pfad>.entpackt/'. starts_with statt
-- like, damit '%' oder '_' im Pfad keine Platzhalter werden; der Schrägstrich
-- am Ende verhindert Treffer wie '<storage_pfad>.entpacktX/...'.
-- Keine Insert-, Update- oder Delete-Policy: geschrieben wird nur durch das
-- Einspiel-Skript, nicht durch die App.

create policy scorm_packages_entpackt_read_published on storage.objects
  for select to authenticated
  using (
    bucket_id = 'scorm-packages'
    and exists (
      select 1
      from scorm_package sp
      join lesson l on l.id = sp.lesson_id
      join file_asset fa on fa.id = sp.file_asset_id
      where starts_with(storage.objects.name, fa.storage_pfad || '.entpackt/')
        and l.status = 'published'
    )
  );

