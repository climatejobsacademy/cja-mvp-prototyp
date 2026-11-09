-- 0063_praxisflow_ko_ruecksprung.sql
-- SR-89 (Trainer-Einschätzung Pflicht, Selbst- und Peer-Einschätzung
-- optional; nur ein K.-o. in der Trainer-Einschätzung führt zurück zu
-- Informieren), SR-64 (derselbe Praxisauftrag springt zurück, Dateien und
-- Verlauf bleiben), SR-03 (Verifizierung erst beim erfolgreichen Durchlauf).
-- Entscheidungen 09.11.2026 (decisions.md).
--
-- Nur Ersatz von Funktionen aus 0061, keine neue Tabelle:
--   - fn_praxis_einschaetzen: Peer ohne Selbsteinschätzung möglich.
--   - fn_praxis_trainer_einschaetzen: Selbst und Peer sind keine
--     Voraussetzung mehr.
--   - fn_praxis_abschliessen: bei K.-o. kein Abschluss. Der Durchlauf wird
--     unter praxisflow.durchlaeufe abgelegt (Einschätzungen, Freitext,
--     Zeitpunkt), Haken, Freigaben und Einschätzungen werden geleert, der
--     Plan bleibt als Ausgangspunkt, die Phase springt auf informieren.
--     Es entsteht kein field_capture und keine verification; erst ein
--     erfolgreicher Durchlauf legt beides an. Dateien (field_job_datei)
--     bleiben unberührt.
--
-- Neuer Schlüssel in field_job.praxisflow:
--   durchlaeufe: [{nr, ergebnis: 'ko', einschaetzung, naechstes_mal, am}]

-- Selbst- oder Peer-Einschätzung speichern, beide optional; änderbar, bis
-- die Trainer-Einschätzung gespeichert ist. Ersetzt die Fassung aus 0061.
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
-- Aufruf; genau einmal je Durchlauf. Selbst und Peer sind optional.
-- true = gespeichert, false = Codewort falsch. Ersetzt die Fassung aus 0061.
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
  if not coalesce(fn_praxis_einschaetzung_gueltig(p_werte), false) then
    raise exception 'Einschätzung unvollständig oder außerhalb der Skala' using errcode = '23514';
  end if;
  if not fn_praxis_codewort_ok(v, 'bewertung', p_codewort) then
    return false;
  end if;

  v_flow := jsonb_set(
    v.praxisflow || jsonb_build_object('einschaetzung', coalesce(v.praxisflow -> 'einschaetzung', '{}'::jsonb)),
    '{einschaetzung,trainer}',
    p_werte
  ) || jsonb_build_object('bewertung_freigegeben_am', now());
  v_flow := fn_praxis_mit_verlauf(v_flow, 'einschaetzung:trainer');
  update field_job set praxisflow = v_flow where id = v.id;
  return true;
end;
$$;

-- Abschluss. Gibt das Ergebnis zurück: angerechnet, ko oder ohne_trainer.
-- Bei ko springt der Praxisauftrag zurück zu Informieren (kein Abschluss).
-- Ersetzt die Fassung aus 0061.
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
  v_durchlaeufe jsonb;
begin
  v := fn_praxis_eigener_job(p_job);
  if v.phase = 'abgeschlossen' then
    return v.praxisflow ->> 'ergebnis';
  end if;
  -- Wiederholter Aufruf direkt nach einem K.-o.-Rücksprung (SR-08).
  if v.phase = 'informieren' and v.praxisflow -> 'verlauf' -> -1 ->> 'ereignis' = 'ko:informieren' then
    return 'ko';
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

  select exists (
    select 1 from fn_praxis_bewertungsbogen() b
    where b.ko and (v.praxisflow #>> array['einschaetzung', 'trainer', b.id])::int = 0
  ) into v_ko;

  if v_ko then
    v_durchlaeufe := coalesce(v.praxisflow -> 'durchlaeufe', '[]'::jsonb);
    update field_job
    set phase = 'informieren',
        phase_seit = now(),
        praxisflow = fn_praxis_mit_verlauf(
          (v.praxisflow
            - 'erledigt' - 'plan_bestaetigt_am' - 'plan_freigegeben_am' - 'kontrolle'
            - 'zuschalten_freigegeben_am' - 'bewertung_freigegeben_am' - 'einschaetzung')
          || jsonb_build_object('durchlaeufe', v_durchlaeufe || jsonb_build_array(jsonb_build_object(
               'nr', jsonb_array_length(v_durchlaeufe) + 1,
               'ergebnis', 'ko',
               'einschaetzung', v.praxisflow -> 'einschaetzung',
               'naechstes_mal', v_text,
               'am', now()))),
          'ko:informieren')
    where id = v.id;
    return 'ko';
  end if;

  if exists (select 1 from field_capture c where c.field_job_id = v.id and c.phase = 'abschluss') then
    raise exception 'Zu diesem Praxisauftrag gibt es schon einen Abschluss' using errcode = '23505';
  end if;

  v_ergebnis := case when v.instructor_id is null then 'ohne_trainer' else 'angerechnet' end;

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
