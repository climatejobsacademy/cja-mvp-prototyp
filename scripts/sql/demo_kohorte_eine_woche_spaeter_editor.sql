-- scripts/sql/demo_kohorte_eine_woche_spaeter_editor.sql
-- Verschiebt die Demo-Kohorte "DEMO Rim" um eine Woche nach hinten
-- (Wunsch Anna 2026-10-15: Demo am Mi 21.10. soll ein Theorietag sein).
-- Für den SQL Editor im Supabase-Dashboard. NUR STAGING (Irland,
-- keijrwvegmwgpvprpoxa) -- vorher oben links prüfen, welches Projekt offen ist.
--
--   vorher:  Start 05.10. | 05.-09.10. erledigt | 12.-16.10. Theorie | ab 19.10. Praxis
--   nachher: Start 12.10. | 12.-16.10. erledigt | 19.-23.10. Theorie | ab 26.10. Praxis
--
-- Verschoben wird nur, was der Demo-Kohorte allein gehört: Start/Ende der
-- Kohorte, ihre Stundenplan-Einträge, ihre Live-Termine (eigene Kopien,
-- inkl. Demo-Zoom-Links) und die Praxistage ihrer Demo-Konten. Alle
-- Demo-Konten (Rim, Malte, Susanne, Vera ...) wandern mit.
-- NICHT angefasst: Anwesenheit und Prüfungen (Regel 7, bleiben unverändert
-- und hängen danach an den eine Woche späteren Terminen), unit_progress,
-- Lektionen, Materialien, "Energiehelden" und alle anderen Kohorten.
-- Es wird nichts gelöscht.
--
-- Ablauf:
--   1. Diesen ganzen Text in den SQL Editor kopieren, im Block EINGABEN
--      p_bestaetigung auf 'STAGING' setzen, "Run".
--      -> Probelauf: endet absichtlich mit "PROBELAUF ok, nichts gespeichert"
--         und nennt, was verschoben würde. Nichts wird gespeichert.
--   2. Passt alles: p_probelauf := false setzen, erneut "Run".
--      -> "Success". Die Abfrage am Ende zeigt die Demo-Woche 19.-23.10.
--
-- Schutz gegen doppeltes Verschieben: läuft nur, wenn die Kohorte noch am
-- p_start_vorher beginnt. Zurück geht es mit p_tage := -7 und
-- p_start_vorher := '2026-10-12'.

do $$
declare
  -- ===================== EINGABEN =====================
  p_probelauf     boolean := true;          -- erst true lassen, dann false
  p_bestaetigung  text    := '';            -- 'STAGING' eintragen
  p_kohorte       text    := 'DEMO Rim';
  p_start_vorher  date    := '2026-10-05';  -- erwarteter Start vor dem Verschieben
  p_tage          int     := 7;             -- um so viele Tage nach hinten
  -- ====================================================
  v_kohorte    uuid;
  v_start      date;
  v_einschr    uuid[];
  v_personen   uuid[];
  v_eintraege  uuid[];
  v_live       uuid[];
  v_jobs       uuid[];
  v_geteilt    int;
  v_diese_woche int;
  v_anwesend_spaeter int;
  v_konten     text;
  v_bericht    text;
