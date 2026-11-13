-- 0071_zweite_trainerin.sql
-- SR-78 (Notion, Acceptance Check am 10.11.2026 ergänzt): Praxis- und
-- Labortage können eine zweite begleitende Trainer:in haben. Home,
-- Stundenplan und Praxisauftrag zeigen dann beide mit Name und Foto
-- („Praxis mit A und B“). Die zweite Trainer:in wird nur angezeigt:
-- Zugriffsrechte, Freigaben und Anrechnung hängen weiter an
-- field_job.instructor_id. Keine Policy auf field_job ändert sich; der
-- Trainer-Bereich liest weiter nur instructor_id.
--
-- Erweitert fn_meine_trainer (0030) um zweit_trainer_id, damit Lernende
-- Name und Foto der zweiten Person ihres eigenen Praxis- bzw. Labortags
-- lesen (wie bei instructor_id). Mehr Daten der Person sind nicht lesbar.

alter table field_job
  add column zweit_trainer_id uuid references person (id);

comment on column field_job.zweit_trainer_id is
  'SR-78: zweite begleitende Trainer:in, nur zur Anzeige für Lernende. Rechte, Freigaben und Anrechnung über instructor_id.';

create or replace function fn_meine_trainer()
returns table (person_id uuid, name text, rufname text, foto_pfad text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.name, p.rufname, p.foto_pfad
  from person p
  where exists (
      select 1 from role_assignment ra
      where ra.person_id = p.id and ra.rolle = 'trainer'
    )
    and p.id in (
      select ls.trainer_id
      from live_session ls
      join schedule_entry se on se.live_session_id = ls.id
      where se.cohort_id in (select fn_current_cohort_ids())
         or se.enrolment_id in (select fn_current_enrolment_ids())
      union
      select fj.instructor_id
      from field_job fj
      where fj.learner_id = auth.uid()
      union
      select fj.zweit_trainer_id
      from field_job fj
      where fj.learner_id = auth.uid()
    );
$$;

comment on function fn_meine_trainer() is
  'Name, Rufname und Fotopfad der Trainer:innen im eigenen Plan (Rolle trainer), '
  'auch der zweiten Trainer:in eines Praxis- oder Labortags (SR-78, 0071). '
  'Öffnet die Tabelle person nicht für Lernende (SR-78, Entscheidung 2026-10-13).';
