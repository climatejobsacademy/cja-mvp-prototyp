-- 0058_praxisflow_ablauf.sql
-- SR-64 (Praxisaufgabe in Phasen und Schritten, serverseitig in Reihenfolge),
-- SR-08 (kleine, atomare Schreibvorgänge). Entscheidungen 06.11.2026
-- (decisions.md, praxisflow-realbau.md Abschnitt 5).
--
-- Nur additiv:
--   - field_job_type.ablauf: 'einfach' (bisheriger Praxistag, Standard) oder
--     'gefuehrt' (Praxisflow in sechs Phasen). Rückfall ohne Datenverlust.
--   - field_job.phase, field_job.phase_seit, field_job.praxisflow (jsonb):
--     Phase und Fortschritt je Praxistag. Lernende haben darauf kein
--     Schreibrecht (Spaltenrechte aus 0012 bleiben unverändert); geschrieben
--     wird nur über die Funktionen unten.
--   - Funktionen für Planen, Abhaken und den Wechsel der Phase von
--     Informieren bis Kontrollieren. Kontrollieren, Bewerten und Abschluss
--     folgen in eigenen Migrationen (Dateien, Codewort, Einschätzung); bis
--     dahin lehnen die Prüffunktionen den Wechsel ab.
--
-- Aufbau von field_job.praxisflow (alle Schlüssel optional):
--   werkzeuge, materialien, schritte: [{id, text}]
--   erledigt: [{id, am}]                  abgehakte Arbeitsschritte
--   plan_bestaetigt_am: timestamptz       Entscheiden
--   verlauf: [{zeit, ereignis}]           für die Zusammenfassung (SR-90)

-- ============================================================
-- Spalten
-- ============================================================
alter table field_job_type
  add column ablauf text not null default 'einfach'
    constraint field_job_type_ablauf_check check (ablauf in ('einfach', 'gefuehrt'));

comment on column field_job_type.ablauf is
  'SR-64: einfach = bisheriger Praxistag (Standard), gefuehrt = Praxisflow in sechs Phasen.';

alter table field_job
  add column phase text not null default 'informieren'
    constraint field_job_phase_check check (phase in (
      'informieren', 'planen', 'entscheiden', 'ausfuehren',
      'kontrollieren', 'bewerten', 'abgeschlossen'
    )),
  add column phase_seit timestamptz,
  add column praxisflow jsonb not null default '{}'::jsonb
    constraint field_job_praxisflow_objekt check (jsonb_typeof(praxisflow) = 'object');

comment on column field_job.phase is
  'SR-64: Phase im Praxisflow (nur bei field_job_type.ablauf = gefuehrt von Bedeutung). Schreiben nur über fn_praxis_*.';
comment on column field_job.praxisflow is
  'SR-64: Fortschritt im Praxisflow (Plan, Haken, Verlauf). Schreiben nur über fn_praxis_*.';

-- ============================================================
-- Interne Hilfsfunktionen (nicht über die API aufrufbar)
-- ============================================================

-- Reihenfolge der Phasen (1 = informieren … 7 = abgeschlossen).
create or replace function fn_praxis_phase_nr(p_phase text)
returns int
language sql
immutable
set search_path = public
as $$
  select array_position(array[
    'informieren', 'planen', 'entscheiden', 'ausfuehren',
    'kontrollieren', 'bewerten', 'abgeschlossen'
  ], p_phase);
$$;

-- Eigener Praxistag im geführten Ablauf, gesperrt für die laufende
-- Transaktion. Fremde Praxistage und Praxistage im einfachen Ablauf gelten
-- als nicht gefunden.
create or replace function fn_praxis_eigener_job(p_job uuid)
returns field_job
language plpgsql
security definer
set search_path = public
as $$
declare
  v field_job;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet' using errcode = '42501';
  end if;
  select fj.* into v
  from field_job fj
  join field_job_type t on t.id = fj.field_job_type_id
  where fj.id = p_job
    and fj.learner_id = auth.uid()
    and t.ablauf = 'gefuehrt'
  for update of fj;
  if not found then
    raise exception 'Praxistag nicht gefunden' using errcode = 'P0002';
  end if;
  return v;
end;
$$;

-- Eintrag im Verlauf anhängen.
create or replace function fn_praxis_mit_verlauf(p_flow jsonb, p_ereignis text)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_set(
    p_flow,
    '{verlauf}',
    coalesce(p_flow -> 'verlauf', '[]'::jsonb)
      || jsonb_build_array(jsonb_build_object('zeit', now(), 'ereignis', p_ereignis))
  );
$$;

-- Liste aus Texten: leere Einträge entfallen, höchstens 50 Einträge mit
-- höchstens 300 Zeichen. Jeder Eintrag bekommt eine neue id.
create or replace function fn_praxis_liste(p_texte text[])
returns jsonb
language plpgsql
volatile
set search_path = public
as $$
declare
  v jsonb;
