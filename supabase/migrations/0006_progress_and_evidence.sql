-- 0006_progress_and_evidence.sql
-- Group 4 — Progress and evidence (docs/data-model.md)
-- Was ein Learner getan hat und was das belegt.

-- ============================================================
-- unit_progress
-- Owner: Employer -> organisation_id.
-- ============================================================
create table unit_progress (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  organisation_id uuid not null references organisation (id) on delete cascade,
  learner_id uuid not null references person (id) on delete cascade,
  lesson_id uuid not null references lesson (id) on delete cascade,
  status text not null default 'offen' check (status in ('offen', 'in Bearbeitung', 'abgeschlossen')),
  abgeschlossen_am timestamptz,

  unique (learner_id, lesson_id)
);

create trigger set_updated_at before update on unit_progress
  for each row execute function set_updated_at();

comment on table unit_progress is 'Fortschritt einer Person in einer Lektion.';

-- ============================================================
-- attendance
-- Owner: Employer -> organisation_id.
-- status: Werteliste nicht spezifiziert -> Annahme, siehe docs/open-questions.md
-- (Q-ATTENDANCE-STATUS).
-- ============================================================
create table attendance (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  organisation_id uuid not null references organisation (id) on delete cascade,
  learner_id uuid not null references person (id) on delete cascade,
  live_session_id uuid not null references live_session (id) on delete cascade,
  status text not null default 'anwesend' check (status in ('anwesend', 'abwesend', 'entschuldigt')),
  bestaetigt_von uuid references person (id),

  unique (learner_id, live_session_id)
);

create trigger set_updated_at before update on attendance
  for each row execute function set_updated_at();

comment on table attendance is 'Bestätigte Teilnahme an einer Live-Session.';

-- ============================================================
-- field_capture
-- Owner: Employer -> organisation_id.
-- Media-Felder sind laut data-model.md "schema-bereit, inaktiv" -> als jsonb
-- Platzhalter modelliert statt fester Spalten, um im Prototyp nichts zu
-- suggerieren, das noch nicht funktioniert.
--
-- WICHTIG (docs/access-matrix.md): Status/Ergebnis vs. Rohinhalt (text/media)
-- haben unterschiedliche Schreibrechte für dieselbe Zeile (Learner darf Rohinhalt
-- schreiben, aber nicht status; AfCJ admin darf gar nichts hier schreiben, nur
-- über `verification`). Postgres-RLS ist zeilenbasiert, keine Spalten-Policies ->
-- umgesetzt über GRANT/REVOKE auf Spaltenebene in 0009_rls_policies.sql.
-- ============================================================
create table field_capture (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  organisation_id uuid not null references organisation (id) on delete cascade,
  learner_id uuid not null references person (id) on delete cascade,
  field_job_id uuid not null references field_job (id) on delete cascade,
  text text,
  media jsonb, -- schema-bereit, inaktiv (data-model.md Group 4)
  status text not null default 'submitted' check (status in ('submitted', 'verified', 'rejected')),
  eingereicht_am timestamptz not null default now()
);

create trigger set_updated_at before update on field_capture
  for each row execute function set_updated_at();

comment on table field_capture is
  'Eine Selbstauskunft zu einem oder mehreren praktischen Teilschritten.';

-- ============================================================
-- field_capture_step_mapping
-- N:M: welche Teilschritte deckt diese Selbstauskunft ab.
-- Owner: Employer -> organisation_id (übernimmt den Wert von field_capture).
-- ============================================================
create table field_capture_step_mapping (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  organisation_id uuid not null references organisation (id) on delete cascade,
  field_capture_id uuid not null references field_capture (id) on delete cascade,
  competency_step_id uuid not null references competency_step (id) on delete cascade,

  unique (field_capture_id, competency_step_id)
);

create trigger set_updated_at before update on field_capture_step_mapping
  for each row execute function set_updated_at();

comment on table field_capture_step_mapping is
  'N:M: welche (praktischen) Teilschritte deckt diese Selbstauskunft ab.';

-- ============================================================
-- verification
-- Owner: Employer -> organisation_id.
-- ============================================================
create table verification (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  organisation_id uuid not null references organisation (id) on delete cascade,
  field_capture_id uuid not null references field_capture (id) on delete cascade,
  verifiziert_von uuid not null references person (id),
  entscheidung text not null check (entscheidung in ('verified', 'rejected')),
  verifiziert_am timestamptz not null default now(),
  kommentar text
);

create trigger set_updated_at before update on verification
  for each row execute function set_updated_at();

comment on table verification is 'Admin-Entscheidung über eine Selbstauskunft.';

-- ============================================================
-- competency_evidence
-- Entscheidung 2026-09-04 / SR-01: berechnete View, KEINE Tabelle, kein Write für
-- irgendeine Rolle. Entsteht ausschließlich aus abgeschlossenem unit_progress und
-- bestätigter verification.
--
-- security_invoker = true: die View selbst trägt keine eigenen RLS-Policies,
-- sondern erbt sie von unit_progress/verification/field_capture/
-- field_capture_step_mapping. Das bildet "read Own (Learner) / read All (AfCJ
-- admin) / write — (alle)" exakt ab, ohne Zugriffslogik zu duplizieren.
-- ============================================================
create view competency_evidence
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
  from verification v
  join field_capture fc on fc.id = v.field_capture_id
  join field_capture_step_mapping fcsm on fcsm.field_capture_id = fc.id
  where v.entscheidung = 'verified';

comment on view competency_evidence is
  '"Diese Person hat diesen Teilschritt erfüllt, belegt durch diese Quelle." '
  'Berechnete View (SR-01), kein Write für irgendeine Rolle. Zugriff wird durch '
  'security_invoker von den Basistabellen geerbt.';
