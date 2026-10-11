-- scripts/sql/demo_konten_hinzufuegen_editor.sql
-- Weitere Demo-Konten in die bestehende Demo-Kohorte "DEMO Rim" einschreiben
-- (Wunsch Anna 2026-10-11: jede:r soll die Demo selbst anklicken können).
-- Für den SQL Editor im Supabase-Dashboard. NUR STAGING (Irland,
-- keijrwvegmwgpvprpoxa).
--
-- Voraussetzung: "DEMO Rim" ist angelegt (demo_kohorte_verschoben_editor.sql)
-- und die Personen sind unter Authentication -> Users eingeladen, mit einer
-- Adresse, die auf "+demo@climatejobsacademy.com" endet (z. B.
-- malte+demo@climatejobsacademy.com).
--
-- Das Skript nimmt automatisch alle solchen Konten, die noch nicht in
-- "DEMO Rim" sind, und gibt jedem denselben Stand wie dem ersten Demo-Konto
-- (Rim): Einschreibung, eigene Praxistage an denselben Tagen, abgeschlossene
-- Lektionen und Anwesenheit wie bei Rim. Name in der App = Teil vor dem "+",
-- großgeschrieben ("malte+demo@..." -> "Malte"). Konten in anderen Kohorten
-- werden übersprungen. Rim und die Kohorte selbst bleiben unverändert; es
-- wird nichts gelöscht.
--
-- Ablauf: p_bestaetigung := 'STAGING', Run -> Probelauf ("PROBELAUF ok, nichts
-- gespeichert" mit der Liste der Konten). Dann p_probelauf := false, Run.

do $$
declare
  -- ===================== EINGABEN =====================
  p_probelauf    boolean := true;           -- erst true lassen, dann false
  p_bestaetigung text    := '';             -- 'STAGING' eintragen
  p_kohorte      text    := 'DEMO Rim';
  p_vorbild      text    := 'anna+demo@climatejobsacademy.com';  -- Konto mit dem Demo-Stand
  p_muster       text    := '%+demo@climatejobsacademy.com';
  -- ====================================================
  v_kohorte  uuid;
  v_org      uuid;
  v_vorbild  uuid;
  v_vorbild_einschr uuid;
  r          record;
  v_einschr  uuid;
  v_name     text;
  v_liste    text := '';
  v_anzahl   int := 0;
begin
  if p_bestaetigung <> 'STAGING' then
    raise exception 'Abbruch: Bitte im Block EINGABEN p_bestaetigung := ''STAGING'' setzen.';
  end if;

  select c.id into v_kohorte from cohort c where c.name = p_kohorte;
  select id into v_vorbild from auth.users where email = p_vorbild;
  select e.id, e.organisation_id into v_vorbild_einschr, v_org
    from enrolment e where e.cohort_id = v_kohorte and e.learner_id = v_vorbild;
  if v_kohorte is null or v_vorbild_einschr is null then
    raise exception 'Abbruch: Kohorte "%" oder die Einschreibung von % nicht gefunden. Erst das Demo-Kohorten-Skript ausführen.', p_kohorte, p_vorbild;
  end if;

  for r in
    select u.id, u.email from auth.users u
    where u.email like p_muster and u.id <> v_vorbild
      and not exists (select 1 from enrolment e where e.learner_id = u.id)
    order by u.email
  loop
    v_name := initcap(split_part(split_part(r.email, '@', 1), '+', 1));
    v_einschr := gen_random_uuid();

    insert into person (id, email, name, username)
    values (r.id, r.email, v_name, 'demo_' || lower(regexp_replace(v_name, '[^a-zA-Z0-9]', '', 'g')) || '_' || left(r.id::text, 4))
    on conflict (id) do nothing;
    insert into org_membership (person_id, organisation_id)
    select r.id, v_org where not exists (select 1 from org_membership where person_id = r.id and organisation_id = v_org);
    insert into role_assignment (person_id, organisation_id, rolle)
    select r.id, v_org, 'learner'
    where not exists (select 1 from role_assignment where person_id = r.id and organisation_id = v_org and rolle = 'learner');

    insert into enrolment (id, organisation_id, learner_id, cohort_id, status)
    values (v_einschr, v_org, r.id, v_kohorte, 'aktiv');

    -- Eigene Praxistage an denselben Tagen wie beim Vorbild
    create temp table if not exists praxis_kopie (alt uuid, neu uuid, eintrag uuid) on commit drop;
    delete from praxis_kopie;
    insert into praxis_kopie (alt, neu, eintrag)
    select fj.id, gen_random_uuid(), gen_random_uuid()
    from schedule_entry s join field_job fj on fj.id = s.field_job_id
    where s.enrolment_id = v_vorbild_einschr and s.art = 'feld';

    insert into field_job (id, organisation_id, datum, field_job_type_id, learner_id, status, durchgefuehrt_bestaetigt_am, ergebnis)
    select k.neu, fj.organisation_id, fj.datum, fj.field_job_type_id, r.id, fj.status, fj.durchgefuehrt_bestaetigt_am, fj.ergebnis
    from praxis_kopie k join field_job fj on fj.id = k.alt;

    insert into schedule_entry (id, organisation_id, datum, art, reihenfolge, enrolment_id, field_job_id)
    select k.eintrag, s.organisation_id, s.datum, 'feld', s.reihenfolge, v_einschr, k.neu
    from praxis_kopie k join schedule_entry s on s.field_job_id = k.alt;

    -- Fortschritt wie beim Vorbild
    insert into unit_progress (organisation_id, learner_id, lesson_id, status, abgeschlossen_am)
    select up.organisation_id, r.id, up.lesson_id, up.status, up.abgeschlossen_am
    from unit_progress up where up.learner_id = v_vorbild
    on conflict (learner_id, lesson_id) do nothing;

    insert into attendance (organisation_id, learner_id, live_session_id, status, bestaetigt_von)
    select a.organisation_id, r.id, a.live_session_id, a.status, a.bestaetigt_von
    from attendance a where a.learner_id = v_vorbild
    on conflict (learner_id, live_session_id) do nothing;

    v_anzahl := v_anzahl + 1;
    v_liste := v_liste || case when v_liste = '' then '' else ', ' end || r.email || ' (' || v_name || ')';
  end loop;

  if p_probelauf then
    raise exception 'PROBELAUF ok, nichts gespeichert. % Konto/Konten würden in "%" eingeschrieben: %. Zum Speichern p_probelauf := false setzen.',
      v_anzahl, p_kohorte, case when v_anzahl = 0 then '(keine gefunden -- sind die Konten eingeladen und enden auf +demo@climatejobsacademy.com?)' else v_liste end;
  end if;
end $$;

-- Nach dem echten Lauf: alle Konten in der Demo-Kohorte
select p.email, p.name, e.status
from enrolment e join cohort c on c.id = e.cohort_id join person p on p.id = e.learner_id
where c.name = 'DEMO Rim'
order by p.email;
