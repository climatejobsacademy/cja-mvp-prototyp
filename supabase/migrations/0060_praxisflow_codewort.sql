-- 0060_praxisflow_codewort.sql
-- SR-65 (Trainer-Gate mit Codewort, serverseitig, nur als Hash, Fehlversuche
-- mit Sperre), SR-64 (Kontrollieren in Reihenfolge), SR-88 (Prüfprotokoll
-- ist Pflicht). Entscheidungen 06.11.2026 (decisions.md): ein Codewort je
-- Kohorte für beide Gates, vor dem Zuschalten der Spannung (Kontrollieren)
-- und vor der Trainer-Einschätzung (Bewerten).
--
-- Nur additiv:
--   - praxis_codewort: Hash je Kohorte. Kein Lese- oder Schreibrecht für
--     Lernende und Trainer:innen; AfCJ admin setzt es über
--     fn_praxis_codewort_setzen. Das Codewort selbst steht nirgends im Repo.
--     Ohne organisation_id, wie cohort (AfCJ-eigene Einstellung je Kohorte).
--   - praxis_codewort_versuch: Protokoll der Versuche je Praxistag und Gate.
--     Nach 5 Fehlversuchen seit dem letzten Erfolg oder der letzten
--     Entsperrung ist das Gate gesperrt; AfCJ admin hebt die Sperre auf.
--   - Prüfliste Kontrollieren (ids wie demo: a1–a4 spannungsfrei, c1–c2
--     unter Spannung); die Texte stehen in der App.
--   - fn_praxis_gate, fn_praxis_kontrolle_abhaken; Ersatz von
--     fn_praxis_pruefe_kontrollieren (0058): Kontrollieren endet mit allen
--     Prüfpunkten und hochgeladenem Prüfprotokoll.
--
-- Neue Schlüssel in field_job.praxisflow:
--   kontrolle: [{id, am}]
--   zuschalten_freigegeben_am, bewertung_freigegeben_am: timestamptz

-- ============================================================
-- Tabellen
-- ============================================================
create table praxis_codewort (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  cohort_id uuid not null unique references cohort (id) on delete cascade,
  hash text not null,
  geaendert_von uuid references person (id)
);

create trigger set_updated_at before update on praxis_codewort
  for each row execute function set_updated_at();

comment on table praxis_codewort is
  'SR-65: Codewort der Trainer:innen je Kohorte, nur als Hash (bcrypt). Nicht lesbar für Lernende und Trainer:innen.';

alter table praxis_codewort enable row level security;
revoke all on praxis_codewort from public, anon, authenticated;
grant select on praxis_codewort to authenticated;

-- Nur AfCJ admin liest (z. B. ob ein Codewort gesetzt ist); geschrieben
-- wird nur über fn_praxis_codewort_setzen.
create policy praxis_codewort_admin_lesen on praxis_codewort
  for select to authenticated
  using (fn_is_afcj_admin());

create table praxis_codewort_versuch (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  organisation_id uuid not null references organisation (id) on delete cascade,
  field_job_id uuid not null references field_job (id) on delete cascade,
  gate text not null check (gate in ('zuschalten', 'bewertung')),
  art text not null check (art in ('fehlversuch', 'erfolg', 'entsperrt')),
  person_id uuid references person (id)
);

create index praxis_codewort_versuch_job_gate_idx on praxis_codewort_versuch (field_job_id, gate, created_at);

create trigger set_updated_at before update on praxis_codewort_versuch
  for each row execute function set_updated_at();

comment on table praxis_codewort_versuch is
  'SR-65: Versuche am Trainer-Gate je Praxistag. Geschrieben nur über fn_praxis_gate und fn_praxis_codewort_entsperren.';

alter table praxis_codewort_versuch enable row level security;
revoke all on praxis_codewort_versuch from public, anon, authenticated;
grant select on praxis_codewort_versuch to authenticated;

create policy praxis_codewort_versuch_admin_lesen on praxis_codewort_versuch
  for select to authenticated
  using (fn_is_afcj_admin());

-- ============================================================
-- Hilfsfunktionen (nicht über die API aufrufbar)
-- ============================================================

