-- 016_competency_step_reihenfolge.test.sql
-- Reihenfolge der Kompetenzschritte (0027, SR-69): competency_competency_step.
-- reihenfolge ist integer, Pflicht, > 0 und je Kompetenz eindeutig; die
-- Eindeutigkeit ist deferrable, damit sich Positionen tauschen lassen. Derselbe
-- Schritt kann in zwei Kompetenzen an verschiedener Stelle stehen. Lernende
-- lesen die Reihenfolge, ändern sie aber nicht.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(13);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000001601', 'learner-rf@example.test'),
  ('00000000-0000-0000-0000-000000001602', 'admin-rf@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000001611', 'Betrieb', 'employer', 'aktiv'),
  ('00000000-0000-0000-0000-000000001612', 'AfCJ', 'afcj', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000001601', 'learner-rf@example.test', 'Learner Rf', 'learner_rf', 'DE'),
  ('00000000-0000-0000-0000-000000001602', 'admin-rf@example.test', 'Admin Rf', 'admin_rf', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000001601', '00000000-0000-0000-0000-000000001611'),
  ('00000000-0000-0000-0000-000000001602', '00000000-0000-0000-0000-000000001612');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000001601', '00000000-0000-0000-0000-000000001611', 'learner'),
  ('00000000-0000-0000-0000-000000001602', '00000000-0000-0000-0000-000000001612', 'afcj_admin');

insert into competency (id, name, kompetenzbereich, quelle) values
  ('00000000-0000-0000-0000-000000001621', 'Kompetenz A', 'Elektro', 'EFK-EE'),
  ('00000000-0000-0000-0000-000000001622', 'Kompetenz B', 'Elektro', 'EFK-EE');

-- competency_id ist bis zur Drop-Column-Folgemigration noch not null.
insert into competency_step (id, competency_id, name, typ) values
  ('00000000-0000-0000-0000-000000001631', '00000000-0000-0000-0000-000000001621', 'Schritt 1', 'theoretisch'),
  ('00000000-0000-0000-0000-000000001632', '00000000-0000-0000-0000-000000001621', 'Schritt 2', 'theoretisch'),
  ('00000000-0000-0000-0000-000000001633', '00000000-0000-0000-0000-000000001621', 'Schritt 3', 'praktisch');

insert into competency_competency_step (id, competency_id, competency_step_id, reihenfolge) values
  ('00000000-0000-0000-0000-000000001641', '00000000-0000-0000-0000-000000001621', '00000000-0000-0000-0000-000000001631', 1),
  ('00000000-0000-0000-0000-000000001642', '00000000-0000-0000-0000-000000001621', '00000000-0000-0000-0000-000000001632', 2);

-- ------------------------------------------------------------
-- Schema
-- ------------------------------------------------------------
select has_column('public', 'competency_competency_step', 'reihenfolge', 'competency_competency_step hat reihenfolge');
select col_type_is('public', 'competency_competency_step', 'reihenfolge', 'integer', 'reihenfolge ist integer');
select col_not_null('public', 'competency_competency_step', 'reihenfolge', 'reihenfolge ist Pflicht');

-- ------------------------------------------------------------
-- Constraints (als Superuser)
-- ------------------------------------------------------------
select throws_ok(
  $$insert into competency_competency_step (competency_id, competency_step_id)
    values ('00000000-0000-0000-0000-000000001621', '00000000-0000-0000-0000-000000001633')$$,
  '23502',
  null,
  'Zuordnung ohne reihenfolge wird abgelehnt'
);
select throws_ok(
  $$insert into competency_competency_step (competency_id, competency_step_id, reihenfolge)
    values ('00000000-0000-0000-0000-000000001621', '00000000-0000-0000-0000-000000001633', 0)$$,
  '23514',
  null,
  'reihenfolge 0 wird abgelehnt'
);

-- Tausch zweier Positionen in einer Transaktion: zwischendurch doppelt,
-- geprüft wird erst danach (deferrable). SET CONSTRAINTS … IMMEDIATE prüft
-- die offenen Fälle sofort.
update competency_competency_step set reihenfolge = 2 where id = '00000000-0000-0000-0000-000000001641';
update competency_competency_step set reihenfolge = 1 where id = '00000000-0000-0000-0000-000000001642';
select lives_ok(
  $$set constraints competency_competency_step_reihenfolge_eindeutig immediate$$,
  'Tausch zweier Positionen in einer Transaktion ist erlaubt'
);
select results_eq(
  $$select competency_step_id::text from competency_competency_step
    where competency_id = '00000000-0000-0000-0000-000000001621' order by reihenfolge$$,
  $$values ('00000000-0000-0000-0000-000000001632'), ('00000000-0000-0000-0000-000000001631')$$,
  'Nach dem Tausch steht Schritt 2 vor Schritt 1'
);
select throws_ok(
  $$insert into competency_competency_step (competency_id, competency_step_id, reihenfolge)
    values ('00000000-0000-0000-0000-000000001621', '00000000-0000-0000-0000-000000001633', 1)$$,
  '23505',
  null,
  'Doppelte Position in derselben Kompetenz wird abgelehnt'
);
select lives_ok(
  $$insert into competency_competency_step (competency_id, competency_step_id, reihenfolge)
    values ('00000000-0000-0000-0000-000000001622', '00000000-0000-0000-0000-000000001631', 1),
           ('00000000-0000-0000-0000-000000001622', '00000000-0000-0000-0000-000000001633', 2),
           ('00000000-0000-0000-0000-000000001621', '00000000-0000-0000-0000-000000001633', 3)$$,
  'Gleiche Position in verschiedenen Kompetenzen ist erlaubt'
);
select results_eq(
  $$select competency_id::text, reihenfolge from competency_competency_step
    where competency_step_id = '00000000-0000-0000-0000-000000001633' order by competency_id$$,
  $$values ('00000000-0000-0000-0000-000000001621', 3), ('00000000-0000-0000-0000-000000001622', 2)$$,
  'Derselbe Schritt steht in zwei Kompetenzen an verschiedener Stelle'
);

-- ------------------------------------------------------------
-- Als Learner: lesen ja, ändern nein
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000001601', 'role', 'authenticated')::text, true);

select is(
  (select reihenfolge from competency_competency_step where id = '00000000-0000-0000-0000-000000001641'),
  2,
  'Learner liest die Reihenfolge'
);
select is_empty(
  $$update competency_competency_step set reihenfolge = 9
    where id = '00000000-0000-0000-0000-000000001641' returning id$$,
  'Learner kann die Reihenfolge nicht ändern (RLS filtert die Zeile weg)'
);

-- ------------------------------------------------------------
-- Als AfCJ admin: ändern ja
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000001602', 'role', 'authenticated')::text, true);

select lives_ok(
  $$update competency_competency_step set reihenfolge = 4
    where id = '00000000-0000-0000-0000-000000001641'$$,
  'AfCJ admin ändert die Reihenfolge'
);

select * from finish();
rollback;
