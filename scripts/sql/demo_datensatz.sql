-- scripts/sql/demo_datensatz.sql
-- Demo-Datensatz für das Investor-Demo (Branch demo, nur STAGING).
--
-- Legt für das Demo-Konto eine eigene Kohorte "DEMO Investor" an, mit
-- Stundenplan relativ zu einem Stichtag:
--   - 10 Werktage vor dem Stichtag: je ein Live-Termin und ein Selbstlern-
--     Termin, Titel und Uhrzeiten aus der Staging-Kohorte "Energiehelden
--     28.09.26" (eigene live_session-Zeilen, die Vorlage bleibt unverändert)
--   - am Stichtag: Praxistag "230V Schuko Verlängerung", Status geplant,
--     ohne Bericht
--   - 3 Werktage danach: weitere geplante Praxistage
-- Ein erneuter Lauf löscht zuerst nur die Zeilen der Kohorte "DEMO Investor"
-- (Stundenplan, eigene Live-Termine, Praxistage der Demo-Einschreibung,
-- Einschreibung, Kohorte) und legt sie dann neu an.
-- Einmalig und bei jedem Lauf nur falls fehlend: person, org_membership,
-- role_assignment des Demo-Kontos und der Praxis-Typ "230V Schuko
-- Verlängerung" (diese werden nie gelöscht).
--
-- NUR mit psql ausführen (der Schutz liest die psql-Verbindungsdaten; im
-- Supabase-SQL-Editor bricht das Skript ab). Standard ist der Probelauf:
-- er plant alles in temporären Tabellen der eigenen Sitzung, schaltet die
-- Transaktion dann auf "nur lesen", zeigt den Plan und rollt zurück.
--
--   Probelauf:
--   PGPASSWORD="$(security find-generic-password -s cja-db-irl -w)" psql \
--     "host=aws-1-eu-west-1.pooler.supabase.com port=5432 dbname=postgres user=postgres.keijrwvegmwgpvprpoxa sslmode=require" \
--     -X -v ON_ERROR_STOP=1 -v stichtag=2026-10-15 -f scripts/sql/demo_datensatz.sql
--
--   Echter Lauf: zusätzlich -v modus=echt
--   Optional: -v fortschritt=ja  (Selbstlern-Lektionen vor dem Stichtag als
--             abgeschlossen markieren; löscht dafür zuerst ALLE unit_progress-
--             Zeilen des Demo-Kontos)
--
-- Production (vqfnmkcfjsudsujiuoqm) wird nie angefasst: das Skript bricht ab,
-- wenn die Verbindung nicht zu keijrwvegmwgpvprpoxa gehört.

\set ON_ERROR_STOP on
\pset footer off

-- ===================== EINGABEN =====================
\if :{?stichtag}
\else
  \set stichtag 2026-10-15
\endif
\if :{?modus}
\else
  \set modus probe
\endif
\if :{?fortschritt}
\else
  \set fortschritt nein
\endif
\set demo_email 'vera+demo@climatejobsacademy.com'
\set demo_name 'Alex Beispiel'
\set demo_username 'demo_investor'
\set demo_kohorte 'DEMO Investor'
\set demo_praxis_titel '230V Schuko Verlängerung'
-- Vorlage für Titel und Uhrzeiten der Theorie-Termine
\set vorlage_kohorte 'Energiehelden 28.09.26'
\set organisation 'Energiehelden'
\set programm_kuerzel 'EFK-EE'
-- Modul, an das ein neu angelegter Praxis-Typ gehängt wird
\set praxis_modul 'Woche 3 – Praxis (präsenz), 12.10.–16.10.2026'
-- ====================================================

-- ---------- Schutz: nur Staging ----------
select (:'USER' like '%keijrwvegmwgpvprpoxa%' or :'HOST' like '%keijrwvegmwgpvprpoxa%') as ziel_staging,
       (:'USER' like '%vqfnmkcfjsudsujiuoqm%' or :'HOST' like '%vqfnmkcfjsudsujiuoqm%') as ziel_production,
       (:'modus' = 'echt') as echt,
       (:'modus' in ('echt', 'probe')) as modus_ok,
       (:'fortschritt' = 'ja') as mit_fortschritt
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
\echo '== Demo-Datensatz, Ziel Staging keijrwvegmwgpvprpoxa, Stichtag' :stichtag ', Modus' :modus ', Fortschritt' :fortschritt

begin;

