-- 0064_praxisflow_ereignisse.sql
-- SR-92: Der Praxisflow speichert Interaktionen der Lernenden als Ereignisse
-- (Zeitpunkt, Praxisauftrag, Phase, Schritt, Ereignisart), ohne Inhalte,
-- Dateinamen oder Freitext. Lernende erzeugen Ereignisse nur über die
-- vorgesehenen Aufrufe, lesen, ändern und löschen sie nicht; eine Zeile
-- lässt sich nicht nachträglich ändern. Ausgewertet wird nur aggregiert
-- (scripts/praxis-auswertung.sql, nur lesend). Entscheidung 09.11.2026.
--
-- Zwei Quellen:
--   - Datenbank (Trigger, zuverlässig): Datei hochgeladen/gelöscht,
--     Freigabe erfolgreich/fehlgeschlagen, Plan geändert, Phasenwechsel,
--     Rücksprung (Zurück zum Plan, K.-o.), Abschluss.
--   - App (fn_praxis_ereignis_melden): Schritt geöffnet/beendet, Hilfe oder
--     Vorschau geöffnet. Nur diese Arten, nur für eigene Praxisaufträge im
--     geführten Ablauf, höchstens 20 je Aufruf.
--
-- Löschweg: Zeilen hängen per on delete cascade an field_job und person.

create table praxis_ereignis (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),

  organisation_id uuid not null references organisation (id) on delete cascade,
  field_job_id uuid not null references field_job (id) on delete cascade,
  learner_id uuid not null references person (id) on delete cascade,
  phase text not null check (phase in (
    'informieren', 'planen', 'entscheiden', 'ausfuehren', 'kontrollieren', 'bewerten', 'abgeschlossen'
  )),
  -- Kennung des Schritts in der App (z. B. "plaene", "tun:<id>", "a:a1")
  -- oder der Art bzw. des Gates; nie Inhalt oder Dateiname.
  schritt text check (schritt is null or schritt ~ '^[a-z0-9:_-]{1,80}$'),
  art text not null check (art in (
    'schritt_geoeffnet', 'schritt_beendet', 'hilfe_geoeffnet', 'vorschau_geoeffnet',
    'datei_hochgeladen', 'datei_geloescht', 'plan_geaendert',
    'freigabe_ok', 'freigabe_fehler', 'phase_gewechselt', 'ruecksprung', 'abschluss'
  ))
);

create index praxis_ereignis_job_idx on praxis_ereignis (field_job_id, created_at);
create index praxis_ereignis_zeit_idx on praxis_ereignis (created_at);

comment on table praxis_ereignis is
  'SR-92: Ereignisse im Praxisflow ohne Inhalte. Nur Einfügen über Trigger und fn_praxis_ereignis_melden; keine Änderung; Auswertung nur aggregiert.';

-- Keine Änderung, auch nicht für AfCJ admin (wie 0032).
create trigger unveraenderlich before update on praxis_ereignis
  for each row execute function fn_unveraenderlich();

alter table praxis_ereignis enable row level security;

revoke all on praxis_ereignis from public, anon, authenticated;
grant select on praxis_ereignis to authenticated;

-- Lesen nur AfCJ admin (Auswertung); Lernende und Trainer:innen nicht.
create policy praxis_ereignis_admin_lesen on praxis_ereignis
  for select to authenticated
  using (fn_is_afcj_admin());

