-- scripts/sql/modul2_praxis_neu_schneiden_production.sql
-- Fassung für PRODUCTION von scripts/sql/modul2_praxis_neu_schneiden.sql
-- (Staging, PR #237). Inhalt und Prüfungen sind gleich; anders sind nur:
--   - Ziel: nur Production (vqfnmkcfjsudsujiuoqm), zusätzlich
--     -v production_freigabe=ja, sonst Abbruch;
--   - Voraussetzung: Migrationen 0058–0071 sind angewendet (die Prüfungen
--     lesen phase, praxisflow, field_job_datei, praxis_codewort_versuch,
--     praxis_ereignis), sonst Abbruch. Also erst nach den Migrationen des
--     Releases laufen lassen, vor dem Plan-Import.
-- Lesend geprüft am 10.11.2026: eine Pilot-Kohorte, 182 Praxistage Modul II
-- (14 Aufträge × 13 Einschreibungen, 16.–26.11.) genau nach dem alten Plan,
-- keiner abgehakt, keine Berichte; 131 Praxistage anderer Module bleiben.
--
-- Aufruf aus dem Release-Ordner (Kohortenname steht nicht im Repo):
--   psql "host=aws-1-eu-central-1.pooler.supabase.com port=5432 dbname=postgres user=postgres.vqfnmkcfjsudsujiuoqm sslmode=require" \
--        -X -v kohorten='<Pilot-Kohorte>' -v production_freigabe=ja \
--        -f scripts/sql/modul2_praxis_neu_schneiden_production.sql            (Probelauf, ROLLBACK)
--   ... -v ausfuehren=ja (zusätzlich)                                          (speichert, COMMIT; nur mit Freigabe)
--
-- Was das Skript tut, die Sicherungen und die Nachkontrolle: siehe Kopf der
-- Staging-Fassung.

\set ON_ERROR_STOP 1
\pset footer off
\pset pager off

-- ========== Ziel: nur Production, nur mit Freigabe-Variable ==========
select (:'USER' like '%vqfnmkcfjsudsujiuoqm%' or :'HOST' like '%vqfnmkcfjsudsujiuoqm%')
       and :'USER' not like '%keijrwvegmwgpvprpoxa%' and :'HOST' not like '%keijrwvegmwgpvprpoxa%' as ist_production \gset
\if :ist_production
  \echo '== Ziel: Production (vqfnmkcfjsudsujiuoqm) =='
\else
  \echo 'Abbruch: Die Verbindung zeigt nicht auf Production (vqfnmkcfjsudsujiuoqm).'
  do $$ begin raise exception 'Abbruch: falsches Ziel'; end $$;
\endif
\if :{?production_freigabe}
  select :'production_freigabe' = 'ja' as freigabe \gset
\else
  \set freigabe false
\endif
\if :freigabe
\else
  \echo 'Abbruch: Production nur mit -v production_freigabe=ja.'
  do $$ begin raise exception 'Abbruch: production_freigabe fehlt'; end $$;
\endif

-- ========== Voraussetzung: Migrationen 0058-0071 ==========
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'field_job' and column_name = 'phase')
     or to_regclass('public.field_job_datei') is null
     or to_regclass('public.praxis_codewort_versuch') is null
     or to_regclass('public.praxis_ereignis') is null
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'field_job' and column_name = 'zweit_trainer_id') then
    raise exception 'Abbruch: Migrationen 0058-0071 fehlen. Erst die Migrationen des Releases anwenden.';
  end if;
end $$;

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