-- ---------- Eingaben und Stammdaten prüfen ----------
create temp table p on commit drop as
select
  :'stichtag'::date                                                    as stichtag,
  -- Im Probelauf ohne Konto: Platzhalter-ID, damit der Plan sichtbar ist
  coalesce((select id from auth.users where email = :'demo_email'),
           '00000000-0000-0000-0000-000000000000'::uuid)                  as person_id,
  exists (select 1 from auth.users where email = :'demo_email')        as konto_vorhanden,
  :'modus' = 'echt'                                                    as echt,
  (select id from organisation where name = :'organisation')           as org_id,
  (select id from programme where kuerzel = :'programm_kuerzel')       as programme_id,
  (select id from cohort where name = :'vorlage_kohorte')              as vorlage_id,
  (select m.id from module m join programme pr on pr.id = m.programme_id
    where pr.kuerzel = :'programm_kuerzel' and m.name = :'praxis_modul') as modul_id;

do $$
declare r record;
begin
  select * into r from p;
  if extract(isodow from r.stichtag) > 5 then
    raise exception 'ABBRUCH: Stichtag % ist kein Werktag (Mo–Fr).', r.stichtag;
  end if;
  if not r.konto_vorhanden then
    if r.echt then
      raise exception 'ABBRUCH: Kein Login-Konto vera+demo@climatejobsacademy.com auf Staging. Erst mit scripts/invite-learner.mjs --target=staging einladen.';
    end if;
    raise notice 'HINWEIS: Login-Konto vera+demo@climatejobsacademy.com fehlt noch. Der Probelauf rechnet mit einer Platzhalter-ID; der echte Lauf bricht ab.';
  end if;
  if r.org_id is null or r.programme_id is null or r.vorlage_id is null or r.modul_id is null then
    raise exception 'ABBRUCH: Organisation, Programm, Vorlage-Kohorte oder Modul nicht gefunden (%, %, %, %).',
      r.org_id, r.programme_id, r.vorlage_id, r.modul_id;
  end if;
  -- Das Demo-Konto darf außerhalb der Demo-Kohorte keine Einschreibung haben.
  if exists (select 1 from enrolment e join cohort c on c.id = e.cohort_id
             where e.learner_id = r.person_id and c.name <> 'DEMO Investor') then
    raise exception 'ABBRUCH: Das Demo-Konto ist noch in einer anderen Kohorte eingeschrieben.';
  end if;
end $$;

-- ---------- Was gelöscht würde (nur Kohorte "DEMO Investor") ----------
create temp table alt_kohorte on commit drop as
select c.id from cohort c join p on c.programme_id = p.programme_id where c.name = :'demo_kohorte';

create temp table alt_enrolment on commit drop as
select e.id, e.learner_id from enrolment e where e.cohort_id in (select id from alt_kohorte);

create temp table alt_eintrag on commit drop as
select s.id, s.datum, s.art, s.live_session_id, s.field_job_id from schedule_entry s
where s.cohort_id in (select id from alt_kohorte) or s.enrolment_id in (select id from alt_enrolment);

-- Live-Termine nur, wenn keine Kohorte außerhalb der Demo sie nutzt
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
    raise exception 'ABBRUCH: In der Kohorte DEMO Investor ist noch ein anderes Konto eingeschrieben.';
  end if;
  -- Berichte und Prüfungen sind unveränderlich (CLAUDE.md Regel 7): nie löschen.
  if exists (select 1 from field_capture fc where fc.field_job_id in (select id from alt_praxis)) then
    raise exception 'ABBRUCH: Zu einem Demo-Praxistag gibt es einen Bericht (field_capture). Nicht automatisch löschen, bitte melden.';
  end if;
end $$;

-- ---------- Was angelegt würde ----------
-- Vorlage: Kohorten-Termine der Vorlage-Kohorte, je Tag Live + Selbstlernen
create temp table vorlage on commit drop as
select s.datum as vorlage_datum,
       dense_rank() over (order by s.datum) as tag_nr,
       s.art, s.reihenfolge, s.lesson_id, s.course_id,
       ls.lesson_id as ls_lesson_id, ls.course_id as ls_course_id, ls.start, ls.ende,
       coalesce(l.name, l2.name, co.name, co2.name) as titel
from schedule_entry s
join p on s.cohort_id = p.vorlage_id
left join live_session ls on ls.id = s.live_session_id
left join lesson l on l.id = s.lesson_id
left join lesson l2 on l2.id = ls.lesson_id
left join course co on co.id = s.course_id
left join course co2 on co2.id = ls.course_id
where s.art in ('live', 'asynchron');

