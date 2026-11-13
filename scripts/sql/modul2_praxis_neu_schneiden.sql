-- scripts/sql/modul2_praxis_neu_schneiden.sql
-- Bereitet auf STAGING den neuen Zuschnitt des Praxisblocks Modul II vor
-- (Plan vom 10.11.2026: halbtags 08-12 / 13-17, Aufträge über mehrere Tage;
-- Entscheidung Projektleitung 10.11.2026), bevor die Excel "EFK-EE
-- Plattform-Import Modul I-II (Stand 10.11.2026)" mit scripts/import-plan.mjs
-- importiert wird:
--   A) entfernt ALLE Praxistage (field_job) von Modul II samt ihren
--      Stundenplan-Einträgen. Der Import legt danach die neuen Tage je aktive
--      Einschreibung an (Schlüssel Lernende:r + Auftrag + Datum).
--   B) setzt die weggefallenen Aufträge M02-A01, M02-A06, M02-A10b, M02-A13
--      auf 'unpublished' (nicht löschen) und löst ihre Teilschritt-Zuordnungen
--      (field_job_type_competency_mapping). Der Import fasst diese Aufträge
--      nicht mehr an, weil sie im Tab Aufträge fehlen.
-- Praxistage anderer Module und alle Live-Termine bleiben unberührt.
-- Danach: import-plan.mjs --datei "...(Stand 10.11.2026).xlsx" --ziel staging
--   --trainer-datei trainer-staging.csv --kohorte "<Kohorte A>"
--   --kohorte "<Kohorte B>@+14"
--
-- Nur per psql (die Prüfung des Ziels braucht psql-Variablen). Die Kohorten
-- kommen beim Aufruf als Variable, wie beim Plan-Import "Name" bzw.
-- "Name@+Tage", mehrere mit "|" getrennt; sie stehen nicht im Repo:
--   psql "host=aws-1-eu-west-1.pooler.supabase.com port=5432 dbname=postgres user=postgres.keijrwvegmwgpvprpoxa sslmode=require" \
--        -X -v kohorten='<Kohorte A>|<Kohorte B>@+14' \
--        -f scripts/sql/modul2_praxis_neu_schneiden.sql                    (Probelauf, ROLLBACK)
--   ... -v ausfuehren=ja (zusätzlich)                                      (speichert, COMMIT; nur mit Freigabe)
--
-- Sicherungen:
--   - Abbruch, wenn die Verbindung nicht auf Staging (keijrwvegmwgpvprpoxa) zeigt.
--   - Abbruch ohne -v kohorten.
--   - Abbruch, wenn an einem Praxistag etwas hängt (CLAUDE.md Regel 7): Haken
--     (durchgefuehrt_bestaetigt_am, Status), Ergebnis oder Problem-Text,
--     Praxisbericht (field_capture, damit auch Antworten und
--     Teilschritt-Zuordnungen), Freigabe (verification), Nachweis
--     (competency_evidence), Fortschritt im Praxisflow (phase, phase_seit,
--     praxisflow; 0058), Dateien (field_job_datei; 0059), Codewort-Versuche
--     (praxis_codewort_versuch; 0060), Ereignisse (praxis_ereignis; 0064).
--     Ein Löschen würde all das per on delete cascade mitnehmen; das darf
--     nie passieren.
--   - Abbruch, wenn die Auswahl nicht passt: Praxistag ohne Stundenplan-Eintrag
--     einer Einschreibung, außerhalb der beiden Kohorten, oder nicht nach dem
--     alten Plan (Stand 20.10.2026: 14 Aufträge an festen Tagen), oder wenn
--     eine der übergebenen Kohorten fehlt.
--   - Abbruch, wenn nicht genau die 4 weggefallenen Aufträge in Modul II
--     gefunden werden.
--   - Nachkontrolle: Die Zeilenzahlen aller Tabellen, in die die Löschungen
--     kaskadieren könnten, ändern sich genau um die gelisteten Datensätze.
-- Die Ausgabe enthält keine Namen von Personen.
--
-- Production: dieses Skript läuft nur auf Staging. Für Production eine
-- eigene Fassung im Release-Ordner (/production-inhalte), nach der
-- Lese-Prüfung, dass an den Praxistagen nichts hängt.

