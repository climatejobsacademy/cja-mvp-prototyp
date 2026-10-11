-- scripts/sql/demo_kohorte_verschoben_editor.sql
-- Wie scripts/sql/demo_kohorte_verschoben.sql, aber für den SQL Editor im
-- Supabase-Dashboard (ohne Terminal, ohne psql). NUR STAGING (Irland,
-- keijrwvegmwgpvprpoxa) -- vorher oben links prüfen, welches Projekt offen ist.
--
-- Legt die Demo-Kohorte "DEMO Rim" an: Stundenplan und
-- Live-Termine als Kopie von "Energiehelden 28.09.26", 1 Woche später (Start
-- 05.10.2026; Entscheidung Anna 2026-10-11: auf Staging gibt es nur Inhalte
-- für Modul 1, deshalb Demo in Modul 1, Woche 2 -- 05.-09.10. erledigt,
-- 12.-16.10. Theorie, ab 19.10. Praxis);
-- eigene Praxistage; Fortschritt vor dem Stichtag (Lektionen abgeschlossen,
-- Anwesenheit bestätigt, Praxisberichte geprüft; die letzte Selbstlern-
-- Einheit bleibt offen). Die echte Kohorte bleibt unberührt.
--
-- Ablauf:
--   1. Rim ist eingeladen (Authentication -> Users -> Invite user).
--   2. Diesen ganzen Text in den SQL Editor kopieren, im Block EINGABEN
--      p_bestaetigung auf 'STAGING' setzen, "Run".
--      -> Probelauf: endet absichtlich mit "PROBELAUF ok, nichts gespeichert"
--         und nennt, was angelegt würde. Nichts wird gespeichert.
--   3. Passt alles: p_probelauf := false setzen, erneut "Run".
--      -> "Success". Danach zeigt die Abfrage am Ende die Demo-Woche.
--
-- Ein erneuter Lauf ersetzt die Demo-Kohorte, solange es dort noch keine
-- bestätigte Anwesenheit / keine Praxisberichte gibt (Regel 7: die werden nie
-- automatisch gelöscht -- nach dem echten Lauf also nur durch das Team).

do $$
declare
  -- ===================== EINGABEN =====================
  p_probelauf     boolean := true;          -- erst true lassen, dann false
  p_bestaetigung  text    := '';            -- 'STAGING' eintragen
  p_stichtag      date    := '2026-10-12';  -- Fortschritt bis zum Tag davor
  p_verschiebung  int     := -7;            -- Tage früher (+) bzw. später (-) als die Vorlage, ganze Wochen
  p_demo_email    text    := 'anna+demo@climatejobsacademy.com';
  p_demo_name     text    := 'Rim';
  p_demo_username text    := 'demo_rim';
  p_kohorte       text    := 'DEMO Rim';
  p_vorlage       text    := 'Energiehelden 28.09.26';
  p_organisation  text    := 'Energiehelden';
  p_programm      text    := 'EFK-EE';
  -- ====================================================
  v_person   uuid;
  v_pruefer  uuid;
  v_org      uuid;
  v_programm uuid;
  v_vorlage  uuid;
  v_start    date;
  v_kohorte  uuid := gen_random_uuid();
  v_einschr  uuid := gen_random_uuid();
  v_alt      uuid[];
  v_n_theorie int; v_n_praxis int; v_n_fertig int; v_n_anwesend int; v_n_berichte int;
  v_woche    text;
