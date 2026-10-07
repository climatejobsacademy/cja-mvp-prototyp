-- scripts/sql/lernmaterial_anlegen.sql
-- Vorlage: eine hochgeladene Datei (oder einen Video-Link) an eine Lektion
-- hängen. Anleitung: docs/lernmaterialien-upload.md. SR folgt.
--
-- Läuft im Supabase-Dashboard (SQL Editor) oder per psql. Standard ist der
-- Probelauf: am Ende wird absichtlich ein Fehler ausgelöst, dadurch wird alles
-- zurückgerollt (ROLLBACK) und die Meldung zeigt, was angelegt worden wäre.
-- Erst wenn das passt, probelauf auf false setzen und erneut ausführen.
--
-- Nur die vier Werte im Block "EINGABEN" ändern. Keine echten Lektions-IDs,
-- Titel oder Dateinamen ins Repo committen.

do $$
declare
  -- ===================== EINGABEN =====================
  p_lesson_id  uuid    := '00000000-0000-0000-0000-000000000000';  -- Lektions-ID
  p_titel      text    := 'TITEL ERSETZEN';                         -- Anzeigename für Lernende
  p_pfad       text    := 'ordner/beispiel-datei.pdf';              -- Objektname im Bucket lesson-resources (bei Link: null)
  p_link       text    := null;                                     -- nur für Videos: https://…, dann p_pfad := null
  p_probelauf  boolean := true;                                     -- true = ROLLBACK, false = speichern
  -- ====================================================

  v_lektion       text;
  v_mimetype      text;
  v_groesse       bigint;
  v_file_asset_id uuid;
  v_reihenfolge   int;
  v_typ           text;
begin
  -- Lektion
  select name into v_lektion from lesson where id = p_lesson_id;
  if v_lektion is null then
    raise exception 'Abbruch: Lektion % gibt es nicht.', p_lesson_id;
  end if;

  -- Titel
  if p_titel is null or btrim(p_titel) = '' or p_titel = 'TITEL ERSETZEN' then
    raise exception 'Abbruch: Bitte einen Titel angeben.';
  end if;

  -- genau eins von Datei oder Link
  if (p_pfad is null) = (p_link is null) then
    raise exception 'Abbruch: Entweder p_pfad (Datei) oder p_link (Video-Link) setzen, nicht beides.';
  end if;

  if p_link is not null then
    v_typ := 'link';
    if p_link !~ '^https://' then
      raise exception 'Abbruch: Link muss mit https:// beginnen.';
    end if;
    if exists (select 1 from lesson_resource where lesson_id = p_lesson_id and external_url = p_link) then
      raise exception 'Abbruch: Dieser Link hängt schon an der Lektion.';
    end if;
  else
    v_typ := 'datei';

    -- Namenskonvention: Kleinbuchstaben, Ziffern, Bindestriche, Ordner mit /,
    -- eine Endung. Der schöne Name steht im Titel.
    if p_pfad !~ '^[a-z0-9]+(-[a-z0-9]+)*(/[a-z0-9]+(-[a-z0-9]+)*)*\.[a-z0-9]+$' then
      raise exception 'Abbruch: Objektname "%" hält die Namenskonvention nicht ein (nur a-z, 0-9, Bindestrich, /, eine Endung).', p_pfad;
    end if;

    -- Objekt muss im Bucket lesson-resources liegen
    select metadata->>'mimetype', (metadata->>'size')::bigint
      into v_mimetype, v_groesse
      from storage.objects
     where bucket_id = 'lesson-resources' and name = p_pfad;
    if v_mimetype is null then
      raise exception 'Abbruch: Objekt "%" liegt nicht im Bucket lesson-resources.', p_pfad;
    end if;

    -- file_asset wiederverwenden, wenn dieselbe Datei schon an einer anderen
    -- Lektion hängt; nie eins aus scorm_package.
    select fa.id into v_file_asset_id
      from file_asset fa
     where fa.storage_pfad = p_pfad
       and not exists (select 1 from scorm_package sp where sp.file_asset_id = fa.id)
     limit 1;

    if v_file_asset_id is null then
      insert into file_asset (dateiname, dateityp, storage_pfad)
      values (regexp_replace(p_pfad, '^.*/', ''), v_mimetype, p_pfad)
      returning id into v_file_asset_id;
    end if;

    if exists (select 1 from lesson_resource where lesson_id = p_lesson_id and file_asset_id = v_file_asset_id) then
      raise exception 'Abbruch: Diese Datei hängt schon an der Lektion.';
    end if;
  end if;

  select coalesce(max(reihenfolge), 0) + 1 into v_reihenfolge
    from lesson_resource where lesson_id = p_lesson_id;

  insert into lesson_resource (lesson_id, reihenfolge, typ, file_asset_id, external_url, titel)
  values (p_lesson_id, v_reihenfolge, v_typ,
          case when v_typ = 'datei' then v_file_asset_id end,
          case when v_typ = 'link' then p_link end,
          btrim(p_titel));

  if p_probelauf then
    raise exception 'PROBELAUF ok, nichts gespeichert: Lektion "%", Titel "%", Typ %, Position %, Format %, Größe % Byte. Zum Speichern p_probelauf := false setzen.',
      v_lektion, btrim(p_titel), v_typ, v_reihenfolge, coalesce(v_mimetype, '-'), coalesce(v_groesse::text, '-');
  end if;

  raise notice 'Gespeichert: Lektion "%", Titel "%", Typ %, Position %.', v_lektion, btrim(p_titel), v_typ, v_reihenfolge;
end $$;
