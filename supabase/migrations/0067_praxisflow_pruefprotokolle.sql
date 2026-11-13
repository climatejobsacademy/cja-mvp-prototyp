-- 0067_praxisflow_pruefprotokolle.sql
-- SR-91: Jede Praxisaufgabe ist einer Prüfprotokoll-Variante zugeordnet
-- (z. B. ortsveränderlich oder ortsfest, Neu- oder Wiederholungsprüfung).
-- Die Variante legt die Prüfpunkte beim Messen fest und die Stelle, an der
-- das Zuschalten freigegeben wird (SR-65): zwischen dem letzten Punkt ohne
-- Spannung und dem ersten unter Spannung. Ein laufender Praxisauftrag
-- behält seine Variante. Varianten und Zuordnung pflegt AfCJ admin per
-- Import; Lernende lesen nur veröffentlichte Varianten.
--
-- Grundgerüst vor den Inhalten: Ohne Zuordnung gilt weiter die
-- Standard-Prüfliste aus 0060 (fn_praxis_pruefliste, ids a1–a4, c1–c2).
--
-- Neu:
--   - pruefprotokoll, pruefprotokoll_punkt (AfCJ-eigene Inhalte, ohne
--     organisation_id wie field_job_type und field_job_type_frage)
--   - field_job_type.pruefprotokoll_id, field_job.pruefprotokoll_id
--     (beim Anlegen des Auftrags vom Aufgabentyp übernommen, danach fest)
--   - fn_praxis_pruefliste_job(v field_job): Prüfliste des Auftrags
-- Ersetzt (Fassungen aus 0065, nur die Prüfliste je Auftrag):
--   fn_praxis_pruefe_gate_zuschalten, fn_praxis_pruefe_ausfuehren,
--   fn_praxis_pruefe_kontrollieren, fn_praxis_kontrolle_abhaken,
--   fn_praxis_deutung_speichern

-- ============================================================
-- Tabellen
-- ============================================================
create table pruefprotokoll (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  kennung text not null unique check (kennung ~ '^[a-z0-9-]{1,60}$'),
  titel text not null check (char_length(titel) between 1 and 200),
  beschreibung text check (beschreibung is null or char_length(beschreibung) <= 2000),
  status text not null default 'unpublished' check (status in ('published', 'unpublished'))
);

create table pruefprotokoll_punkt (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  pruefprotokoll_id uuid not null references pruefprotokoll (id) on delete cascade,
  kennung text not null check (kennung ~ '^[a-z0-9_-]{1,20}$'),
  nr integer not null check (nr > 0),
  teil text not null check (teil in ('spannungsfrei', 'unter_spannung')),
  titel text not null check (char_length(titel) between 1 and 200),
  text text check (text is null or char_length(text) <= 2000),
  hinweis text check (hinweis is null or char_length(hinweis) <= 2000),
  punkte text[] not null default '{}',

  unique (pruefprotokoll_id, kennung),
  unique (pruefprotokoll_id, nr)
);

create index pruefprotokoll_punkt_protokoll_idx on pruefprotokoll_punkt (pruefprotokoll_id, nr);

create trigger set_updated_at before update on pruefprotokoll
  for each row execute function set_updated_at();
create trigger set_updated_at before update on pruefprotokoll_punkt
  for each row execute function set_updated_at();

-- Erst alle Punkte ohne Spannung, dann die unter Spannung: dazwischen liegt
-- die Freigabe zum Zuschalten. Geprüft am Ende der Transaktion (Import).
create or replace function fn_pruefprotokoll_reihenfolge()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_id uuid := coalesce(new.pruefprotokoll_id, old.pruefprotokoll_id);
begin
  if exists (
    select 1 from pruefprotokoll_punkt u
    join pruefprotokoll_punkt a on a.pruefprotokoll_id = u.pruefprotokoll_id
    where u.pruefprotokoll_id = v_id
      and u.teil = 'unter_spannung' and a.teil = 'spannungsfrei' and u.nr < a.nr
  ) then
    raise exception 'Prüfpunkte unter Spannung müssen nach allen Punkten ohne Spannung kommen' using errcode = '23514';
  end if;
  return null;
end;
$$;

create constraint trigger pruefprotokoll_reihenfolge after insert or update on pruefprotokoll_punkt
  deferrable initially deferred
  for each row execute function fn_pruefprotokoll_reihenfolge();

comment on table pruefprotokoll is
  'SR-91: Prüfprotokoll-Variante (z. B. ortsveränderlich/ortsfest, Neu-/Wiederholungsprüfung). AfCJ admin pflegt per Import.';
