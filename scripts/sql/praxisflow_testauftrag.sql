-- scripts/sql/praxisflow_testauftrag.sql
-- Legt auf STAGING einen neuen Praxisauftrag im geführten Praxisflow an
-- (SR-64), zum Durchklicken. Nie auf Production.
--
-- Was entsteht:
--   - einmalig ein unveröffentlichtes Programm „Test Praxisflow“ (TEST-PF)
--     und daran der Aufgabentyp „Test Praxisflow (geführt)“ (ablauf
--     gefuehrt). Weil keine Kohorte dieses Programm hat, erscheint der Typ
--     in keinem Reiter Programm;
--     seit 0068 laufen ohnehin alle Aufgabentypen im geführten Ablauf;
--   - je Aufruf ein neuer Praxisauftrag für die einzige aktive Person der
--     Kohorte :kohorte, heute (Berlin), mit Trainer:in, plus Eintrag im
--     Stundenplan. Für einen neuen Testlauf das Skript erneut ausführen,
--     statt einen alten Auftrag zurückzusetzen (ein Abschluss legt eine
--     Verifizierung an, die nicht gelöscht wird).
--
-- Das Codewort setzt die Produkt-Lead selbst im SQL Editor (siehe unten),
-- es steht nie im Repo.
--
-- Probelauf (Standard): psql ... -v kohorte='Test-Kohorte (Dev)' -v probelauf=true -f …
-- Echter Lauf nur mit Freigabe:      -v probelauf=false
-- Ausgaben ohne Personendaten (nur Anzahlen und ids der neuen Zeilen).

begin;

-- psql-Variablen an den DO-Block weitergeben (PGOPTIONS greift über den Pooler nicht).
select set_config('praxis.kohorte', :'kohorte', true), set_config('praxis.probelauf', :'probelauf', true);

do $$
declare
  v_kohorte text := current_setting('praxis.kohorte');
  v_probelauf boolean := current_setting('praxis.probelauf')::boolean;
  v_enrolment record;
  v_anzahl int;
  v_trainer uuid;
  v_typ uuid;
  v_programm uuid;
  v_job uuid;
  v_heute date := (now() at time zone 'Europe/Berlin')::date;
begin
  select count(*) into v_anzahl
  from enrolment e join cohort c on c.id = e.cohort_id
  where c.name = v_kohorte and e.status = 'aktiv';
  if v_anzahl <> 1 then
    raise exception 'Erwartet genau eine aktive Person in der Kohorte, gefunden: %', v_anzahl;
  end if;
  select e.* into v_enrolment
  from enrolment e join cohort c on c.id = e.cohort_id
  where c.name = v_kohorte and e.status = 'aktiv';

  -- Trainer:in: erste Person mit Rolle trainer (Testkonten des Teams).
  select r.person_id into v_trainer
  from role_assignment r join person p on p.id = r.person_id
  where r.rolle = 'trainer' and p.email ilike '%@climatejobsacademy.com'
  order by p.created_at, p.id limit 1;
  if v_trainer is null then
    raise exception 'Keine Trainer:in mit Testkonto gefunden';
  end if;

  select id into v_programm from programme where kuerzel = 'TEST-PF';
  if v_programm is null then
    insert into programme (name, kuerzel, status) values ('Test Praxisflow', 'TEST-PF', 'unpublished')
    returning id into v_programm;
  end if;

  select id into v_typ from field_job_type where titel = 'Test Praxisflow (geführt)';
  if v_typ is null then
    insert into field_job_type (titel, programme_id, reihenfolge, status, ablauf, beschreibung)
    values ('Test Praxisflow (geführt)', v_programm, 999, 'published', 'gefuehrt',
            'Nur zum Testen des Praxisflows auf Staging.')
    returning id into v_typ;
    raise notice 'Aufgabentyp angelegt: %', v_typ;
  else
    raise notice 'Aufgabentyp vorhanden: %', v_typ;
  end if;

  insert into field_job (organisation_id, datum, field_job_type_id, learner_id, instructor_id)
  values (v_enrolment.organisation_id, v_heute, v_typ, v_enrolment.learner_id, v_trainer)
  returning id into v_job;

  insert into schedule_entry (organisation_id, datum, art, reihenfolge, enrolment_id, field_job_id)
  values (v_enrolment.organisation_id, v_heute, 'feld', 90, v_enrolment.id, v_job);

  raise notice 'Praxisauftrag angelegt: % (Datum %), Codewort für die Kohorte gesetzt: %',
    v_job, v_heute,
    exists (select 1 from praxis_codewort pc where pc.cohort_id = v_enrolment.cohort_id);

  if v_probelauf then
    raise exception 'PROBELAUF: alles wird zurückgerollt. Für den echten Lauf -v probelauf=false.';
  end if;
end;
$$;

commit;

-- Codewort setzen (Produkt-Lead, Supabase-Dashboard → SQL Editor, Staging).
-- Der dokumentierte Weg ist fn_praxis_codewort_setzen (nur AfCJ admin,
-- access-matrix.md); im SQL Editor gibt es keine angemeldete Person, deshalb
-- hier direkt, mit derselben Hash-Form wie die Funktion:
--   insert into praxis_codewort (cohort_id, hash)
--   select c.id, extensions.crypt(lower(btrim('HIER_CODEWORT')), extensions.gen_salt('bf'))
--   from cohort c where c.name = 'Test-Kohorte (Dev)'
--   on conflict (cohort_id) do update set hash = excluded.hash;
