-- scripts/sql/demo_woche_inhalte_editor.sql
-- Demo-Woche vollständig machen (Wunsch Anna 2026-10-11) für die Demo-Kohorte
-- im Zeitraum p_von..p_bis:
--   - Live-Lektionen: Fragen-Thread an (SR-74, lesson.chat_aktiv) und jede
--     Datei aus p_material als Lernmaterial (SR-68),
--   - Selbstlern-Lektionen: nur SCORM (SR-50) -- veröffentlichte SCORM-
--     Lektionen ohne Paket bekommen abwechselnd eines der Pakete aus p_scorm;
--     vorhandene Pakete bleiben. Kein Thread, keine Materialien,
--   - Live-Link: Live-Termine ohne Link, die nur diese Kohorte nutzt,
--     bekommen p_link (wie demo_live_link_editor.sql).
-- Für den SQL Editor im Supabase-Dashboard, NUR STAGING.
--
-- Voraussetzung: PDFs im Wurzelverzeichnis von lesson-resources; die Zips im
-- Wurzelverzeichnis von scorm-packages (nur nötig, wenn eine SCORM-Lektion
-- noch kein Paket hat). Startdatei beider Pakete: scorm.html (SCORM 1.2).
--
-- Thread, Materialien und Pakete hängen an der Lektion -- auf Staging sehen
-- sie also alle Kohorten mit dieser Lektion. Schon Vorhandenes wird
-- übersprungen, es wird nichts gelöscht.
--
-- Ablauf: p_bestaetigung := 'STAGING', Run -> Probelauf ("PROBELAUF ok, nichts
-- gespeichert" mit Zusammenfassung). Dann p_probelauf := false, Run.

do $$
declare
  -- ===================== EINGABEN =====================
  p_probelauf    boolean := true;           -- erst true lassen, dann false
  p_bestaetigung text    := '';             -- 'STAGING' eintragen
  p_kohorte      text    := 'DEMO Rim';
  p_von          date    := '2026-10-12';
  p_bis          date    := '2026-10-16';
  p_link         text    := 'https://zoom.us/j/84222517212';
  p_scorm        text[]  := array['lernmodul-1-elektrische-grundlagen.zip',
                                  'lernmodul-2-elektrotechnische-bauelemente.zip'];
  p_scorm_titel  text[]  := array['Lernmodul 1: Elektrische Grundlagen',
                                  'Lernmodul 2: Elektrotechnische Bauelemente'];
  p_material     text[]  := array['formelsammlung-grundlagen-elektrotechnik.pdf',
                                  'merkblatt-fuenf-sicherheitsregeln.pdf'];
  p_mat_titel    text[]  := array['Formelsammlung Grundlagen Elektrotechnik',
                                  'Die 5 Sicherheitsregeln'];
  -- ====================================================
  v_kohorte   uuid;
  v_mime      text;
  v_asset     uuid;
  r           record;
  i           int;
  n           int := 0;
  v_lektionen int;
  v_thread    int;
  v_material  int := 0;
  v_links     int;
  v_scorm     text := '';
  v_entwurf   text;
begin
  if p_bestaetigung <> 'STAGING' then
    raise exception 'Abbruch: Bitte im Block EINGABEN p_bestaetigung := ''STAGING'' setzen.';
  end if;
  select id into v_kohorte from cohort where name = p_kohorte;
  if v_kohorte is null then
    raise exception 'Abbruch: Kohorte "%" nicht gefunden.', p_kohorte;
  end if;

  -- Alle Lektionen der Kohorte im Zeitraum; art = live oder asynchron
  -- (Selbstlernen, auch ganze Kurse)
  create temp table woche_lektion on commit drop as
  select l.id, l.name, l.content_type, l.status, s.art, min(s.datum) as datum
  from schedule_entry s
  left join live_session ls on ls.id = s.live_session_id
  join lesson l on l.id = s.lesson_id or l.id = ls.lesson_id or l.course_id = s.course_id
  where s.cohort_id = v_kohorte and s.datum between p_von and p_bis and s.art in ('live', 'asynchron')
  group by l.id, l.name, l.content_type, l.status, s.art;

  select count(*) into v_lektionen from woche_lektion;
  if v_lektionen = 0 then
    raise exception 'Abbruch: Keine Lektionen der Kohorte "%" zwischen % und %.', p_kohorte, p_von, p_bis;
  end if;
  select string_agg(format('%s %s', to_char(datum, 'DD.MM.'), name), '; ' order by datum)
    into v_entwurf from woche_lektion where status <> 'published';

  -- ---------- Fragen-Thread (nur Live) ----------
  update lesson set chat_aktiv = true
   where id in (select id from woche_lektion where art = 'live') and chat_aktiv is distinct from true;
  get diagnostics v_thread = row_count;

  -- ---------- Materialien (nur Live) ----------
  for i in 1 .. coalesce(array_length(p_material, 1), 0) loop
    select metadata->>'mimetype' into v_mime
      from storage.objects where bucket_id = 'lesson-resources' and name = p_material[i];
    if v_mime is null then
      raise exception 'Abbruch: "%" liegt nicht im Bucket lesson-resources (Wurzelverzeichnis, genauer Name).', p_material[i];
    end if;

    v_asset := null;
    select fa.id into v_asset from file_asset fa
     where fa.storage_pfad = p_material[i]
       and not exists (select 1 from scorm_package sp where sp.file_asset_id = fa.id)
     limit 1;
    if v_asset is null then
      insert into file_asset (dateiname, dateityp, storage_pfad)
      values (p_material[i], v_mime, p_material[i]) returning id into v_asset;
    end if;

    for r in select w.id from woche_lektion w
              where w.art = 'live' and not exists (select 1 from lesson_resource lr where lr.lesson_id = w.id and lr.file_asset_id = v_asset)
    loop
      insert into lesson_resource (lesson_id, reihenfolge, typ, file_asset_id, titel)
      select r.id, coalesce(max(reihenfolge), 0) + 1, 'datei', v_asset, p_mat_titel[i]
        from lesson_resource where lesson_id = r.id;
      v_material := v_material + 1;
    end loop;
  end loop;

  -- ---------- SCORM (nur Selbstlernen) ----------
  for r in select w.id, w.name, w.datum from woche_lektion w
            where w.art = 'asynchron' and w.content_type = 'scorm' and w.status = 'published'
              and not exists (select 1 from scorm_package sp where sp.lesson_id = w.id)
            order by w.datum, w.name
  loop
    i := (n % array_length(p_scorm, 1)) + 1;
    n := n + 1;

    v_asset := null;
    select fa.id into v_asset
      from file_asset fa join scorm_package sp on sp.file_asset_id = fa.id
     where fa.storage_pfad = p_scorm[i] limit 1;
    if v_asset is null then
      select metadata->>'mimetype' into v_mime
        from storage.objects where bucket_id = 'scorm-packages' and name = p_scorm[i];
      if v_mime is null then
        raise exception 'Abbruch: "%" liegt nicht im Bucket scorm-packages (Wurzelverzeichnis, genauer Name).', p_scorm[i];
      end if;
      insert into file_asset (dateiname, dateityp, storage_pfad)
      values (p_scorm[i], v_mime, p_scorm[i]) returning id into v_asset;
    end if;

    insert into scorm_package (lesson_id, file_asset_id, entry_point_pfad, manifest_titel)
    values (r.id, v_asset, 'scorm.html', p_scorm_titel[i]);
    v_scorm := v_scorm || format('%s %s -> %s; ', to_char(r.datum, 'DD.MM.'), r.name, p_scorm_titel[i]);
  end loop;

  -- ---------- Live-Links ----------
  update live_session ls set join_link = p_link
   where coalesce(ls.join_link, '') = ''
     and ls.id in (select s.live_session_id from schedule_entry s
                    where s.cohort_id = v_kohorte and s.art = 'live' and s.datum between p_von and p_bis)
     and not exists (select 1 from schedule_entry s2
                      where s2.live_session_id = ls.id and s2.cohort_id is distinct from v_kohorte);
  get diagnostics v_links = row_count;

  if p_probelauf then
    raise exception 'PROBELAUF ok, nichts gespeichert. % Lektionen % bis % (Live und Selbstlernen) | Fragen-Thread neu an (Live): % | Materialien neu (Live): % | SCORM neu (Selbstlernen): % | Live-Links neu: % | Nicht veröffentlicht (für Lernende unsichtbar): % | Zum Speichern p_probelauf := false setzen.',
      v_lektionen, to_char(p_von, 'DD.MM.'), to_char(p_bis, 'DD.MM.'), v_thread, v_material,
      case when v_scorm = '' then 'keine (alle haben schon ein Paket oder es gibt keine SCORM-Lektion)' else v_scorm end,
      v_links, coalesce(v_entwurf, 'keine');
  end if;
end $$;

-- Nach dem echten Lauf: Stand je Lektion der Demo-Woche
select to_char(min(s.datum), 'DD.MM.') as tag, s.art, l.name as lektion, l.content_type, l.status,
       l.chat_aktiv as thread,
       (select count(*) from lesson_resource lr where lr.lesson_id = l.id) as materialien,
       (select sp.manifest_titel from scorm_package sp where sp.lesson_id = l.id) as scorm,
       string_agg(distinct coalesce(nullif(ls.join_link, ''), 'FEHLT'), ', ') filter (where ls.id is not null) as live_link
from schedule_entry s
join cohort c on c.id = s.cohort_id
left join live_session ls on ls.id = s.live_session_id
join lesson l on l.id = s.lesson_id or l.id = ls.lesson_id or l.course_id = s.course_id
where c.name = 'DEMO Rim' and s.datum between '2026-10-12' and '2026-10-16' and s.art in ('live', 'asynchron')
group by s.art, l.id, l.name, l.content_type, l.status, l.chat_aktiv
order by min(s.datum), s.art desc, l.name;
