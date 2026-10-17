-- scripts/scorm-einspielen/lesen.sql
-- Nur lesen (läuft in "begin read only ... rollback"): löst die Zeilen der
-- Liste zu Selbstlern-Lektionen auf und liest, was im Bucket scorm-packages
-- schon liegt. Wird nur über scripts/scorm-einspielen.mjs ausgeführt; der
-- Platzhalter __EINGABE__ wird dort durch ein jsonb-Literal ersetzt.
-- Anleitung: docs/scorm-einspielen.md. SR-50, SR-85.
--
-- Auflösung der Kennung wie scripts/import-plan/fachsprache.sql:
-- Modul (Reihenfolge) -> Woche (n-te module-Zeile nach Reihenfolge) -> Kurs
-- (Name) -> erste Lektion mit content_type 'scorm' (die Selbstlern-Lektion
-- aus dem Plan-Import). Mit lesson_id wird die Lektion direkt genommen.
--
-- Gibt genau eine Zeile mit einer jsonb-Spalte aus, keine Personendaten.

with eingabe as (
  select x.*
    from jsonb_to_recordset((__EINGABE__) -> 'eintraege')
      as x(zeile integer, "lessonId" uuid, kennung text, "modulReihenfolge" integer, woche integer, "kursName" text, speichername text)
),
prog as (
  select id from programme where kuerzel = 'EFK-EE'
),
woche as (
  select e.zeile,
         (select w.id
            from (select m.id, row_number() over (order by m.reihenfolge, m.created_at) as nr
                    from module m
                   where m.modul_id = (select mo.id from modul mo
                                        where mo.programme_id = (select id from prog)
                                          and mo.reihenfolge = e."modulReihenfolge")) w
           where w.nr = e.woche) as woche_id
    from eingabe e
   where e."lessonId" is null
),
kurs as (
  select e.zeile, w.woche_id,
         (select c.id from course c where c.module_id = w.woche_id and c.name = e."kursName" order by c.created_at limit 1) as kurs_id,
         (select count(*) from course c where c.module_id = w.woche_id and c.name = e."kursName") as kurs_anzahl
    from eingabe e join woche w using (zeile)
),
aufgeloest as (
  select e.*, k.woche_id, k.kurs_id, k.kurs_anzahl,
         coalesce(e."lessonId",
                  (select l.id from lesson l
                    where l.course_id = k.kurs_id and l.content_type = 'scorm'
                    order by l.reihenfolge, l.created_at limit 1)) as lid
    from eingabe e left join kurs k using (zeile)
)
select jsonb_build_object(
  'bucket', (select jsonb_build_object('vorhanden', true, 'groesseGrenze', b.file_size_limit, 'mimeTypen', b.allowed_mime_types)
               from storage.buckets b where b.id = 'scorm-packages'),
  'policyEntpackt', exists (select 1 from pg_policies
                             where schemaname = 'storage' and tablename = 'objects'
                               and policyname = 'scorm_packages_entpackt_read_published'),
  'programm', exists (select 1 from prog),
  'eintraege', coalesce((
    select jsonb_agg(jsonb_build_object(
             'zeile', a.zeile,
             'wocheGefunden', a.woche_id is not null,
             'kursGefunden', a.kurs_id is not null,
             'kursAnzahl', a.kurs_anzahl,
             'lessonId', l.id,
             'lessonName', l.name,
             'kursName', c.name,
             'contentType', l.content_type,
             'status', l.status,
             'zipPfad', l.id::text || '/' || a.speichername,
             'paket', (select jsonb_build_object('fileAssetId', sp.file_asset_id, 'storagePfad', fa.storage_pfad,
                                                 'entryPoint', sp.entry_point_pfad, 'manifestTitel', sp.manifest_titel,
                                                 'andereLektionen', (select count(*) from scorm_package s2
                                                                      where s2.file_asset_id = sp.file_asset_id and s2.lesson_id <> sp.lesson_id))
                         from scorm_package sp join file_asset fa on fa.id = sp.file_asset_id
                        where sp.lesson_id = l.id),
             'fileAssets', (select count(*) from file_asset fa where fa.storage_pfad = l.id::text || '/' || a.speichername),
             'objekte', (select coalesce(jsonb_agg(jsonb_build_object('name', o.name, 'groesse', (o.metadata ->> 'size')::bigint) order by o.name), '[]'::jsonb)
                           from storage.objects o
                          where l.id is not null and o.bucket_id = 'scorm-packages'
                            and (o.name = l.id::text || '/' || a.speichername
                                 or starts_with(o.name, l.id::text || '/' || a.speichername || '.entpackt/')))
           ) order by a.zeile)
      from aufgeloest a
      left join lesson l on l.id = a.lid
      left join course c on c.id = l.course_id), '[]'::jsonb)
);
