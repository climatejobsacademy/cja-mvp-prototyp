-- 0024_lektion_beitrag.sql
-- Fragen-Thread pro Lektion, PR A (nur Schema). SR folgt (Fragen-Thread).
--
-- Entschieden 2026-10-07 (Vera):
--   - Ein Beitrag gehört zu Lektion und Kohorte. Schreiben: Lernende mit
--     Einschreibung Status 'aktiv' in dieser Kohorte. Lesen: wer die Lektion
--     lesen darf (fn_kann_lektion_lesen, 0023) und in dieser Kohorte
--     eingeschrieben ist (aktiv/abgeschlossen), dazu Moderierende und AfCJ admin.
--   - Nur Text (inkl. Emojis), 1 bis 1000 Zeichen, kein Bearbeiten, eine
--     Antwortebene (parent_id).
--   - Löschen nur über fn_beitrag_loeschen (security definer): eigene Beiträge
--     durch die Autor:in, alle durch Moderierende/AfCJ admin. Soft-Delete:
--     text, person_id und autor_anzeigename werden geleert, geloescht_am
--     gesetzt, die Thread-Struktur bleibt.
--   - Moderation über kohorte_moderation (keine neue Rolle), Prüfung über
--     fn_moderiert_kohorte (schließt AfCJ admin ein).
--   - autor_anzeigename als Snapshot (Vorname + Initial des Nachnamens), per
--     Trigger gesetzt; keine Policy auf person geöffnet.
--   - lesson.chat_aktiv (Standard false): Threads nur an freigeschalteten
--     Lektionen sichtbar und beschreibbar (für Lernende).
--   - person_id nullable, on delete set null (Löschentscheid 14.10. offen).
--   - Moderationsprotokoll ohne Beitragstext.
--   - Beitragsinhalte werden nirgends geloggt (CLAUDE.md Regel 9): keine
--     RAISE-Meldung in dieser Migration enthält Text oder Namen.
--
-- organisation_id: cohort hat keine organisation_id (AfCJ-owned, 0005). Der
-- Beitrag übernimmt die organisation_id der Einschreibung der Autor:in
-- (Arbeitgeber), gesetzt per Trigger. Sichtbar ist der Beitrag trotzdem für
-- die ganze Kohorte, also über Arbeitgeber hinweg -- bewusste Ausnahme von
-- SR-06, siehe docs/decisions.md (2026-10-07, Fragen-Thread gehört der Kohorte).

-- ============================================================
-- lesson.chat_aktiv
-- ============================================================
alter table lesson
  add column chat_aktiv boolean not null default false;

comment on column lesson.chat_aktiv is
  'Fragen-Thread an dieser Lektion freigeschaltet (Standard aus). SR folgt (Fragen-Thread).';

-- ============================================================
-- kohorte_moderation
-- AfCJ-owned wie cohort, daher ohne organisation_id.
-- ============================================================
create table kohorte_moderation (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  cohort_id uuid not null references cohort (id) on delete cascade,
  person_id uuid not null references person (id) on delete cascade,
  created_by uuid references person (id) on delete set null default auth.uid(),

  unique (cohort_id, person_id)
);

create trigger set_updated_at before update on kohorte_moderation
  for each row execute function set_updated_at();

comment on table kohorte_moderation is
  'Personen, die die Fragen-Threads einer Kohorte moderieren (löschen) dürfen. '
  'Keine Rolle im Rollenmodell; AfCJ admin moderiert ohnehin. SR folgt (Fragen-Thread).';

-- ============================================================
-- lektion_beitrag
-- ============================================================
create table lektion_beitrag (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  organisation_id uuid not null references organisation (id) on delete cascade,
  lesson_id uuid not null references lesson (id) on delete cascade,
  cohort_id uuid not null references cohort (id) on delete cascade,
  -- Bewusst ohne on delete-Aktion: Beiträge werden nur weich gelöscht; ein
  -- harter Löschweg wird mit dem Löschentscheid (14.10.) festgelegt.
  parent_id uuid references lektion_beitrag (id),
  person_id uuid references person (id) on delete set null,
  autor_anzeigename text,
  text text,
  geloescht_am timestamptz,

  constraint lektion_beitrag_text_laenge check (
    (geloescht_am is null and text is not null and char_length(text) between 1 and 1000)
    or (geloescht_am is not null and text is null)
  ),
  constraint lektion_beitrag_geloescht_ohne_person check (
    geloescht_am is null or (person_id is null and autor_anzeigename is null)
  ),
  constraint lektion_beitrag_nicht_eigene_antwort check (parent_id is null or parent_id <> id)
);

