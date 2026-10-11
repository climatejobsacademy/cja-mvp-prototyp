-- scripts/sql/demo_fragen_thread_editor.sql
-- Fragen-Thread (SR-74) an den Live-Lektionen bestimmter Tage der Demo-Kohorte
-- einschalten (Wunsch Anna 2026-10-11). Für den SQL Editor im Supabase-
-- Dashboard, NUR STAGING. Wie scripts/sql/thread_aktivieren.sql, nur ohne
-- IDs heraussuchen: die Lektionen werden über Kohorte und Datum gefunden.
--
-- chat_aktiv hängt an der Lektion -- auf Staging sehen den Thread also alle
-- Kohorten, die diese Lektion haben; die Beiträge bleiben je Kohorte getrennt.
-- Zum Ausschalten p_chat_aktiv := false.
--
-- Ablauf: p_bestaetigung := 'STAGING', Run -> Probelauf ("PROBELAUF ok, nichts
-- gespeichert" mit den Lektionen). Dann p_probelauf := false, Run.

do $$
declare
  -- ===================== EINGABEN =====================
  p_probelauf    boolean := true;           -- erst true lassen, dann false
  p_bestaetigung text    := '';             -- 'STAGING' eintragen
  p_kohorte      text    := 'DEMO Rim';
  p_tage         date[]  := array['2026-10-12', '2026-10-13']::date[];
  p_chat_aktiv   boolean := true;
  -- ====================================================
  v_liste  text;
  v_anzahl int;
begin
  if p_bestaetigung <> 'STAGING' then
    raise exception 'Abbruch: Bitte im Block EINGABEN p_bestaetigung := ''STAGING'' setzen.';
  end if;

  create temp table thread_lektionen on commit drop as
  select distinct l.id, l.name, l.status, l.chat_aktiv as vorher, s.datum
  from schedule_entry s
  join cohort c on c.id = s.cohort_id
  join live_session ls on ls.id = s.live_session_id
  join lesson l on l.id = ls.lesson_id
  where c.name = p_kohorte and s.art = 'live' and s.datum = any (p_tage);

  select count(*), string_agg(format('%s: %s (vorher %s)', to_char(datum, 'DD.MM.'), name, vorher), ' | ' order by datum)
    into v_anzahl, v_liste from thread_lektionen;
  if v_anzahl = 0 then
    raise exception 'Abbruch: Keine Live-Lektionen der Kohorte "%" an diesen Tagen gefunden.', p_kohorte;
  end if;

  update lesson set chat_aktiv = p_chat_aktiv where id in (select id from thread_lektionen);

  if p_probelauf then
    raise exception 'PROBELAUF ok, nichts gespeichert. Fragen-Thread % für % Lektion(en): %. Zum Speichern p_probelauf := false setzen.',
      case when p_chat_aktiv then 'an' else 'aus' end, v_anzahl, v_liste;
  end if;
end $$;

-- Nach dem echten Lauf: Stand der Lektionen
select to_char(s.datum, 'DD.MM.') as tag, l.name, l.chat_aktiv
from schedule_entry s
join cohort c on c.id = s.cohort_id
join live_session ls on ls.id = s.live_session_id
join lesson l on l.id = ls.lesson_id
where c.name = 'DEMO Rim' and s.art = 'live' and s.datum between '2026-10-12' and '2026-10-16'
order by s.datum;