-- 10 Werktage vor dem Stichtag (älteste zuerst) und 3 danach
create temp table theorietage on commit drop as
select d::date as datum, row_number() over (order by d) as tag_nr
from (select d from p, generate_series(p.stichtag - 30, p.stichtag - 1, interval '1 day') d
      where extract(isodow from d) <= 5 order by d desc limit (select max(tag_nr) from vorlage)) x;

create temp table praxistage_danach on commit drop as
select d::date as datum, row_number() over (order by d) as nr
from (select d from p, generate_series(p.stichtag + 1, p.stichtag + 14, interval '1 day') d
      where extract(isodow from d) <= 5 order by d limit 3) x;

create temp table neu_eintrag on commit drop as
select gen_random_uuid() as id, t.datum, v.art, v.reihenfolge, v.titel,
       case when v.art = 'live' then gen_random_uuid() end as live_session_id,
       v.lesson_id, v.course_id, v.ls_lesson_id, v.ls_course_id, v.start, v.ende,
       null::uuid as field_job_id, null::uuid as field_job_type_id
from vorlage v join theorietage t on t.tag_nr = v.tag_nr;

-- Praxis-Typ: vorhandenen mit dem Titel nehmen, sonst neu (im Praxis-Modul)
create temp table praxis_typ on commit drop as
select coalesce((select id from field_job_type where titel = :'demo_praxis_titel' limit 1), gen_random_uuid()) as id,
       exists (select 1 from field_job_type where titel = :'demo_praxis_titel') as vorhanden;

insert into neu_eintrag (id, datum, art, reihenfolge, titel, field_job_id, field_job_type_id)
select gen_random_uuid(), p.stichtag, 'feld', 1, :'demo_praxis_titel', gen_random_uuid(), (select id from praxis_typ) from p;

-- Danach: vorhandene veröffentlichte Praxis-Typen des Moduls in ihrer Reihenfolge
insert into neu_eintrag (id, datum, art, reihenfolge, titel, field_job_id, field_job_type_id)
select gen_random_uuid(), d.datum, 'feld', 1, ft.titel, gen_random_uuid(), ft.id
from praxistage_danach d
join (select ft.id, ft.titel, row_number() over (order by ft.reihenfolge, ft.titel) as nr
      from field_job_type ft join p on ft.module_id = p.modul_id
      where ft.status = 'published' and ft.titel <> :'demo_praxis_titel') ft on ft.nr = d.nr;

create temp table neu_kohorte on commit drop as
select gen_random_uuid() as id, gen_random_uuid() as enrolment_id,
       (select min(datum) from neu_eintrag) as start_datum,
       (select max(datum) from neu_eintrag) as end_datum;

-- Ab hier im Probelauf nur noch lesen (die temporären Tabellen oben gehören
-- nur dieser Sitzung und verschwinden beim Rollback).
\if :echt
\else
set transaction read only;
\endif

-- ---------- Plan anzeigen ----------
\echo
\echo '-- Würde LÖSCHEN (nur Kohorte DEMO Investor):'
select 'cohort' as tabelle, count(*) as zeilen from alt_kohorte
union all select 'enrolment', count(*) from alt_enrolment
union all select 'schedule_entry', count(*) from alt_eintrag
union all select 'live_session', count(*) from alt_live
union all select 'field_job', count(*) from alt_praxis
union all select 'unit_progress (nur bei fortschritt=ja)',
  case when :'fortschritt' = 'ja' then (select count(*) from unit_progress u join p on u.learner_id = p.person_id) else 0 end;

\echo '-- Konto (nur falls fehlend, wird nie gelöscht):'
select 'person' as tabelle, exists (select 1 from person x join p on x.id = p.person_id) as vorhanden
union all select 'org_membership', exists (select 1 from org_membership x join p on x.person_id = p.person_id and x.organisation_id = p.org_id)
union all select 'role_assignment learner', exists (select 1 from role_assignment x join p on x.person_id = p.person_id and x.organisation_id = p.org_id and x.rolle = 'learner')
union all select 'Praxis-Typ ' || :'demo_praxis_titel', (select vorhanden from praxis_typ);

\echo '-- Würde ANLEGEN: Kohorte'
select :'demo_kohorte' as kohorte, start_datum, end_datum, :'organisation' as organisation from neu_kohorte;

