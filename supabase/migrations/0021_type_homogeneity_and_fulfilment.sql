-- 0021_type_homogeneity_and_fulfilment.sql
-- Migration C (Entscheidung LD-Runde 2026-09-23), zwei Teile:
--
-- SR-67: Typ-Homogenität der Teilschritt-Zuordnungen über competency_step.typ.
-- content_competency_mapping (Lektion -> Teilschritt) nimmt nur theoretische,
-- field_job_type_competency_mapping (Field-Job-Typ -> Teilschritt) nur
-- praktische Teilschritte auf. Damit kann ein Teilschritt auch nie in beiden
-- Tabellen gleichzeitig stehen -- ohne Tabellen-übergreifende Prüfung, die
-- bei nebenläufigen Inserts umgangen werden könnte.
--
-- SR-68: AND-Logik auf Kompetenz-Ebene als View competency_fulfilment. Eine
-- Kompetenz gilt erst als erfüllt, wenn ALLE ihr zugeordneten Teilschritte
-- (competency_competency_step) erfüllt sind. competency_evidence bleibt
-- unverändert auf Teilschritt-Ebene (Knotenpunkt laut data-model.md, SR-01).

-- ============================================================
-- SR-67, Vorab-Prüfung: bestehende Zuordnungen, die der neuen Regel
-- widersprechen, brechen die Migration ab, statt stillschweigend im
-- Bestand zu bleiben (der Trigger prüft nur neue/geänderte Zeilen).
-- ============================================================
do $$
declare
  falsch_theoretisch text;
  falsch_praktisch text;
begin
  select string_agg(distinct cs.id::text, ', ')
    into falsch_theoretisch
  from content_competency_mapping ccm
  join competency_step cs on cs.id = ccm.competency_step_id
  where cs.typ <> 'theoretisch';

  select string_agg(distinct cs.id::text, ', ')
    into falsch_praktisch
  from field_job_type_competency_mapping fjtcm
  join competency_step cs on cs.id = fjtcm.competency_step_id
  where cs.typ <> 'praktisch';

  if falsch_theoretisch is not null or falsch_praktisch is not null then
    raise exception 'SR-67: bestehende Zuordnungen widersprechen der Typ-Regel'
      using detail = format(
        'Nicht-theoretische Teilschritte in content_competency_mapping: %s. '
        'Nicht-praktische Teilschritte in field_job_type_competency_mapping: %s.',
        coalesce(falsch_theoretisch, '-'),
        coalesce(falsch_praktisch, '-')
      ),
      hint = 'Zuordnungen bzw. competency_step.typ bereinigen, dann Migration erneut ausführen.';
  end if;
end $$;

-- ============================================================
-- SR-67, Trigger: eine Funktion für beide Tabellen, erwarteter typ kommt
-- als Trigger-Argument. Kein security definer nötig -- competency_step ist
-- für alle eingeloggten Rollen lesbar (competency_step_read_all, 0009), und
-- schreiben dürfen die beiden Mapping-Tabellen ohnehin nur AfCJ admin.
-- errcode check_violation (23514), damit Aufrufer den Fall wie einen
-- CHECK-Constraint behandeln können.
-- ============================================================
create or replace function fn_check_competency_step_typ()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  erwarteter_typ text := tg_argv[0];
  tatsaechlicher_typ text;
begin
  select typ into tatsaechlicher_typ
  from competency_step
  where id = new.competency_step_id;

  if tatsaechlicher_typ is distinct from erwarteter_typ then
    raise exception 'SR-67: % nimmt nur Teilschritte mit typ = ''%'' auf, competency_step % hat typ = ''%''',
      tg_table_name, erwarteter_typ, new.competency_step_id, coalesce(tatsaechlicher_typ, 'NULL')
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function fn_check_competency_step_typ() is
  'SR-67: prüft, dass der zugeordnete competency_step den per Trigger-Argument '
  'erwarteten typ hat (theoretisch für content_competency_mapping, praktisch für '
  'field_job_type_competency_mapping).';

create trigger check_competency_step_typ
  before insert or update of competency_step_id on content_competency_mapping
  for each row execute function fn_check_competency_step_typ('theoretisch');

create trigger check_competency_step_typ
  before insert or update of competency_step_id on field_job_type_competency_mapping
  for each row execute function fn_check_competency_step_typ('praktisch');

-- ============================================================
-- SR-68: competency_fulfilment -- pro Learner und Kompetenz.
--
-- teilschritte_gesamt: alle der Kompetenz zugeordneten Teilschritte
-- (competency_competency_step, read All für alle eingeloggten Rollen).
-- teilschritte_erfuellt: davon die mit mindestens einem Nachweis in
-- competency_evidence (distinct -- mehrere Nachweise für denselben
-- Teilschritt zählen einmal).
-- erfuellt: AND-Logik, alle zugeordneten Teilschritte erfüllt.
--
-- Eine Zeile entsteht nur, wenn der Learner mindestens einen Teilschritt der
-- Kompetenz erfüllt hat; keine Zeile heißt "nicht erfüllt, 0 Teilschritte".
--
-- security_invoker = true wie competency_evidence: keine eigenen Policies,
-- Zugriff wird von den Basistabellen geerbt (Learner sieht nur die eigenen
-- Nachweise, AfCJ admin alle).
-- ============================================================
create view competency_fulfilment
  with (security_invoker = true)
as
  with gesamt as (
    select competency_id, count(*)::int as teilschritte_gesamt
    from competency_competency_step
    group by competency_id
  ),
  erfuellt as (
    select
      ce.learner_id,
      ccs.competency_id,
      count(distinct ce.competency_step_id)::int as teilschritte_erfuellt
    from competency_evidence ce
    join competency_competency_step ccs on ccs.competency_step_id = ce.competency_step_id
    group by ce.learner_id, ccs.competency_id
  )
  select
    e.learner_id,
    e.competency_id,
    g.teilschritte_gesamt,
    e.teilschritte_erfuellt,
    (e.teilschritte_erfuellt = g.teilschritte_gesamt and g.teilschritte_gesamt > 0) as erfuellt
  from erfuellt e
  join gesamt g on g.competency_id = e.competency_id;

-- Supabase-Default-Privileges geben anon/authenticated sonst volle Rechte auf
-- neue Relationen (siehe Kopf von 0009) -- hier explizit nur Lesen für
-- eingeloggte Rollen. Die View ist durch die Aggregation ohnehin nicht
-- beschreibbar.
revoke all on competency_fulfilment from public, anon, authenticated;
grant select on competency_fulfilment to authenticated;

comment on view competency_fulfilment is
  'SR-68: Erfüllungsstatus je Learner und Kompetenz mit AND-Logik (alle zugeordneten '
  'Teilschritte erfüllt). Berechnet aus competency_evidence, kein Write für irgendeine '
  'Rolle. Zugriff wird durch security_invoker von den Basistabellen geerbt.';