\set ON_ERROR_STOP 1
\pset footer off
\pset pager off

-- ========== Ziel: nur Staging ==========
select (:'USER' like '%keijrwvegmwgpvprpoxa%' or :'HOST' like '%keijrwvegmwgpvprpoxa%')
       and :'USER' not like '%vqfnmkcfjsudsujiuoqm%' and :'HOST' not like '%vqfnmkcfjsudsujiuoqm%' as ist_staging \gset
\if :ist_staging
  \echo '== Ziel: Staging (keijrwvegmwgpvprpoxa) =='
\else
  \echo 'Abbruch: Die Verbindung zeigt nicht auf Staging (keijrwvegmwgpvprpoxa).'
  do $$ begin raise exception 'Abbruch: falsches Ziel'; end $$;
\endif

-- ========== Kohorten: nur per Variable ==========
\if :{?kohorten}
\else
  \echo 'Abbruch: Kohorten fehlen (-v kohorten=''<Kohorte A>|<Kohorte B>@+14'').'
  do $$ begin raise exception 'Abbruch: -v kohorten fehlt'; end $$;
\endif

set client_min_messages = warning;
begin;

-- ========== Eingaben ==========
-- "Name" oder "Name@+Tage" (Versatz wie beim Plan-Import), mit "|" getrennt
create temp table _kohorte (name text primary key, versatz integer not null) on commit drop;
insert into _kohorte
select btrim(split_part(x, '@', 1)), coalesce(nullif(btrim(split_part(x, '@', 2)), '')::integer, 0)
  from unnest(string_to_array(:'kohorten', '|')) as x
 where btrim(x) <> '';

-- Alter Praxisplan Modul II (Stand 20.10.2026, Datum ohne Versatz). Nur
-- Praxistage nach diesem Plan werden entfernt; alles andere -> Abbruch.
create temp table _altplan (kategorie text, tag date, primary key (kategorie, tag)) on commit drop;
insert into _altplan values
  ('M02-A01', '2026-11-16'), ('M02-A02a', '2026-11-16'), ('M02-A02b', '2026-11-16'),
  ('M02-A03', '2026-11-17'), ('M02-A04', '2026-11-17'),
  ('M02-A05', '2026-11-18'), ('M02-A06', '2026-11-18'),
  ('M02-A07', '2026-11-19'),
  ('M02-A08', '2026-11-20'),
  ('M02-A09', '2026-11-23'), ('M02-A10b', '2026-11-23'),
  ('M02-A10', '2026-11-24'),
  ('M02-A11', '2026-11-25'),
  ('M02-A13', '2026-11-26');

-- Weggefallene Aufträge (Plan 10.11.2026): unveröffentlicht, Zuordnungen lösen
create temp table _weg (kategorie text primary key) on commit drop;
insert into _weg values ('M02-A01'), ('M02-A06'), ('M02-A10b'), ('M02-A13');

-- ========== Auswahl ==========
-- Wochen von Modul II (Programm EFK-EE)
create temp table _woche on commit drop as
select w.id
  from module w
  join modul m on m.id = w.modul_id
  join programme p on p.id = m.programme_id
 where p.kuerzel = 'EFK-EE' and m.reihenfolge = 2;

-- Aufträge von Modul II
create temp table _typ on commit drop as
select ft.id, ft.kategorie, ft.titel, ft.status
  from field_job_type ft
 where ft.module_id in (select id from _woche);