begin
  if coalesce(cardinality(p_texte), 0) > 50 then
    raise exception 'Höchstens 50 Einträge je Liste' using errcode = '23514';
  end if;
  if exists (select 1 from unnest(p_texte) t where char_length(btrim(t)) > 300) then
    raise exception 'Höchstens 300 Zeichen je Eintrag' using errcode = '23514';
  end if;
  select coalesce(
    jsonb_agg(jsonb_build_object('id', gen_random_uuid()::text, 'text', btrim(u.t)) order by u.nr),
    '[]'::jsonb
  )
  into v
  from unnest(p_texte) with ordinality as u(t, nr)
  where u.t is not null and btrim(u.t) <> '';
  return v;
end;
$$;

-- Voraussetzungen für das Verlassen einer Phase. Jede Funktion wirft einen
-- Fehler, wenn die Voraussetzung fehlt. Spätere Migrationen ersetzen
-- einzelne Funktionen (Dateien: informieren; Codewort: kontrollieren;
-- Einschätzung: bewerten).
create or replace function fn_praxis_pruefe_informieren(v field_job)
returns void
language plpgsql
stable
set search_path = public
as $$
begin
  -- Pflicht-Upload des Arbeitsauftrags folgt mit den Dateien (SR-88).
  return;
end;
$$;

create or replace function fn_praxis_pruefe_planen(v field_job)
returns void
language plpgsql
stable
set search_path = public
as $$
begin
  if jsonb_array_length(coalesce(v.praxisflow -> 'schritte', '[]'::jsonb)) < 1 then
    raise exception 'Der Plan braucht mindestens einen Arbeitsschritt' using errcode = '23514';
  end if;
end;
$$;

create or replace function fn_praxis_pruefe_entscheiden(v field_job)
returns void
language plpgsql
stable
set search_path = public
as $$
begin
  return;
end;
$$;

create or replace function fn_praxis_pruefe_ausfuehren(v field_job)
returns void
language plpgsql
stable
set search_path = public
as $$
begin
  if exists (
    select 1
    from jsonb_array_elements(coalesce(v.praxisflow -> 'schritte', '[]'::jsonb)) s
    where not exists (
      select 1
      from jsonb_array_elements(coalesce(v.praxisflow -> 'erledigt', '[]'::jsonb)) e
      where e ->> 'id' = s ->> 'id'
    )
  ) then
    raise exception 'Noch nicht alle Arbeitsschritte erledigt' using errcode = '23514';
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
  raise exception 'Kontrollieren ist noch nicht freigeschaltet' using errcode = '0A000';
end;
$$;

create or replace function fn_praxis_pruefe_bewerten(v field_job)
returns void
language plpgsql
stable
set search_path = public
as $$
begin
  raise exception 'Bewerten endet über den Abschluss' using errcode = '0A000';
end;
$$;

revoke execute on function fn_praxis_phase_nr(text) from public, anon, authenticated;
revoke execute on function fn_praxis_eigener_job(uuid) from public, anon, authenticated;
revoke execute on function fn_praxis_mit_verlauf(jsonb, text) from public, anon, authenticated;
revoke execute on function fn_praxis_liste(text[]) from public, anon, authenticated;
revoke execute on function fn_praxis_pruefe_informieren(field_job) from public, anon, authenticated;
revoke execute on function fn_praxis_pruefe_planen(field_job) from public, anon, authenticated;
revoke execute on function fn_praxis_pruefe_entscheiden(field_job) from public, anon, authenticated;
revoke execute on function fn_praxis_pruefe_ausfuehren(field_job) from public, anon, authenticated;
revoke execute on function fn_praxis_pruefe_kontrollieren(field_job) from public, anon, authenticated;
revoke execute on function fn_praxis_pruefe_bewerten(field_job) from public, anon, authenticated;

-- ============================================================
-- Aufrufe der App (security definer, nur eigener Praxistag)
-- ============================================================

