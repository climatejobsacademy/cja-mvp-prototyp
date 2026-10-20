-- 0032_trainer_anwesenheit_pruefung.sql
-- Trainer:innen bestätigen Anwesenheit (SR-81) und prüfen Praxisberichte
-- (SR-82); bestätigte Anwesenheit und Verifizierung sind unveränderlich
-- (SR-07). Entscheidungen Vera 2026-10-13 (Paket G, E1–E4):
--   E1  Trainer:innen melden sich an (Magic Link wie Lernende). Die Rolle
--       trainer aus 0030 ist damit keine reine Anzeige-Rolle mehr.
--   E2  Trainer:innen prüfen Praxisberichte (verification) ihrer Kohorte.
--   E3  Eine Trainer:in handelt für alle Termine und Praxisberichte einer
--       Kohorte, in der sie mindestens einen Termin hat
--       (live_session.trainer_id oder field_job.instructor_id) -- je Termin
--       ist nur eine Person gespeichert.
--   E4  Kein Update auf attendance und verification, für niemanden.
--       Korrektur per Storno-Eintrag: neue Zeile mit korrigiert_id auf die
--       korrigierte Zeile. Delete bleibt nur für AfCJ admin (bestehende
--       *_admin_all-Policies), bis der Löschweg (DSGVO) entschieden ist.
--
-- Lesen der aktuellen Werte über die Views attendance_aktuell und
-- verification_aktuell (Zeilen ohne spätere Korrektur). competency_evidence
-- zählt nur noch nicht korrigierte Verifizierungen.
--
-- Trainer:innen lesen Kohorte, Plan, Einschreibungen, Praxistage und
-- Praxisberichte ihrer Kohorten (Zugriffsmatrix, Spalte AfCJ trainer, Stand
-- 2026-10-13). Namen der Lernenden nur über fn_trainer_teilnehmende(), die
-- Tabelle person bleibt geschlossen. Fotos der Lernenden für Trainer:innen:
-- noch nicht (fn_darf_foto_sehen unverändert).

-- ============================================================
-- Hilfsfunktionen
-- ============================================================
create or replace function fn_ist_trainer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from role_assignment ra
    where ra.person_id = auth.uid() and ra.rolle = 'trainer'
  );
$$;

comment on function fn_ist_trainer() is
  'True, wenn die eingeloggte Person die Rolle trainer hat (0030, Anmeldung seit 0032).';

-- E3: Kohorten mit mindestens einem eigenen Termin (Live-Termin oder Praxistag).
create or replace function fn_trainer_kohorten_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select k.cohort_id
  from (
    select se.cohort_id
      from live_session ls
      join schedule_entry se on se.live_session_id = ls.id
     where ls.trainer_id = auth.uid() and se.cohort_id is not null
    union
    select e.cohort_id
      from live_session ls
      join schedule_entry se on se.live_session_id = ls.id
      join enrolment e on e.id = se.enrolment_id
     where ls.trainer_id = auth.uid()
    union
    select e.cohort_id
      from field_job fj
      join schedule_entry se on se.field_job_id = fj.id
      join enrolment e on e.id = se.enrolment_id
     where fj.instructor_id = auth.uid()
  ) k
  where fn_ist_trainer();
$$;

comment on function fn_trainer_kohorten_ids() is
  'Kohorten, in denen die eingeloggte Trainer:in mindestens einen Termin hat '
  '(live_session.trainer_id oder field_job.instructor_id). Entscheidung E3, 2026-10-13.';

-- Einschreibungen in den eigenen Kohorten
create or replace function fn_trainer_enrolment_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.id from enrolment e where e.cohort_id in (select fn_trainer_kohorten_ids());
$$;

-- Live-Termin gehört zu einer eigenen Kohorte (kohortenweit oder je Einschreibung)
create or replace function fn_trainer_darf_session(p_live_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from schedule_entry se
    where se.live_session_id = p_live_session_id
      and (se.cohort_id in (select fn_trainer_kohorten_ids())
           or se.enrolment_id in (select fn_trainer_enrolment_ids()))
  );
$$;

-- Anwesenheit eintragen: Lernende:r ist in einer eigenen Kohorte eingeschrieben,
-- der Termin steht im Plan dieser Kohorte bzw. Einschreibung, organisation_id
-- ist die der Einschreibung.
create or replace function fn_trainer_darf_anwesenheit(p_learner_id uuid, p_live_session_id uuid, p_organisation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from enrolment e
      join schedule_entry se on se.live_session_id = p_live_session_id
                            and (se.cohort_id = e.cohort_id or se.enrolment_id = e.id)
     where e.learner_id = p_learner_id
       and e.organisation_id = p_organisation_id
       and e.cohort_id in (select fn_trainer_kohorten_ids())
  );
$$;