do $$
begin
  if not exists (select 1 from _kohorte) then
    raise exception 'Abbruch: keine Kohorte übergeben.';
  end if;
  if (select count(*) from cohort c join _kohorte k on k.name = c.name) <> (select count(*) from _kohorte) then
    raise exception 'Abbruch: Nicht alle übergebenen Kohorten gefunden (übergeben %, gefunden %).',
      (select count(*) from _kohorte), (select count(*) from cohort c join _kohorte k on k.name = c.name);
  end if;
  if not exists (select 1 from _woche) then
    raise exception 'Abbruch: Modul II hat keine Wochen.';
  end if;
  if exists (select 1 from _typ where kategorie is null or kategorie not like 'M02-%') then
    raise exception 'Abbruch: Auftrag in Modul II ohne Kennung M02-…';
  end if;
end $$;

-- A) Alle Praxistage von Modul II (über den Auftrag), mit Kohorte, falls vorhanden
create temp table _job on commit drop as
select fj.id, fj.datum, t.kategorie, co.name as kohorte, k.versatz, e.id as enrolment_id
  from field_job fj
  join _typ t on t.id = fj.field_job_type_id
  left join schedule_entry se on se.field_job_id = fj.id
  left join enrolment e on e.id = se.enrolment_id
  left join cohort co on co.id = e.cohort_id
  left join _kohorte k on k.name = co.name;

create temp table _se on commit drop as
select se.id from schedule_entry se where se.field_job_id in (select id from _job);

-- B) Weggefallene Aufträge und ihre Teilschritt-Zuordnungen
create temp table _weg_typ on commit drop as
select t.id, t.kategorie, t.titel, t.status from _typ t join _weg w on w.kategorie = t.kategorie;

create temp table _fjtcm on commit drop as
select m.id, m.field_job_type_id, m.competency_step_id
  from field_job_type_competency_mapping m
 where m.field_job_type_id in (select id from _weg_typ);

-- ========== Liste: was sich ändern würde ==========
\echo
\echo '== A) Praxistage Modul II je Kohorte =='
select coalesce(kohorte, '(ohne Kohorte)') as "Kohorte", count(*) as "Praxistage",
       count(distinct enrolment_id) as "Einschreibungen", min(datum) as "von", max(datum) as "bis"
  from _job group by 1 order by 1;

\echo '== A) Praxistage Modul II je Datum und Auftrag (Anzahl Lernende) =='
select coalesce(kohorte, '(ohne Kohorte)') as "Kohorte", datum as "Datum", kategorie as "Auftrag", count(*) as "Anzahl"
  from _job group by 1, 2, 3 order by 1, 2, 3;

\echo '== B) Weggefallene Aufträge =='
select w.kategorie as "Auftrag", w.titel as "Titel", w.status as "Status bisher", 'unpublished' as "Status neu",
       (select count(*) from _fjtcm m where m.field_job_type_id = w.id) as "Zuordnungen gelöst"
  from _weg_typ w order by w.kategorie;

\echo '== B) Teilschritte, die damit keinen Auftrag mehr haben (Hinweis, nie erfüllbar bis neu zugeordnet) =='
select mc.kuerzel as "Kompetenz", cs.name as "Teilschritt"
  from (select distinct competency_step_id from _fjtcm) x
  join competency_step cs on cs.id = x.competency_step_id
  left join competency_competency_step ccs on ccs.competency_step_id = cs.id
  left join modul_competency mc on mc.competency_id = ccs.competency_id
 where not exists (select 1 from field_job_type_competency_mapping m
                    where m.competency_step_id = x.competency_step_id
                      and m.id not in (select id from _fjtcm))
   and not exists (select 1 from content_competency_mapping c where c.competency_step_id = x.competency_step_id)
 order by 1, 2;

\echo '== Übersicht =='
select 'Praxistage Modul II (field_job)' as "Was", count(*) as "Anzahl" from _job
union all select 'Stundenplan-Einträge Praxis (schedule_entry)', count(*) from _se
union all select 'Aufträge unveröffentlichen (field_job_type)', count(*) from _weg_typ where status <> 'unpublished'
union all select 'Teilschritt-Zuordnungen lösen (field_job_type_competency_mapping)', count(*) from _fjtcm;

-- ========== Prüfungen: Abbruch, wenn etwas hängt oder die Auswahl nicht passt ==========
do $$
declare
  v_text text;