comment on table pruefprotokoll_punkt is
  'SR-91: Prüfpunkt einer Variante in Reihenfolge; teil spannungsfrei vor unter_spannung, dazwischen die Freigabe zum Zuschalten (SR-65).';

alter table field_job_type add column pruefprotokoll_id uuid references pruefprotokoll (id) on delete set null;
alter table field_job add column pruefprotokoll_id uuid references pruefprotokoll (id) on delete restrict;

comment on column field_job_type.pruefprotokoll_id is 'SR-91: Prüfprotokoll-Variante der Aufgabe; leer = Standard-Prüfliste.';
comment on column field_job.pruefprotokoll_id is 'SR-91: Variante beim Anlegen des Auftrags übernommen, danach fest.';

-- Variante beim Anlegen vom Aufgabentyp übernehmen; danach nicht mehr ändern.
create or replace function fn_field_job_pruefprotokoll()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.pruefprotokoll_id is null then
      select t.pruefprotokoll_id into new.pruefprotokoll_id from field_job_type t where t.id = new.field_job_type_id;
    end if;
  elsif new.pruefprotokoll_id is distinct from old.pruefprotokoll_id and old.pruefprotokoll_id is not null then
    raise exception 'Die Prüfprotokoll-Variante eines Praxisauftrags bleibt fest (SR-91)' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function fn_field_job_pruefprotokoll() from public, anon, authenticated;
revoke execute on function fn_pruefprotokoll_reihenfolge() from public, anon, authenticated;

create trigger pruefprotokoll_uebernehmen before insert or update of pruefprotokoll_id on field_job
  for each row execute function fn_field_job_pruefprotokoll();

-- ============================================================
-- RLS: lesen alle Angemeldeten (nur veröffentlicht), schreiben AfCJ admin
-- ============================================================
alter table pruefprotokoll enable row level security;
alter table pruefprotokoll_punkt enable row level security;
revoke all on pruefprotokoll, pruefprotokoll_punkt from public, anon, authenticated;
grant select, insert, update, delete on pruefprotokoll, pruefprotokoll_punkt to authenticated;

create policy pruefprotokoll_read_published on pruefprotokoll
  for select to authenticated
  using (status = 'published');
create policy pruefprotokoll_admin_all on pruefprotokoll
  for all to authenticated
  using (fn_is_afcj_admin())
  with check (fn_is_afcj_admin());

create policy pruefprotokoll_punkt_read_published on pruefprotokoll_punkt
  for select to authenticated
  using (exists (
    select 1 from pruefprotokoll p where p.id = pruefprotokoll_punkt.pruefprotokoll_id and p.status = 'published'
  ));
create policy pruefprotokoll_punkt_admin_all on pruefprotokoll_punkt
  for all to authenticated
  using (fn_is_afcj_admin())
  with check (fn_is_afcj_admin());

-- ============================================================
-- Prüfliste je Auftrag (intern)
-- ============================================================
create or replace function fn_praxis_pruefliste_job(v field_job)
returns table (id text, teil text, nr int)
language sql
stable
security definer
set search_path = public
as $$
  select p.kennung, p.teil, p.nr
  from pruefprotokoll_punkt p
  where v.pruefprotokoll_id is not null and p.pruefprotokoll_id = v.pruefprotokoll_id
  union all
  select s.id, s.teil, s.nr
  from fn_praxis_pruefliste() s
  where v.pruefprotokoll_id is null;
$$;

revoke execute on function fn_praxis_pruefliste_job(field_job) from public, anon, authenticated;

-- ============================================================
-- Prüf-Funktionen mit der Prüfliste des Auftrags (Ersatz von 0065)
-- ============================================================
create or replace function fn_praxis_pruefe_gate_zuschalten(v field_job)
returns void
language plpgsql
stable
set search_path = public
as $$
begin
  if v.phase <> 'ausfuehren' then
    raise exception 'Freigabe zum Zuschalten nur in Ausführen' using errcode = '23514';
  end if;
  if not fn_praxis_schritte_erledigt(v) then
    raise exception 'Erst alle Arbeitsschritte abhaken' using errcode = '23514';
  end if;
  if exists (
    select 1 from fn_praxis_pruefliste_job(v) p
    where p.teil = 'spannungsfrei'
      and not exists (
        select 1 from jsonb_array_elements(coalesce(v.praxisflow -> 'kontrolle', '[]'::jsonb)) k
        where k ->> 'id' = p.id
      )
  ) then
    raise exception 'Erst alle Prüfungen ohne Spannung abhaken' using errcode = '23514';
  end if;
end;
$$;

