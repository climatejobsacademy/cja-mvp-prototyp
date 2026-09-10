-- 0002_tenancy_and_people.sql
-- Group 1 — Tenancy and people (docs/data-model.md)
-- Wer existiert und wem gehört er — die Basis für alle Zugriffsregeln.

-- ============================================================
-- organisation
-- Owner: — (Tenancy-Anker). Kein organisation_id auf sich selbst.
-- ============================================================
create table organisation (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  name text not null,
  typ text not null check (typ in ('afcj', 'employer')),
  status text not null default 'aktiv' check (status in ('aktiv', 'trial', 'pausiert'))
);

create trigger set_updated_at before update on organisation
  for each row execute function set_updated_at();

comment on table organisation is
  'Ein Betrieb oder AfCJ selbst, als Mandant. Prototyp: genau zwei Zeilen (AfCJ, Energiehelden), beide status=aktiv.';

-- ============================================================
-- person
-- Owner: Person (kein organisation_id — Zugehörigkeit läuft über org_membership).
-- id = auth.users.id, damit RLS "eigene Person" über auth.uid() prüfen kann.
-- ============================================================
create table person (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  email text not null unique,
  name text not null,
  username text not null unique,
  geburtsdatum date,
  geschlecht text, -- kein Statusfeld i.S.d. Übersetzungsregeln, daher bewusst Freitext/nullable
                    -- siehe docs/open-questions.md: feste Werteliste hier nicht spezifiziert
  vorerfahrung text,
  sprache text not null default 'DE' check (sprache in ('DE', 'UK'))
);

create trigger set_updated_at before update on person
  for each row execute function set_updated_at();

comment on table person is
  'Eine individuelle Nutzer:in mit Login-Profil. id ist 1:1 an auth.users gekoppelt.';

-- ============================================================
-- org_membership
-- "Diese Person gehört zu dieser Organisation" (reine Zugehörigkeit, keine Rolle).
-- Owner: Employer (bzw. AfCJ) -> trägt organisation_id.
-- ============================================================
create table org_membership (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  person_id uuid not null references person (id) on delete cascade,
  organisation_id uuid not null references organisation (id) on delete cascade,
  aktiv_seit date not null default current_date,

  unique (person_id, organisation_id)
);

create trigger set_updated_at before update on org_membership
  for each row execute function set_updated_at();

comment on table org_membership is
  '"Diese Person gehört zu dieser Organisation." Bewusst getrennt von role_assignment (Entscheidung 2026-09-04).';

-- ============================================================
-- role_assignment
-- "Diese Person hat diese Rolle innerhalb dieser Organisation."
-- Owner: Employer (bzw. AfCJ) -> trägt organisation_id.
-- Prototyp: nur zwei Rollen-Werte (Learner, AfCJ admin) — Instructor/Trainer/Manager
-- existieren noch nicht als eigene Personen (siehe docs/access-matrix.md, Rollen-Kurzreferenz).
-- ============================================================
create table role_assignment (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  person_id uuid not null references person (id) on delete cascade,
  organisation_id uuid not null references organisation (id) on delete cascade,
  rolle text not null check (rolle in ('learner', 'afcj_admin')),
  aktiv_seit date not null default current_date,

  unique (person_id, organisation_id, rolle)
);

create trigger set_updated_at before update on role_assignment
  for each row execute function set_updated_at();

comment on table role_assignment is
  'Rolle einer Person in einer Organisation. Prototyp-Werteliste: learner, afcj_admin (siehe docs/open-questions.md für MVP-Erweiterung).';
