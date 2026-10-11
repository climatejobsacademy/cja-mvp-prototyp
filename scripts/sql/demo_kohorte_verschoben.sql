-- scripts/sql/demo_kohorte_verschoben.sql
-- Demo-Kohorte mit verschobenem Start (Branch demo, nur STAGING).
-- Umsetzungsplan: Notion "Demo Oktober 2026 + Weg nach dev: Umsetzungsplan".
--
-- Idee: Die Demo soll mit dem echten Datum laufen, ohne Sonderlinks. Dafür
-- bekommt das Demo-Konto eine eigene Kohorte, deren Stundenplan eine Kopie
-- der Vorlage-Kohorte "Energiehelden 28.09.26" ist -- um `verschiebung` Tage
-- früher (Standard 28 = 4 Wochen, Start 31.08.2026). Dann liegen die Wochen
-- 12.–23.10. in Modul 2 (Theorie, dann Praxis), Modul 1 ist abgeschlossen.
-- Die Wochentage bleiben gleich (Verschiebung in ganzen Wochen).
--
-- Angelegt wird:
--   - Kohorte (start_datum = Vorlage-Start minus Verschiebung) und
--     Einschreibung des Demo-Kontos
--   - eigene Live-Termine (Kopie, gleiche Uhrzeit; Einwahl-Link der Vorlage,
--     falls vorhanden) und der Kohorten-Stundenplan (Live + Selbstlernen)
--   - eigene Praxistage des Demo-Kontos an den verschobenen Praxis-Tagen der
--     Vorlage (gleiche Praxis-Typen)
--   - Fortschritt vor dem Stichtag (Standard 12.10.2026):
--       * Lektionen (Live und Selbstlernen) abgeschlossen -- außer der letzten
--         Selbstlern-Einheit vor dem Stichtag (bleibt offen für "Wenn du magst")
--       * Anwesenheit an Live-Terminen bestätigt (Prüfer = `pruefer_email`)
--       * Praxistage durchgeführt, mit Abschluss-Bericht und Prüfung
--         "verified" (damit Praxis-Kompetenzschritte als erreicht zählen)
--
-- Unveränderliche Zeilen (CLAUDE.md Regel 7): bestätigte Anwesenheit und
-- Prüfungen werden NIE gelöscht. Gibt es sie für die Demo-Kohorte schon,
-- bricht ein erneuter Lauf ab; Zurücksetzen dann bewusst durch das Team.
--
-- NUR mit psql ausführen (der Schutz liest die psql-Verbindungsdaten). Standard
-- ist der Probelauf: plant alles in temporären Tabellen, zeigt den Plan, rollt
-- zurück.
--
--   Probelauf:
--   PGPASSWORD="$(security find-generic-password -s cja-db-irl -w)" psql \
--     "host=aws-1-eu-west-1.pooler.supabase.com port=5432 dbname=postgres user=postgres.keijrwvegmwgpvprpoxa sslmode=require" \
--     -X -v ON_ERROR_STOP=1 -f scripts/sql/demo_kohorte_verschoben.sql
--
--   Echter Lauf: zusätzlich -v modus=echt
--   Optional: -v stichtag=2026-10-14  -v verschiebung=28  -v pruefer_email=...
--
-- Voraussetzung: Login-Konto demo+test@climatejobsacademy.com existiert auf
-- Staging (scripts/invite-learner.mjs --target=staging).
--
-- Production (vqfnmkcfjsudsujiuoqm) wird nie angefasst: das Skript bricht ab,
-- wenn die Verbindung nicht zu keijrwvegmwgpvprpoxa gehört.

\set ON_ERROR_STOP on
\pset footer off

-- ===================== EINGABEN =====================
\if :{?stichtag}
\else
  \set stichtag 2026-10-12
\endif
\if :{?verschiebung}
\else
  \set verschiebung 28
\endif
\if :{?modus}
\else
  \set modus probe