begin
  -- ---------- Prüfen ----------
  if p_bestaetigung <> 'STAGING' then
    raise exception 'Abbruch: Bitte im Block EINGABEN p_bestaetigung := ''STAGING'' setzen (und oben links prüfen, dass das Staging-Projekt offen ist).';
  end if;
  if p_tage % 7 <> 0 or p_tage = 0 then
    raise exception 'Abbruch: p_tage muss eine ganze Zahl von Wochen sein (7, 14, -7 ...).';
  end if;

  select id, start_datum into v_kohorte, v_start from cohort where name = p_kohorte;
  if v_kohorte is null then
    raise exception 'Abbruch: Kohorte "%" nicht gefunden.', p_kohorte;
  end if;
  if (select count(*) from cohort where name = p_kohorte) > 1 then
    raise exception 'Abbruch: Es gibt mehrere Kohorten "%".', p_kohorte;
  end if;
  if v_start is distinct from p_start_vorher then
    raise exception 'Abbruch: "%" beginnt am %, nicht am % -- schon verschoben? Nichts geändert.', p_kohorte, v_start, p_start_vorher;
  end if;

  select array_agg(e.id), array_agg(e.learner_id) into v_einschr, v_personen
  from enrolment e where e.cohort_id = v_kohorte;

  select coalesce(array_agg(p.email order by p.email), '{}')::text into v_konten
  from person p where p.id = any (v_personen);

  -- Stundenplan der Kohorte (Live/Selbstlernen) und der Demo-Konten (Praxistage)
  select array_agg(s.id),
         array_agg(distinct s.live_session_id) filter (where s.live_session_id is not null),
         array_agg(distinct s.field_job_id) filter (where s.field_job_id is not null)
    into v_eintraege, v_live, v_jobs
  from schedule_entry s
  where s.cohort_id = v_kohorte or s.enrolment_id = any (v_einschr);

  if v_eintraege is null then
    raise exception 'Abbruch: "%" hat keine Stundenplan-Einträge.', p_kohorte;
  end if;

  -- Live-Termine dürfen nur der Demo-Kohorte gehören (sonst würden echte Termine mitwandern)
  select count(*) into v_geteilt
  from schedule_entry s
  where s.live_session_id = any (v_live) and not (s.id = any (v_eintraege));
  if v_geteilt > 0 then
    raise exception 'Abbruch: % Live-Termine werden auch von anderen Kohorten genutzt. Nichts geändert.', v_geteilt;
  end if;
  if exists (select 1 from field_job fj where fj.id = any (v_jobs) and not (fj.learner_id = any (v_personen))) then
    raise exception 'Abbruch: Praxistage gehören nicht nur Demo-Konten. Nichts geändert.';
  end if;

  -- Hinweise: was diese Woche schon erledigt wurde, steht nach dem Verschieben in der Demo-Woche
  select count(*) into v_diese_woche
  from unit_progress up
  where up.learner_id = any (v_personen) and up.status = 'abgeschlossen'
    and up.abgeschlossen_am >= (v_start + 7)::timestamp at time zone 'Europe/Berlin';
  select count(*) into v_anwesend_spaeter
  from attendance a join live_session ls on ls.id = a.live_session_id
  where a.live_session_id = any (v_live) and ls.datum >= v_start + 7;

  v_bericht := format(
    E'Kohorte "%s": Start %s -> %s, Ende %s -> %s\n'
    '  Stundenplan-Einträge: %s, Live-Termine: %s, Praxistage: %s\n'
    '  Demo-Konten (%s): %s\n'
    '  Hinweis: %s Lektionen wurden seit %s schon als erledigt markiert (erscheinen danach in der Demo-Woche als erledigt).\n'
    '  Hinweis: %s Anwesenheiten hängen an Terminen ab %s (wandern mit).',
    p_kohorte, v_start, v_start + p_tage,
    (select end_datum from cohort where id = v_kohorte), (select end_datum + p_tage from cohort where id = v_kohorte),
    cardinality(v_eintraege), coalesce(cardinality(v_live), 0), coalesce(cardinality(v_jobs), 0),
    coalesce(cardinality(v_personen), 0), v_konten,
    v_diese_woche, v_start + 7,
    v_anwesend_spaeter, v_start + 7);

  -- ---------- Verschieben ----------
  update cohort set start_datum = start_datum + p_tage, end_datum = end_datum + p_tage where id = v_kohorte;
  update schedule_entry set datum = datum + p_tage where id = any (v_eintraege);
  update live_session set datum = datum + p_tage where id = any (v_live);
  update field_job set datum = datum + p_tage where id = any (v_jobs);

  if p_probelauf then
    raise exception E'PROBELAUF ok, nichts gespeichert.\n%', v_bericht;
  end if;
  raise notice E'Verschoben.\n%', v_bericht;
end $$;

-- Demo-Woche nach dem Verschieben (bei Probelauf noch die alten Daten)
select s.datum, s.art, coalesce(l.name, l2.name, ft.titel) as titel, ls.start, ls.ende, ls.join_link is not null as hat_link
from schedule_entry s
join cohort c on c.name = 'DEMO Rim'
left join enrolment e on e.id = s.enrolment_id
left join live_session ls on ls.id = s.live_session_id
left join lesson l on l.id = s.lesson_id
left join lesson l2 on l2.id = ls.lesson_id
left join field_job fj on fj.id = s.field_job_id
left join field_job_type ft on ft.id = fj.field_job_type_id
where (s.cohort_id = c.id or e.cohort_id = c.id)
  and s.datum between date '2026-10-19' and date '2026-10-23'
  and (e.id is null or e.learner_id = (select id from person where email = 'anna+demo@climatejobsacademy.com'))
order by s.datum, ls.start nulls last, s.reihenfolge;
