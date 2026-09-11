-- 0010_content_status_and_lesson_resource.sql
-- Team-Entscheidungen vom 2026-09-11 (siehe docs/open-questions.md,
-- Q-PUBLISHED und Q-LESSON-INHALT; docs/data-model.md Group 2/3, Stand
-- 2026-09-11).

-- ============================================================
-- Veröffentlichungsstatus: programme, module, course, lesson, field_job_type
-- bekommen alle ein binäres status-Feld. Default 'unpublished' — Content muss
-- explizit veröffentlicht werden, bevor Learner ihn sehen (0012_rls_updates
-- filtert Learner-Reads darauf).
--
-- competency/competency_step bekommen bewusst KEIN eigenes Status-Feld
-- (data-model.md, Group 2, Entscheidung 2026-09-11: Sichtbarkeit läuft
-- ausschließlich über content_competency_mapping, ein eigener
-- Veröffentlichungsstatus wäre redundant).
-- ============================================================
alter table programme
  add column status text not null default 'unpublished' check (status in ('published', 'unpublished'));

alter table module
  add column status text not null default 'unpublished' check (status in ('published', 'unpublished'));

alter table course
  add column status text not null default 'unpublished' check (status in ('published', 'unpublished'));

alter table lesson
  add column status text not null default 'unpublished' check (status in ('published', 'unpublished'));

alter table field_job_type
  add column status text not null default 'unpublished' check (status in ('published', 'unpublished'));

comment on column programme.status is 'Entschieden 2026-09-11: published/unpublished, Learner sehen nur published.';
comment on column module.status is 'Entschieden 2026-09-11: published/unpublished, Learner sehen nur published.';
comment on column course.status is 'Entschieden 2026-09-11: published/unpublished, Learner sehen nur published.';
comment on column lesson.status is 'Entschieden 2026-09-11: published/unpublished, Learner sehen nur published.';
comment on column field_job_type.status is 'Entschieden 2026-09-11: published/unpublished, Learner sehen nur published.';

-- ============================================================
-- lesson_resource
-- Entschieden 2026-09-11 (löst Q-LESSON-INHALT): Repository-Lektionen können
-- mehrere, gemischt-typige Datei-/Link-Verweise haben — deshalb eigene,
-- normalisierte Entity statt eines einzelnen `inhalt`-Attributs.
-- `lesson.inhalt` bleibt bestehen, ist für content_type=repository ab jetzt
-- aber einfach ungenutzt (nur noch für scorm relevant).
-- Owner: AfCJ (wie lesson) -> kein organisation_id.
-- ============================================================
create table lesson_resource (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  lesson_id uuid not null references lesson (id) on delete cascade,
  reihenfolge integer not null,
  typ text not null check (typ in ('datei', 'link')),
  file_asset_id uuid references file_asset (id),
  external_url text,

  constraint lesson_resource_typ_matches_reference check (
    (typ = 'datei' and file_asset_id is not null and external_url is null)
    or (typ = 'link' and external_url is not null and file_asset_id is null)
  )
);

create trigger set_updated_at before update on lesson_resource
  for each row execute function set_updated_at();

comment on table lesson_resource is
  'Ein einzelner Datei- oder Link-Verweis an einer Repository-Lektion. Eine '
  'Lektion hat mindestens einen, oft mehrere, gemischt-typige Verweise '
  '(Entschieden 2026-09-11).';