\endif
\set demo_email 'demo+test@climatejobsacademy.com'
\set demo_name 'Rim'
\set demo_username 'demo_rim'
\set demo_kohorte 'DEMO Rim (Start 31.08.26)'
\set vorlage_kohorte 'Energiehelden 28.09.26'
\set organisation 'Energiehelden'
\set programm_kuerzel 'EFK-EE'
-- Wer Anwesenheit bestätigt und Praxisberichte prüft: Standard ist die
-- erste Person mit Rolle afcj_admin; mit -v pruefer_email=... wählbar.
\if :{?pruefer_email}
\else
  \set pruefer_email ''
\endif
-- ====================================================

-- ---------- Schutz: nur Staging ----------
select (:'USER' like '%keijrwvegmwgpvprpoxa%' or :'HOST' like '%keijrwvegmwgpvprpoxa%') as ziel_staging,
       (:'USER' like '%vqfnmkcfjsudsujiuoqm%' or :'HOST' like '%vqfnmkcfjsudsujiuoqm%') as ziel_production,
       (:'modus' = 'echt') as echt,
       (:'modus' in ('echt', 'probe')) as modus_ok
\gset
\if :ziel_production
  do $$ begin raise exception 'ABBRUCH: Verbindung zu Production (vqfnmkcfjsudsujiuoqm). Dieses Skript ist nur für Staging.'; end $$;
\endif
\if :ziel_staging
\else
  do $$ begin raise exception 'ABBRUCH: Verbindung gehört nicht zu Staging (keijrwvegmwgpvprpoxa).'; end $$;
\endif
\if :modus_ok
\else
  do $$ begin raise exception 'ABBRUCH: modus muss probe oder echt sein.'; end $$;
\endif

\echo
\echo '== Demo-Kohorte verschoben, Ziel Staging keijrwvegmwgpvprpoxa, Stichtag' :stichtag ', Verschiebung' :verschiebung 'Tage, Modus' :modus

begin;

-- ---------- Eingaben und Stammdaten prüfen ----------
create temp table p on commit drop as
select
  :'stichtag'::date                                                    as stichtag,
  :'verschiebung'::int                                                 as verschiebung,
  coalesce((select id from auth.users where email = :'demo_email'),
           '00000000-0000-0000-0000-000000000000'::uuid)                  as person_id,
  exists (select 1 from auth.users where email = :'demo_email')        as konto_vorhanden,
  coalesce((select id from person where email = :'pruefer_email'),
           (select ra.person_id from role_assignment ra where ra.rolle = 'afcj_admin'
            order by ra.created_at limit 1))                            as pruefer_id,
  :'modus' = 'echt'                                                    as echt,
  (select id from organisation where name = :'organisation')           as org_id,
  (select id from programme where kuerzel = :'programm_kuerzel')       as programme_id,
  (select id from cohort where name = :'vorlage_kohorte')              as vorlage_id,
  (select start_datum from cohort where name = :'vorlage_kohorte')     as vorlage_start;

do $$
declare r record;
begin
  select * into r from p;
  if r.verschiebung % 7 <> 0 or r.verschiebung <= 0 then
    raise exception 'ABBRUCH: verschiebung % muss ein Vielfaches von 7 sein (ganze Wochen).', r.verschiebung;
  end if;
  if not r.konto_vorhanden then
    if r.echt then
      raise exception 'ABBRUCH: Kein Login-Konto demo+test@climatejobsacademy.com auf Staging. Erst mit scripts/invite-learner.mjs --target=staging einladen.';
    end if;
    raise notice 'HINWEIS: Login-Konto demo+test@climatejobsacademy.com fehlt noch. Der Probelauf rechnet mit einer Platzhalter-ID; der echte Lauf bricht ab.';
  end if;
  if r.pruefer_id is null then
    raise exception 'ABBRUCH: Keine Prüfer-Person gefunden (keine afcj_admin-Rolle; -v pruefer_email=... angeben).';
  end if;
  if r.org_id is null or r.programme_id is null or r.vorlage_id is null then
    raise exception 'ABBRUCH: Organisation, Programm oder Vorlage-Kohorte nicht gefunden (%, %, %).',
      r.org_id, r.programme_id, r.vorlage_id;
  end if;
  if exists (select 1 from enrolment e join cohort c on c.id = e.cohort_id
             where e.learner_id = r.person_id and c.name <> 'DEMO Rim (Start 31.08.26)') then
    raise exception 'ABBRUCH: Das Demo-Konto ist noch in einer anderen Kohorte eingeschrieben.';
  end if;
