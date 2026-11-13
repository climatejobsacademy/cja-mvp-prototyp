-- 0066_praxisflow_reflexion_pflicht.sql
-- SR-90 (Acceptance Check ergänzt am 09.11.2026): Vor dem Abschluss
-- beantworten Lernende die Frage „Was machst du beim nächsten Mal anders?“
-- mit mindestens einem Satz, auch nach einem K.-o.; ohne Antwort lehnt der
-- Server den Abschluss ab.
--
-- Nur Ersatz von fn_praxis_abschliessen (Fassung aus 0065); sonst unverändert.

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
  -- Reflexion ist Pflicht (SR-90, 09.11.2026), auch nach einem K.-o.
  if v_text is null or char_length(v_text) < 3 then
    raise exception 'Schreib kurz auf, was du beim nächsten Mal anders machst' using errcode = '23514';
  end if;
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
            - 'zuschalten_freigegeben_am' - 'bewertung_freigegeben_am' - 'einschaetzung' - 'deutungen')
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
