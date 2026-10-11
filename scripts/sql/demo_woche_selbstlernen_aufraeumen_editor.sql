-- scripts/sql/demo_woche_selbstlernen_aufraeumen_editor.sql
-- Korrektur zu einem Lauf der ersten Fassung von demo_woche_inhalte_editor.sql
-- (Anna 2026-10-11): An Selbstlern-Lektionen gehören weder Fragen-Thread noch
-- Lernmaterialien, nur SCORM. Für die Selbstlern-Lektionen der Demo-Kohorte
-- im Zeitraum: Thread aus, und die Zuordnungen der Demo-PDFs (lesson_resource)
-- entfernen. Die Dateien selbst (Storage, file_asset), SCORM-Pakete und alle
-- Live-Lektionen bleiben unverändert. Lektionen, die im Zeitraum auch als
-- Live-Termin vorkommen, werden nicht angefasst.
-- Für den SQL Editor im Supabase-Dashboard, NUR STAGING.
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
  p_material     text[]  := array['formelsammlung-grundlagen-elektrotechnik.pdf',
                                  'merkblatt-fuenf-sicherheitsregeln.pdf'];
  -- ====================================================
  v_kohorte  uuid;
  v_anzahl   int;
  v_thread   int;
  v_material int;
  v_beitraege int;
begin
  if p_bestaetigung <> 'STAGING' then
    raise exception 'Abbruch: Bitte im Block EINGABEN p_bestaetigung := ''STAGING'' setzen.';
  end if;
  select id into v_kohorte from cohort where name = p_kohorte;
  if v_kohorte is null then
    raise exception 'Abbruch: Kohorte "%" nicht gefunden.', p_kohorte;
  end if;

  create temp table selbstlern_lektion on commit drop as
  select distinct l.id
  from schedule_entry s
  join lesson l on l.id = s.lesson_id or l.course_id = s.course_id
  where s.cohort_id = v_kohorte and s.art = 'asynchron' and s.datum between p_von and p_bis
    and not exists (select 1 from schedule_entry s2 join live_session ls on ls.id = s2.live_session_id
                     where s2.cohort_id = v_kohorte and s2.datum between p_von and p_bis and ls.lesson_id = l.id);

  select count(*) into v_anzahl from selbstlern_lektion;
  if v_anzahl = 0 then
    raise exception 'Abbruch: Keine Selbstlern-Lektionen der Kohorte "%" zwischen % und %.', p_kohorte, p_von, p_bis;
  end if;

  select count(*) into v_beitraege from lektion_beitrag b where b.lesson_id in (select id from selbstlern_lektion);

  update lesson set chat_aktiv = false
   where id in (select id from selbstlern_lektion) and chat_aktiv;
  get diagnostics v_thread = row_count;

  delete from lesson_resource lr
   using file_asset fa
   where fa.id = lr.file_asset_id
     and fa.storage_pfad = any (p_material)
     and lr.lesson_id in (select id from selbstlern_lektion);
  get diagnostics v_material = row_count;

  if p_probelauf then
    raise exception 'PROBELAUF ok, nichts gespeichert. % Selbstlern-Lektionen | Fragen-Thread aus: % | Material-Zuordnungen entfernt: % | Vorhandene Thread-Beiträge (bleiben gespeichert, nur ausgeblendet): % | Zum Speichern p_probelauf := false setzen.',
      v_anzahl, v_thread, v_material, v_beitraege;
  end if;
end $$;