end $$;

-- ---------- Was gelöscht würde (nur Kohorte DEMO Rim) ----------
create temp table alt_kohorte on commit drop as
select c.id from cohort c join p on c.programme_id = p.programme_id where c.name = :'demo_kohorte';

create temp table alt_enrolment on commit drop as
select e.id, e.learner_id from enrolment e where e.cohort_id in (select id from alt_kohorte);

create temp table alt_eintrag on commit drop as
select s.id, s.live_session_id, s.field_job_id from schedule_entry s
where s.cohort_id in (select id from alt_kohorte) or s.enrolment_id in (select id from alt_enrolment);

create temp table alt_live on commit drop as
select distinct a.live_session_id as id from alt_eintrag a
where a.live_session_id is not null
  and not exists (select 1 from schedule_entry s where s.live_session_id = a.live_session_id
                  and s.id not in (select id from alt_eintrag));

create temp table alt_praxis on commit drop as
select distinct a.field_job_id as id from alt_eintrag a where a.field_job_id is not null;

do $$
begin
  if exists (select 1 from alt_enrolment a join p on true where a.learner_id <> p.person_id) then
    raise exception 'ABBRUCH: In der Kohorte DEMO Rim ist noch ein anderes Konto eingeschrieben.';
  end if;
  -- Regel 7: bestätigte Anwesenheit, Berichte und Prüfungen nie automatisch löschen.
  if exists (select 1 from attendance a where a.live_session_id in (select id from alt_live)) then
    raise exception 'ABBRUCH: Es gibt schon bestätigte Anwesenheit für die Demo-Kohorte. Zurücksetzen bitte bewusst durch das Team.';
  end if;
  if exists (select 1 from field_capture fc where fc.field_job_id in (select id from alt_praxis)) then
    raise exception 'ABBRUCH: Zu einem Demo-Praxistag gibt es einen Bericht (field_capture). Zurücksetzen bitte bewusst durch das Team.';
  end if;
end $$;

-- ---------- Was angelegt würde ----------
-- Vorlage: Kohorten-Termine (Live + Selbstlernen) der Vorlage-Kohorte
create temp table vorlage_theorie on commit drop as
select s.datum, s.art, s.reihenfolge, s.lesson_id, s.course_id,
       ls.lesson_id as ls_lesson_id, ls.course_id as ls_course_id, ls.start, ls.ende, ls.join_link,
       coalesce(l.name, l2.name, co.name, co2.name) as titel
from schedule_entry s
join p on s.cohort_id = p.vorlage_id
left join live_session ls on ls.id = s.live_session_id
left join lesson l on l.id = s.lesson_id
left join lesson l2 on l2.id = ls.lesson_id
left join course co on co.id = s.course_id
left join course co2 on co2.id = ls.course_id
where s.art in ('live', 'asynchron');

-- Vorlage: Praxistage (hängen an Einschreibungen der Vorlage-Kohorte) -- je
-- Tag und Praxis-Typ einmal
create temp table vorlage_praxis on commit drop as
select distinct s.datum, fj.field_job_type_id, ft.titel
from schedule_entry s
join enrolment e on e.id = s.enrolment_id
join p on e.cohort_id = p.vorlage_id
join field_job fj on fj.id = s.field_job_id
join field_job_type ft on ft.id = fj.field_job_type_id
where s.art = 'feld';

create temp table neu_eintrag on commit drop as
select gen_random_uuid() as id, v.datum - p.verschiebung as datum, v.art, v.reihenfolge, v.titel,
       case when v.art = 'live' then gen_random_uuid() end as live_session_id,
       v.lesson_id, v.course_id, v.ls_lesson_id, v.ls_course_id, v.start, v.ende, v.join_link,
       null::uuid as field_job_id, null::uuid as field_job_type_id
from vorlage_theorie v, p;

insert into neu_eintrag (id, datum, art, reihenfolge, titel, field_job_id, field_job_type_id)
select gen_random_uuid(), v.datum - p.verschiebung, 'feld', 1, v.titel, gen_random_uuid(), v.field_job_type_id
from vorlage_praxis v, p;