create or replace function fn_praxis_pruefe_ausfuehren(v field_job)
returns void
language plpgsql
stable
set search_path = public
as $$
begin
  if not fn_praxis_schritte_erledigt(v) then
    raise exception 'Noch nicht alle Arbeitsschritte erledigt' using errcode = '23514';
  end if;
  if exists (
    select 1 from fn_praxis_pruefliste_job(v) p
    where not exists (
      select 1 from jsonb_array_elements(coalesce(v.praxisflow -> 'kontrolle', '[]'::jsonb)) k
      where k ->> 'id' = p.id
    )
  ) then
    raise exception 'Noch nicht alle Messungen erledigt' using errcode = '23514';
  end if;
  if not exists (
    select 1 from field_job_datei d
    where d.field_job_id = v.id and d.art = 'protokoll'
  ) then
    raise exception 'Erst das Prüfprotokoll hochladen' using errcode = '23514';
  end if;
end;
$$;

create or replace function fn_praxis_pruefe_kontrollieren(v field_job)
returns void
language plpgsql
stable
set search_path = public
as $$
begin
  if exists (
    select 1 from fn_praxis_pruefliste_job(v) p
    where not exists (
      select 1 from jsonb_array_elements(coalesce(v.praxisflow -> 'deutungen', '[]'::jsonb)) d
      where d ->> 'id' = p.id and char_length(btrim(coalesce(d ->> 'text', ''))) > 0
    )
  ) then
    raise exception 'Erst zu jedem Prüfpunkt deinen Messwert deuten' using errcode = '23514';
  end if;
end;
$$;

create or replace function fn_praxis_kontrolle_abhaken(p_job uuid, p_punkt text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v field_job;
  v_punkt record;
  v_kontrolle jsonb;
  v_flow jsonb;
begin
  v := fn_praxis_eigener_job(p_job);
  if v.phase <> 'ausfuehren' then
    raise exception 'Messen geht nur in der Phase Ausführen' using errcode = '23514';
  end if;
  if not fn_praxis_schritte_erledigt(v) then
    raise exception 'Erst alle Arbeitsschritte abhaken' using errcode = '23514';
  end if;
  select * into v_punkt from fn_praxis_pruefliste_job(v) p where p.id = p_punkt;
  if not found then
    raise exception 'Prüfpunkt nicht gefunden' using errcode = 'P0002';
  end if;
  v_kontrolle := coalesce(v.praxisflow -> 'kontrolle', '[]'::jsonb);
  if exists (select 1 from jsonb_array_elements(v_kontrolle) k where k ->> 'id' = p_punkt) then
    return v.praxisflow;
  end if;
  if v_punkt.teil = 'unter_spannung' and not (v.praxisflow ? 'zuschalten_freigegeben_am') then
    raise exception 'Prüfungen unter Spannung erst nach der Freigabe zum Zuschalten' using errcode = '23514';
  end if;
  if exists (
    select 1 from fn_praxis_pruefliste_job(v) p
    where p.nr < v_punkt.nr
      and not exists (select 1 from jsonb_array_elements(v_kontrolle) k where k ->> 'id' = p.id)
  ) then
    raise exception 'Erst die früheren Prüfpunkte abhaken' using errcode = '23514';
  end if;
  v_flow := jsonb_set(
    v.praxisflow, '{kontrolle}',
    v_kontrolle || jsonb_build_array(jsonb_build_object('id', p_punkt, 'am', now()))
  );
  update field_job set praxisflow = v_flow where id = v.id;
  return v_flow;
end;
$$;

create or replace function fn_praxis_deutung_speichern(p_job uuid, p_punkt text, p_text text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v field_job;
  v_text text;
  v_flow jsonb;
begin
  v := fn_praxis_eigener_job(p_job);
  if v.phase <> 'kontrollieren' then
    raise exception 'Deuten geht nur in der Phase Kontrollieren' using errcode = '23514';
  end if;
  if not exists (select 1 from fn_praxis_pruefliste_job(v) p where p.id = p_punkt) then
    raise exception 'Prüfpunkt nicht gefunden' using errcode = 'P0002';
  end if;
  v_text := btrim(coalesce(p_text, ''));
  if char_length(v_text) < 1 or char_length(v_text) > 1000 then
    raise exception 'Bitte 1 bis 1000 Zeichen' using errcode = '23514';
  end if;
  v_flow := jsonb_set(
    v.praxisflow, '{deutungen}',
    coalesce((
      select jsonb_agg(d) from jsonb_array_elements(coalesce(v.praxisflow -> 'deutungen', '[]'::jsonb)) d
      where d ->> 'id' <> p_punkt
    ), '[]'::jsonb) || jsonb_build_array(jsonb_build_object('id', p_punkt, 'text', v_text, 'am', now()))
  );
  update field_job set praxisflow = v_flow where id = v.id;
  return v_flow;
end;
$$;
