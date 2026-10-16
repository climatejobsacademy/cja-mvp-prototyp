-- scripts/import-plan/fachsprache.sql
-- Schreibt Fachsprache-Einheiten (aus fachsprache.mjs) in fachsprache_einheit
-- (Migration 0051). Wird nur über scripts/import-plan.mjs --fachsprache bzw.
-- --nur-fachsprache ausgeführt, hinter import.sql (benutzt import_bericht,
-- import_meldung, pg_temp.zaehle und pg_temp.melde von dort), innerhalb
-- BEGIN ... ROLLBACK (Probelauf) bzw. COMMIT. Anleitung: docs/import-plan.md.
--
-- Legt nur temporäre Objekte an, keine Schemaänderung. Idempotent: Schlüssel
-- ist lesson_id (genau eine Einheit je Lektion). Die Lektion wird über den
-- Kurs des Termins gefunden (Woche + Kursname, erste Live-Lektion), wie in
-- import.sql.
--
-- Schreibt nie status und nie die Prüffelder (fachlich_/sprachlich_geprueft_*):
-- neue Einheiten starten als 'entwurf' über den Spaltenstandard, bei
-- geänderten Inhalten setzt der Trigger aus 0051 die Prüfung zurück. Der
-- Import meldet das vorher ("Prüfung wird zurückgesetzt") und prüft danach,
-- dass der Trigger es getan hat.
-- Bilder werden nie hochgeladen; geprüft wird nur, ob die Datei im Bucket
-- fachsprache-bilder unter "<lesson_id>/<dateiname>" liegt.

create function pg_temp.fachsprache_import(p_fs jsonb, p_lauf integer, p_ausfuehren boolean, p_bilder_spaeter boolean)
returns void
language plpgsql
as $fn$
declare
  v_prog uuid;
  r jsonb;
  v_kenn text;
  v_woche uuid;
  v_kurs uuid;
  v_lesson uuid;
  v_alt record;
  v_neu record;
  v_n integer;
  v_inhalt_neu boolean;
  v_bilder text[];
  v_fehlend text[];
  v_geprueft timestamptz;
  v_text text;