-- Praxisbericht gehört zu Lernenden einer eigenen Kohorte (über den Praxistag im Plan)
create or replace function fn_trainer_darf_capture(p_field_capture_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from field_capture fc
      join schedule_entry se on se.field_job_id = fc.field_job_id
     where fc.id = p_field_capture_id
       and se.enrolment_id in (select fn_trainer_enrolment_ids())
  );
$$;

create or replace function fn_trainer_darf_field_job(p_field_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from schedule_entry se
    where se.field_job_id = p_field_job_id
      and se.enrolment_id in (select fn_trainer_enrolment_ids())
  );
$$;

-- Namen der Lernenden in den eigenen Kohorten (ohne E-Mail, Geburtsdatum),
-- analog fn_meine_trainer -- person bleibt für Trainer:innen geschlossen.
create or replace function fn_trainer_teilnehmende()
returns table (person_id uuid, cohort_id uuid, enrolment_id uuid, name text, rufname text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, e.cohort_id, e.id, p.name, p.rufname
    from enrolment e
    join person p on p.id = e.learner_id
   where e.cohort_id in (select fn_trainer_kohorten_ids())
     and e.status in ('aktiv', 'abgeschlossen');
$$;

comment on function fn_trainer_teilnehmende() is
  'Name und Rufname der Lernenden in den Kohorten der eingeloggten Trainer:in '
  '(SR-81, SR-82). Öffnet person nicht.';

revoke execute on function fn_ist_trainer(), fn_trainer_kohorten_ids(), fn_trainer_enrolment_ids(),
  fn_trainer_darf_session(uuid), fn_trainer_darf_anwesenheit(uuid, uuid, uuid),
  fn_trainer_darf_capture(uuid), fn_trainer_darf_field_job(uuid), fn_trainer_teilnehmende()
  from public, anon;
grant execute on function fn_ist_trainer(), fn_trainer_kohorten_ids(), fn_trainer_enrolment_ids(),
  fn_trainer_darf_session(uuid), fn_trainer_darf_anwesenheit(uuid, uuid, uuid),
  fn_trainer_darf_capture(uuid), fn_trainer_darf_field_job(uuid), fn_trainer_teilnehmende()
  to authenticated;

-- ============================================================
-- Lesen für Trainer:innen (read Cohort)
-- ============================================================
create policy cohort_trainer_select on cohort
  for select to authenticated
  using (id in (select fn_trainer_kohorten_ids()));

create policy enrolment_trainer_select on enrolment
  for select to authenticated
  using (cohort_id in (select fn_trainer_kohorten_ids()));

create policy schedule_entry_trainer_select on schedule_entry
  for select to authenticated
  using (cohort_id in (select fn_trainer_kohorten_ids())
         or enrolment_id in (select fn_trainer_enrolment_ids()));

create policy live_session_trainer_select on live_session
  for select to authenticated
  using (fn_trainer_darf_session(id));

create policy field_job_trainer_select on field_job
  for select to authenticated
  using (fn_trainer_darf_field_job(id));

create policy field_capture_trainer_select on field_capture
  for select to authenticated
  using (fn_trainer_darf_capture(id));

create policy field_capture_antwort_trainer_select on field_capture_antwort
  for select to authenticated
  using (fn_trainer_darf_capture(field_capture_id));

create policy field_capture_step_mapping_trainer_select on field_capture_step_mapping
  for select to authenticated
  using (fn_trainer_darf_capture(field_capture_id));

-- ============================================================
-- attendance: Zeitpunkt, Storno, Trainer:in bestätigt (SR-81)
-- ============================================================
alter table attendance
  add column bestaetigt_am timestamptz not null default now(),
  add column korrigiert_id uuid references attendance (id) on delete cascade;

update attendance set bestaetigt_am = created_at;

-- Bisher eine Zeile je Lernende:r und Termin. Mit Storno: eine Ausgangszeile
-- je Lernende:r und Termin, jede Zeile höchstens einmal korrigiert.
alter table attendance drop constraint attendance_learner_id_live_session_id_key;
create unique index attendance_ausgang_eindeutig on attendance (learner_id, live_session_id)
  where korrigiert_id is null;
alter table attendance add constraint attendance_korrektur_eindeutig unique (korrigiert_id);

comment on column attendance.bestaetigt_am is 'Zeitpunkt der Bestätigung (SR-07, SR-81).';
comment on column attendance.korrigiert_id is
  'Storno-Eintrag: diese Zeile korrigiert die angegebene (gleiche Person, gleicher Termin). '
  'Aktueller Wert: Zeile ohne spätere Korrektur, siehe attendance_aktuell (E4, 2026-10-13).';

create policy attendance_trainer_select on attendance
  for select to authenticated
  using (fn_trainer_darf_session(live_session_id));

create policy attendance_trainer_insert on attendance
  for insert to authenticated
  with check (
    bestaetigt_von = auth.uid()
    and fn_trainer_darf_anwesenheit(learner_id, live_session_id, organisation_id)
  );

-- ============================================================
-- verification: Storno, Trainer:in prüft (SR-82)
-- ============================================================
alter table verification
  add column korrigiert_id uuid references verification (id) on delete cascade,
  add constraint verification_korrektur_eindeutig unique (korrigiert_id);

comment on column verification.korrigiert_id is
  'Storno-Eintrag: diese Entscheidung ersetzt die angegebene (gleiche Selbstauskunft). '
  'Aktueller Wert: Zeile ohne spätere Korrektur, siehe verification_aktuell (E4, 2026-10-13).';

create policy verification_trainer_select on verification
  for select to authenticated
  using (fn_trainer_darf_capture(field_capture_id));

create policy verification_trainer_insert on verification
  for insert to authenticated
  with check (
    verifiziert_von = auth.uid()
    and fn_trainer_darf_capture(field_capture_id)
    and organisation_id = (select fc.organisation_id from field_capture fc where fc.id = field_capture_id)
  );

-- ============================================================
-- Storno prüfen und Unveränderlichkeit (SR-07, E4)
-- ============================================================
create or replace function fn_pruefe_korrektur()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  passt boolean;
begin
  if new.korrigiert_id is null then
    return new;
  end if;
  if tg_table_name = 'attendance' then
    select a.learner_id = new.learner_id and a.live_session_id = new.live_session_id
      into passt from attendance a where a.id = new.korrigiert_id;
  else
    select v.field_capture_id = new.field_capture_id
      into passt from verification v where v.id = new.korrigiert_id;
  end if;
  if passt is distinct from true then
    raise exception 'SR-07: Storno muss dieselbe % betreffen wie die korrigierte Zeile',
      case tg_table_name when 'attendance' then 'Person und denselben Termin' else 'Selbstauskunft' end
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger pruefe_korrektur before insert on attendance
  for each row execute function fn_pruefe_korrektur();
create trigger pruefe_korrektur before insert on verification
  for each row execute function fn_pruefe_korrektur();

create or replace function fn_unveraenderlich()
returns trigger
language plpgsql
as $$
begin
  raise exception 'SR-07: % ist nach der Bestätigung unveränderlich -- Korrektur per Storno-Eintrag (korrigiert_id)',
    tg_table_name
    using errcode = 'insufficient_privilege';
end;
$$;

comment on function fn_unveraenderlich() is
  'SR-07, E4 (2026-10-13): kein Update auf attendance und verification, auch nicht für '
  'AfCJ admin. Delete bleibt für AfCJ admin, bis der Löschweg entschieden ist.';

create trigger unveraenderlich before update on attendance
  for each row execute function fn_unveraenderlich();
create trigger unveraenderlich before update on verification
  for each row execute function fn_unveraenderlich();

-- ============================================================
-- Aktuelle Werte (ohne korrigierte Zeilen)
-- ============================================================
create view attendance_aktuell
  with (security_invoker = true)
as
  select a.*
    from attendance a
   where not exists (select 1 from attendance k where k.korrigiert_id = a.id);

create view verification_aktuell
  with (security_invoker = true)
as
  select v.*
    from verification v
   where not exists (select 1 from verification k where k.korrigiert_id = v.id);

revoke all on attendance_aktuell, verification_aktuell from public, anon, authenticated;
grant select on attendance_aktuell, verification_aktuell to authenticated;

comment on view attendance_aktuell is
  'Aktuelle Anwesenheit je Person und Termin (Zeilen ohne Storno). RLS über attendance.';
comment on view verification_aktuell is
  'Aktuelle Entscheidung je Selbstauskunft (Zeilen ohne Storno). RLS über verification.';

-- competency_evidence: korrigierte Verifizierungen zählen nicht mehr
create or replace view competency_evidence
  with (security_invoker = true)
as
  select
    up.learner_id,
    ccm.competency_step_id,
    'lesson_completion'::text as quelltyp,
    up.id as quelle_id,
    up.organisation_id,
    coalesce(up.abgeschlossen_am, up.updated_at) as erstellt_am
  from unit_progress up
  join content_competency_mapping ccm on ccm.lesson_id = up.lesson_id
  where up.status = 'abgeschlossen'
  union all
  select
    fc.learner_id,
    fcsm.competency_step_id,
    'field_verification'::text as quelltyp,
    v.id as quelle_id,
    fc.organisation_id,
    v.verifiziert_am as erstellt_am
  from verification_aktuell v
  join field_capture fc on fc.id = v.field_capture_id
  join field_capture_step_mapping fcsm on fcsm.field_capture_id = fc.id
  where v.entscheidung = 'verified';

-- ============================================================
-- Rolle trainer: Kommentar aus 0030 nachziehen (E1)
-- ============================================================
comment on table role_assignment is
  'Rolle einer Person in einer Organisation: learner, afcj_admin, trainer. Trainer:innen '
  'melden sich seit 0032 an (Magic Link), bestätigen Anwesenheit und prüfen Praxisberichte '
  'in Kohorten mit mindestens einem eigenen Termin (E1-E3, 2026-10-13).';