\echo '-- Würde ANLEGEN: Stundenplan (Kohorte bzw. Einschreibung), eigene Live-Termine, Praxistage'
select n.datum, to_char(n.datum, 'Dy') as tag,
       case n.art when 'live' then 'Live ' || to_char(n.start, 'HH24:MI') || '–' || to_char(n.ende, 'HH24:MI')
                  when 'asynchron' then 'Selbstlernen' else 'Praxistag (geplant)' end as art,
       n.titel,
       case when n.datum = (select stichtag from p) then '<- Stichtag' else '' end as hinweis
from neu_eintrag n order by n.datum, case n.art when 'live' then 1 when 'asynchron' then 2 else 3 end;

select count(*) filter (where art in ('live', 'asynchron')) as schedule_entry_kohorte,
       count(*) filter (where art = 'feld') as schedule_entry_einschreibung,
       count(*) filter (where art = 'live') as live_session,
       count(*) filter (where art = 'feld') as field_job,
       case when :'fortschritt' = 'ja' then (select count(distinct lesson_id) from neu_eintrag
            where art = 'asynchron' and lesson_id is not null and datum < (select stichtag from p)) else 0 end as unit_progress_abgeschlossen
from neu_eintrag;

\if :echt
-- ===================== ECHTER LAUF =====================
-- Löschen (Reihenfolge wegen Fremdschlüsseln)
delete from schedule_entry where id in (select id from alt_eintrag);
delete from live_session where id in (select id from alt_live);
delete from field_job where id in (select id from alt_praxis);
delete from enrolment where id in (select id from alt_enrolment);
delete from cohort where id in (select id from alt_kohorte);
\if :mit_fortschritt
delete from unit_progress where learner_id = (select person_id from p);
\endif

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

-- Praxis-Typ (nur falls fehlend)
insert into field_job_type (id, titel, beschreibung, status, module_id, reihenfolge)
select t.id, :'demo_praxis_titel', 'Demo-Praxistag für das Investor-Demo.', 'published', p.modul_id,
       coalesce((select max(reihenfolge) from field_job_type where module_id = p.modul_id), 0) + 1
from praxis_typ t, p where not t.vorhanden;

-- Kohorte, Einschreibung
insert into cohort (id, programme_id, name, start_datum, end_datum)
select k.id, p.programme_id, :'demo_kohorte', k.start_datum, k.end_datum from neu_kohorte k, p;
insert into enrolment (id, organisation_id, learner_id, cohort_id, status)
select k.enrolment_id, p.org_id, p.person_id, k.id, 'aktiv' from neu_kohorte k, p;

-- Live-Termine (ohne Einwahl-Link), dann Stundenplan
insert into live_session (id, lesson_id, course_id, datum, start, ende)
select n.live_session_id, n.ls_lesson_id, n.ls_course_id, n.datum, n.start, n.ende
from neu_eintrag n where n.art = 'live';

insert into field_job (id, organisation_id, datum, field_job_type_id, learner_id, status)
select n.field_job_id, p.org_id, n.datum, n.field_job_type_id, p.person_id, 'geplant'
from neu_eintrag n, p where n.art = 'feld';

insert into schedule_entry (id, organisation_id, datum, art, reihenfolge, cohort_id, enrolment_id, course_id, lesson_id, live_session_id, field_job_id)
select n.id, p.org_id, n.datum, n.art, n.reihenfolge,
       case when n.art = 'feld' then null else k.id end,
       case when n.art = 'feld' then k.enrolment_id end,
       case when n.art = 'asynchron' then n.course_id end,
       case when n.art = 'asynchron' then n.lesson_id end,
       n.live_session_id, n.field_job_id
from neu_eintrag n, neu_kohorte k, p;

\if :mit_fortschritt
insert into unit_progress (organisation_id, learner_id, lesson_id, status, abgeschlossen_am)
select distinct on (n.lesson_id) p.org_id, p.person_id, n.lesson_id, 'abgeschlossen',
       (n.datum + time '17:30') at time zone 'Europe/Berlin'
from neu_eintrag n, p
where n.art = 'asynchron' and n.lesson_id is not null and n.datum < p.stichtag
order by n.lesson_id, n.datum;
\endif

commit;
\echo '== ECHTER LAUF gespeichert.'
\else
-- ===================== PROBELAUF =====================
rollback;
\echo '== PROBELAUF: nichts gespeichert (Transaktion nur lesend und zurückgerollt).'
\endif