create index lektion_beitrag_thread_idx on lektion_beitrag (lesson_id, cohort_id, created_at);
create index lektion_beitrag_parent_idx on lektion_beitrag (parent_id);
create index lektion_beitrag_person_idx on lektion_beitrag (person_id);

create trigger set_updated_at before update on lektion_beitrag
  for each row execute function set_updated_at();

comment on table lektion_beitrag is
  'Frage oder Antwort im Thread einer Lektion für eine Kohorte. Nur Text, 1-1000 '
  'Zeichen, eine Antwortebene, Soft-Delete über fn_beitrag_loeschen. SR folgt (Fragen-Thread).';
comment on column lektion_beitrag.organisation_id is
  'Arbeitgeber der Autor:in (aus ihrer Einschreibung), per Trigger gesetzt.';
comment on column lektion_beitrag.autor_anzeigename is
  'Snapshot "Vorname N." beim Schreiben, beim Löschen geleert. Kein Lesezugriff auf person nötig.';

-- ============================================================
-- moderationsprotokoll (ohne Beitragstext)
-- ============================================================
create table moderationsprotokoll (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  beitrag_id uuid not null references lektion_beitrag (id) on delete cascade,
  person_id uuid references person (id) on delete set null,
  aktion text not null check (aktion in ('geloescht_autor', 'geloescht_moderation'))
);

create trigger set_updated_at before update on moderationsprotokoll
  for each row execute function set_updated_at();

comment on table moderationsprotokoll is
  'Wer hat wann welchen Beitrag gelöscht (ohne Beitragstext). Nur über '
  'fn_beitrag_loeschen beschrieben. SR folgt (Fragen-Thread).';

-- ============================================================
-- Hilfsfunktionen (security definer, fester search_path, EXECUTE nur für
-- authenticated -- Muster 0023)
-- ============================================================

