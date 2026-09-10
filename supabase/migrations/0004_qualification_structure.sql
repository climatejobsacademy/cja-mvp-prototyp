-- 0004_qualification_structure.sql
-- Group 2 — Qualification structure (docs/data-model.md)
-- Das Curriculum, einmal definiert, gemeinsam genutzt von allen Betrieben.
-- Owner aller Tabellen hier: AfCJ -> kein organisation_id (read All für jede Rolle,
-- siehe docs/access-matrix.md "Qualification structure").
--
-- target_group ist "Nein — Later" (data-model.md Group 2) und wird bewusst NICHT gebaut.

-- ============================================================
-- programme
-- ============================================================
create table programme (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  name text not null,
  kuerzel text not null unique, -- z. B. TQ-EGT, EFK-EE, EFKffT
  beschreibung text
);

create trigger set_updated_at before update on programme
  for each row execute function set_updated_at();

comment on table programme is
  'Ein Qualifikationsprogramm (TQ-EGT, EFK-EE, EFKffT). Prototyp: nur EFK-EE befüllt.';

-- ============================================================
-- module
-- ============================================================
create table module (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  programme_id uuid not null references programme (id) on delete cascade,
  name text not null,
  reihenfolge integer not null
);

create trigger set_updated_at before update on module
  for each row execute function set_updated_at();

comment on table module is 'Ein Abschnitt eines Programms.';

-- ============================================================
-- course
-- Entscheidung 2026-09-09: Modul-Ebene ist optional. Genau eines von
-- module_id/programme_id ist gesetzt, nie beide, nie keins.
-- ============================================================
create table course (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  module_id uuid references module (id) on delete cascade,
  programme_id uuid references programme (id) on delete cascade,
  name text not null,
  typ text not null check (typ in ('synchron', 'asynchron')),
  reihenfolge integer not null,

  constraint course_hangs_off_module_xor_programme check (
    (module_id is not null and programme_id is null)
    or (module_id is null and programme_id is not null)
  )
);

create trigger set_updated_at before update on course
  for each row execute function set_updated_at();

comment on table course is
  'Ein Kurs. Hängt an genau einem von module_id/programme_id (Entscheidung 2026-09-09).';

-- ============================================================
-- lesson
-- Entscheidung 2026-09-09: content_type in {scorm, live, repository}.
-- Bei live liegen Datum/Join-Link an live_session (Group 3), nicht hier.
--
-- `inhalt` ist absichtlich jsonb, weil sein Inhalt je nach content_type variiert
-- (SCORM-Paket-Referenz / leer / mehrere Datei-Link-Referenzen bei repository) —
-- siehe docs/open-questions.md (Q-LESSON-INHALT) zur genauen Struktur.
-- ============================================================
create table lesson (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  course_id uuid not null references course (id) on delete cascade,
  name text not null,
  content_type text not null check (content_type in ('scorm', 'live', 'repository')),
  inhalt jsonb,
  reihenfolge integer not null
);

create trigger set_updated_at before update on lesson
  for each row execute function set_updated_at();

comment on table lesson is
  'Kleinste Content-Einheit innerhalb eines Kurses. '
  'Regel für die KI (data-model.md 2026-09-09): mindestens ein competency_step pro Lektion '
  'über content_competency_mapping ist Pflicht — wird hier nicht als DB-Constraint erzwungen '
  '(Henne-Ei-Problem beim Anlegen), sondern muss beim Import/Editor-Flow geprüft werden.';

-- ============================================================
-- competency
-- ============================================================
create table competency (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  name text not null,
  kompetenzbereich text not null,
  quelle text not null check (quelle in ('TQ-ARP', 'EFKffT', 'EFK-EE'))
);

create trigger set_updated_at before update on competency
  for each row execute function set_updated_at();

comment on table competency is 'Eine Kompetenz aus der Kompetenzmatrix.';

-- ============================================================
-- competency_step
-- nachweistyp "aktuell nur binär" -> feste Werteliste mit einem erlaubten Wert,
-- schema-bereit für spätere Erweiterung.
-- ============================================================
create table competency_step (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  competency_id uuid not null references competency (id) on delete cascade,
  name text not null,
  typ text not null check (typ in ('theoretisch', 'praktisch')),
  nachweistyp text not null default 'binär' check (nachweistyp in ('binär'))
);

create trigger set_updated_at before update on competency_step
  for each row execute function set_updated_at();

comment on table competency_step is
  'Ein Teilschritt, kleinster Nachweisbaustein einer Kompetenz.';

-- ============================================================
-- content_competency_mapping
-- N:M: welche Lektion zahlt auf welchen *theoretischen* Teilschritt ein.
-- ============================================================
create table content_competency_mapping (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  lesson_id uuid not null references lesson (id) on delete cascade,
  competency_step_id uuid not null references competency_step (id) on delete cascade,

  unique (lesson_id, competency_step_id)
);

create trigger set_updated_at before update on content_competency_mapping
  for each row execute function set_updated_at();

comment on table content_competency_mapping is
  'N:M Lektion <-> theoretischer Teilschritt. Praktische Teilschritte laufen stattdessen '
  'über field_capture_step_mapping (Group 4).';
