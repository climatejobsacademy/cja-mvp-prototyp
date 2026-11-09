-- 0065_praxisflow_variante_b.sql
-- SR-64 (Phasen nach Variante B, Entscheidung 09.11.2026): Ausführen umfasst
-- die Arbeitsschritte und das Messen (Prüfliste, Freigabe zum Zuschalten,
-- Prüfprotokoll am Ende von Ausführen); Kontrollieren heißt Messwerte
-- deuten: zu jedem Prüfpunkt ein Freitext zu Bedeutung und Grenzwert,
-- Pflicht; Bewerten bleibt die Einschätzung. SR-65 (Zuschalten jetzt in
-- Ausführen), SR-89 (K.-o.-Rücksprung leert auch die Deutungen).
-- Die Phasen-Kennungen in field_job.phase bleiben unverändert.
--
-- Nur Ersatz von Funktionen und eine neue Funktion, keine Tabelle:
--   - fn_praxis_kontrolle_abhaken (0060): in Ausführen, erst nach allen
--     Arbeitsschritten.
--   - fn_praxis_pruefe_gate_zuschalten (0060): in Ausführen.
--   - fn_praxis_pruefe_ausfuehren (0058): Arbeitsschritte, alle Prüfpunkte
--     und Prüfprotokoll.
--   - fn_praxis_pruefe_kontrollieren (0060): zu jedem Prüfpunkt eine Deutung.
--   - fn_praxis_deutung_speichern (neu): Deutung je Prüfpunkt, änderbar bis
--     Kontrollieren abgeschlossen ist.
--   - fn_praxis_abschliessen (0063): K.-o. leert zusätzlich die Deutungen.
--
-- Neuer Schlüssel in field_job.praxisflow:
--   deutungen: [{id, text, am}]

-- Alle Arbeitsschritte abgehakt? (intern)
create or replace function fn_praxis_schritte_erledigt(v field_job)
returns boolean
language sql
stable
set search_path = public
as $$
  select not exists (
    select 1
    from jsonb_array_elements(coalesce(v.praxisflow -> 'schritte', '[]'::jsonb)) s
    where not exists (
      select 1 from jsonb_array_elements(coalesce(v.praxisflow -> 'erledigt', '[]'::jsonb)) e
      where e ->> 'id' = s ->> 'id'
    )
  );
$$;

revoke execute on function fn_praxis_schritte_erledigt(field_job) from public, anon, authenticated;

-- Voraussetzung für das Gate Zuschalten: in Ausführen nach allen
-- Arbeitsschritten und allen Prüfungen ohne Spannung. Ersetzt 0060.
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

-- Ausführen endet mit allen Arbeitsschritten, allen Prüfpunkten und dem
-- Prüfprotokoll. Ersetzt 0058.
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
    select 1 from fn_praxis_pruefliste() p
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

-- Kontrollieren endet, wenn jeder Prüfpunkt gedeutet ist. Ersetzt 0060.
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
      select 1 from jsonb_array_elements(coalesce(v.praxisflow -> 'deutungen', '[]'::jsonb)) d
      where d ->> 'id' = p.id and char_length(btrim(coalesce(d ->> 'text', ''))) > 0
    )
  ) then
    raise exception 'Erst zu jedem Prüfpunkt deinen Messwert deuten' using errcode = '23514';
  end if;
end;
$$;

-- Messen: einen Prüfpunkt abhaken, in Ausführen nach allen Arbeitsschritten,
-- in der Reihenfolge der Prüfliste; unter Spannung erst nach der Freigabe.
-- Ersetzt 0060.
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

-- Kontrollieren: Deutung zu einem Prüfpunkt speichern (Bedeutung des
-- Messwerts, Grenzwert). Ersetzt eine frühere Deutung desselben Punkts.
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
  if not exists (select 1 from fn_praxis_pruefliste() p where p.id = p_punkt) then
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

revoke execute on function fn_praxis_deutung_speichern(uuid, text, text) from public, anon;
grant execute on function fn_praxis_deutung_speichern(uuid, text, text) to authenticated;

-- Abschluss wie 0063; beim K.-o. werden zusätzlich die Deutungen geleert.
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
