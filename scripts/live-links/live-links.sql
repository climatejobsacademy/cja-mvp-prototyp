-- scripts/live-links/live-links.sql
-- Schreibt Teams-Links in live_session.join_link. Wird nur über
-- scripts/live-links.mjs ausgeführt, das diese Datei zusammen mit den
-- Einträgen aus der CSV und BEGIN ... ROLLBACK (Probelauf) bzw. COMMIT an psql
-- gibt. Anleitung: docs/live-links.md.
--
-- Legt nur temporäre Objekte an (pg_temp), keine Schemaänderung. Schreibt nur
-- die Spalte join_link, sonst nichts; legt keine Termine an und löscht nichts.
-- Idempotent: geändert wird nur, wo join_link vom Link abweicht.
--
-- Zuordnung (es gibt keine gespeicherte Termin-Kennung wie M02-S002):
--   Kohorte   cohort.name (muss eindeutig sein), Termine über
--             schedule_entry.cohort_id + live_session_id
--   Modul     live_session -> course (direkt oder über die Lektion)
--             -> module (Woche) -> modul_id; modul über Programm der Kohorte
--             und reihenfolge (I = 1 … Abschluss = 6)
--   Begleitkurse (Deutsch/Fachdeutsch, Softskills Coaching) hängen am
--             Programm, nicht an einer Woche. Sie zählen nur mit
--             --mit-begleitkursen zum Modul, und zwar über den Zeitraum des
--             Moduls in dieser Kohorte (fn_modul_zeitraum, Migration 0028).
--   Termin    Kohorte + live_session.datum + live_session.start
--
-- Kein Link erscheint in einer Meldung oder Ausgabe.

create temp table live_link_zeile (
  lauf integer not null,
  zeile integer not null,
  eintrag text not null,
  domain text not null,
  cohort_id uuid not null,
  begleit_ausgelassen integer not null default 0,
  primary key (lauf, zeile)
) on commit drop;

create temp table live_link_ziel (
  lauf integer not null,
  zeile integer not null,
  live_session_id uuid not null,
  link text not null,
  alt text
) on commit drop;

create temp table live_link_meldung (
  nr serial,
  lauf integer not null,
  art text not null,
  text text not null
) on commit drop;

create function pg_temp.live_links_melde(p_lauf integer, p_art text, p_text text)
returns void language sql as $$
  insert into live_link_meldung (lauf, art, text) values (p_lauf, p_art, p_text);
$$;

create function pg_temp.live_links(p jsonb, p_lauf integer, p_mit_begleit boolean)
returns void
language plpgsql
as $fn$
declare
  r jsonb;
  v_n integer;
  v_kohorte record;
  v_modul uuid;
  v_von date;
  v_bis date;
  v_ids uuid[];
  v_begleit uuid[];
  v_eintrag text;
  v_text text;