begin
  -- ---------- Prüfen ----------
  if p_bestaetigung <> 'STAGING' then
    raise exception 'Abbruch: Bitte im Block EINGABEN p_bestaetigung := ''STAGING'' setzen (und oben links prüfen, dass das Staging-Projekt offen ist).';
  end if;
  if p_verschiebung % 7 <> 0 then
    raise exception 'Abbruch: p_verschiebung muss ein Vielfaches von 7 sein.';
  end if;

  select id into v_person from auth.users where email = p_demo_email;
  if v_person is null then
    raise exception 'Abbruch: Kein Konto % gefunden. Erst unter Authentication -> Users einladen.', p_demo_email;
  end if;
  select id into v_org from organisation where name = p_organisation;
  select id into v_programm from programme where kuerzel = p_programm;
  select id, start_datum into v_vorlage, v_start from cohort where name = p_vorlage;
  if v_org is null or v_programm is null or v_vorlage is null then
    raise exception 'Abbruch: Organisation "%", Programm "%" oder Vorlage-Kohorte "%" nicht gefunden.', p_organisation, p_programm, p_vorlage;
  end if;
  -- Prüfer:in für Anwesenheit und Praxisberichte: Admin-Rolle, sonst jemand
  -- aus der AfCJ-Organisation. Gibt es niemanden: Anwesenheit ohne
  -- "bestätigt von", Praxisberichte bleiben "in Prüfung" (kein Abbruch).
  select ra.person_id into v_pruefer from role_assignment ra where ra.rolle = 'afcj_admin' order by ra.created_at limit 1;
  if v_pruefer is null then
    select om.person_id into v_pruefer from org_membership om join organisation o on o.id = om.organisation_id
    where o.typ = 'afcj' and om.person_id <> v_person order by om.created_at limit 1;
  end if;
  if exists (select 1 from enrolment e join cohort c on c.id = e.cohort_id where e.learner_id = v_person and c.name <> p_kohorte) then
    raise exception 'Abbruch: Das Demo-Konto ist schon in einer anderen Kohorte eingeschrieben.';
  end if;

  -- ---------- Alte Demo-Kohorte (falls vorhanden) ----------
  select array_agg(id) into v_alt from cohort where name = p_kohorte and programme_id = v_programm;
  if v_alt is not null then
    if exists (select 1 from enrolment e where e.cohort_id = any (v_alt) and e.learner_id <> v_person) then
      raise exception 'Abbruch: In "%" ist noch ein anderes Konto eingeschrieben.', p_kohorte;
    end if;
    if exists (select 1 from attendance a join schedule_entry s on s.live_session_id = a.live_session_id where s.cohort_id = any (v_alt))
       or exists (select 1 from field_capture fc join schedule_entry s on s.field_job_id = fc.field_job_id
                  join enrolment e on e.id = s.enrolment_id where e.cohort_id = any (v_alt)) then
      raise exception 'Abbruch: Die Demo-Kohorte hat schon bestätigte Anwesenheit oder Praxisberichte. Zurücksetzen bitte durch das Team.';
    end if;
    create temp table alt_eintrag on commit drop as
      select s.id, s.live_session_id, s.field_job_id from schedule_entry s
      where s.cohort_id = any (v_alt) or s.enrolment_id in (select id from enrolment where cohort_id = any (v_alt));
    delete from schedule_entry where id in (select id from alt_eintrag);
    delete from live_session where id in (select live_session_id from alt_eintrag where live_session_id is not null)
      and not exists (select 1 from schedule_entry s where s.live_session_id = live_session.id);
    delete from field_job where id in (select field_job_id from alt_eintrag where field_job_id is not null);
    delete from enrolment where cohort_id = any (v_alt);
    delete from cohort where id = any (v_alt);
  end if;
  delete from unit_progress where learner_id = v_person;

  -- ---------- Plan: Kopie der Vorlage, verschoben ----------
  create temp table neu on commit drop as
  select gen_random_uuid() as id, s.datum - p_verschiebung as datum, s.art, s.reihenfolge,
         s.lesson_id, s.course_id,
         case when s.art = 'live' then gen_random_uuid() end as live_id,
         ls.lesson_id as ls_lesson_id, ls.course_id as ls_course_id, ls.start, ls.ende, ls.join_link,
         coalesce(l.name, l2.name, co.name, co2.name) as titel,
         null::uuid as job_id, null::uuid as job_typ
  from schedule_entry s
  left join live_session ls on ls.id = s.live_session_id
  left join lesson l on l.id = s.lesson_id
  left join lesson l2 on l2.id = ls.lesson_id
  left join course co on co.id = s.course_id
  left join course co2 on co2.id = ls.course_id
  where s.cohort_id = v_vorlage and s.art in ('live', 'asynchron');

  insert into neu (id, datum, art, reihenfolge, titel, job_id, job_typ)
  select gen_random_uuid(), x.datum - p_verschiebung, 'feld', 1, x.titel, gen_random_uuid(), x.typ
  from (select distinct s.datum, fj.field_job_type_id as typ, ft.titel
        from schedule_entry s
        join enrolment e on e.id = s.enrolment_id and e.cohort_id = v_vorlage
        join field_job fj on fj.id = s.field_job_id
        join field_job_type ft on ft.id = fj.field_job_type_id
        where s.art = 'feld') x;

  -- ---------- Konto, Kohorte, Einschreibung ----------
  insert into person (id, email, name, username) values (v_person, p_demo_email, p_demo_name, p_demo_username)
  on conflict (id) do nothing;
  insert into org_membership (person_id, organisation_id)
  select v_person, v_org where not exists (select 1 from org_membership where person_id = v_person and organisation_id = v_org);
  insert into role_assignment (person_id, organisation_id, rolle)
  select v_person, v_org, 'learner'
  where not exists (select 1 from role_assignment where person_id = v_person and organisation_id = v_org and rolle = 'learner');

  insert into cohort (id, programme_id, name, start_datum, end_datum)
  values (v_kohorte, v_programm, p_kohorte, v_start - p_verschiebung, (select max(datum) from neu));
  insert into enrolment (id, organisation_id, learner_id, cohort_id, status)
  values (v_einschr, v_org, v_person, v_kohorte, 'aktiv');

  -- ---------- Termine ----------
  insert into live_session (id, lesson_id, course_id, datum, start, ende, join_link)
  select live_id, ls_lesson_id, ls_course_id, datum, start, ende, join_link from neu where art = 'live';

  insert into field_job (id, organisation_id, datum, field_job_type_id, learner_id, status, durchgefuehrt_bestaetigt_am, ergebnis)
  select job_id, v_org, datum, job_typ, v_person,
         case when datum < p_stichtag then 'durchgeführt' else 'geplant' end,
         case when datum < p_stichtag then (datum + time '16:30') at time zone 'Europe/Berlin' end,
         case when datum < p_stichtag then 'erledigt' end
  from neu where art = 'feld';

  insert into schedule_entry (id, organisation_id, datum, art, reihenfolge, cohort_id, enrolment_id, course_id, lesson_id, live_session_id, field_job_id)
  select id, v_org, datum, art, reihenfolge,
         case when art = 'feld' then null else v_kohorte end,
         case when art = 'feld' then v_einschr end,
         case when art = 'asynchron' then course_id end,
         case when art = 'asynchron' then lesson_id end,
         live_id, job_id
  from neu;

  -- ---------- Fortschritt vor dem Stichtag ----------
  insert into unit_progress (organisation_id, learner_id, lesson_id, status, abgeschlossen_am)
  select v_org, v_person, x.lid, 'abgeschlossen', (min(x.datum) + time '17:30') at time zone 'Europe/Berlin'
  from (select coalesce(lesson_id, ls_lesson_id) as lid, datum from neu
        where art in ('live', 'asynchron') and datum < p_stichtag) x
  where x.lid is not null
    and x.lid is distinct from (select lesson_id from neu where art = 'asynchron' and lesson_id is not null and datum < p_stichtag
                                order by datum desc, reihenfolge desc limit 1)
  group by x.lid;

  insert into attendance (organisation_id, learner_id, live_session_id, status, bestaetigt_von)
  select v_org, v_person, live_id, 'anwesend', v_pruefer from neu where art = 'live' and datum < p_stichtag;

  create temp table bericht on commit drop as
    select gen_random_uuid() as id, job_id, datum from neu where art = 'feld' and datum < p_stichtag;
  insert into field_capture (id, organisation_id, learner_id, field_job_id, text, status, phase, eingereicht_am)
  select id, v_org, v_person, job_id, 'Demo: Aufgabe wie geplant durchgeführt.', 'submitted', 'abschluss',
         (datum + time '16:00') at time zone 'Europe/Berlin' from bericht;
  insert into verification (organisation_id, field_capture_id, verifiziert_von, entscheidung, verifiziert_am, kommentar)
  select v_org, id, v_pruefer, 'verified', (datum + time '18:00') at time zone 'Europe/Berlin', 'Demo-Datensatz' from bericht
  where v_pruefer is not null;

  -- ---------- Zusammenfassung ----------
  select count(*) filter (where art in ('live', 'asynchron')), count(*) filter (where art = 'feld')
    into v_n_theorie, v_n_praxis from neu;
  select count(*) into v_n_fertig from unit_progress where learner_id = v_person;
  select count(*) into v_n_anwesend from neu where art = 'live' and datum < p_stichtag;
  select count(*) into v_n_berichte from bericht;
  select string_agg(format('%s %s: %s', to_char(datum, 'Dy DD.MM.'),
                           case art when 'live' then 'Live ' || to_char(start, 'HH24:MI') when 'asynchron' then 'Selbstlernen' else 'Praxis' end,
                           left(titel, 45)), ' | ' order by datum, art)
    into v_woche from neu where datum between p_stichtag and p_stichtag + 11;

  if p_probelauf then
    raise exception E'PROBELAUF ok, nichts gespeichert. Kohorte "%" ab %; % Theorie-Termine, % Praxistage; Fortschritt: % Lektionen erledigt, % Live-Termine anwesend, % Praxisberichte (%). Ab Stichtag: %. Zum Speichern p_probelauf := false setzen.',
      p_kohorte, v_start - p_verschiebung, v_n_theorie, v_n_praxis, v_n_fertig, v_n_anwesend, v_n_berichte,
      case when v_pruefer is null then 'in Prüfung, keine Prüfer:in gefunden' else 'geprüft' end, coalesce(v_woche, '(keine Termine)');
  end if;
end $$;

-- Nach dem echten Lauf: die Demo-Wochen ab Stichtag
select s.datum, to_char(s.datum, 'Dy') as tag, s.art,
       coalesce(l.name, l2.name, ft.titel) as titel
from schedule_entry s
left join enrolment e on e.id = s.enrolment_id
join cohort c on c.id = coalesce(s.cohort_id, e.cohort_id)
left join lesson l on l.id = s.lesson_id
left join live_session ls on ls.id = s.live_session_id
left join lesson l2 on l2.id = ls.lesson_id
left join field_job fj on fj.id = s.field_job_id
left join field_job_type ft on ft.id = fj.field_job_type_id
where c.name = 'DEMO Rim' and s.datum between '2026-10-12' and '2026-10-23'
order by s.datum, s.art;
