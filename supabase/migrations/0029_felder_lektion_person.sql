-- 0029_felder_lektion_person.sql
-- Kleine Felder aus den Datenlücken Nr. 4, 8 und 10 (Entscheidungen
-- 2026-10-13, SR-13, SR-73, SR-15, SR-48):
--   - lesson.thema: Thema/Untertitel der Lektion als eigenes Feld statt in
--     der Klammer im Titel (Nr. 4)
--   - lesson.live_lektion_id: Selbstlern-Lektion -> zugehörige
--     Live-Lektion, 1:1, statt Abgleich über gleichen Titel (Nr. 8)
--   - person.rufname: Vor-/Rufname für Begrüßung und Anzeige (Nr. 10)
-- Nr. 9 ("in Bearbeitung" beim ersten Öffnen) braucht keine Migration: der
-- Statuswert existiert seit 0006, die Policies aus 0009 erlauben das Insert.
--
-- lesson.name bleibt in dieser Migration unverändert: die Preview von demo
-- läuft gegen Staging und zerlegt den Titel dort noch selbst. Die Klammer
-- entfernt das Datenskript scripts/sql/lektion_klammer_entfernen.sql (nach
-- der Demo am 15.10.2026 auf Staging, im Release auf Production).
--
-- Keine neuen Policies: lesson ist für Learner lesbar und nur für AfCJ
-- admin schreibbar (0009/0010), person über person_self_update /
-- person_admin_all -- die neuen Spalten fallen darunter.

-- ============================================================
-- lesson.thema (Nr. 4)
-- ============================================================
alter table lesson
  add column thema text,
  add constraint lesson_thema_nicht_leer check (thema is null or btrim(thema) <> '');

comment on column lesson.thema is
  'Thema/Untertitel der Lektion (z. B. "Der Transistor / Die Dioden"). Solange '
  'lesson.name die Klammer noch enthält, zeigt die App den Titel ohne die '
  'erste Klammer an (Entscheidung 2026-10-13).';

-- ============================================================
-- lesson.live_lektion_id (Nr. 8)
-- ============================================================
alter table lesson
  add column live_lektion_id uuid references lesson (id) on delete set null;

create unique index lesson_live_lektion_eindeutig
  on lesson (live_lektion_id)
  where live_lektion_id is not null;

comment on column lesson.live_lektion_id is
  'Nur an einer Selbstlern-Lektion (scorm/repository): die zugehörige '
  'Live-Lektion desselben Programms ("Wissen festigen"). 1:1 über den '
  'eindeutigen Index lesson_live_lektion_eindeutig (Entscheidung 2026-10-13).';

-- Typ und Programm prüfen. Eine Check-Constraint kann keine andere Zeile
-- lesen, darum ein Trigger. Geprüft wird beim Setzen der Verknüpfung und
-- wenn sich der Typ der verknüpfenden Lektion ändert.
create or replace function fn_pruefe_live_lektion()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.live_lektion_id is null then
    return new;
  end if;
  if new.content_type = 'live' then
    raise exception 'live_lektion_id nur an Selbstlern-Lektionen, nicht an Live-Lektionen'
      using errcode = '23514';
  end if;
  if not exists (
    select 1 from lesson l
    where l.id = new.live_lektion_id and l.content_type = 'live'
  ) then
    raise exception 'live_lektion_id muss auf eine Live-Lektion zeigen'
      using errcode = '23514';
  end if;
  if fn_programm_von_lektion(new.live_lektion_id) is distinct from fn_programm_von_lektion(new.id) then
    raise exception 'Selbstlern- und Live-Lektion müssen zum selben Programm gehören'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger pruefe_live_lektion
  before insert or update of live_lektion_id, content_type on lesson
  for each row execute function fn_pruefe_live_lektion();

-- ============================================================
-- person.rufname (Nr. 10)
-- ============================================================
alter table person add column rufname text;

-- Neue Personen (scripts/invite-learner.mjs, Dashboard) bekommen den
-- Rufnamen automatisch aus dem ersten Wort von name, wenn keiner angegeben ist.
create or replace function fn_rufname_vorbelegen()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.rufname is null or btrim(new.rufname) = '' then
    new.rufname := split_part(btrim(new.name), ' ', 1);
  end if;
  return new;
end;
$$;

create trigger rufname_vorbelegen
  before insert on person
  for each row execute function fn_rufname_vorbelegen();

comment on column person.rufname is
  'Vor-/Rufname für Begrüßung und Anzeige. Backfill aus dem ersten Wort von '
  'name; die Person kann ihn im Konto-Menü selbst ändern (Entscheidung 2026-10-13).';

-- ============================================================
-- Backfill
-- Reihenfolge: zuerst Nr. 8 über den vollen Namen, dann Nr. 4 (thema). name
-- wird nicht verändert.
-- ============================================================

-- Nr. 8: gleicher Name (ohne Groß-/Kleinschreibung) im selben Programm, eine
-- Live- und eine Selbstlern-Lektion. Nur eindeutige Paare; mehrdeutige
-- bleiben leer und werden von Hand zugeordnet.
with paare as (
  select s.id as selbst_id, l.id as live_id
  from lesson s
  join lesson l
    on lower(btrim(s.name)) = lower(btrim(l.name))
   and fn_programm_von_lektion(s.id) = fn_programm_von_lektion(l.id)
  where s.content_type <> 'live'
    and l.content_type = 'live'
),
eindeutig as (
  select p.selbst_id, p.live_id
  from paare p
  where (select count(*) from paare q where q.selbst_id = p.selbst_id) = 1
    and (select count(*) from paare q where q.live_id = p.live_id) = 1
)
update lesson
   set live_lektion_id = e.live_id
  from eindeutig e
 where lesson.id = e.selbst_id;

-- Nr. 4: Text der ersten Klammer wird thema -- nur wenn außerhalb der
-- Klammer noch ein Titel übrig bleibt (gleiche Regel wie in der App).
update lesson
   set thema = btrim(substring(name from '\(([^()]+)\)'))
 where name ~ '\([^()]+\)'
   and btrim(substring(name from '\(([^()]+)\)')) <> ''
   and btrim(regexp_replace(name, '\([^()]+\)', '')) <> '';

-- Nr. 10: erstes Wort des Namens.
update person set rufname = split_part(btrim(name), ' ', 1)
 where rufname is null;

do $$
begin
  if exists (select 1 from person where rufname is null or btrim(rufname) = '') then
    raise exception 'Backfill unvollständig: Person ohne Rufnamen';
  end if;
end;
$$;

alter table person
  alter column rufname set not null,
  add constraint person_rufname_nicht_leer check (btrim(rufname) <> '' and char_length(rufname) <= 60);