begin
  if to_regclass('public.modul') is null or to_regprocedure('public.fn_modul_zeitraum(uuid)') is null then
    raise exception 'Abbruch: Tabelle modul oder fn_modul_zeitraum fehlt (Migration 0028 ist in dieser Datenbank nicht angewendet).';
  end if;

  for r in select * from jsonb_array_elements(p->'eintraege') loop
    -- ---------- Kohorte ----------
    select count(*) into v_n from cohort where name = r->>'kohorte';
    if v_n = 0 then
      raise exception 'Abbruch: Zeile %: Kohorte "%" gibt es nicht.', r->>'zeile', r->>'kohorte';
    elsif v_n > 1 then
      raise exception 'Abbruch: Zeile %: Kohortenname "%" ist nicht eindeutig (% Kohorten).', r->>'zeile', r->>'kohorte', v_n;
    end if;
    select * into v_kohorte from cohort where name = r->>'kohorte';

    if p->>'variante' = 'modul' then
      v_eintrag := format('%s, Modul %s', r->>'kohorte', r->>'modul');
      select id into v_modul from modul
       where programme_id = v_kohorte.programme_id and reihenfolge = (r->>'modulReihenfolge')::int;
      if v_modul is null then
        raise exception 'Abbruch: Zeile %: Modul % gibt es im Programm der Kohorte "%" nicht.', r->>'zeile', r->>'modul', r->>'kohorte';
      end if;

      select coalesce(array_agg(distinct ls.id), '{}') into v_ids
        from live_session ls
        join schedule_entry se on se.live_session_id = ls.id and se.cohort_id = v_kohorte.id
        left join lesson l on l.id = ls.lesson_id
        join course c on c.id = coalesce(ls.course_id, l.course_id)
        join module w on w.id = c.module_id
       where w.modul_id = v_modul;

      -- Begleitkurse im Zeitraum des Moduls (nur mit --mit-begleitkursen)
      v_von := null;
      v_bis := null;
      select z.von, z.bis into v_von, v_bis from fn_modul_zeitraum(v_kohorte.id) z where z.modul_id = v_modul;
      select coalesce(array_agg(distinct ls.id), '{}') into v_begleit
        from live_session ls
        join schedule_entry se on se.live_session_id = ls.id and se.cohort_id = v_kohorte.id
        join course c on c.id = ls.course_id
       where c.module_id is null
         and ls.datum between v_von and v_bis;
      if p_mit_begleit then
        v_ids := v_ids || v_begleit;
        v_begleit := '{}';
      end if;
    else
      v_eintrag := format('%s, %s %s', r->>'kohorte', r->>'datum', r->>'start');
      v_begleit := '{}';
      select coalesce(array_agg(distinct ls.id), '{}') into v_ids
        from live_session ls
        join schedule_entry se on se.live_session_id = ls.id and se.cohort_id = v_kohorte.id
       where ls.datum = (r->>'datum')::date
         and ls.start = (r->>'start')::time;
    end if;

    if cardinality(v_ids) = 0 then
      raise exception 'Abbruch: Zeile % (%) trifft keinen Live-Termin. %', r->>'zeile', v_eintrag,
        case when p->>'variante' = 'modul'
          then 'Ist der Stundenplan dieses Moduls für die Kohorte schon importiert (scripts/import-plan.mjs)?'
          else 'Datum und Startzeit wie im Stundenplan angeben (Berliner Zeit, HH:MM).' end;
    end if;

    insert into live_link_zeile (lauf, zeile, eintrag, domain, cohort_id, begleit_ausgelassen)
    values (p_lauf, (r->>'zeile')::int, v_eintrag, r->>'domain', v_kohorte.id, cardinality(v_begleit));
    -- alt = Stand vor dem Schreiben (Zählung neu/geändert/unverändert)
    insert into live_link_ziel (lauf, zeile, live_session_id, link, alt)
    select p_lauf, (r->>'zeile')::int, ls.id, r->>'link', ls.join_link
      from live_session ls where ls.id = any (v_ids);

    if cardinality(v_begleit) > 0 then
      perform pg_temp.live_links_melde(p_lauf, 'begleitkurs', format(
        'Zeile %s (%s): %s Begleitkurs-Termine (Deutsch/Fachdeutsch, Coaching) im Zeitraum des Moduls bleiben, wie sie sind (mit --mit-begleitkursen bekommen sie denselben Link).',
        r->>'zeile', v_eintrag, cardinality(v_begleit)));
    end if;
  end loop;

  -- ---------- Ein Termin, zwei verschiedene Links ----------
  select string_agg(format('Termin am %s %s (Zeilen %s)', ls.datum, to_char(ls.start, 'HH24:MI'), k.zeilen), '; ')
    into v_text
    from (select live_session_id, string_agg(distinct zeile::text, ', ') as zeilen
            from live_link_ziel where lauf = p_lauf
           group by live_session_id having count(distinct link) > 1) k
    join live_session ls on ls.id = k.live_session_id;
  if v_text is not null then
    raise exception 'Abbruch: Verschiedene Links für denselben Termin: %.', v_text;
  end if;

  -- ---------- Termine, die auch zu einer anderen Kohorte gehören ----------
  for v_text in
    select format('Zeile %s: %s Termin(e) gehören auch zur Kohorte "%s"; der Link gilt dort mit.',
                  z.zeile, count(distinct t.live_session_id), co.name)
      from live_link_zeile z
      join live_link_ziel t on t.lauf = z.lauf and t.zeile = z.zeile
      join schedule_entry se on se.live_session_id = t.live_session_id and se.cohort_id <> z.cohort_id
      join cohort co on co.id = se.cohort_id
     where z.lauf = p_lauf
     group by z.zeile, co.name
     order by z.zeile, co.name
  loop
    perform pg_temp.live_links_melde(p_lauf, 'andere kohorte', v_text);
  end loop;

  -- ---------- Schreiben (nur wo abweichend) ----------
  update live_session ls
     set join_link = t.link
    from (select distinct live_session_id, link from live_link_ziel where lauf = p_lauf) t
   where ls.id = t.live_session_id
     and ls.join_link is distinct from t.link;
end;
$fn$;
