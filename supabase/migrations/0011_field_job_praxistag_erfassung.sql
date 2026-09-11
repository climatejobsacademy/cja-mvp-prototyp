-- 0011_field_job_praxistag_erfassung.sql
-- Team-Entscheidungen vom 2026-09-11 zur Praxistag-Erfassung (siehe
-- docs/open-questions.md, Q-FIELD-JOB-LEARNER-CONFIRM, Q-ENROLMENT-STATUS/
-- Q-ATTENDANCE-STATUS, Q-PERSON-GESCHLECHT; docs/data-model.md Group 1/3/4,
-- Stand 2026-09-11).

-- ============================================================
-- field_job: ergebnis + problem_beschreibung
-- Entschieden 2026-09-11: Lernende bestätigen einen Einsatz explizit als
-- "erledigt" oder melden ein "Problem" mit Freitext, bevor die
-- Abschluss-Fragen kommen. `status` (geplant/durchgeführt) bleibt bestehen,
-- wird aber ab jetzt NICHT mehr direkt vom Learner geschrieben (siehe RLS in
-- 0012), sondern per Trigger aus `durchgefuehrt_bestaetigt_am` abgeleitet —
-- damit die in access-matrix.md exakt benannten drei Learner-Schreibfelder
-- (durchgeführt_bestätigt_am, ergebnis, problem_beschreibung) tatsächlich
-- ausreichen, ohne dass `status` dauerhaft auf "geplant" hängen bleibt.
-- ============================================================
alter table field_job
  add column ergebnis text check (ergebnis in ('erledigt', 'problem')),
  add column problem_beschreibung text;

alter table field_job
  add constraint field_job_problem_beschreibung_only_if_problem
    check (problem_beschreibung is null or ergebnis = 'problem');

comment on column field_job.ergebnis is 'Entschieden 2026-09-11: erledigt/problem, vom Learner selbst gesetzt.';
comment on column field_job.problem_beschreibung is 'Freitext, nur gesetzt wenn ergebnis = problem (Entschieden 2026-09-11).';

create or replace function fn_derive_field_job_status()
returns trigger
language plpgsql
as $$
begin
  if new.durchgefuehrt_bestaetigt_am is not null then
    new.status := 'durchgeführt';
  end if;
  return new;
end;
$$;

comment on function fn_derive_field_job_status() is
  'Setzt field_job.status auf durchgeführt, sobald durchgefuehrt_bestaetigt_am '
  'gesetzt wird — nötig, weil Learner laut access-matrix.md (2026-09-11) genau '
  'drei Felder schreiben darf (durchgeführt_bestätigt_am, ergebnis, '
  'problem_beschreibung), status selbst aber nicht. Läuft als einfacher '
  '(nicht security definer) BEFORE-Trigger auf derselben Zeile — Spalten-Grants '
  'gelten nur für das, was der Client explizit in der UPDATE-Spaltenliste '
  'schreibt, nicht für das, was ein Trigger auf NEW zusätzlich setzt.';

create trigger derive_field_job_status
  before update on field_job
  for each row execute function fn_derive_field_job_status();

-- ============================================================
-- attendance.status: Entschieden 2026-09-11 — zwei statt drei Werte.
-- ============================================================
alter table attendance drop constraint attendance_status_check;
alter table attendance alter column status set default 'anwesend';
alter table attendance add constraint attendance_status_check
  check (status in ('anwesend', 'nicht anwesend'));

comment on column attendance.status is 'Entschieden 2026-09-11: anwesend/nicht anwesend (vorher fälschlich mit drittem Wert "entschuldigt" angenommen).';

-- ============================================================
-- person.geschlecht: Entschieden 2026-09-11 — feste Werteliste statt Freitext,
-- "keine Angabe" ist selbst einer der vier festen Werte, daher NOT NULL mit
-- diesem Wert als Default statt eines separaten NULL-Zustands.
-- ============================================================
alter table person alter column geschlecht set default 'keine Angabe';
update person set geschlecht = 'keine Angabe' where geschlecht is null;
alter table person alter column geschlecht set not null;
alter table person add constraint person_geschlecht_check
  check (geschlecht in ('männlich', 'weiblich', 'divers', 'keine Angabe'));