create temp table neu_kohorte on commit drop as
select gen_random_uuid() as id, gen_random_uuid() as enrolment_id,
       p.vorlage_start - p.verschiebung as start_datum,
       (select max(datum) from neu_eintrag) as end_datum
from p;

-- Fortschritt vor dem Stichtag. Die letzte Selbstlern-Einheit davor bleibt
-- offen (Home: "Wenn du magst", Stundenplan: offen).
create temp table offen_lassen on commit drop as
select n.lesson_id from neu_eintrag n, p
where n.art = 'asynchron' and n.lesson_id is not null and n.datum < p.stichtag
order by n.datum desc, n.reihenfolge desc limit 1;

create temp table neu_erledigt on commit drop as
select distinct on (lid) lid as lesson_id, datum
from (
  select coalesce(n.lesson_id, n.ls_lesson_id) as lid, n.datum
  from neu_eintrag n, p
  where n.art in ('live', 'asynchron') and n.datum < p.stichtag
) x
where lid is not null and lid not in (select lesson_id from offen_lassen)
order by lid, datum;

-- Ab hier im Probelauf nur noch lesen.
\if :echt
\else
set transaction read only;
\endif

-- ---------- Plan anzeigen ----------
\echo
\echo '-- Würde LÖSCHEN (nur Kohorte DEMO Rim; Anwesenheit/Berichte/Prüfungen nie):'
select 'cohort' as tabelle, count(*) as zeilen from alt_kohorte
union all select 'enrolment', count(*) from alt_enrolment
union all select 'schedule_entry', count(*) from alt_eintrag
union all select 'live_session', count(*) from alt_live
union all select 'field_job', count(*) from alt_praxis
union all select 'unit_progress (des Demo-Kontos)', (select count(*) from unit_progress u join p on u.learner_id = p.person_id);

\echo '-- Würde ANLEGEN: Kohorte'
select :'demo_kohorte' as kohorte, start_datum, end_datum, :'organisation' as organisation from neu_kohorte;

\echo '-- Würde ANLEGEN: Stundenplan rund um den Stichtag (2 Wochen davor bis 2 Wochen danach)'
select n.datum, to_char(n.datum, 'Dy') as tag,
       case n.art when 'live' then 'Live ' || to_char(n.start, 'HH24:MI') || '–' || to_char(n.ende, 'HH24:MI')
                  when 'asynchron' then 'Selbstlernen' else 'Praxistag' end as art,
       n.titel,
       case when n.datum < (select stichtag from p) then 'erledigt' else '' end as stand
from neu_eintrag n, p
where n.datum between p.stichtag - 14 and p.stichtag + 13
order by n.datum, case n.art when 'live' then 1 when 'asynchron' then 2 else 3 end;

select count(*) filter (where art in ('live', 'asynchron')) as schedule_entry_kohorte,
       count(*) filter (where art = 'feld') as schedule_entry_einschreibung,
       count(*) filter (where art = 'live') as live_session,
       count(*) filter (where art = 'feld') as field_job,
       (select count(*) from neu_erledigt) as unit_progress_abgeschlossen,
       count(*) filter (where art = 'live' and datum < (select stichtag from p)) as attendance_anwesend,
       count(*) filter (where art = 'feld' and datum < (select stichtag from p)) as praxistage_durchgefuehrt_und_geprueft,
       (select count(*) from offen_lassen) as selbstlernen_offen_gelassen
from neu_eintrag;

\if :echt
-- ===================== ECHTER LAUF =====================
-- Löschen (Reihenfolge wegen Fremdschlüsseln; Anwesenheit und Berichte
-- wurden oben ausgeschlossen)
delete from schedule_entry where id in (select id from alt_eintrag);
delete from live_session where id in (select id from alt_live);
delete from field_job where id in (select id from alt_praxis);
delete from enrolment where id in (select id from alt_enrolment);
delete from cohort where id in (select id from alt_kohorte);
delete from unit_progress where learner_id = (select person_id from p);

