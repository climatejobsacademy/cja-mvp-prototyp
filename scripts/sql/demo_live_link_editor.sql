-- scripts/sql/demo_live_link_editor.sql
-- Einwahl-Link für die Live-Termine der Demo-Kohorte eintragen (Wunsch Anna
-- 2026-10-11). Für den SQL Editor im Supabase-Dashboard, NUR STAGING.
--
-- Betrifft nur Live-Termine, die ausschließlich von der Demo-Kohorte genutzt
-- werden (vom Demo-Skript als Kopie angelegt) -- die Termine anderer
-- Kohorten bleiben unberührt. Für Teilnehmende den Beitritts-Link (zoom.us/j/...)
-- nehmen, nicht den Start-Link für Gastgeber (zoom.us/s/...).
--
-- Ablauf: p_bestaetigung := 'STAGING', Run -> Probelauf ("PROBELAUF ok, nichts
-- gespeichert" mit den Terminen). Dann p_probelauf := false, Run.

do $$
declare
  -- ===================== EINGABEN =====================
  p_probelauf    boolean := true;           -- erst true lassen, dann false
  p_bestaetigung text    := '';             -- 'STAGING' eintragen
  p_kohorte      text    := 'DEMO Rim';
  p_link         text    := 'https://zoom.us/j/84222517212';
  p_ab           date    := '2026-10-12';
  -- ====================================================
  v_liste  text;
  v_anzahl int;
begin
  if p_bestaetigung <> 'STAGING' then
    raise exception 'Abbruch: Bitte im Block EINGABEN p_bestaetigung := ''STAGING'' setzen.';
  end if;
  if p_link !~ '^https://' then
    raise exception 'Abbruch: Der Link muss mit https:// beginnen.';
  end if;

  create temp table demo_live on commit drop as
  select distinct ls.id, ls.datum, ls.start, ls.join_link as vorher
  from schedule_entry s
  join cohort c on c.id = s.cohort_id
  join live_session ls on ls.id = s.live_session_id
  where c.name = p_kohorte and s.art = 'live' and ls.datum >= p_ab
    -- nur Termine, die keine andere Kohorte nutzt
    and not exists (select 1 from schedule_entry s2 join cohort c2 on c2.id = s2.cohort_id
                    where s2.live_session_id = ls.id and c2.name <> p_kohorte);

  select count(*), string_agg(format('%s %s', to_char(datum, 'DD.MM.'), to_char(start, 'HH24:MI')), ', ' order by datum)
    into v_anzahl, v_liste from demo_live;
  if v_anzahl = 0 then
    raise exception 'Abbruch: Keine Live-Termine der Kohorte "%" ab % gefunden.', p_kohorte, p_ab;
  end if;

  update live_session set join_link = p_link where id in (select id from demo_live);

  if p_probelauf then
    raise exception 'PROBELAUF ok, nichts gespeichert. Link % für % Live-Termin(e): %. Zum Speichern p_probelauf := false setzen.',
      p_link, v_anzahl, v_liste;
  end if;
end $$;

-- Nach dem echten Lauf: Live-Termine der Demo-Kohorte
select to_char(ls.datum, 'DD.MM.') as tag, to_char(ls.start, 'HH24:MI') as beginn, ls.join_link
from schedule_entry s
join cohort c on c.id = s.cohort_id
join live_session ls on ls.id = s.live_session_id
where c.name = 'DEMO Rim' and s.art = 'live' and ls.datum >= '2026-10-12'
order by ls.datum;