begin
  if to_regclass('public.fachsprache_einheit') is null
     or not exists (select 1 from storage.buckets where id = 'fachsprache-bilder') then
    raise exception 'Abbruch: Tabelle fachsprache_einheit oder Bucket fachsprache-bilder fehlt (Migration 0051 ist in dieser Datenbank nicht angewendet).';
  end if;
  select id into strict v_prog from programme where kuerzel = 'EFK-EE';

  for r in select * from jsonb_array_elements(p_fs->'einheiten') loop
    v_kenn := (select string_agg(x, ' und ') from jsonb_array_elements_text(r->'kennungen') x);

    -- ---------- Kennung -> Kurs -> erste Live-Lektion ----------
    select w.id into v_woche
      from (select id, row_number() over (order by reihenfolge, created_at) as nr
              from module
             where modul_id = (select id from modul where programme_id = v_prog and reihenfolge = (r->>'modulReihenfolge')::int)) w
     where w.nr = (r->>'woche')::int;
    if v_woche is null then
      raise exception 'Abbruch: Fachsprache %: Woche % von Modul % fehlt in der Datenbank (erst den Plan importieren, nicht nur --nur-fachsprache).',
        v_kenn, r->>'woche', r->>'modul';
    end if;
    select id into v_kurs from course where module_id = v_woche and name = r->>'kursName';
    if v_kurs is null then
      raise exception 'Abbruch: Fachsprache %: Kurs "%" fehlt in der Datenbank (erst den Plan importieren, nicht nur --nur-fachsprache).',
        v_kenn, r->>'kursName';
    end if;
    select id into v_lesson from lesson where course_id = v_kurs and content_type = 'live' order by reihenfolge limit 1;
    if v_lesson is null then
      raise exception 'Abbruch: Fachsprache %: Kurs "%" hat keine Live-Lektion.', v_kenn, r->>'kursName';
    end if;

    -- ---------- Bilder im Bucket ----------
    select coalesce(array_agg(distinct x #>> '{}'), '{}') into v_bilder from jsonb_path_query(r->'inhalt', '$.**.bild') x;
    select coalesce(array_agg(b order by b), '{}') into v_fehlend
      from unnest(v_bilder) b
     where not exists (select 1 from storage.objects o
                        where o.bucket_id = 'fachsprache-bilder' and o.name = v_lesson::text || '/' || b);
    if cardinality(v_bilder) > 0 then
      perform pg_temp.melde(p_lauf, 'bilder', format('%s: Bilder gehören in den Bucket fachsprache-bilder, Ordner %s/ (Lektion "%s").',
        v_kenn, v_lesson, r->>'kursName'));
    end if;
    if cardinality(v_fehlend) > 0 then
      if p_ausfuehren and not p_bilder_spaeter then
        raise exception 'Abbruch: Fachsprache %: fehlende Bilder im Bucket fachsprache-bilder (Ordner %/): %. Bilder zuerst hochladen, oder bewusst mit --bilder-spaeter importieren.',
          v_kenn, v_lesson, array_to_string(v_fehlend, ', ');
      end if;
      perform pg_temp.melde(p_lauf, 'bild fehlt', format('%s: Bild %s fehlt im Bucket fachsprache-bilder (Ordner %s/)%s.',
        v_kenn, array_to_string(v_fehlend, ', '), v_lesson,
        case when p_ausfuehren then ', bewusst übergangen (--bilder-spaeter)' else '; der echte Lauf bricht dann ab (außer mit --bilder-spaeter)' end));
    end if;
    for v_text in
      select o.name from storage.objects o
       where o.bucket_id = 'fachsprache-bilder' and starts_with(o.name, v_lesson::text || '/')
         and not (storage.filename(o.name) = any (v_bilder))
       order by o.name
    loop
      perform pg_temp.melde(p_lauf, 'bild ungenutzt', format('%s: Datei %s liegt im Bucket, steht aber in keiner Zeile (für Lernende unsichtbar).',
        v_kenn, storage.filename(v_text)));
    end loop;

    -- ---------- Einheit anlegen oder ändern ----------
    select * into v_alt from fachsprache_einheit where lesson_id = v_lesson;
    if not found then
      insert into fachsprache_einheit (lesson_id, titel, dauer_minuten, inhalt)
      values (v_lesson, r->>'titel', (r->>'dauer')::int, r->'inhalt');
      perform pg_temp.zaehle(p_lauf, 'fachsprache_einheit', 'neu');
      perform pg_temp.melde(p_lauf, 'fachsprache', format('%s: neu angelegt, Status entwurf (Lektion "%s").', v_kenn, r->>'kursName'));
    else
      v_inhalt_neu := v_alt.inhalt is distinct from r->'inhalt' or v_alt.titel is distinct from r->>'titel';
      if v_inhalt_neu or v_alt.dauer_minuten is distinct from (r->>'dauer')::int then
        if v_inhalt_neu and (v_alt.status = 'veroeffentlicht' or v_alt.fachlich_geprueft_von is not null or v_alt.sprachlich_geprueft_von is not null) then
          perform pg_temp.melde(p_lauf, 'prüfung', format('%s: Inhalt geändert -- Prüfung wird zurückgesetzt (Status war %s; fachlich %s, sprachlich %s). Danach ist die Einheit ein Entwurf und muss neu geprüft werden.',
            v_kenn, v_alt.status,
            case when v_alt.fachlich_geprueft_am is null then 'nicht geprüft' else 'geprüft am ' || to_char(v_alt.fachlich_geprueft_am at time zone 'Europe/Berlin', 'DD.MM.YYYY') end,
            case when v_alt.sprachlich_geprueft_am is null then 'nicht geprüft' else 'geprüft am ' || to_char(v_alt.sprachlich_geprueft_am at time zone 'Europe/Berlin', 'DD.MM.YYYY') end));
        end if;
        update fachsprache_einheit
           set titel = r->>'titel', dauer_minuten = (r->>'dauer')::int, inhalt = r->'inhalt'
         where id = v_alt.id;
        if v_inhalt_neu then
          select * into v_neu from fachsprache_einheit where id = v_alt.id;
          if v_neu.status <> 'entwurf' or v_neu.fachlich_geprueft_von is not null or v_neu.sprachlich_geprueft_von is not null then
            raise exception 'Abbruch: Fachsprache %: Der Trigger aus 0051 hat die Prüfung nach der Inhaltsänderung nicht zurückgesetzt.', v_kenn;
          end if;
        else
          perform pg_temp.melde(p_lauf, 'fachsprache', format('%s: nur die Dauer geändert, Prüfung und Status bleiben.', v_kenn));
        end if;
        perform pg_temp.zaehle(p_lauf, 'fachsprache_einheit', 'geändert');
      else
        perform pg_temp.zaehle(p_lauf, 'fachsprache_einheit', 'unverändert');
        -- Inhalt gleich, aber ein Bild kann nach der Prüfung unter gleichem Namen ersetzt worden sein
        v_geprueft := greatest(v_alt.fachlich_geprueft_am, v_alt.sprachlich_geprueft_am);
        if v_geprueft is not null then
          for v_text in
            select storage.filename(o.name) from storage.objects o
             where o.bucket_id = 'fachsprache-bilder' and starts_with(o.name, v_lesson::text || '/')
               and storage.filename(o.name) = any (v_bilder) and o.updated_at > v_geprueft
             order by o.name
          loop
            perform pg_temp.melde(p_lauf, 'bild nach prüfung', format('%s: Bild %s wurde nach der Prüfung (%s) hochgeladen oder ersetzt; Name gleich, Inhalt evtl. anders. Die Prüfung bleibt stehen, bitte neu prüfen lassen.',
              v_kenn, v_text, to_char(v_geprueft at time zone 'Europe/Berlin', 'DD.MM.YYYY')));
          end loop;
        end if;
      end if;
    end if;
  end loop;
end;
$fn$;
