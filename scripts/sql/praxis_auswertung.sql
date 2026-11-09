-- scripts/sql/praxis_auswertung.sql
-- Tägliche Auswertung des Praxisflows (SR-92), nur lesend und nur
-- aggregiert: Häufigkeiten, Mediane, keine Personen, keine Inhalte.
-- Grundlage: praxis_ereignis (0064), field_job.phase / praxisflow (0058 ff.).
--
-- Aufruf (Beispiel Production, nur mit Freigabe; Passwort aus dem
-- Schlüsselbund, nie im Klartext):
--   PGPASSWORD="$(security find-generic-password -s cja-db-fra -w)" psql \
--     "host=<Session-Pooler> port=5432 dbname=postgres user=postgres.<ref> sslmode=require" \
--     -X -A -F ' | ' -v ON_ERROR_STOP=1 \
--     -v kohorte='<Name der Kohorte>' -v traeger='<Domain-Muster der Trainer-Konten, sonst ->' \
--     -f scripts/sql/praxis_auswertung.sql
--
-- Herausgerechnet: Teamkonten (eigene Domain), Personen mit Rolle trainer
-- oder afcj_admin und Konten, deren Domain auf :traeger passt. Das Muster
-- wird beim Aufruf übergeben und steht nicht im Repo.
-- Ergebnisse gehören als Häufigkeiten nach Notion (Pilot Data), nicht ins Repo.

set session characteristics as transaction read only;
select 'read_only=' || current_setting('transaction_read_only') as pruefung;

\echo === Praxisaufträge im geführten Ablauf je Phase (jetzt)
with p as (
  select e.learner_id from enrolment e
  join cohort c on c.id = e.cohort_id and c.name = :'kohorte'
  join auth.users u on u.id = e.learner_id
  where e.status = 'aktiv'
    and u.email not ilike '%@climatejobsacademy.com'
    and split_part(u.email, '@', 2) not ilike :'traeger'
    and not exists (select 1 from role_assignment r where r.person_id = e.learner_id and r.rolle in ('trainer', 'afcj_admin'))
)
select fj.phase, count(*) as auftraege,
       count(*) filter (where fj.phase not in ('abgeschlossen') and fj.phase_seit < now() - interval '30 minutes') as seit_ueber_30_min
from field_job fj join field_job_type t on t.id = fj.field_job_type_id and t.ablauf = 'gefuehrt'
join p on p.learner_id = fj.learner_id
group by fj.phase order by min(fn_praxis_phase_nr(fj.phase));

\echo === Ergebnisse und K.-o.-Durchläufe
with p as (
  select e.learner_id from enrolment e
  join cohort c on c.id = e.cohort_id and c.name = :'kohorte'
  join auth.users u on u.id = e.learner_id
  where e.status = 'aktiv'
    and u.email not ilike '%@climatejobsacademy.com'
    and split_part(u.email, '@', 2) not ilike :'traeger'
    and not exists (select 1 from role_assignment r where r.person_id = e.learner_id and r.rolle in ('trainer', 'afcj_admin'))
)
select coalesce(fj.praxisflow ->> 'ergebnis', '(offen)') as ergebnis, count(*) as auftraege,
       sum(jsonb_array_length(coalesce(fj.praxisflow -> 'durchlaeufe', '[]'::jsonb))) as ko_durchlaeufe
from field_job fj join field_job_type t on t.id = fj.field_job_type_id and t.ablauf = 'gefuehrt'
join p on p.learner_id = fj.learner_id
group by 1 order by 1;

\echo === Ereignisse je Art und Schritt (Anzahl Ereignisse, Anzahl Personen)
with p as (
  select e.learner_id from enrolment e
  join cohort c on c.id = e.cohort_id and c.name = :'kohorte'
  join auth.users u on u.id = e.learner_id
  where e.status = 'aktiv'
    and u.email not ilike '%@climatejobsacademy.com'
    and split_part(u.email, '@', 2) not ilike :'traeger'
    and not exists (select 1 from role_assignment r where r.person_id = e.learner_id and r.rolle in ('trainer', 'afcj_admin'))
)
select ev.art,
       case when ev.schritt like 'tun:%' then 'tun:*' else ev.schritt end as schritt,
       count(*) as ereignisse, count(distinct ev.learner_id) as personen
from praxis_ereignis ev join p on p.learner_id = ev.learner_id
where ev.art not in ('schritt_geoeffnet', 'schritt_beendet')
group by 1, 2 order by 1, 2;

\echo === Verweildauer je Schritt (Median in Minuten, geöffnet bis nächstes Ereignis der Person im Auftrag)
with p as (
  select e.learner_id from enrolment e
  join cohort c on c.id = e.cohort_id and c.name = :'kohorte'
  join auth.users u on u.id = e.learner_id
  where e.status = 'aktiv'
    and u.email not ilike '%@climatejobsacademy.com'
    and split_part(u.email, '@', 2) not ilike :'traeger'
    and not exists (select 1 from role_assignment r where r.person_id = e.learner_id and r.rolle in ('trainer', 'afcj_admin'))
),
x as (
  select ev.phase, case when ev.schritt like 'tun:%' then 'tun:*' else ev.schritt end as schritt, ev.art, ev.learner_id,
         lead(ev.created_at) over (partition by ev.field_job_id order by ev.created_at) - ev.created_at as dauer
  from praxis_ereignis ev join p on p.learner_id = ev.learner_id
  where ev.art in ('schritt_geoeffnet', 'schritt_beendet')
)
select phase, schritt, count(*) as geoeffnet, count(distinct learner_id) as personen,
       round((percentile_cont(0.5) within group (order by extract(epoch from dauer)) / 60)::numeric, 1) as median_min
from x where art = 'schritt_geoeffnet' and dauer is not null
group by 1, 2 order by min(fn_praxis_phase_nr(phase)), 2;

\echo === Ereignisse je Tag (Berlin)
with p as (
  select e.learner_id from enrolment e
  join cohort c on c.id = e.cohort_id and c.name = :'kohorte'
  join auth.users u on u.id = e.learner_id
  where e.status = 'aktiv'
    and u.email not ilike '%@climatejobsacademy.com'
    and split_part(u.email, '@', 2) not ilike :'traeger'
    and not exists (select 1 from role_assignment r where r.person_id = e.learner_id and r.rolle in ('trainer', 'afcj_admin'))
)
select (ev.created_at at time zone 'Europe/Berlin')::date as tag, count(*) as ereignisse, count(distinct ev.learner_id) as personen
from praxis_ereignis ev join p on p.learner_id = ev.learner_id
group by 1 order by 1;