-- ============================================================
-- Schreiben (intern)
-- ============================================================
create or replace function fn_praxis_ereignis_schreiben(p_job uuid, p_art text, p_schritt text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into praxis_ereignis (organisation_id, field_job_id, learner_id, phase, schritt, art)
  select fj.organisation_id, fj.id, fj.learner_id, fj.phase, p_schritt, p_art
  from field_job fj
  join field_job_type t on t.id = fj.field_job_type_id and t.ablauf = 'gefuehrt'
  where fj.id = p_job;
$$;

revoke execute on function fn_praxis_ereignis_schreiben(uuid, text, text) from public, anon, authenticated;

-- Dateien: hochgeladen oder gelöscht, Schritt = Art der Datei.
create or replace function fn_praxis_ereignis_datei()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform fn_praxis_ereignis_schreiben(new.field_job_id, 'datei_hochgeladen', new.art);
  else
    perform fn_praxis_ereignis_schreiben(old.field_job_id, 'datei_geloescht', old.art);
  end if;
  return null;
end;
$$;

create trigger praxis_ereignis after insert or delete on field_job_datei
  for each row execute function fn_praxis_ereignis_datei();

-- Codewort: Erfolg oder Fehlversuch, Schritt = Gate. Entsperren zählt nicht.
create or replace function fn_praxis_ereignis_codewort()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.art in ('erfolg', 'fehlversuch') then
    perform fn_praxis_ereignis_schreiben(
      new.field_job_id,
      case new.art when 'erfolg' then 'freigabe_ok' else 'freigabe_fehler' end,
      new.gate);
  end if;
  return null;
end;
$$;

create trigger praxis_ereignis after insert on praxis_codewort_versuch
  for each row execute function fn_praxis_ereignis_codewort();

-- Praxisauftrag: Planänderung und neue Einträge im Verlauf.
create or replace function fn_praxis_ereignis_job()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_neu text;
  v_art text;
begin
  if new.praxisflow -> 'werkzeuge' is distinct from old.praxisflow -> 'werkzeuge'
     or new.praxisflow -> 'materialien' is distinct from old.praxisflow -> 'materialien'
     or new.praxisflow -> 'schritte' is distinct from old.praxisflow -> 'schritte' then
    insert into praxis_ereignis (organisation_id, field_job_id, learner_id, phase, schritt, art)
    values (new.organisation_id, new.id, new.learner_id, new.phase, 'plan', 'plan_geaendert');
  end if;
  for v_neu in
    select e ->> 'ereignis'
    from jsonb_array_elements(coalesce(new.praxisflow -> 'verlauf', '[]'::jsonb)) with ordinality as x(e, nr)
    where x.nr > jsonb_array_length(coalesce(old.praxisflow -> 'verlauf', '[]'::jsonb))
  loop
    v_art := case split_part(v_neu, ':', 1)
      when 'phase' then 'phase_gewechselt'
      when 'zurueck' then 'ruecksprung'
      when 'ko' then 'ruecksprung'
      when 'abgeschlossen' then 'abschluss'
      else null
    end;
    if v_art is not null then
      insert into praxis_ereignis (organisation_id, field_job_id, learner_id, phase, schritt, art)
      values (new.organisation_id, new.id, new.learner_id, new.phase,
              lower(regexp_replace(v_neu, '[^a-zA-Z0-9:_-]', '', 'g')), v_art);
    end if;
  end loop;
  return null;
end;
$$;

create trigger praxis_ereignis after update of praxisflow on field_job
  for each row
  when (old.praxisflow is distinct from new.praxisflow)
  execute function fn_praxis_ereignis_job();

revoke execute on function fn_praxis_ereignis_datei() from public, anon, authenticated;
revoke execute on function fn_praxis_ereignis_codewort() from public, anon, authenticated;
revoke execute on function fn_praxis_ereignis_job() from public, anon, authenticated;

-- ============================================================
-- Aufruf der App: Ereignisse aus der Oberfläche melden
-- p_ereignisse: [{"art": "schritt_geoeffnet", "schritt": "plaene"}, …]
-- Gibt die Zahl der gespeicherten Ereignisse zurück.
-- ============================================================
create or replace function fn_praxis_ereignis_melden(p_job uuid, p_ereignisse jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v field_job;
  v_anzahl int;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet' using errcode = '42501';
  end if;
  if jsonb_typeof(p_ereignisse) <> 'array' or jsonb_array_length(p_ereignisse) > 20 then
    raise exception 'Höchstens 20 Ereignisse je Aufruf' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_ereignisse) e
    where coalesce(e ->> 'art', '') not in ('schritt_geoeffnet', 'schritt_beendet', 'hilfe_geoeffnet', 'vorschau_geoeffnet')
       or coalesce(e ->> 'schritt', '') !~ '^[a-z0-9:_-]{1,80}$'
  ) then
    raise exception 'Unbekanntes Ereignis' using errcode = '22023';
  end if;

  select fj.* into v
  from field_job fj
  join field_job_type t on t.id = fj.field_job_type_id
  where fj.id = p_job and fj.learner_id = auth.uid() and t.ablauf = 'gefuehrt';
  if not found then
    raise exception 'Praxisauftrag nicht gefunden' using errcode = 'P0002';
  end if;

  insert into praxis_ereignis (created_at, updated_at, organisation_id, field_job_id, learner_id, phase, schritt, art)
  select clock_timestamp(), clock_timestamp(), v.organisation_id, v.id, v.learner_id, v.phase, e ->> 'schritt', e ->> 'art'
  from jsonb_array_elements(p_ereignisse) with ordinality as x(e, nr)
  order by x.nr;
  get diagnostics v_anzahl = row_count;
  return v_anzahl;
end;
$$;

revoke execute on function fn_praxis_ereignis_melden(uuid, jsonb) from public, anon;
grant execute on function fn_praxis_ereignis_melden(uuid, jsonb) to authenticated;
