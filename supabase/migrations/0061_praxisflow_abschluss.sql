-- 0061_praxisflow_abschluss.sql
-- SR-89 (Selbst-, Peer- und Trainer-Einschätzung; nur ein K.-o.-Kriterium
-- mit 0 in der Trainer-Einschätzung verhindert die Anrechnung), SR-03
-- (automatische Verifizierung beim Abschluss im Praxisflow), SR-90
-- (Zusammenfassung: alle Angaben bleiben in field_job.praxisflow).
-- Entscheidungen 06.11.2026 (decisions.md).
--
-- Nur additiv: Funktionen.
-- Keine neue Tabelle. Regel 6 (CLAUDE.md) bleibt: Nachweise entstehen nur
-- über eine Verifizierung; hier legt sie das System an.
--
-- Ablauf in Bewerten:
--   1. Selbsteinschätzung, 2. Peer-Einschätzung (nur Rolle, keine Person),
--   3. Trainer-Einschätzung, genau einmal, nur zusammen mit dem Codewort im
--      selben Aufruf (Gate bewertung); danach sind Selbst und Peer fest,
--   4. Abschluss: field_capture (phase abschluss) und, wenn kein
--      K.-o.-Kriterium der Trainer-Einschätzung 0 ist und dem Praxistag eine
--      Trainer:in zugeordnet ist, eine verification 'verified' mit dieser
--      Trainer:in als Prüfer:in. Was Lernende nach einem K.-o. tun, ist
--      offen (Feedback der Trainer:innen); bis dahin endet der Auftrag ohne
--      Anrechnung.
--
-- Neue Schlüssel in field_job.praxisflow:
--   einschaetzung: {selbst: {kriterium: punkte}, peer: {…}, trainer: {…}}
--   naechstes_mal: text, abgeschlossen_am: timestamptz,
--   ergebnis: 'angerechnet' | 'ko' | 'ohne_trainer'

-- ============================================================
-- Bewertungsbogen (Standard für alle Aufträge im Pilot, ids wie demo).
-- Die Texte stehen in der App.
-- ============================================================
create or replace function fn_praxis_bewertungsbogen()
returns table (id text, skala int[], ko boolean, nr int)
language sql
immutable
set search_path = public
as $$
  values
    ('funktion', array[10, 0], true, 1),
    ('ausfuehrung', array[10, 9, 7, 5, 3, 0], false, 2),
    ('schutz', array[10, 0], true, 3),
    ('protokoll', array[10, 9, 7, 5, 3, 0], false, 4),
    ('unterlagen', array[10, 9, 7, 5, 3, 0], false, 5);
$$;

-- Ist eine Einschätzung vollständig und gültig? Genau die Kriterien des
-- Bogens, je eine ganze Zahl aus der Skala des Kriteriums.
create or replace function fn_praxis_einschaetzung_gueltig(p_werte jsonb)
returns boolean
language sql
immutable
set search_path = public
as $$
  select jsonb_typeof(p_werte) = 'object'
    and (select count(*) from jsonb_object_keys(p_werte)) = (select count(*) from fn_praxis_bewertungsbogen())
    and not exists (
      select 1 from fn_praxis_bewertungsbogen() b
      where not case
        when jsonb_typeof(p_werte -> b.id) = 'number' and (p_werte ->> b.id) ~ '^[0-9]+$'
          then (p_werte ->> b.id)::int = any (b.skala)
        else false
      end
    );
$$;

revoke execute on function fn_praxis_bewertungsbogen() from public, anon, authenticated;
revoke execute on function fn_praxis_einschaetzung_gueltig(jsonb) from public, anon, authenticated;

-- ============================================================
-- Aufrufe der App
-- ============================================================