-- Kohorte eines Praxistags über den Plan-Eintrag der Einschreibung.
create or replace function fn_praxis_kohorte(p_job uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.cohort_id
  from schedule_entry se
  join enrolment e on e.id = se.enrolment_id
  where se.field_job_id = p_job
  limit 1;
$$;

-- Prüfliste Kontrollieren (Standard für alle Aufträge im Pilot).
create or replace function fn_praxis_pruefliste()
returns table (id text, teil text, nr int)
language sql
immutable
set search_path = public
as $$
  values
    ('a1', 'spannungsfrei', 1),
    ('a2', 'spannungsfrei', 2),
    ('a3', 'spannungsfrei', 3),
    ('a4', 'spannungsfrei', 4),
    ('c1', 'unter_spannung', 5),
    ('c2', 'unter_spannung', 6);
$$;

-- Fehlversuche seit dem letzten Erfolg oder der letzten Entsperrung.
create or replace function fn_praxis_fehlversuche(p_job uuid, p_gate text)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from praxis_codewort_versuch v
  where v.field_job_id = p_job
    and v.gate = p_gate
    and v.art = 'fehlversuch'
    and v.created_at > coalesce((
      select max(w.created_at) from praxis_codewort_versuch w
      where w.field_job_id = p_job and w.gate = p_gate and w.art in ('erfolg', 'entsperrt')
    ), '-infinity'::timestamptz);
$$;

-- Voraussetzung je Gate. 0061 ersetzt fn_praxis_pruefe_gate_bewertung.
create or replace function fn_praxis_pruefe_gate_zuschalten(v field_job)
returns void
language plpgsql
stable
set search_path = public
as $$
begin
  if v.phase <> 'kontrollieren' then
    raise exception 'Freigabe zum Zuschalten nur in Kontrollieren' using errcode = '23514';
  end if;
  if exists (
    select 1 from fn_praxis_pruefliste() p
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

create or replace function fn_praxis_pruefe_gate_bewertung(v field_job)
returns void
language plpgsql
stable
set search_path = public
as $$
begin
  if v.phase <> 'bewerten' then
    raise exception 'Freigabe zur Trainer-Einschätzung nur in Bewerten' using errcode = '23514';
  end if;
end;
$$;

-- Kontrollieren endet mit allen Prüfpunkten und dem Prüfprotokoll.
-- Ersetzt die Fassung aus 0058.
create or replace function fn_praxis_pruefe_kontrollieren(v field_job)
returns void
language plpgsql
stable
set search_path = public
as $$
begin
  if exists (
    select 1 from fn_praxis_pruefliste() p
    where not exists (
      select 1 from jsonb_array_elements(coalesce(v.praxisflow -> 'kontrolle', '[]'::jsonb)) k
      where k ->> 'id' = p.id
    )
  ) then
    raise exception 'Noch nicht alle Prüfpunkte erledigt' using errcode = '23514';
  end if;
  if not exists (
    select 1 from field_job_datei d
    where d.field_job_id = v.id and d.art = 'protokoll'
  ) then
    raise exception 'Erst das Prüfprotokoll hochladen' using errcode = '23514';
  end if;
end;
$$;

revoke execute on function fn_praxis_kohorte(uuid) from public, anon, authenticated;
revoke execute on function fn_praxis_pruefliste() from public, anon, authenticated;
revoke execute on function fn_praxis_fehlversuche(uuid, text) from public, anon, authenticated;
revoke execute on function fn_praxis_pruefe_gate_zuschalten(field_job) from public, anon, authenticated;
revoke execute on function fn_praxis_pruefe_gate_bewertung(field_job) from public, anon, authenticated;
revoke execute on function fn_praxis_pruefe_kontrollieren(field_job) from public, anon, authenticated;

-- ============================================================
-- Aufrufe der App
-- ============================================================

-- Kontrollieren: einen Prüfpunkt abhaken, in der Reihenfolge der Prüfliste.
-- Punkte unter Spannung erst nach der Freigabe zum Zuschalten.
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
  if v.phase <> 'kontrollieren' then
    raise exception 'Abhaken geht nur in der Phase Kontrollieren' using errcode = '23514';
  end if;
  select * into v_punkt from fn_praxis_pruefliste() p where p.id = p_punkt;
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
    select 1 from fn_praxis_pruefliste() p
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

-- Trainer-Gate. Gibt true zurück, wenn das Codewort stimmt (oder das Gate
-- schon offen ist), sonst false; ein Fehlversuch wird protokolliert und
-- bleibt auch bei false gespeichert. Gesperrt: Fehler 42501.
-- Die Zeile des Praxistags ist für die Dauer des Aufrufs gesperrt, damit
-- gleichzeitige Versuche die Zählung nicht umgehen.
create or replace function fn_praxis_gate(p_job uuid, p_gate text, p_codewort text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v field_job;
  v_schluessel text;
  v_hash text;
begin
  if p_gate not in ('zuschalten', 'bewertung') then
    raise exception 'Unbekanntes Gate' using errcode = '22023';
  end if;
  v := fn_praxis_eigener_job(p_job);
  v_schluessel := p_gate || '_freigegeben_am';
  if v.praxisflow ? v_schluessel then
    return true;
  end if;
  if p_gate = 'zuschalten' then
    perform fn_praxis_pruefe_gate_zuschalten(v);
  else
    perform fn_praxis_pruefe_gate_bewertung(v);
  end if;
  if fn_praxis_fehlversuche(v.id, p_gate) >= 5 then
    raise exception 'Gate gesperrt, bitte AfCJ melden' using errcode = '42501';
  end if;

  select c.hash into v_hash from praxis_codewort c where c.cohort_id = fn_praxis_kohorte(v.id);
  if v_hash is null
     or extensions.crypt(lower(btrim(coalesce(p_codewort, ''))), v_hash) <> v_hash then
    insert into praxis_codewort_versuch (organisation_id, field_job_id, gate, art, person_id)
    values (v.organisation_id, v.id, p_gate, 'fehlversuch', auth.uid());
    return false;
  end if;

  insert into praxis_codewort_versuch (organisation_id, field_job_id, gate, art, person_id)
  values (v.organisation_id, v.id, p_gate, 'erfolg', auth.uid());
  update field_job
  set praxisflow = fn_praxis_mit_verlauf(
        v.praxisflow || jsonb_build_object(v_schluessel, now()),
        'gate:' || p_gate)
  where id = v.id;
  return true;
end;
$$;

-- AfCJ admin: Codewort einer Kohorte setzen oder ändern.
create or replace function fn_praxis_codewort_setzen(p_cohort uuid, p_codewort text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not fn_is_afcj_admin() then
    raise exception 'Nur AfCJ admin' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_codewort, ''))) < 4 then
    raise exception 'Das Codewort braucht mindestens 4 Zeichen' using errcode = '23514';
  end if;
  insert into praxis_codewort (cohort_id, hash, geaendert_von)
  values (p_cohort, extensions.crypt(lower(btrim(p_codewort)), extensions.gen_salt('bf')), auth.uid())
  on conflict (cohort_id) do update
    set hash = excluded.hash, geaendert_von = excluded.geaendert_von;
end;
$$;

-- AfCJ admin: Sperre eines Gates aufheben.
create or replace function fn_praxis_codewort_entsperren(p_job uuid, p_gate text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not fn_is_afcj_admin() then
    raise exception 'Nur AfCJ admin' using errcode = '42501';
  end if;
  insert into praxis_codewort_versuch (organisation_id, field_job_id, gate, art, person_id)
  select fj.organisation_id, fj.id, p_gate, 'entsperrt', auth.uid()
  from field_job fj where fj.id = p_job;
  if not found then
    raise exception 'Praxistag nicht gefunden' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function fn_praxis_kontrolle_abhaken(uuid, text) from public, anon;
revoke execute on function fn_praxis_gate(uuid, text, text) from public, anon;
revoke execute on function fn_praxis_codewort_setzen(uuid, text) from public, anon;
revoke execute on function fn_praxis_codewort_entsperren(uuid, text) from public, anon;
grant execute on function fn_praxis_kontrolle_abhaken(uuid, text) to authenticated;
grant execute on function fn_praxis_gate(uuid, text, text) to authenticated;
grant execute on function fn_praxis_codewort_setzen(uuid, text) to authenticated;
grant execute on function fn_praxis_codewort_entsperren(uuid, text) to authenticated;