begin
  -- Auswahl A
  if exists (select 1 from _job where enrolment_id is null) then
    raise exception 'Abbruch: Praxistag Modul II ohne Stundenplan-Eintrag einer Einschreibung.';
  end if;
  if exists (select 1 from _job where versatz is null) then
    raise exception 'Abbruch: Praxistag Modul II außerhalb der beiden Kohorten.';
  end if;
  if exists (select 1 from _job group by id having count(*) > 1) then
    raise exception 'Abbruch: Praxistag mit mehreren Stundenplan-Einträgen.';
  end if;
  select string_agg(distinct format('%s am %s (%s)', kategorie, datum, kohorte), ', ') into v_text
    from _job j
   where not exists (select 1 from _altplan a where a.kategorie = j.kategorie and a.tag + j.versatz = j.datum);
  if v_text is not null then
    raise exception 'Abbruch: Praxistage, die nicht zum alten Plan passen: %', v_text;
  end if;
  if (select count(*) from _se) <> (select count(*) from _job) then
    raise exception 'Abbruch: Stundenplan-Einträge (%) passen nicht zu den Praxistagen (%).',
      (select count(*) from _se), (select count(*) from _job);
  end if;

  -- Auswahl B
  if (select count(*) from _weg_typ) <> (select count(*) from _weg) then
    raise exception 'Abbruch: Nicht genau die % weggefallenen Aufträge in Modul II gefunden (gefunden: %).',
      (select count(*) from _weg), (select count(*) from _weg_typ);
  end if;

  -- Was an den Praxistagen hängt (CLAUDE.md Regel 7)
  if exists (select 1 from field_job where id in (select id from _job)
              and (durchgefuehrt_bestaetigt_am is not null or status <> 'geplant')) then
    raise exception 'Abbruch: Praxistag ist schon abgehakt/durchgeführt.';
  end if;
  if exists (select 1 from field_job where id in (select id from _job)
              and (ergebnis is not null or problem_beschreibung is not null)) then
    raise exception 'Abbruch: Praxistag hat schon ein Ergebnis.';
  end if;
  if exists (select 1 from field_capture where field_job_id in (select id from _job)) then
    raise exception 'Abbruch: Praxisberichte (field_capture) an Praxistagen von Modul II.';
  end if;
  if exists (select 1 from verification v join field_capture fc on fc.id = v.field_capture_id
              where fc.field_job_id in (select id from _job)) then
    raise exception 'Abbruch: Freigaben (verification) an Praxistagen von Modul II.';
  end if;
  if exists (select 1 from competency_evidence ce join verification v on v.id = ce.quelle_id
              join field_capture fc on fc.id = v.field_capture_id
              where ce.quelltyp = 'field_verification' and fc.field_job_id in (select id from _job)) then
    raise exception 'Abbruch: Nachweise (competency_evidence) aus Praxistagen von Modul II.';
  end if;
  -- Praxisflow (0058-0064): Fortschritt, Dateien, Codewort-Versuche, Ereignisse
  if exists (select 1 from field_job where id in (select id from _job)
              and (phase <> 'informieren' or phase_seit is not null or praxisflow <> '{}'::jsonb)) then
    raise exception 'Abbruch: Praxistag hat schon Fortschritt im Praxisflow (phase/praxisflow).';
  end if;
  if exists (select 1 from field_job_datei where field_job_id in (select id from _job)) then
    raise exception 'Abbruch: Dateien (field_job_datei) an Praxistagen von Modul II.';
  end if;
  if exists (select 1 from praxis_codewort_versuch where field_job_id in (select id from _job)) then
    raise exception 'Abbruch: Codewort-Versuche (praxis_codewort_versuch) an Praxistagen von Modul II.';
  end if;
  if exists (select 1 from praxis_ereignis where field_job_id in (select id from _job)) then
    raise exception 'Abbruch: Ereignisse (praxis_ereignis) an Praxistagen von Modul II.';
  end if;
  -- Auch an den weggefallenen Aufträgen darf kein Bericht hängen (sonst
  -- änderte das Lösen der Zuordnungen die Erfüllung bestehender Nachweise).
  if exists (select 1 from field_capture fc join field_job fj on fj.id = fc.field_job_id
              where fj.field_job_type_id in (select id from _weg_typ)) then
    raise exception 'Abbruch: Praxisberichte an einem weggefallenen Auftrag.';
  end if;