-- Selbst- oder Peer-Einschätzung speichern; änderbar, bis die Trainer-
-- Einschätzung gespeichert ist. Peer erst nach der Selbsteinschätzung.
create or replace function fn_praxis_einschaetzen(p_job uuid, p_rolle text, p_werte jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v field_job;
  v_flow jsonb;
begin
  if p_rolle not in ('selbst', 'peer') then
    raise exception 'Unbekannte Rolle' using errcode = '22023';
  end if;
  v := fn_praxis_eigener_job(p_job);
  if v.phase <> 'bewerten' then
    raise exception 'Einschätzen geht nur in der Phase Bewerten' using errcode = '23514';
  end if;
  if v.praxisflow #> '{einschaetzung,trainer}' is not null then
    raise exception 'Nach der Trainer-Einschätzung sind Selbst- und Peer-Einschätzung fest' using errcode = '23514';
  end if;
  if not coalesce(fn_praxis_einschaetzung_gueltig(p_werte), false) then
    raise exception 'Einschätzung unvollständig oder außerhalb der Skala' using errcode = '23514';
  end if;
  if p_rolle = 'peer' and v.praxisflow #> '{einschaetzung,selbst}' is null then
    raise exception 'Erst die Selbsteinschätzung abgeben' using errcode = '23514';
  end if;

  v_flow := jsonb_set(
    v.praxisflow || jsonb_build_object('einschaetzung', coalesce(v.praxisflow -> 'einschaetzung', '{}'::jsonb)),
    array['einschaetzung', p_rolle],
    p_werte
  );
  v_flow := fn_praxis_mit_verlauf(v_flow, 'einschaetzung:' || p_rolle);
  update field_job set praxisflow = v_flow where id = v.id;
  return v_flow;
end;
$$;

-- Trainer-Einschätzung speichern, nur zusammen mit dem Codewort im selben
-- Aufruf (Entscheidung 06.11.2026: das Codewort wird immer neu eingegeben,
-- kein Speichern ohne Codewort). Genau einmal; Selbst und Peer müssen
-- vorliegen. true = gespeichert, false = Codewort falsch (Fehlversuch
-- protokolliert, Gate bewertung). Gesperrt: 55P03.
create or replace function fn_praxis_trainer_einschaetzen(p_job uuid, p_werte jsonb, p_codewort text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v field_job;
  v_flow jsonb;
begin
  v := fn_praxis_eigener_job(p_job);
  if v.phase <> 'bewerten' then
    raise exception 'Einschätzen geht nur in der Phase Bewerten' using errcode = '23514';
  end if;
  if v.praxisflow #> '{einschaetzung,trainer}' is not null then
    raise exception 'Die Trainer-Einschätzung ist schon gespeichert' using errcode = '23514';
  end if;
  if not coalesce(fn_praxis_einschaetzung_gueltig(v.praxisflow #> '{einschaetzung,selbst}'), false)
     or not coalesce(fn_praxis_einschaetzung_gueltig(v.praxisflow #> '{einschaetzung,peer}'), false) then
    raise exception 'Erst Selbst- und Peer-Einschätzung abgeben' using errcode = '23514';
  end if;
  if not coalesce(fn_praxis_einschaetzung_gueltig(p_werte), false) then
    raise exception 'Einschätzung unvollständig oder außerhalb der Skala' using errcode = '23514';
  end if;
  if not fn_praxis_codewort_ok(v, 'bewertung', p_codewort) then
    return false;
  end if;

  v_flow := jsonb_set(v.praxisflow, '{einschaetzung,trainer}', p_werte)
    || jsonb_build_object('bewertung_freigegeben_am', now());
  v_flow := fn_praxis_mit_verlauf(v_flow, 'einschaetzung:trainer');
  update field_job set praxisflow = v_flow where id = v.id;
  return true;
end;
$$;

-- Abschluss. Gibt das Ergebnis zurück: angerechnet, ko oder ohne_trainer.
create or replace function fn_praxis_abschliessen(p_job uuid, p_naechstes_mal text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v field_job;
  v_ko boolean;
  v_ergebnis text;
  v_capture uuid;
  v_text text;
begin
  v := fn_praxis_eigener_job(p_job);
  if v.phase = 'abgeschlossen' then
    return v.praxisflow ->> 'ergebnis';
  end if;
  if v.phase <> 'bewerten' then
    raise exception 'Abschließen geht nur aus Bewerten' using errcode = '23514';
  end if;
  if v.praxisflow #> '{einschaetzung,trainer}' is null then
    raise exception 'Erst die Trainer-Einschätzung' using errcode = '23514';
  end if;
  v_text := nullif(btrim(coalesce(p_naechstes_mal, '')), '');
  if char_length(v_text) > 2000 then
    raise exception 'Höchstens 2000 Zeichen' using errcode = '23514';
  end if;
  if exists (select 1 from field_capture c where c.field_job_id = v.id and c.phase = 'abschluss') then
    raise exception 'Zu diesem Praxistag gibt es schon einen Abschluss' using errcode = '23505';
  end if;

  select exists (
    select 1 from fn_praxis_bewertungsbogen() b
    where b.ko and (v.praxisflow #>> array['einschaetzung', 'trainer', b.id])::int = 0
  ) into v_ko;

  v_ergebnis := case
    when v_ko then 'ko'
    when v.instructor_id is null then 'ohne_trainer'
    else 'angerechnet'
  end;

  -- Abschluss-Selbstauskunft; der Trigger aus 0018 leitet die Teilschritte ab.
  insert into field_capture (organisation_id, learner_id, field_job_id, phase, text)
  values (v.organisation_id, v.learner_id, v.id, 'abschluss', v_text)
  returning id into v_capture;

  if v_ergebnis = 'angerechnet' then
    insert into verification (organisation_id, field_capture_id, verifiziert_von, entscheidung, kommentar)
    values (v.organisation_id, v_capture, v.instructor_id, 'verified', 'automatisch, Praxisflow (SR-03)');
  end if;

  update field_job
  set phase = 'abgeschlossen',
      phase_seit = now(),
      praxisflow = fn_praxis_mit_verlauf(
        v.praxisflow || jsonb_build_object(
          'naechstes_mal', v_text,
          'abgeschlossen_am', now(),
          'ergebnis', v_ergebnis
        ),
        'abgeschlossen:' || v_ergebnis)
  where id = v.id;
  return v_ergebnis;
end;
$$;

revoke execute on function fn_praxis_einschaetzen(uuid, text, jsonb) from public, anon;
revoke execute on function fn_praxis_trainer_einschaetzen(uuid, jsonb, text) from public, anon;
grant execute on function fn_praxis_trainer_einschaetzen(uuid, jsonb, text) to authenticated;
revoke execute on function fn_praxis_abschliessen(uuid, text) from public, anon;
grant execute on function fn_praxis_einschaetzen(uuid, text, jsonb) to authenticated;
grant execute on function fn_praxis_abschliessen(uuid, text) to authenticated;