-- Planen: Werkzeuge, Materialien und Arbeitsschritte speichern. Nur in der
-- Phase planen; ersetzt die bisherigen Listen.
create or replace function fn_praxis_plan_speichern(
  p_job uuid,
  p_werkzeuge text[],
  p_materialien text[],
  p_schritte text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v field_job;
  v_flow jsonb;
begin
  v := fn_praxis_eigener_job(p_job);
  if v.phase <> 'planen' then
    raise exception 'Der Plan lässt sich nur in der Phase Planen ändern' using errcode = '23514';
  end if;
  v_flow := v.praxisflow
    || jsonb_build_object(
      'werkzeuge', fn_praxis_liste(p_werkzeuge),
      'materialien', fn_praxis_liste(p_materialien),
      'schritte', fn_praxis_liste(p_schritte),
      'erledigt', '[]'::jsonb
    );
  update field_job set praxisflow = v_flow where id = v.id;
  return v_flow;
end;
$$;

-- Nächste Phase. p_von ist die Phase, die die App gerade zeigt. Steht der
-- Praxistag schon weiter, bleibt alles, wie es ist (wiederholter Aufruf,
-- SR-08). Gibt die Phase nach dem Aufruf zurück.
create or replace function fn_praxis_weiter(p_job uuid, p_von text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v field_job;
  v_nach text;
  v_flow jsonb;
begin
  v := fn_praxis_eigener_job(p_job);
  if fn_praxis_phase_nr(p_von) is null then
    raise exception 'Unbekannte Phase' using errcode = '22023';
  end if;
  if v.phase <> p_von then
    if fn_praxis_phase_nr(v.phase) > fn_praxis_phase_nr(p_von) then
      return v.phase;
    end if;
    raise exception 'Der Praxistag steht in einer früheren Phase' using errcode = '23514';
  end if;

  case p_von
    when 'informieren' then perform fn_praxis_pruefe_informieren(v); v_nach := 'planen';
    when 'planen' then perform fn_praxis_pruefe_planen(v); v_nach := 'entscheiden';
    when 'entscheiden' then perform fn_praxis_pruefe_entscheiden(v); v_nach := 'ausfuehren';
    when 'ausfuehren' then perform fn_praxis_pruefe_ausfuehren(v); v_nach := 'kontrollieren';
    when 'kontrollieren' then perform fn_praxis_pruefe_kontrollieren(v); v_nach := 'bewerten';
    when 'bewerten' then perform fn_praxis_pruefe_bewerten(v); v_nach := 'abgeschlossen';
    else raise exception 'Der Praxistag ist abgeschlossen' using errcode = '23514';
  end case;

  v_flow := fn_praxis_mit_verlauf(v.praxisflow, 'phase:' || v_nach);
  if p_von = 'entscheiden' then
    v_flow := v_flow || jsonb_build_object('plan_bestaetigt_am', now());
  end if;

  update field_job
  set phase = v_nach,
      phase_seit = now(),
      praxisflow = v_flow,
      -- Ende von Ausführen gilt als Durchführung; der Trigger aus 0011 setzt
      -- daraus den Status.
      durchgefuehrt_bestaetigt_am = case
        when p_von = 'ausfuehren' then coalesce(durchgefuehrt_bestaetigt_am, now())
        else durchgefuehrt_bestaetigt_am
      end
  where id = v.id;
  return v_nach;
end;
$$;

-- Entscheiden: zurück zum Plan.
create or replace function fn_praxis_zurueck_zum_plan(p_job uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v field_job;
begin
  v := fn_praxis_eigener_job(p_job);
  if v.phase = 'planen' then
    return v.phase;
  end if;
  if v.phase <> 'entscheiden' then
    raise exception 'Zurück zum Plan geht nur aus Entscheiden' using errcode = '23514';
  end if;
  update field_job
  set phase = 'planen',
      phase_seit = now(),
      praxisflow = fn_praxis_mit_verlauf(v.praxisflow, 'zurueck:planen')
  where id = v.id;
  return 'planen';
end;
$$;

-- Ausführen: einen Arbeitsschritt abhaken, nur in der Reihenfolge des Plans.
-- Ein schon abgehakter Schritt bleibt unverändert (wiederholter Aufruf).
create or replace function fn_praxis_schritt_abhaken(p_job uuid, p_schritt text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v field_job;
  v_pos int;
  v_flow jsonb;
  v_erledigt jsonb;
begin
  v := fn_praxis_eigener_job(p_job);
  if v.phase <> 'ausfuehren' then
    raise exception 'Abhaken geht nur in der Phase Ausführen' using errcode = '23514';
  end if;
  v_erledigt := coalesce(v.praxisflow -> 'erledigt', '[]'::jsonb);

  select s.nr into v_pos
  from jsonb_array_elements(coalesce(v.praxisflow -> 'schritte', '[]'::jsonb)) with ordinality as s(el, nr)
  where s.el ->> 'id' = p_schritt;
  if v_pos is null then
    raise exception 'Arbeitsschritt nicht gefunden' using errcode = 'P0002';
  end if;

  if exists (select 1 from jsonb_array_elements(v_erledigt) e where e ->> 'id' = p_schritt) then
    return v.praxisflow;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v.praxisflow -> 'schritte') with ordinality as s(el, nr)
    where s.nr < v_pos
      and not exists (select 1 from jsonb_array_elements(v_erledigt) e where e ->> 'id' = s.el ->> 'id')
  ) then
    raise exception 'Erst die früheren Arbeitsschritte abhaken' using errcode = '23514';
  end if;

  v_flow := jsonb_set(
    v.praxisflow,
    '{erledigt}',
    v_erledigt || jsonb_build_array(jsonb_build_object('id', p_schritt, 'am', now()))
  );
  update field_job set praxisflow = v_flow where id = v.id;
  return v_flow;
end;
$$;

revoke execute on function fn_praxis_plan_speichern(uuid, text[], text[], text[]) from public, anon;
revoke execute on function fn_praxis_weiter(uuid, text) from public, anon;
revoke execute on function fn_praxis_zurueck_zum_plan(uuid) from public, anon;
revoke execute on function fn_praxis_schritt_abhaken(uuid, text) from public, anon;
grant execute on function fn_praxis_plan_speichern(uuid, text[], text[], text[]) to authenticated;
grant execute on function fn_praxis_weiter(uuid, text) to authenticated;
grant execute on function fn_praxis_zurueck_zum_plan(uuid) to authenticated;
grant execute on function fn_praxis_schritt_abhaken(uuid, text) to authenticated;