end $$;
\echo '== Prüfungen bestanden: an keinem Praxistag hängt etwas =='

-- ========== Zeilenzahlen vorher ==========
create temp table _zaehlung (tabelle text primary key, vorher bigint, nachher bigint, erwartet bigint) on commit drop;
insert into _zaehlung (tabelle, erwartet) values
  ('field_job', (select count(*) from _job)),
  ('schedule_entry', (select count(*) from _se)),
  ('field_job_type_competency_mapping', (select count(*) from _fjtcm)),
  ('field_job_type', 0), ('field_job_type_frage', 0), ('competency_step', 0),
  ('field_capture', 0), ('field_capture_antwort', 0), ('field_capture_step_mapping', 0),
  ('verification', 0), ('attendance', 0), ('live_session', 0), ('enrolment', 0),
  ('field_job_datei', 0), ('praxis_codewort_versuch', 0), ('praxis_ereignis', 0);

do $$
declare r record; v bigint;
begin
  for r in select tabelle from _zaehlung loop
    execute format('select count(*) from public.%I', r.tabelle) into v;
    update _zaehlung set vorher = v where tabelle = r.tabelle;
  end loop;
end $$;

-- ========== Ändern (Kinder zuerst, damit nichts unbemerkt kaskadiert) ==========
delete from schedule_entry where id in (select id from _se);
delete from field_job where id in (select id from _job);
delete from field_job_type_competency_mapping where id in (select id from _fjtcm);
update field_job_type set status = 'unpublished'
 where id in (select id from _weg_typ) and status <> 'unpublished';

-- ========== Nachkontrolle ==========
do $$
declare r record; v bigint; v_text text;
begin
  for r in select tabelle from _zaehlung loop
    execute format('select count(*) from public.%I', r.tabelle) into v;
    update _zaehlung set nachher = v where tabelle = r.tabelle;
  end loop;
  select string_agg(format('%s (−%s statt −%s)', tabelle, vorher - nachher, erwartet), ', ') into v_text
    from _zaehlung where vorher - nachher <> erwartet;
  if v_text is not null then
    raise exception 'Abbruch: Unerwartete Änderung, nichts gespeichert: %', v_text;
  end if;
  if exists (select 1 from field_job_type where id in (select id from _weg_typ) and status <> 'unpublished') then
    raise exception 'Abbruch: Ein weggefallener Auftrag ist noch veröffentlicht.';
  end if;
  if exists (select 1 from field_job fj join _typ t on t.id = fj.field_job_type_id) then
    raise exception 'Abbruch: Es gibt noch Praxistage von Modul II.';
  end if;
end $$;

\echo '== Nachkontrolle: Zeilen je Tabelle =='
select tabelle as "Tabelle", vorher as "vorher", nachher as "nachher", vorher - nachher as "entfernt"
  from _zaehlung order by (vorher - nachher) desc, tabelle;

\echo '== Nachkontrolle: Aufträge Modul II =='
select t.kategorie as "Auftrag", ft.status as "Status",
       (select count(*) from field_job_type_competency_mapping m where m.field_job_type_id = t.id) as "Teilschritte",
       (select count(*) from field_job fj where fj.field_job_type_id = t.id) as "Praxistage"
  from _typ t join field_job_type ft on ft.id = t.id
 order by ft.reihenfolge;

\if :{?ausfuehren}
  select :'ausfuehren' = 'ja' as speichern \gset
\else
  \set speichern false
\endif
\if :speichern
  commit;
  \echo '== GESPEICHERT (COMMIT) =='
\else
  rollback;
  \echo '== PROBELAUF: nichts gespeichert (ROLLBACK) =='
\endif
