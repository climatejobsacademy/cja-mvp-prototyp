-- 0050_kohorten_chat.sql
-- Kohorten-Chat (Haupt-Chat), PR 1: nur Schema, Rechte und Tests. SR-83.
-- Nummer 0050 laut Bauanleitung (0035 bis 0049 sind für den Praxisflow
-- reserviert). Nur additiv.
--
-- Entschieden 2026-10-16 (Anna, Variante B1 der Bauanleitung "Fachsprache
-- und Haupt-Chat vor dem 02.11."):
--   - Zwei feste Kanäle je Kohorte, keine Kanal-Tabelle:
--       ankuendigungen  schreiben nur Trainer:innen der Kohorte und das Team
--                       (Moderation der Kohorte, AfCJ admin); lesen alle
--       treffpunkt      schreiben Lernende mit Einschreibung 'aktiv',
--                       Trainer:innen der Kohorte und das Team; lesen alle
--     "Alle" = in genau dieser Kohorte eingeschrieben (aktiv oder
--     abgeschlossen), über Arbeitgeber hinweg -- wie der Fragen-Thread (0024)
--     eine bewusste Ausnahme von SR-06, siehe docs/decisions.md (2026-10-16).
--   - Keine Rolle in der Nachricht: Lesen und Schreiben prüft die Datenbank
--     selbst (Einschreibung, Rolle trainer mit Termin in der Kohorte über
--     fn_trainer_kohorten_ids aus 0032, kohorte_moderation, AfCJ admin).
--   - Nur Text (inkl. Emojis), 1 bis 1000 Zeichen, keine Antworten, kein
--     Bearbeiten. Anzeigename als Snapshot (Rufname bzw. erstes Wort plus
--     Initial des Nachnamens) per Trigger -- person bleibt geschlossen.
--   - Moderation: Trainer:innen der Kohorte, kohorte_moderation und AfCJ
--     admin löschen alle Nachrichten der Kohorte, die Autor:in die eigenen.
--     Soft-Delete wie im Fragen-Thread, Protokoll ohne Nachrichtentext.
--     Lernende können Nachrichten melden; Meldungen sehen die Moderierenden.
--   - Account-Löschung anonymisiert die Nachrichten (wie 0024).
--   - Gelesen-Stand je Person, Kohorte und Kanal für den Ungelesen-Zähler.
--     Neue Nachrichten holt die App alle 30 Sekunden (kein Realtime).
--   - Schalter cohort.chat_aktiv (Standard aus): Lernende sehen und schreiben
--     nur in freigeschalteten Kohorten; Moderierende lesen immer. Auf
--     Production bleibt er aus, bis Datenschutzerklärung und Moderation
--     stehen.
--   - Nachrichteninhalte werden nirgends geloggt (CLAUDE.md Regel 9): keine
--     RAISE-Meldung enthält Text oder Namen.
--
-- organisation_id: Arbeitgeber der Autor:in aus ihrer aktiven Einschreibung
-- in der Kohorte; schreiben Trainer:innen oder das Team (keine Einschreibung),
-- die AfCJ-Organisation ihrer Mitgliedschaft. Gesetzt per Trigger.
-- chat_gelesen, chat_meldung und chat_moderationsprotokoll gehören einer
-- Person bzw. AfCJ (wie kohorte_moderation, moderationsprotokoll) und haben
-- keine organisation_id; Trainer:innen haben keinen Arbeitgeber.

-- ============================================================
-- cohort.chat_aktiv
-- ============================================================
alter table cohort
  add column chat_aktiv boolean not null default false;

comment on column cohort.chat_aktiv is
  'Kohorten-Chat für Lernende dieser Kohorte freigeschaltet (Standard aus). SR-83.';

-- ============================================================
-- chat_nachricht
-- ============================================================
create table chat_nachricht (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  organisation_id uuid not null references organisation (id) on delete cascade,
  cohort_id uuid not null references cohort (id) on delete cascade,
  kanal text not null check (kanal in ('ankuendigungen', 'treffpunkt')),
  person_id uuid references person (id) on delete set null,
  autor_anzeigename text,
  text text,
  geloescht_am timestamptz,

  constraint chat_nachricht_text_laenge check (
    (geloescht_am is null and text is not null and char_length(text) between 1 and 1000)
    or (geloescht_am is not null and text is null)
  ),
  constraint chat_nachricht_geloescht_ohne_person check (
    geloescht_am is null or (person_id is null and autor_anzeigename is null)
  )
);

create index chat_nachricht_kanal_idx on chat_nachricht (cohort_id, kanal, created_at);
create index chat_nachricht_person_idx on chat_nachricht (person_id);

create trigger set_updated_at before update on chat_nachricht
  for each row execute function set_updated_at();

comment on table chat_nachricht is
  'Nachricht im Kohorten-Chat (Kanal ankuendigungen oder treffpunkt). Nur Text, '
  '1-1000 Zeichen, kein Bearbeiten, Soft-Delete über fn_chat_nachricht_loeschen. SR-83.';
comment on column chat_nachricht.organisation_id is
  'Arbeitgeber der Autor:in (aus der Einschreibung) bzw. AfCJ bei Trainer:innen und Team; per Trigger gesetzt.';
comment on column chat_nachricht.autor_anzeigename is
  'Snapshot "Rufname N." beim Schreiben, beim Löschen geleert. Kein Lesezugriff auf person nötig.';

-- ============================================================
-- chat_gelesen (Gelesen-Stand je Person, Kohorte, Kanal)
-- ============================================================
create table chat_gelesen (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  person_id uuid not null references person (id) on delete cascade,
  cohort_id uuid not null references cohort (id) on delete cascade,
  kanal text not null check (kanal in ('ankuendigungen', 'treffpunkt')),
  gelesen_bis timestamptz not null default now(),

  unique (person_id, cohort_id, kanal)
);

create trigger set_updated_at before update on chat_gelesen
  for each row execute function set_updated_at();

comment on table chat_gelesen is
  'Bis wann eine Person einen Kanal ihrer Kohorte gelesen hat (Ungelesen-Zähler). '
  'Nur über fn_chat_gelesen_setzen beschrieben. SR-83.';

-- ============================================================
-- chat_meldung (Lernende melden eine Nachricht)
-- ============================================================
create table chat_meldung (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  nachricht_id uuid not null references chat_nachricht (id) on delete cascade,
  person_id uuid references person (id) on delete set null,
  erledigt_am timestamptz,
  erledigt_von uuid references person (id) on delete set null,

  unique (nachricht_id, person_id)
);

create index chat_meldung_nachricht_idx on chat_meldung (nachricht_id);

create trigger set_updated_at before update on chat_meldung
  for each row execute function set_updated_at();

comment on table chat_meldung is
  'Meldung einer Chat-Nachricht durch eine Person der Kohorte (ohne Begründungstext). '
  'Nur über fn_chat_nachricht_melden und fn_chat_meldung_erledigt beschrieben. SR-83.';

-- ============================================================
-- chat_moderationsprotokoll (ohne Nachrichtentext)
-- ============================================================
create table chat_moderationsprotokoll (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  nachricht_id uuid not null references chat_nachricht (id) on delete cascade,
  person_id uuid references person (id) on delete set null,
  aktion text not null check (aktion in ('geloescht_autor', 'geloescht_moderation'))
);

create trigger set_updated_at before update on chat_moderationsprotokoll
  for each row execute function set_updated_at();

comment on table chat_moderationsprotokoll is
  'Wer hat wann welche Chat-Nachricht gelöscht (ohne Text). Nur über '
  'fn_chat_nachricht_loeschen beschrieben. SR-83.';

-- ============================================================
-- Hilfsfunktionen (security definer, fester search_path, EXECUTE nur für
-- authenticated -- Muster 0023/0024)
-- ============================================================

-- Moderiert die eingeloggte Person den Chat dieser Kohorte? AfCJ admin,
-- kohorte_moderation (fn_moderiert_kohorte, 0024) und Trainer:innen mit
-- mindestens einem Termin in der Kohorte (fn_trainer_kohorten_ids, 0032).
create or replace function fn_chat_moderiert(p_cohort_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select fn_moderiert_kohorte(p_cohort_id)
      or p_cohort_id in (select fn_trainer_kohorten_ids());
$$;

-- Lesen: Moderierende immer; Lernende nur bei chat_aktiv und Einschreibung
-- in genau dieser Kohorte (aktiv oder abgeschlossen).
create or replace function fn_chat_darf_lesen(p_cohort_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select fn_chat_moderiert(p_cohort_id)
      or (
        exists (select 1 from cohort c where c.id = p_cohort_id and c.chat_aktiv)
        and exists (
          select 1 from enrolment e
          where e.cohort_id = p_cohort_id
            and e.learner_id = auth.uid()
            and e.status in ('aktiv', 'abgeschlossen')
        )
      );
$$;

-- Schreiben: nur bei chat_aktiv. ankuendigungen nur Moderierende,
-- treffpunkt zusätzlich Lernende mit Einschreibung 'aktiv'.
create or replace function fn_chat_darf_schreiben(p_cohort_id uuid, p_kanal text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from cohort c where c.id = p_cohort_id and c.chat_aktiv)
     and (
       fn_chat_moderiert(p_cohort_id)
       or (
         p_kanal = 'treffpunkt'
         and exists (
           select 1 from enrolment e
           where e.cohort_id = p_cohort_id
             and e.learner_id = auth.uid()
             and e.status = 'aktiv'
         )
       )
     );
$$;

revoke execute on function fn_chat_moderiert(uuid) from public, anon;
grant execute on function fn_chat_moderiert(uuid) to authenticated;
revoke execute on function fn_chat_darf_lesen(uuid) from public, anon;
grant execute on function fn_chat_darf_lesen(uuid) to authenticated;
revoke execute on function fn_chat_darf_schreiben(uuid, text) from public, anon;
grant execute on function fn_chat_darf_schreiben(uuid, text) to authenticated;

-- ============================================================
-- Trigger: Nachricht vorbereiten (vor dem Insert)
-- - person_id = eingeloggte Person (nicht selbst setzbar, Spalten-Grant);
--   ohne Session (Superuser/Seed) bleibt der Wert.
-- - organisation_id: aktive Einschreibung in der Kohorte, sonst die
--   AfCJ-Mitgliedschaft (Trainer:innen, Team).
-- - autor_anzeigename: Rufname (sonst erstes Wort von name) plus Initial des
--   letzten Worts; bei nur einem Wort nur der Rufname.
-- Meldungen enthalten keine Inhalte und keine Namen (Regel 9).
-- ============================================================
create or replace function fn_chat_nachricht_vorbereiten()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_rufname text;
  v_teile text[];
begin
  if auth.uid() is not null then
    new.person_id := auth.uid();
  end if;
  if new.person_id is null then
    raise exception 'Nachricht ohne Autor:in' using errcode = '23502';
  end if;

  select e.organisation_id into new.organisation_id
  from enrolment e
  where e.cohort_id = new.cohort_id
    and e.learner_id = new.person_id
    and e.status = 'aktiv'
  limit 1;
  if new.organisation_id is null then
    select om.organisation_id into new.organisation_id
    from org_membership om
    join organisation o on o.id = om.organisation_id
    where om.person_id = new.person_id and o.typ = 'afcj'
    limit 1;
  end if;
  if new.organisation_id is null then
    raise exception 'Keine Einschreibung in dieser Kohorte und keine AfCJ-Mitgliedschaft' using errcode = '42501';
  end if;

  select p.name, p.rufname into v_name, v_rufname from person p where p.id = new.person_id;
  v_teile := regexp_split_to_array(btrim(coalesce(v_name, '')), '\s+');
  v_rufname := coalesce(nullif(btrim(v_rufname), ''), nullif(v_teile[1], ''));
  if v_rufname is null then
    new.autor_anzeigename := null;
  elsif array_length(v_teile, 1) > 1 then
    new.autor_anzeigename := v_rufname || ' ' || upper(left(v_teile[array_length(v_teile, 1)], 1)) || '.';
  else
    new.autor_anzeigename := v_rufname;
  end if;

  new.geloescht_am := null;
  return new;
end;
$$;

revoke execute on function fn_chat_nachricht_vorbereiten() from public, anon, authenticated;

create trigger chat_nachricht_vorbereiten
  before insert on chat_nachricht
  for each row execute function fn_chat_nachricht_vorbereiten();

-- ============================================================
-- Trigger: Anonymisieren bei Account-Löschung (wie 0024)
-- ============================================================
create or replace function fn_chat_nachricht_anonymisieren()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.person_id is not null and new.person_id is null and new.geloescht_am is null then
    new.text := null;
    new.autor_anzeigename := null;
    new.geloescht_am := now();
  end if;
  return new;
end;
$$;

revoke execute on function fn_chat_nachricht_anonymisieren() from public, anon, authenticated;

create trigger chat_nachricht_anonymisieren
  before update of person_id on chat_nachricht
  for each row execute function fn_chat_nachricht_anonymisieren();

-- ============================================================
-- Löschen (Soft-Delete), nur über diese Funktion
-- Autor:in: eigene Nachrichten. Moderierende: alle der Kohorte.
-- Wiederholter Aufruf auf eine gelöschte Nachricht ist ohne Wirkung.
-- Offene Meldungen zur Nachricht gelten danach als erledigt.
-- ============================================================
create or replace function fn_chat_nachricht_loeschen(p_nachricht_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nachricht chat_nachricht%rowtype;
  v_aktion text;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet' using errcode = '42501';
  end if;

  select * into v_nachricht from chat_nachricht where id = p_nachricht_id for update;
  if not found then
    raise exception 'Nachricht nicht gefunden' using errcode = 'P0002';
  end if;
  if v_nachricht.geloescht_am is not null then
    return;
  end if;

  if v_nachricht.person_id = auth.uid() then
    v_aktion := 'geloescht_autor';
  elsif fn_chat_moderiert(v_nachricht.cohort_id) then
    v_aktion := 'geloescht_moderation';
  else
    raise exception 'Keine Berechtigung zum Löschen' using errcode = '42501';
  end if;

  update chat_nachricht
     set text = null,
         person_id = null,
         autor_anzeigename = null,
         geloescht_am = now()
   where id = p_nachricht_id;

  update chat_meldung
     set erledigt_am = now(), erledigt_von = auth.uid()
   where nachricht_id = p_nachricht_id and erledigt_am is null;

  insert into chat_moderationsprotokoll (nachricht_id, person_id, aktion)
  values (p_nachricht_id, auth.uid(), v_aktion);
end;
$$;

revoke execute on function fn_chat_nachricht_loeschen(uuid) from public, anon;
grant execute on function fn_chat_nachricht_loeschen(uuid) to authenticated;

-- ============================================================
-- Melden: wer die Nachricht lesen darf, kann sie melden (nicht die eigene,
-- nicht gelöschte). Doppelte Meldung derselben Person ohne Wirkung.
-- ============================================================
create or replace function fn_chat_nachricht_melden(p_nachricht_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nachricht chat_nachricht%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet' using errcode = '42501';
  end if;

  select * into v_nachricht from chat_nachricht where id = p_nachricht_id;
  if not found or not fn_chat_darf_lesen(v_nachricht.cohort_id) then
    raise exception 'Nachricht nicht gefunden' using errcode = 'P0002';
  end if;
  if v_nachricht.geloescht_am is not null or v_nachricht.person_id = auth.uid() then
    return;
  end if;

  insert into chat_meldung (nachricht_id, person_id)
  values (p_nachricht_id, auth.uid())
  on conflict (nachricht_id, person_id) do nothing;
end;
$$;

revoke execute on function fn_chat_nachricht_melden(uuid) from public, anon;
grant execute on function fn_chat_nachricht_melden(uuid) to authenticated;

-- Meldung als erledigt markieren (Nachricht bleibt stehen), nur Moderierende.
create or replace function fn_chat_meldung_erledigt(p_meldung_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cohort uuid;
begin
  select n.cohort_id into v_cohort
  from chat_meldung m join chat_nachricht n on n.id = m.nachricht_id
  where m.id = p_meldung_id;
  if v_cohort is null or not fn_chat_moderiert(v_cohort) then
    raise exception 'Keine Berechtigung' using errcode = '42501';
  end if;

  update chat_meldung
     set erledigt_am = now(), erledigt_von = auth.uid()
   where id = p_meldung_id and erledigt_am is null;
end;
$$;

revoke execute on function fn_chat_meldung_erledigt(uuid) from public, anon;
grant execute on function fn_chat_meldung_erledigt(uuid) to authenticated;

-- ============================================================
-- Gelesen-Stand setzen und Ungelesenes zählen
-- ============================================================
create or replace function fn_chat_gelesen_setzen(p_cohort_id uuid, p_kanal text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not fn_chat_darf_lesen(p_cohort_id) then
    raise exception 'Keine Berechtigung' using errcode = '42501';
  end if;
  if p_kanal not in ('ankuendigungen', 'treffpunkt') then
    raise exception 'Unbekannter Kanal' using errcode = '22023';
  end if;

  insert into chat_gelesen (person_id, cohort_id, kanal, gelesen_bis)
  values (auth.uid(), p_cohort_id, p_kanal, now())
  on conflict (person_id, cohort_id, kanal) do update set gelesen_bis = excluded.gelesen_bis;
end;
$$;

revoke execute on function fn_chat_gelesen_setzen(uuid, text) from public, anon;
grant execute on function fn_chat_gelesen_setzen(uuid, text) to authenticated;

-- Ungelesene Nachrichten je Kanal (ohne eigene und gelöschte). Läuft mit den
-- Rechten der aufrufenden Person (security invoker): zählt nur, was sie per
-- RLS lesen darf.
create or replace function fn_chat_ungelesen(p_cohort_id uuid)
returns table (kanal text, anzahl integer)
language sql
stable
security invoker
set search_path = public
as $$
  select k.kanal,
         (select count(*)::int
            from chat_nachricht n
           where n.cohort_id = p_cohort_id
             and n.kanal = k.kanal
             and n.geloescht_am is null
             and n.person_id is distinct from auth.uid()
             and n.created_at > coalesce(
               (select g.gelesen_bis from chat_gelesen g
                 where g.person_id = auth.uid() and g.cohort_id = p_cohort_id and g.kanal = k.kanal),
               '-infinity'::timestamptz))
  from (values ('ankuendigungen'), ('treffpunkt')) as k (kanal);
$$;

revoke execute on function fn_chat_ungelesen(uuid) from public, anon;
grant execute on function fn_chat_ungelesen(uuid) to authenticated;

-- ============================================================
-- RLS chat_nachricht
-- Lesen: Spalten ohne organisation_id. Schreiben: nur Insert von Kennung
-- (optional, z. B. für die Anzeige vor dem Speichern), Kohorte, Kanal und
-- Text; kein Update, kein Delete (Löschen über die Funktion).
-- ============================================================
alter table chat_nachricht enable row level security;
revoke all on chat_nachricht from public, anon, authenticated;
grant select (id, created_at, cohort_id, kanal, person_id, autor_anzeigename, text, geloescht_am)
  on chat_nachricht to authenticated;
grant insert (id, cohort_id, kanal, text) on chat_nachricht to authenticated;

create policy chat_nachricht_lesen on chat_nachricht
  for select to authenticated
  using (fn_chat_darf_lesen(cohort_id));

create policy chat_nachricht_schreiben on chat_nachricht
  for insert to authenticated
  with check (
    person_id = auth.uid()
    and fn_chat_darf_schreiben(cohort_id, kanal)
  );

-- ============================================================
-- RLS chat_gelesen: nur die eigenen Zeilen lesen; schreiben über die Funktion.
-- ============================================================
alter table chat_gelesen enable row level security;
revoke all on chat_gelesen from public, anon, authenticated;
grant select on chat_gelesen to authenticated;

create policy chat_gelesen_eigene on chat_gelesen
  for select to authenticated
  using (person_id = auth.uid());

-- ============================================================
-- RLS chat_meldung: Moderierende der Kohorte lesen; schreiben über Funktionen.
-- ============================================================
alter table chat_meldung enable row level security;
revoke all on chat_meldung from public, anon, authenticated;
grant select on chat_meldung to authenticated;

create policy chat_meldung_moderation_lesen on chat_meldung
  for select to authenticated
  using (
    exists (
      select 1 from chat_nachricht n
      where n.id = chat_meldung.nachricht_id
        and fn_chat_moderiert(n.cohort_id)
    )
  );

-- ============================================================
-- RLS chat_moderationsprotokoll: nur AfCJ admin liest, niemand schreibt direkt.
-- ============================================================
alter table chat_moderationsprotokoll enable row level security;
revoke all on chat_moderationsprotokoll from public, anon, authenticated;
grant select on chat_moderationsprotokoll to authenticated;

create policy chat_moderationsprotokoll_admin_lesen on chat_moderationsprotokoll
  for select to authenticated
  using (fn_is_afcj_admin());