-- Programm einer Lektion (Kurs direkt am Programm oder über das Modul).
create or replace function fn_programm_von_lektion(p_lesson_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(c.programme_id, m.programme_id)
  from lesson l
  join course c on c.id = l.course_id
  left join module m on m.id = c.module_id
  where l.id = p_lesson_id;
$$;

-- Programm einer Kohorte.
create or replace function fn_programm_von_kohorte(p_cohort_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select co.programme_id from cohort co where co.id = p_cohort_id;
$$;

-- Moderiert die eingeloggte Person diese Kohorte? AfCJ admin immer.
create or replace function fn_moderiert_kohorte(p_cohort_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select fn_is_afcj_admin()
      or exists (
        select 1 from kohorte_moderation km
        where km.cohort_id = p_cohort_id and km.person_id = auth.uid()
      );
$$;

-- Darf die eingeloggte Person den Thread (Lektion x Kohorte) lesen?
-- Lernende: Lektion lesbar (fn_kann_lektion_lesen, 0023), Thread
-- freigeschaltet, eingeschrieben in genau dieser Kohorte (aktiv oder
-- abgeschlossen, wie in fn_kann_lektion_lesen). Moderierende und AfCJ admin:
-- immer, auch bei chat_aktiv = false.
create or replace function fn_kann_beitraege_lesen(p_lesson_id uuid, p_cohort_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select fn_moderiert_kohorte(p_cohort_id)
      or (
        fn_kann_lektion_lesen(p_lesson_id)
        and exists (select 1 from lesson l where l.id = p_lesson_id and l.chat_aktiv)
        and exists (
          select 1 from enrolment e
          where e.cohort_id = p_cohort_id
            and e.learner_id = auth.uid()
            and e.status in ('aktiv', 'abgeschlossen')
        )
      );
$$;

-- Darf die eingeloggte Person in den Thread schreiben? Nur Lernende mit
-- Einschreibung 'aktiv' in dieser Kohorte, Lektion lesbar und freigeschaltet,
-- Programm der Kohorte = Programm der Lektion.
create or replace function fn_kann_beitrag_schreiben(p_lesson_id uuid, p_cohort_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select fn_kann_lektion_lesen(p_lesson_id)
     and exists (select 1 from lesson l where l.id = p_lesson_id and l.chat_aktiv)
     and exists (
       select 1 from enrolment e
       where e.cohort_id = p_cohort_id
         and e.learner_id = auth.uid()
         and e.status = 'aktiv'
     )
     and fn_programm_von_kohorte(p_cohort_id) = fn_programm_von_lektion(p_lesson_id);
$$;

revoke execute on function fn_programm_von_lektion(uuid) from public, anon;
grant execute on function fn_programm_von_lektion(uuid) to authenticated;
revoke execute on function fn_programm_von_kohorte(uuid) from public, anon;
grant execute on function fn_programm_von_kohorte(uuid) to authenticated;
revoke execute on function fn_moderiert_kohorte(uuid) from public, anon;
grant execute on function fn_moderiert_kohorte(uuid) to authenticated;
revoke execute on function fn_kann_beitraege_lesen(uuid, uuid) from public, anon;
grant execute on function fn_kann_beitraege_lesen(uuid, uuid) to authenticated;
revoke execute on function fn_kann_beitrag_schreiben(uuid, uuid) from public, anon;
grant execute on function fn_kann_beitrag_schreiben(uuid, uuid) to authenticated;

-- ============================================================
-- Trigger: Beitrag vorbereiten (vor dem Insert)
-- - person_id = eingeloggte Person (Lernende können person_id nicht selbst
--   setzen, Spalten-Grant); ohne Session (Superuser/Seed) bleibt der Wert.
-- - organisation_id aus der aktiven Einschreibung in dieser Kohorte.
-- - autor_anzeigename aus person.name: Vorname + Initial des Nachnamens.
-- - Konsistenz: Programm der Kohorte = Programm der Lektion.
-- - Antwortebene: Antwort nur auf einen nicht gelöschten Beitrag ohne
--   parent_id in derselben Lektion und Kohorte.
-- Meldungen enthalten keine Inhalte und keine Namen (Regel 9).
-- ============================================================
create or replace function fn_lektion_beitrag_vorbereiten()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_teile text[];
  v_parent lektion_beitrag%rowtype;
begin
  if auth.uid() is not null then
    new.person_id := auth.uid();
  end if;
  if new.person_id is null then
    raise exception 'Beitrag ohne Autor:in' using errcode = '23502';
  end if;

  if fn_programm_von_kohorte(new.cohort_id) is distinct from fn_programm_von_lektion(new.lesson_id) then
    raise exception 'Programm der Kohorte passt nicht zum Programm der Lektion' using errcode = '23514';
  end if;

  select e.organisation_id into new.organisation_id
  from enrolment e
  where e.cohort_id = new.cohort_id
    and e.learner_id = new.person_id
    and e.status = 'aktiv';
  if new.organisation_id is null then
    raise exception 'Keine aktive Einschreibung in dieser Kohorte' using errcode = '42501';
  end if;

  select p.name into v_name from person p where p.id = new.person_id;
  v_teile := regexp_split_to_array(btrim(coalesce(v_name, '')), '\s+');
  if array_length(v_teile, 1) is null or v_teile[1] = '' then
    new.autor_anzeigename := null;
  elsif array_length(v_teile, 1) = 1 then
    new.autor_anzeigename := v_teile[1];
  else
    new.autor_anzeigename := v_teile[1] || ' ' || upper(left(v_teile[array_length(v_teile, 1)], 1)) || '.';
  end if;

  if new.parent_id is not null then
    select * into v_parent from lektion_beitrag where id = new.parent_id;
    if not found
       or v_parent.parent_id is not null
       or v_parent.geloescht_am is not null
       or v_parent.lesson_id <> new.lesson_id
       or v_parent.cohort_id <> new.cohort_id then
      raise exception 'Antwort nur auf einen bestehenden Beitrag erster Ebene im selben Thread' using errcode = '23514';
    end if;
  end if;

  new.geloescht_am := null;
  return new;
end;
$$;

revoke execute on function fn_lektion_beitrag_vorbereiten() from public, anon, authenticated;

create trigger lektion_beitrag_vorbereiten
  before insert on lektion_beitrag
  for each row execute function fn_lektion_beitrag_vorbereiten();

-- ============================================================
-- Löschen (Soft-Delete), nur über diese Funktion
-- Autor:in: eigene Beiträge. Moderierende/AfCJ admin: alle der Kohorte.
-- Wiederholter Aufruf auf einen gelöschten Beitrag ist ohne Wirkung (SR-08).
-- ============================================================
create or replace function fn_beitrag_loeschen(p_beitrag_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_beitrag lektion_beitrag%rowtype;
  v_aktion text;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet' using errcode = '42501';
  end if;

  select * into v_beitrag from lektion_beitrag where id = p_beitrag_id for update;
  if not found then
    raise exception 'Beitrag nicht gefunden' using errcode = 'P0002';
  end if;
  if v_beitrag.geloescht_am is not null then
    return;
  end if;

  if v_beitrag.person_id = auth.uid() then
    v_aktion := 'geloescht_autor';
  elsif fn_moderiert_kohorte(v_beitrag.cohort_id) then
    v_aktion := 'geloescht_moderation';
  else
    raise exception 'Keine Berechtigung zum Löschen' using errcode = '42501';
  end if;

  update lektion_beitrag
     set text = null,
         person_id = null,
         autor_anzeigename = null,
         geloescht_am = now()
   where id = p_beitrag_id;

  insert into moderationsprotokoll (beitrag_id, person_id, aktion)
  values (p_beitrag_id, auth.uid(), v_aktion);
end;
$$;

revoke execute on function fn_beitrag_loeschen(uuid) from public, anon;
grant execute on function fn_beitrag_loeschen(uuid) to authenticated;

-- ============================================================
-- RLS lektion_beitrag
-- Lesen: Spalten ohne organisation_id. Schreiben: nur Insert der vier
-- Inhaltsspalten; kein Update, kein Delete (Löschen über die Funktion).
-- ============================================================
alter table lektion_beitrag enable row level security;
revoke all on lektion_beitrag from public, anon, authenticated;
grant select (id, created_at, lesson_id, cohort_id, parent_id, person_id, autor_anzeigename, text, geloescht_am)
  on lektion_beitrag to authenticated;
grant insert (lesson_id, cohort_id, parent_id, text) on lektion_beitrag to authenticated;

create policy lektion_beitrag_lesen on lektion_beitrag
  for select to authenticated
  using (fn_kann_beitraege_lesen(lesson_id, cohort_id));

create policy lektion_beitrag_schreiben on lektion_beitrag
  for insert to authenticated
  with check (
    person_id = auth.uid()
    and fn_kann_beitrag_schreiben(lesson_id, cohort_id)
  );

-- ============================================================
-- RLS kohorte_moderation: eigene Einträge lesen, AfCJ admin alles.
-- ============================================================
alter table kohorte_moderation enable row level security;
revoke all on kohorte_moderation from public, anon, authenticated;
grant select on kohorte_moderation to authenticated;
grant insert, update, delete on kohorte_moderation to authenticated;

create policy kohorte_moderation_eigene_lesen on kohorte_moderation
  for select to authenticated
  using (person_id = auth.uid());

create policy kohorte_moderation_admin_all on kohorte_moderation
  for all to authenticated
  using (fn_is_afcj_admin())
  with check (fn_is_afcj_admin());

-- ============================================================
-- RLS moderationsprotokoll: nur AfCJ admin liest, niemand schreibt direkt.
-- ============================================================
alter table moderationsprotokoll enable row level security;
revoke all on moderationsprotokoll from public, anon, authenticated;
grant select on moderationsprotokoll to authenticated;

create policy moderationsprotokoll_admin_lesen on moderationsprotokoll
  for select to authenticated
  using (fn_is_afcj_admin());
