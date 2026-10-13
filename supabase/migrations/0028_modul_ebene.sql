-- 0028_modul_ebene.sql
-- Echte Modul-Ebene (SR-05, Entscheidung 2026-10-13). Bisher ist jede Zeile
-- in `module` eine Woche; das Modul (z. B. "Modul II", ca. 4 Wochen) stand
-- nur im Code (gliederungFuer auf dem Branch demo).
--
-- Schritt 1 von 2, rein additiv:
--   - neue Tabelle `modul` (Überzeile, Name, Reihenfolge, Status je Programm)
--   - `module` (= Woche) bekommt modul_id, wochentyp und lage
--   - neue Tabelle `modul_competency` (Kompetenzen je Modul, mit Kürzel)
--   - fn_modul_zeitraum: Zeitraum je Modul aus dem Stundenplan der Kohorte
-- Schritt 2 (nach dem Pilotstart 02.11.2026): `module` wird in `woche`
-- umbenannt, zusammen mit der Code-Umstellung.
--
-- Nichts wird gelöscht: module -> course -> lesson -> unit_progress
-- kaskadiert. Darum hängt die Woche mit `on delete restrict` am Modul.
--
-- Die Nummer einer Woche im Modul wird nicht gespeichert, sondern aus
-- module.reihenfolge abgeleitet (eine Reihenfolge, keine zweite).

-- ============================================================
-- modul
-- ============================================================
create table modul (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  programme_id uuid not null references programme (id) on delete restrict,
  ueberzeile text not null check (btrim(ueberzeile) <> ''),
  name text not null check (btrim(name) <> ''),
  reihenfolge integer not null check (reihenfolge > 0),
  status text not null default 'unpublished' check (status in ('published', 'unpublished')),

  -- Ziel des zusammengesetzten Fremdschlüssels von module (gleiches Programm)
  constraint modul_id_programm unique (id, programme_id),
  constraint modul_reihenfolge_eindeutig unique (programme_id, reihenfolge)
    deferrable initially deferred
);

create trigger set_updated_at before update on modul
  for each row execute function set_updated_at();

comment on table modul is
  'Ein Modul eines Programms (z. B. "Modul II", ca. 4 Wochen), Ebene über den '
  'Wochen in `module`. Entschieden 2026-10-13 (SR-05).';
comment on column modul.ueberzeile is
  'Anzeige über dem Namen, z. B. "Modul II" oder "Abschluss". Text, nicht aus '
  'reihenfolge berechnet -- so braucht die Prüfungsvorbereitung keinen Sonderfall.';
comment on column modul.reihenfolge is
  'Position im Programm, 1-basiert, eindeutig je Programm (deferrable: Tauschen '
  'in einer Transaktion möglich).';

-- ============================================================
-- module (= Woche): Modul, Wochentyp, Lage
-- ============================================================
alter table module
  add column modul_id uuid,
  add column wochentyp text check (wochentyp in ('theorie', 'praxis')),
  add column lage text check (lage in ('online', 'praesenz', 'betrieb')),
  add constraint module_modul_gleiches_programm
    foreign key (modul_id, programme_id) references modul (id, programme_id)
    on delete restrict;

create index module_modul_id_idx on module (modul_id);

comment on column module.modul_id is
  'Modul, zu dem die Woche gehört (gleiches Programm, zusammengesetzter FK). '
  'Seit 0028; die Zeile ist eine Woche, Umbenennung in `woche` folgt.';
comment on column module.wochentyp is 'theorie oder praxis. Seit 0028.';
comment on column module.lage is
  'online, praesenz oder betrieb (betrieb nur bei praxis). Seit 0028.';

-- ============================================================
-- modul_competency
-- ============================================================
create table modul_competency (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  modul_id uuid not null references modul (id) on delete cascade,
  competency_id uuid not null references competency (id) on delete cascade,
  kuerzel text check (kuerzel is null or btrim(kuerzel) <> ''),
  reihenfolge integer not null check (reihenfolge > 0),

  constraint modul_competency_eindeutig unique (modul_id, competency_id),
  constraint modul_competency_kuerzel_eindeutig unique (modul_id, kuerzel),
  constraint modul_competency_reihenfolge_eindeutig unique (modul_id, reihenfolge)
    deferrable initially deferred
);

create index modul_competency_competency_id_idx on modul_competency (competency_id);

create trigger set_updated_at before update on modul_competency
  for each row execute function set_updated_at();

comment on table modul_competency is
  'Welche Kompetenzen ein Modul ausdrücklich zum Nachweis bringt (z. B. M2.01 '
  'bis M2.11), mit Kürzel und Reihenfolge. Explizit statt abgeleitet über '
  'Lektionen, Entscheidung 2026-10-13.';