-- Konto (nur falls fehlend)
insert into person (id, email, name, username)
select p.person_id, :'demo_email', :'demo_name', :'demo_username' from p
on conflict (id) do nothing;
insert into org_membership (person_id, organisation_id)
select p.person_id, p.org_id from p
where not exists (select 1 from org_membership x where x.person_id = p.person_id and x.organisation_id = p.org_id);
insert into role_assignment (person_id, organisation_id, rolle)
select p.person_id, p.org_id, 'learner' from p
where not exists (select 1 from role_assignment x where x.person_id = p.person_id and x.organisation_id = p.org_id and x.rolle = 'learner');

-- Kohorte, Einschreibung
insert into cohort (id, programme_id, name, start_datum, end_datum)
select k.id, p.programme_id, :'demo_kohorte', k.start_datum, k.end_datum from neu_kohorte k, p;
insert into enrolment (id, organisation_id, learner_id, cohort_id, status)
select k.enrolment_id, p.org_id, p.person_id, k.id, 'aktiv' from neu_kohorte k, p;

-- Live-Termine, Praxistage, Stundenplan
insert into live_session (id, lesson_id, course_id, datum, start, ende, join_link)
select n.live_session_id, n.ls_lesson_id, n.ls_course_id, n.datum, n.start, n.ende, n.join_link
from neu_eintrag n where n.art = 'live';

insert into field_job (id, organisation_id, datum, field_job_type_id, learner_id, status, durchgefuehrt_bestaetigt_am, ergebnis)
select n.field_job_id, p.org_id, n.datum, n.field_job_type_id, p.person_id,
       case when n.datum < p.stichtag then 'durchgeführt' else 'geplant' end,
       case when n.datum < p.stichtag then (n.datum + time '16:30') at time zone 'Europe/Berlin' end,
       case when n.datum < p.stichtag then 'erledigt' end
from neu_eintrag n, p where n.art = 'feld';

insert into schedule_entry (id, organisation_id, datum, art, reihenfolge, cohort_id, enrolment_id, course_id, lesson_id, live_session_id, field_job_id)
select n.id, p.org_id, n.datum, n.art, n.reihenfolge,
       case when n.art = 'feld' then null else k.id end,
       case when n.art = 'feld' then k.enrolment_id end,
       case when n.art = 'asynchron' then n.course_id end,
       case when n.art = 'asynchron' then n.lesson_id end,
       n.live_session_id, n.field_job_id
from neu_eintrag n, neu_kohorte k, p;

-- Fortschritt vor dem Stichtag
insert into unit_progress (organisation_id, learner_id, lesson_id, status, abgeschlossen_am)
select p.org_id, p.person_id, e.lesson_id, 'abgeschlossen', (e.datum + time '17:30') at time zone 'Europe/Berlin'
from neu_erledigt e, p;

insert into attendance (organisation_id, learner_id, live_session_id, status, bestaetigt_von)
select p.org_id, p.person_id, n.live_session_id, 'anwesend', p.pruefer_id
from neu_eintrag n, p where n.art = 'live' and n.datum < p.stichtag;

-- Praxis: Abschluss-Bericht + Prüfung "verified" (Trigger setzt den Status
-- des Berichts), damit Praxis-Kompetenzschritte als erreicht zählen.
create temp table neu_bericht on commit drop as
select gen_random_uuid() as id, n.field_job_id, n.datum from neu_eintrag n, p
where n.art = 'feld' and n.datum < p.stichtag;

insert into field_capture (id, organisation_id, learner_id, field_job_id, text, status, phase, eingereicht_am)
select b.id, p.org_id, p.person_id, b.field_job_id, 'Demo: Aufgabe wie geplant durchgeführt.', 'submitted', 'abschluss',
       (b.datum + time '16:00') at time zone 'Europe/Berlin'
from neu_bericht b, p;

insert into verification (organisation_id, field_capture_id, verifiziert_von, entscheidung, verifiziert_am, kommentar)
select p.org_id, b.id, p.pruefer_id, 'verified', (b.datum + time '18:00') at time zone 'Europe/Berlin', 'Demo-Datensatz'
from neu_bericht b, p;

commit;
\echo '== ECHTER LAUF gespeichert.'
\else
-- ===================== PROBELAUF =====================
rollback;
\echo '== PROBELAUF: nichts gespeichert (Transaktion nur lesend und zurückgerollt).'
\endif
