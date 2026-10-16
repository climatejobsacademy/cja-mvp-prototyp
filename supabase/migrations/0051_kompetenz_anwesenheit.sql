-- 0051_kompetenz_anwesenheit.sql
-- SR-63 ergänzt (Anna 2026-10-16): Live-Lektionen zählen für einen
-- theoretischen Teilschritt als erledigt, sobald die Anwesenheit bestätigt ist
-- (attendance, Status 'anwesend', aktueller Wert ohne spätere Korrektur über
-- attendance_aktuell aus 0032). Bisher zählte nur unit_progress =
-- 'abgeschlossen'; für Live-Lektionen gibt es in der App keinen Weg dorthin,
-- dadurch wurden Teilschritte mit Live- und Selbstlern-Lektion nie erfüllt.
--
-- Nur die View competency_fulfilment ändert sich (create or replace, gleiche
-- Spalten wie 0021/0022, Grants bleiben). Die AND-Logik bleibt: ein
-- Teilschritt ist erst erfüllt, wenn ALLE zugeordneten Lektionen erledigt sind.
-- Keine Tabellen, keine Policies, keine Daten werden geändert; attendance
-- bleibt unveränderlich (Regel 7, SR-07). Learner sehen weiter nur eigene
-- Zeilen (security_invoker: Rechte der Basistabellen).
--
-- Die App rechnet dieselbe Regel in src/lib/queries/lektionen-erledigt.ts.

create or replace view competency_fulfilment
  with (security_invoker = true)
as
  with
  -- Zuordnungen je Teilschritt. SR-67: theoretische Teilschritte hängen nur an
  -- Lektionen, praktische nur an Field-Job-Typen.
  lektionen_je_step as (
    select competency_step_id, count(distinct lesson_id)::int as gesamt
    from content_competency_mapping
    group by competency_step_id
  ),
  jobtypen_je_step as (
    select competency_step_id, count(distinct field_job_type_id)::int as gesamt
    from field_job_type_competency_mapping
    group by competency_step_id
  ),
  -- Erledigte Lektionen je Learner: abgeschlossen (unit_progress) oder -- bei
  -- Live-Lektionen -- bestätigte Anwesenheit an einem Termin der Lektion
  -- (aktueller Wert ohne spätere Korrektur, attendance_aktuell aus 0032).
  erledigte_lektionen as (
    select up.learner_id, up.lesson_id
    from unit_progress up
    where up.status = 'abgeschlossen'
    union
    select a.learner_id, ls.lesson_id
    from attendance_aktuell a
    join live_session ls on ls.id = a.live_session_id
    where a.status = 'anwesend' and ls.lesson_id is not null
  ),
  -- erledigte zugeordnete Lektionen je Learner und Teilschritt
  theorie_erledigt as (
    select el.learner_id, ccm.competency_step_id, count(distinct el.lesson_id)::int as erledigt
    from erledigte_lektionen el
    join content_competency_mapping ccm on ccm.lesson_id = el.lesson_id
    group by el.learner_id, ccm.competency_step_id
  ),
  -- zugeordnete Field-Job-Typen mit mindestens einer verifizierten
  -- Selbstauskunft je Learner und Teilschritt
  praxis_erledigt as (
    select fc.learner_id, fjtcm.competency_step_id, count(distinct fj.field_job_type_id)::int as erledigt
    from field_capture fc
    join field_job fj on fj.id = fc.field_job_id
    join field_job_type_competency_mapping fjtcm on fjtcm.field_job_type_id = fj.field_job_type_id
    where fc.status = 'verified'
    group by fc.learner_id, fjtcm.competency_step_id
  ),
  -- SR-70: AND auf Teilschritt-Ebene. Teilschritte ohne Zuordnung erscheinen
  -- in keiner der beiden Mengen und sind damit nie erfüllt.
  step_erfuellt as (
    select t.learner_id, t.competency_step_id
    from theorie_erledigt t
    join lektionen_je_step l on l.competency_step_id = t.competency_step_id
    where t.erledigt = l.gesamt
    union
    select p.learner_id, p.competency_step_id
    from praxis_erledigt p
    join jobtypen_je_step j on j.competency_step_id = p.competency_step_id
    where p.erledigt = j.gesamt
  ),
  -- ab hier wie 0021 (SR-68): AND auf Kompetenz-Ebene
  gesamt as (
    select competency_id, count(*)::int as teilschritte_gesamt
    from competency_competency_step
    group by competency_id
  ),
  erfuellt as (
    select
      se.learner_id,
      ccs.competency_id,
      count(distinct se.competency_step_id)::int as teilschritte_erfuellt
    from step_erfuellt se
    join competency_competency_step ccs on ccs.competency_step_id = se.competency_step_id
    group by se.learner_id, ccs.competency_id
  )
  select
    e.learner_id,
    e.competency_id,
    g.teilschritte_gesamt,
    e.teilschritte_erfuellt,
    (e.teilschritte_erfuellt = g.teilschritte_gesamt and g.teilschritte_gesamt > 0) as erfuellt
  from erfuellt e
  join gesamt g on g.competency_id = e.competency_id;

comment on view competency_fulfilment is
  'SR-63/SR-68: Erfüllungsstatus je Learner und Kompetenz mit AND-Logik auf beiden '
  'Ebenen -- Teilschritt erfüllt erst bei allen zugeordneten Lektionen (abgeschlossen '
  'oder, bei Live-Lektionen, bestätigte Anwesenheit; 0051) bzw. Field-Job-Typen, '
  'Kompetenz erst bei allen Teilschritten. Kein Write für irgendeine Rolle. Zugriff '
  'wird durch security_invoker von den Basistabellen geerbt.';
