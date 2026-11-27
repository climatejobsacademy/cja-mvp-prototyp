-- 0074_fachsprache_erledigt.sql
-- SR-84 (Acceptance Check ergänzt 27.11.2026): Wer eine Fachsprache-Einheit
-- bis zum Ende durcharbeitet, ist als „erledigt“ gespeichert, einmal je
-- Person und Einheit, mit Zeitpunkt. Stundenplan und Home zeigen dann auf
-- allen Geräten einen Haken (Warm-up).
--
-- - Tabelle fachsprache_erledigt, employer-owned (organisation_id).
-- - Lernende lesen nur die eigenen Zeilen. Schreiben nur über
--   fn_fachsprache_erledigt_setzen (security definer): nur für die eigene
--   Person und nur für Einheiten, die sie lesen darf (veröffentlicht und
--   Lektion lesbar, wie die Policy fachsprache_einheit_lesen). Ein zweiter
--   Aufruf ändert nichts. Kein Update, kein Delete für Lernende.
-- - Trainer:innen sehen nichts. AfCJ admin liest und schreibt alles.
-- - Erzeugt weder unit_progress noch competency_evidence (CLAUDE.md Regel 6).
-- - Löschweg: on delete cascade an person und fachsprache_einheit.

create table fachsprache_erledigt (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  organisation_id uuid not null references organisation (id) on delete cascade,
  learner_id uuid not null references person (id) on delete cascade,
  einheit_id uuid not null references fachsprache_einheit (id) on delete cascade,
  erledigt_am timestamptz not null default now(),

  unique (learner_id, einheit_id)
);

comment on table fachsprache_erledigt is
  'SR-84: Fachsprache-Einheit von einer Person bis zum Ende durchgearbeitet. Kein Lektionsabschluss, kein Nachweis.';

create index fachsprache_erledigt_einheit_idx on fachsprache_erledigt (einheit_id);

create trigger set_updated_at before update on fachsprache_erledigt
  for each row execute function set_updated_at();

alter table fachsprache_erledigt enable row level security;
revoke all on fachsprache_erledigt from public, anon, authenticated;
grant select on fachsprache_erledigt to authenticated;
grant insert, update, delete on fachsprache_erledigt to authenticated;

-- Lernende: nur eigene Zeilen lesen. Schreiben läuft über die Funktion.
create policy fachsprache_erledigt_learner_select on fachsprache_erledigt
  for select to authenticated
  using (learner_id = auth.uid());

create policy fachsprache_erledigt_admin_all on fachsprache_erledigt
  for all to authenticated
  using (fn_is_afcj_admin())
  with check (fn_is_afcj_admin());

-- Einheit für die angemeldete Person als erledigt speichern. Gibt true
-- zurück, wenn eine neue Zeile entstand, false bei Wiederholung.
create or replace function fn_fachsprache_erledigt_setzen(p_einheit uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lesson uuid;
  v_org uuid;
  v_neu int;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet' using errcode = '42501';
  end if;

  select e.lesson_id into v_lesson
  from fachsprache_einheit e
  where e.id = p_einheit and e.status = 'veroeffentlicht';
  if v_lesson is null or not fn_kann_lektion_lesen(v_lesson) then
    raise exception 'Einheit nicht gefunden' using errcode = 'P0002';
  end if;

  -- Organisation der Einschreibung, über die die Person die Lektion liest
  -- (dieselbe Regel wie fn_kann_lektion_lesen); aktive vor abgeschlossenen.
  select e.organisation_id into v_org
  from lesson l
  join course c on c.id = l.course_id
  left join module m on m.id = c.module_id
  join cohort co on co.programme_id = coalesce(c.programme_id, m.programme_id)
  join enrolment e on e.cohort_id = co.id
  where l.id = v_lesson
    and e.learner_id = auth.uid()
    and e.status in ('aktiv', 'abgeschlossen')
  order by (e.status = 'aktiv') desc, e.created_at
  limit 1;

  insert into fachsprache_erledigt (organisation_id, learner_id, einheit_id)
  values (v_org, auth.uid(), p_einheit)
  on conflict (learner_id, einheit_id) do nothing;
  get diagnostics v_neu = row_count;
  return v_neu > 0;
end;
$$;

comment on function fn_fachsprache_erledigt_setzen(uuid) is
  'SR-84: Fachsprache-Einheit für die angemeldete Person als erledigt speichern (nur lesbare, veröffentlichte Einheiten; idempotent).';

revoke execute on function fn_fachsprache_erledigt_setzen(uuid) from public, anon;
grant execute on function fn_fachsprache_erledigt_setzen(uuid) to authenticated;
