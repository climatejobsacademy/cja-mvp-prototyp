-- 0062_praxisflow_planfreigabe.sql
-- SR-65 (im Pilot drei Gates: Plan-Freigabe vor dem Ausführen, Zuschalten
-- der Spannung, Trainer-Einschätzung), SR-64 (Entscheiden endet erst mit der
-- Plan-Freigabe durch die Trainer:in). Feedback der Trainer:innen vom
-- 09.11.2026, Entscheidungen in decisions.md.
--
-- Nur additiv bzw. Ersatz von Funktionen:
--   - praxis_codewort_versuch.gate kennt zusätzlich 'plan'.
--   - fn_praxis_gate: Gate 'plan' in Entscheiden, setzt
--     praxisflow.plan_freigegeben_am. Das Codewort wird wie beim Zuschalten
--     jedes Mal neu eingegeben, nichts wird gespeichert.
--   - fn_praxis_pruefe_entscheiden (Ersatz von 0058): ohne Plan-Freigabe
--     geht es nicht zu Ausführen.
--   - fn_praxis_zurueck_zum_plan (Ersatz von 0058): wer den Plan noch einmal
--     ändert, braucht danach eine neue Plan-Freigabe.
--
-- Neuer Schlüssel in field_job.praxisflow:
--   plan_freigegeben_am: timestamptz

alter table praxis_codewort_versuch drop constraint praxis_codewort_versuch_gate_check;
alter table praxis_codewort_versuch add constraint praxis_codewort_versuch_gate_check
  check (gate in ('plan', 'zuschalten', 'bewertung'));

-- Voraussetzung für das Gate Plan.
create or replace function fn_praxis_pruefe_gate_plan(v field_job)
returns void
language plpgsql
stable
set search_path = public
as $$
begin
  if v.phase <> 'entscheiden' then
    raise exception 'Plan-Freigabe nur in Entscheiden' using errcode = '23514';
  end if;
  if jsonb_array_length(coalesce(v.praxisflow -> 'schritte', '[]'::jsonb)) < 1 then
    raise exception 'Der Plan braucht mindestens einen Arbeitsschritt' using errcode = '23514';
  end if;
end;
$$;

revoke execute on function fn_praxis_pruefe_gate_plan(field_job) from public, anon, authenticated;

-- Entscheiden endet erst mit der Plan-Freigabe. Ersetzt die Fassung aus 0058.
create or replace function fn_praxis_pruefe_entscheiden(v field_job)
returns void
language plpgsql
stable
set search_path = public
as $$
begin
  if not (v.praxisflow ? 'plan_freigegeben_am') then
    raise exception 'Erst gibt die Trainer:in den Plan frei' using errcode = '23514';
  end if;
end;
$$;

-- Gates Plan (Entscheiden) und Zuschalten (Kontrollieren). true, wenn das
-- Codewort stimmt oder das Gate schon offen ist, sonst false. Die
-- Trainer-Einschätzung prüft ihr Codewort beim Speichern selbst (0061).
-- Ersetzt die Fassung aus 0060.
create or replace function fn_praxis_gate(p_job uuid, p_gate text, p_codewort text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v field_job;
  v_schluessel text;
begin
  if p_gate not in ('plan', 'zuschalten') then
    raise exception 'Unbekanntes Gate' using errcode = '22023';
  end if;
  v_schluessel := p_gate || '_freigegeben_am';
  v := fn_praxis_eigener_job(p_job);
  if v.praxisflow ? v_schluessel then
    return true;
  end if;
  if p_gate = 'plan' then
    perform fn_praxis_pruefe_gate_plan(v);
  else
    perform fn_praxis_pruefe_gate_zuschalten(v);
  end if;
  if not fn_praxis_codewort_ok(v, p_gate, p_codewort) then
    return false;
  end if;
  update field_job
  set praxisflow = fn_praxis_mit_verlauf(
        v.praxisflow || jsonb_build_object(v_schluessel, now()),
        'gate:' || p_gate)
  where id = v.id;
  return true;
end;
$$;

-- Entscheiden: zurück zum Plan. Eine schon erteilte Plan-Freigabe verfällt,
-- der geänderte Plan braucht eine neue. Ersetzt die Fassung aus 0058.
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
      praxisflow = fn_praxis_mit_verlauf(v.praxisflow - 'plan_freigegeben_am', 'zurueck:planen')
  where id = v.id;
  return 'planen';
end;
$$;
