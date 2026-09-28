-- 0022_step_and_logic.sql
-- SR-70 (Produktentscheidung 2026-09-28): AND-Logik auf Teilschritt-Ebene.
-- Ein Teilschritt gilt erst als erfüllt, wenn ALLE zugeordneten Lektionen
-- (theoretisch) bzw. ALLE zugeordneten Field-Job-Typen (praktisch) erfüllt
-- sind -- nicht mehr schon bei der ersten.
--
-- competency_evidence (0006) bleibt bewusst unverändert: sie liefert weiterhin
-- Teilnachweise je Teilschritt (OR, ein Nachweis je abgeschlossener Lektion
-- bzw. verifizierter Selbstauskunft). competency_fulfilment rechnet deshalb
-- nicht mehr aus competency_evidence, sondern direkt aus denselben Quellen wie
-- das Frontend (src/lib/queries/competencies.ts, SR-69):
--   theoretisch: unit_progress.status = 'abgeschlossen' je zugeordneter Lektion
--   praktisch:   field_capture.status = 'verified' zu einem field_job je
--                zugeordnetem Field-Job-Typ
-- Abweichung von der Entscheidung 2026-09-04 ("Kompetenzprofil ausschließlich
-- aus competency_evidence"), dokumentiert in data-model.md.
--
-- Spalten, Reihenfolge und Typen bleiben wie in 0021, daher create or replace;
-- die Grants aus 0021 (nur select für authenticated) bleiben erhalten.
-- security_invoker = true: Zugriff weiter über die Basistabellen (Learner nur
-- eigene Zeilen und Zuordnungen zu veröffentlichten Lektionen/Typen).

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
  -- abgeschlossene zugeordnete Lektionen je Learner und Teilschritt
  theorie_erledigt as (
    select up.learner_id, ccm.competency_step_id, count(distinct up.lesson_id)::int as erledigt
    from unit_progress up
    join content_competency_mapping ccm on ccm.lesson_id = up.lesson_id
    where up.status = 'abgeschlossen'
    group by up.learner_id, ccm.competency_step_id
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
  'SR-68/SR-70: Erfüllungsstatus je Learner und Kompetenz mit AND-Logik auf beiden '
  'Ebenen -- Teilschritt erfüllt erst bei allen zugeordneten Lektionen bzw. '
  'Field-Job-Typen, Kompetenz erst bei allen Teilschritten. Berechnet aus unit_progress '
  'und verifizierten field_capture-Zeilen, kein Write für irgendeine Rolle. Zugriff wird '
  'durch security_invoker von den Basistabellen geerbt.';
