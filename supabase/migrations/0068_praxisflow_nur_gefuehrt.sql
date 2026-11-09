-- 0068_praxisflow_nur_gefuehrt.sql
-- SR-64 (Acceptance Check geändert am 09.11.2026): Alle Praxisaufgaben
-- laufen im geführten Ablauf, auch Aufträge, die vorher im einfachen Ablauf
-- bestätigt wurden. Der Schalter einfach/geführt entfällt fachlich; die
-- Spalte field_job_type.ablauf bleibt technisch bestehen (die Funktionen
-- fn_praxis_* prüfen sie), Standard und alle Werte sind jetzt 'gefuehrt'.
-- In Texten für Lernende heißt der einzelne Auftrag „Praxisauftrag“.
--
-- Datenänderung: alle Zeilen in field_job_type auf ablauf = 'gefuehrt'.
-- Ersetzt (nur Meldungstexte): fn_praxis_eigener_job, fn_praxis_weiter
-- (0058), fn_praxis_codewort_entsperren (0060).

alter table field_job_type alter column ablauf set default 'gefuehrt';
update field_job_type set ablauf = 'gefuehrt' where ablauf <> 'gefuehrt';

comment on column field_job_type.ablauf is
  'SR-64: seit 0068 immer gefuehrt (einfacher Ablauf entfallen); bleibt technisch für fn_praxis_*.';

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
    raise exception 'Praxisauftrag nicht gefunden' using errcode = 'P0002';
  end if;
  return v;
end;
$$;

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
    raise exception 'Der Praxisauftrag steht in einer früheren Phase' using errcode = '23514';
  end if;

  case p_von
    when 'informieren' then perform fn_praxis_pruefe_informieren(v); v_nach := 'planen';
    when 'planen' then perform fn_praxis_pruefe_planen(v); v_nach := 'entscheiden';
    when 'entscheiden' then perform fn_praxis_pruefe_entscheiden(v); v_nach := 'ausfuehren';
    when 'ausfuehren' then perform fn_praxis_pruefe_ausfuehren(v); v_nach := 'kontrollieren';
    when 'kontrollieren' then perform fn_praxis_pruefe_kontrollieren(v); v_nach := 'bewerten';
    when 'bewerten' then perform fn_praxis_pruefe_bewerten(v); v_nach := 'abgeschlossen';
    else raise exception 'Der Praxisauftrag ist abgeschlossen' using errcode = '23514';
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
  insert into praxis_codewort_versuch (created_at, organisation_id, field_job_id, gate, art, person_id)
  select clock_timestamp(), fj.organisation_id, fj.id, p_gate, 'entsperrt', auth.uid()
  from field_job fj where fj.id = p_job;
  if not found then
    raise exception 'Praxisauftrag nicht gefunden' using errcode = 'P0002';
  end if;
end;
$$;
