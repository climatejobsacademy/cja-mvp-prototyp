-- 0008_rls_helpers.sql
-- Helper functions used by the RLS policies in 0009_rls_policies.sql.
--
-- Prototyp hat nur zwei Rollen-Werte: learner, afcj_admin (role_assignment.rolle).
-- Instructor/Team Lead, AfCJ trainer und Manager existieren noch nicht als eigene
-- Rollen (siehe docs/access-matrix.md) — afcj_admin deckt ihre Aufgaben ab. Die
-- Policies unten setzen deshalb bewusst nur "Learner"- und "AfCJ admin"-Spalten
-- der Zugriffsmatrix um; die anderen Spalten sind für den Prototyp nicht
-- erreichbar (siehe docs/open-questions.md, Q-FUTURE-ROLES).
--
-- SECURITY DEFINER + fest gesetzter search_path: die Funktionen dürfen die
-- Basistabellen (role_assignment, enrolment) unabhängig von der RLS-Policy des
-- aufrufenden Nutzers lesen, geben aber ausschließlich auf auth.uid() bezogene
-- Daten zurück, sind also selbst kein Privilegien-Leck.

create or replace function fn_current_person_id()
returns uuid
language sql
stable
security invoker
as $$
  select auth.uid();
$$;

comment on function fn_current_person_id() is
  'Die person.id der eingeloggten Nutzer:in (= auth.uid(), 1:1 gekoppelt).';

create or replace function fn_is_afcj_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from role_assignment ra
    where ra.person_id = auth.uid()
      and ra.rolle = 'afcj_admin'
  );
$$;

comment on function fn_is_afcj_admin() is
  'True, wenn die eingeloggte Person eine aktive afcj_admin-Rollenzuweisung hat.';

create or replace function fn_current_cohort_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.cohort_id
  from enrolment e
  where e.learner_id = auth.uid();
$$;

comment on function fn_current_cohort_ids() is
  'Kohorten, in denen die eingeloggte Person als Learner eingeschrieben ist '
  '(entspricht "Own" für Cohort/Schedule/Live-Session aus Sicht des Learners).';

create or replace function fn_current_enrolment_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.id
  from enrolment e
  where e.learner_id = auth.uid();
$$;

comment on function fn_current_enrolment_ids() is
  'Enrolment-Zeilen der eingeloggten Person (für per-Learner schedule_entry-Einträge).';
