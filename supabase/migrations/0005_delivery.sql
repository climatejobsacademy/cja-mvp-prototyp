-- 0005_delivery.sql
-- Group 3 — Delivery (docs/data-model.md)
-- Ein Programm, das tatsächlich für reale Menschen in Echtzeit läuft.

-- ============================================================
-- cohort
-- Owner: AfCJ -> kein organisation_id.
-- ============================================================
create table cohort (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  programme_id uuid not null references programme (id) on delete restrict,
  name text not null,
  start_datum date not null,
  end_datum date
);

create trigger set_updated_at before update on cohort
  for each row execute function set_updated_at();

comment on table cohort is 'Ein geplanter Durchlauf eines Programms.';

-- ============================================================
-- enrolment
-- Owner: Employer -> organisation_id.
-- status: Werteliste nicht in docs/access-matrix.md bzw. data-model.md spezifiziert
-- -> Annahme, siehe docs/open-questions.md (Q-ENROLMENT-STATUS).
-- ============================================================
create table enrolment (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  organisation_id uuid not null references organisation (id) on delete cascade,
  learner_id uuid not null references person (id) on delete cascade,
  cohort_id uuid not null references cohort (id) on delete restrict,
  instructor_id uuid references person (id), -- Prototyp: leer, AfCJ admin deckt ab
  status text not null default 'aktiv' check (status in ('aktiv', 'abgeschlossen', 'abgebrochen')),

  unique (learner_id, cohort_id)
);

create trigger set_updated_at before update on enrolment
  for each row execute function set_updated_at();

comment on table enrolment is 'Learner x Cohort, mit zugewiesenem Instructor (Prototyp: leer).';

-- ============================================================
-- live_session
-- Owner: AfCJ -> kein organisation_id.
-- "lesson_id/course_id": genau eines gesetzt (analog zum module/programme-Muster
-- bei course), je nachdem ob die Live-Session an einer einzelnen Lektion oder
-- direkt am Kurs hängt.
-- ============================================================
create table live_session (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  lesson_id uuid references lesson (id) on delete cascade,
  course_id uuid references course (id) on delete cascade,
  datum date not null,
  start time not null,
  ende time not null,
  join_link text,
  trainer_id uuid references person (id), -- Prototyp: leer

  constraint live_session_hangs_off_lesson_xor_course check (
    (lesson_id is not null and course_id is null)
    or (lesson_id is null and course_id is not null)
  )
);

create trigger set_updated_at before update on live_session
  for each row execute function set_updated_at();

comment on table live_session is 'Konkreter Termin eines synchronen Formats.';

-- ============================================================
-- field_job_type
-- Owner: AfCJ -> kein organisation_id.
-- kategorie ist bewusst Freitext ohne feste Taxonomie (explizite Ausnahme lt.
-- data-model.md Group 3).
-- ============================================================
create table field_job_type (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  titel text not null,
  bild_oder_icon uuid references file_asset (id),
  beschreibung text,
  kategorie text, -- bewusst freier Text, keine feste Taxonomie (data-model.md)
  vorbereitung_text text,
  vorbereitung_content_id uuid references lesson (id),
  nachbereitung_text text,
  nachbereitung_content_id uuid references lesson (id)
);

create trigger set_updated_at before update on field_job_type
  for each row execute function set_updated_at();

comment on table field_job_type is
  'Referenz: eine konkrete Übungs-/Praxisaufgabe (Prototyp: Werkstatt-Tätigkeit statt '
  'echtem Kundeneinsatz).';

-- ============================================================
-- field_job
-- Owner: Employer -> organisation_id.
-- ============================================================
create table field_job (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  organisation_id uuid not null references organisation (id) on delete cascade,
  datum date not null,
  standort text,
  field_job_type_id uuid not null references field_job_type (id) on delete restrict,
  learner_id uuid not null references person (id) on delete cascade,
  instructor_id uuid references person (id), -- Prototyp: leer
  status text not null default 'geplant' check (status in ('geplant', 'durchgeführt')),
  durchgefuehrt_bestaetigt_am timestamptz
);

create trigger set_updated_at before update on field_job
  for each row execute function set_updated_at();

comment on table field_job is
  'Der konkrete Einsatz/die konkrete Übung an einem Tag für einen Learner. '
  'durchgefuehrt_bestaetigt_am ist die Nutzer-Bestätigung "Einsatz absolviert", getrennt '
  'von der späteren field_capture-Einreichung.';

-- ============================================================
-- schedule_entry
-- Owner: Employer -> organisation_id.
-- Entscheidung 2026-09-09: entweder cohort_id (kohortenweit) oder enrolment_id
-- (Praxistage) — genau eines. `referenz` ist polymorph je nach `art`; hier als
-- vier nullable FKs modelliert (statt jsonb), damit referentielle Integrität
-- erhalten bleibt. Genau eine der vier muss gesetzt sein.
-- ============================================================
create table schedule_entry (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  organisation_id uuid not null references organisation (id) on delete cascade,
  datum date not null,
  art text not null check (art in ('live', 'asynchron', 'feld')),
  reihenfolge integer not null,

  cohort_id uuid references cohort (id) on delete cascade,
  enrolment_id uuid references enrolment (id) on delete cascade,

  course_id uuid references course (id) on delete cascade,
  lesson_id uuid references lesson (id) on delete cascade,
  live_session_id uuid references live_session (id) on delete cascade,
  field_job_id uuid references field_job (id) on delete cascade,

  constraint schedule_entry_cohort_xor_enrolment check (
    (cohort_id is not null and enrolment_id is null)
    or (cohort_id is null and enrolment_id is not null)
  ),
  constraint schedule_entry_exactly_one_referenz check (
    (case when course_id is not null then 1 else 0 end)
    + (case when lesson_id is not null then 1 else 0 end)
    + (case when live_session_id is not null then 1 else 0 end)
    + (case when field_job_id is not null then 1 else 0 end)
    = 1
  )
);

create trigger set_updated_at before update on schedule_entry
  for each row execute function set_updated_at();

comment on table schedule_entry is
  'Ein datiertes Element im Plan — kohortenweit (Live-Sessions, asynchrone Deadlines) '
  'oder pro Learner (Praxistage). Mehrere Aufgaben an einem Praxistag = mehrere '
  'Zeilen mit art=feld am selben Tag (Entscheidung 2026-09-09).';
