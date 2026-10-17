-- scripts/scorm-einspielen/einspielen.sql
-- Registriert eingespielte SCORM-Pakete (SR-50, SR-85): file_asset je Zip,
-- scorm_package je Lektion (Upsert über lesson_id), danach lesson.status
-- 'published' (Entscheidung Anna 2026-10-17). Wird nur über
-- scripts/scorm-einspielen.mjs ausgeführt, innerhalb BEGIN ... ROLLBACK
-- (Probelauf) bzw. COMMIT. Anleitung: docs/scorm-einspielen.md.
--
-- Legt nur temporäre Objekte an, keine Schemaänderung. Lädt nichts hoch und
-- löscht nichts: Die Dateien hat das Skript vorher mit der Supabase CLI
-- hochgeladen. Beim echten Lauf (p_echt) prüft die Funktion zuerst, dass
-- jedes erwartete Objekt in storage.objects liegt (mit erwarteter Größe,
-- wo bekannt), sonst Abbruch -- dann wird nichts registriert und nichts
-- veröffentlicht. Im Probelauf meldet sie fehlende Objekte nur.
-- Idempotent: Ein zweiter Durchgang in derselben Transaktion muss überall
-- "unverändert" ergeben (prüft scripts/scorm-einspielen.mjs).

create temp table scorm_bericht (nr serial, lauf integer, tabelle text, aktion text, anzahl integer default 1);
create temp table scorm_meldung (nr serial, lauf integer, art text, text text);

create function pg_temp.scorm_zaehle(p_lauf integer, p_tabelle text, p_aktion text) returns void
language sql as $$ insert into scorm_bericht (lauf, tabelle, aktion) values (p_lauf, p_tabelle, p_aktion) $$;

create function pg_temp.scorm_melde(p_lauf integer, p_art text, p_text text) returns void
language sql as $$ insert into scorm_meldung (lauf, art, text) values (p_lauf, p_art, p_text) $$;

create function pg_temp.scorm_einspielen(p jsonb, p_lauf integer, p_echt boolean)
returns void
language plpgsql
as $fn$
declare
  r jsonb;
  v_lesson record;
  v_fa uuid;
  v_alt record;
  v_fehlend text[];
  v_falsch text[];
  v_wo text;
begin
  if not exists (select 1 from storage.buckets where id = 'scorm-packages') then
    raise exception 'Abbruch: Bucket scorm-packages fehlt (Migration 0016 nicht angewendet).';
  end if;

  for r in select * from jsonb_array_elements(p -> 'eintraege') loop
    v_wo := format('Zeile %s', r ->> 'zeile');

    -- ---------- Lektion (nochmals prüfen, die Liste wurde vorher gelesen) ----------
    select id, content_type, status into v_lesson from lesson where id = (r ->> 'lessonId')::uuid;
    if not found then
      raise exception 'Abbruch: %: Lektion % nicht gefunden.', v_wo, r ->> 'lessonId';
    end if;
    if v_lesson.content_type <> 'scorm' then
      raise exception 'Abbruch: %: Lektion % ist keine Selbstlern-Lektion (content_type %).', v_wo, v_lesson.id, v_lesson.content_type;
    end if;
    if r ->> 'zipPfad' is distinct from v_lesson.id::text || '/' || (r ->> 'speichername') then
      raise exception 'Abbruch: %: Speicherpfad passt nicht zur Lektion.', v_wo;
    end if;

    -- ---------- Objekte im Bucket ----------
    select coalesce(array_agg(x ->> 'name' order by x ->> 'name'), '{}') into v_fehlend
      from jsonb_array_elements(r -> 'objekte') x
     where not exists (select 1 from storage.objects o where o.bucket_id = 'scorm-packages' and o.name = x ->> 'name');
    select coalesce(array_agg(x ->> 'name' order by x ->> 'name'), '{}') into v_falsch
      from jsonb_array_elements(r -> 'objekte') x
      join storage.objects o on o.bucket_id = 'scorm-packages' and o.name = x ->> 'name'
     where x ->> 'groesse' is not null and (o.metadata ->> 'size')::bigint is distinct from (x ->> 'groesse')::bigint;
    if cardinality(v_falsch) > 0 then
      raise exception 'Abbruch: %: % Objekt(e) im Bucket mit anderer Größe als erwartet, z. B. %. Nichts registriert.',
        v_wo, cardinality(v_falsch), v_falsch[1];
    end if;
    if cardinality(v_fehlend) > 0 then
      if p_echt then
        raise exception 'Abbruch: %: % Objekt(e) fehlen im Bucket nach dem Hochladen, z. B. %. Nichts registriert, nichts veröffentlicht.',
          v_wo, cardinality(v_fehlend), v_fehlend[1];
      end if;
      perform pg_temp.scorm_melde(p_lauf, 'probelauf', format('%s: %s Datei(en) liegen noch nicht im Bucket (der echte Lauf lädt sie vorher hoch).',
        v_wo, cardinality(v_fehlend)));
    end if;

    -- ---------- file_asset (wiederverwenden über storage_pfad) ----------
    select id into v_fa from file_asset where storage_pfad = r ->> 'zipPfad' order by created_at, id limit 1;
    if v_fa is null then
      insert into file_asset (organisation_id, dateiname, dateityp, storage_pfad)
      values (null, r ->> 'dateiname', 'application/zip', r ->> 'zipPfad')
      returning id into v_fa;
      perform pg_temp.scorm_zaehle(p_lauf, 'file_asset', 'neu');
    else
      perform pg_temp.scorm_zaehle(p_lauf, 'file_asset', 'unverändert');
    end if;

    -- ---------- scorm_package (Upsert über lesson_id) ----------
    select * into v_alt from scorm_package where lesson_id = v_lesson.id;
    if not found then
      insert into scorm_package (lesson_id, file_asset_id, entry_point_pfad, manifest_titel)
      values (v_lesson.id, v_fa, r ->> 'entryPoint', r ->> 'manifestTitel');
      perform pg_temp.scorm_zaehle(p_lauf, 'scorm_package', 'neu');
    elsif v_alt.file_asset_id is distinct from v_fa
       or v_alt.entry_point_pfad is distinct from r ->> 'entryPoint'
       or v_alt.manifest_titel is distinct from r ->> 'manifestTitel' then
      update scorm_package
         set file_asset_id = v_fa, entry_point_pfad = r ->> 'entryPoint', manifest_titel = r ->> 'manifestTitel'
       where id = v_alt.id;
      perform pg_temp.scorm_zaehle(p_lauf, 'scorm_package', 'geändert');
      if v_alt.file_asset_id is distinct from v_fa then
        perform pg_temp.scorm_melde(p_lauf, 'paket', format('%s: Lektion zeigt jetzt auf das neue Paket; das alte bleibt im Bucket (nichts gelöscht).', v_wo));
      end if;
    else
      perform pg_temp.scorm_zaehle(p_lauf, 'scorm_package', 'unverändert');
    end if;

    -- ---------- veröffentlichen ----------
    if v_lesson.status <> 'published' then
      update lesson set status = 'published' where id = v_lesson.id;
      perform pg_temp.scorm_zaehle(p_lauf, 'lesson (veröffentlicht)', 'geändert');
    else
      perform pg_temp.scorm_zaehle(p_lauf, 'lesson (veröffentlicht)', 'unverändert');
    end if;
  end loop;
end;
$fn$;