-- ============================================================
-- field_capture.phase
-- Entschieden 2026-09-11: pro field_job entstehen bis zu zwei field_capture-
-- Zeilen, eine je Phase (start/abschluss) — kein Default, jede Einreichung
-- muss die Phase explizit angeben.
-- ============================================================
alter table field_capture
  add column phase text not null check (phase in ('start', 'abschluss'));

alter table field_capture
  add constraint field_capture_unique_phase_per_job unique (field_job_id, phase);

comment on column field_capture.phase is 'Entschieden 2026-09-11: start/abschluss, bis zu zwei Zeilen pro field_job.';

-- ============================================================
-- field_job_type_frage
-- Entschieden 2026-09-11: vordefinierte Single-Choice-Fragen zu einem Field
-- Job Type, je Phase (start/abschluss), von AfCJ admin angelegt.
-- Owner: AfCJ (wie field_job_type) -> kein organisation_id.
-- ============================================================
create table field_job_type_frage (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  field_job_type_id uuid not null references field_job_type (id) on delete cascade,
  phase text not null check (phase in ('start', 'abschluss')),
  reihenfolge integer not null,
  frage_text text not null,
  antwortoptionen text[] not null,

  constraint field_job_type_frage_optionen_count check (
    array_length(antwortoptionen, 1) between 3 and 5
  )
);

create trigger set_updated_at before update on field_job_type_frage
  for each row execute function set_updated_at();

comment on table field_job_type_frage is
  'Eine vordefinierte Single-Choice-Frage zu einem Field Job Type, für die '
  'Phase Start oder Abschluss. Von AfCJ admin angelegt, nicht von Lernenden '
  '(Entschieden 2026-09-11).';

-- ============================================================
-- field_capture_antwort
-- Entschieden 2026-09-11: eine einzelne Single-Choice-Antwort der Lernenden
-- auf eine field_job_type_frage, Teil einer field_capture.
-- Owner: Employer (wie field_capture) -> organisation_id.
-- ============================================================
create table field_capture_antwort (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  organisation_id uuid not null references organisation (id) on delete cascade,
  field_capture_id uuid not null references field_capture (id) on delete cascade,
  field_job_type_frage_id uuid not null references field_job_type_frage (id) on delete restrict,
  gewaehlte_option text not null,

  unique (field_capture_id, field_job_type_frage_id)
);

create trigger set_updated_at before update on field_capture_antwort
  for each row execute function set_updated_at();

comment on table field_capture_antwort is
  'Eine einzelne Single-Choice-Antwort auf eine field_job_type_frage, Teil '
  'einer field_capture (Entschieden 2026-09-11).';

-- Validiert, dass gewaehlte_option tatsächlich eine der hinterlegten
-- antwortoptionen der referenzierten Frage ist. Security definer, damit die
-- Prüfung unabhängig von der (ggf. published-gefilterten) RLS auf
-- field_job_type_frage funktioniert — sie liest hier nur zu Validierungszwecken,
-- gibt nichts über den Aufrufer hinaus zurück.
create or replace function fn_validate_field_capture_antwort()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  optionen text[];
begin
  select antwortoptionen into optionen
  from field_job_type_frage
  where id = new.field_job_type_frage_id;

  if optionen is null then
    raise exception 'field_job_type_frage % existiert nicht', new.field_job_type_frage_id;
  end if;

  if not (new.gewaehlte_option = any (optionen)) then
    raise exception 'gewaehlte_option "%" ist keine der hinterlegten Antwortoptionen', new.gewaehlte_option;
  end if;

  return new;
end;
$$;

create trigger validate_field_capture_antwort
  before insert or update on field_capture_antwort
  for each row execute function fn_validate_field_capture_antwort();