-- ============================================================
-- Backfill (Stand 13.10.2026, Staging und Production lesend geprüft:
-- ein Programm EFK-EE, drei Wochen, alle Modul I). Ohne Programm EFK-EE
-- (CI, leere Datenbank) ein No-op. Titel vorläufig, Änderungen per Update.
-- ============================================================
insert into modul (programme_id, ueberzeile, name, reihenfolge, status)
select p.id, v.ueberzeile, v.name, v.reihenfolge, 'published'
from programme p
cross join (values
  (1, 'Modul I', 'Grundlagen Elektrotechnik'),
  (2, 'Modul II', 'Gebäudeinstallation'),
  (3, 'Modul III', 'Grundlagen IT-Systemtechnik'),
  (4, 'Modul IV', 'Schaltschrankbau'),
  (5, 'Modul V', 'Grundlagen Erneuerbaren Energien'),
  (6, 'Abschluss', 'Prüfungsvorbereitung')
) as v (reihenfolge, ueberzeile, name)
where p.kuerzel = 'EFK-EE';

-- Wochen 1-5 gehören zu Modul I (vorhanden sind 1-3).
update module w
set modul_id = m.id
from modul m, programme p
where p.id = w.programme_id
  and p.kuerzel = 'EFK-EE'
  and m.programme_id = w.programme_id
  and m.reihenfolge = 1
  and w.reihenfolge between 1 and 5;

-- Wochentyp und Lage aus dem Namen ("Woche 1 – Theorie (online), …").
update module
set wochentyp = case
      when name ~* 'theorie' then 'theorie'
      when name ~* 'praxis' then 'praxis'
    end,
    lage = case
      when name ~* 'online' then 'online'
      when name ~* 'präsenz|praesenz' then 'praesenz'
      when name ~* 'betrieb' then 'betrieb'
    end;

do $$
declare
  offen text;
begin
  select string_agg(name, '; ' order by reihenfolge) into offen
  from module
  where modul_id is null or wochentyp is null or lage is null;
  if offen is not null then
    raise exception 'Woche ohne Modul, Wochentyp oder Lage: %', offen;
  end if;
end $$;

alter table module
  alter column modul_id set not null,
  alter column wochentyp set not null,
  alter column lage set not null,
  add constraint module_betrieb_nur_praxis check (lage <> 'betrieb' or wochentyp = 'praxis');

-- ============================================================
-- fn_modul_zeitraum: erster bis letzter Tag je Modul im Stundenplan der
-- Kohorte (kohortenweite und persönliche Einträge). Security invoker: es
-- gilt die RLS der aufrufenden Person -- Lernende sehen ihre eigenen
-- Einträge, AfCJ admin alle. Module ohne Termine liefern keine Zeile;
-- Pausen (z. B. Weihnachten) liegen zwischen den Zeiträumen.
-- Zuordnung Eintrag -> Woche: Kurs direkt, über die Lektion, über den
-- Live-Termin (Kurs oder Lektion) oder über den Praxistyp des Field Jobs.
-- ============================================================
create or replace function fn_modul_zeitraum(p_cohort_id uuid)
returns table (modul_id uuid, von date, bis date)
language sql
stable
security invoker
set search_path = public
as $$
  with eintrag as (
    select
      se.datum,
      coalesce(se.course_id, l.course_id, ls.course_id, ll.course_id) as course_id,
      fj.field_job_type_id
    from schedule_entry se
    left join lesson l on l.id = se.lesson_id
    left join live_session ls on ls.id = se.live_session_id
    left join lesson ll on ll.id = ls.lesson_id
    left join field_job fj on fj.id = se.field_job_id
    where se.cohort_id = p_cohort_id
       or se.enrolment_id in (select e.id from enrolment e where e.cohort_id = p_cohort_id)
  )
  select w.modul_id, min(e.datum), max(e.datum)
  from eintrag e
  left join course c on c.id = e.course_id
  left join field_job_type t on t.id = e.field_job_type_id
  join module w on w.id = coalesce(c.module_id, t.module_id)
  group by w.modul_id;
$$;

comment on function fn_modul_zeitraum(uuid) is
  'Zeitraum je Modul (erster/letzter Termin) im Stundenplan einer Kohorte, '
  'unter der RLS der aufrufenden Person. Grundlage für Home "Hier bist du" '
  'und die Programmseite. Entschieden 2026-10-13: kein Versatz ab Kohortenstart.';

revoke execute on function fn_modul_zeitraum(uuid) from public, anon;
grant execute on function fn_modul_zeitraum(uuid) to authenticated;

-- ============================================================
-- RLS wie Qualification structure (0009/0012): Learner lesen nur
-- veröffentlichte Module, write nur AfCJ admin.
-- ============================================================
alter table modul enable row level security;
revoke all on modul from public, anon, authenticated;
grant select on modul to authenticated;
grant insert, update, delete on modul to authenticated;

create policy modul_read_published on modul
  for select to authenticated
  using (status = 'published');

create policy modul_admin_write on modul
  for all to authenticated
  using (fn_is_afcj_admin())
  with check (fn_is_afcj_admin());

alter table modul_competency enable row level security;
revoke all on modul_competency from public, anon, authenticated;
grant select on modul_competency to authenticated;
grant insert, update, delete on modul_competency to authenticated;

create policy modul_competency_read_published on modul_competency
  for select to authenticated
  using (
    exists (
      select 1 from modul m
      where m.id = modul_competency.modul_id
        and m.status = 'published'
    )
  );

create policy modul_competency_admin_write on modul_competency
  for all to authenticated
  using (fn_is_afcj_admin())
  with check (fn_is_afcj_admin());
