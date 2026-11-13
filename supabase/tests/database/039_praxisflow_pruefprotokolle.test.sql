-- 039_praxisflow_pruefprotokolle.test.sql
-- SR-91 (Migration 0067): Prüfprotokoll-Variante je Aufgabe. Der Auftrag
-- übernimmt die Variante beim Anlegen und behält sie; beim Messen gelten
-- genau ihre Punkte, Punkte unter Spannung erst nach der Freigabe.
-- Lernende lesen nur veröffentlichte Varianten und ändern nichts; AfCJ admin
-- pflegt sie. Punkte ohne Spannung kommen vor denen unter Spannung.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(12);

-- ------------------------------------------------------------
-- Fixtures (als Superuser)
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000039001', 'pp2-a@example.test'),
  ('00000000-0000-0000-0000-000000039003', 'pp2-admin@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000039011', 'Betrieb', 'employer', 'aktiv'),
  ('00000000-0000-0000-0000-000000039012', 'AfCJ', 'afcj', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000039001', 'pp2-a@example.test', 'Lernende A', 'pp2_a', 'DE'),
  ('00000000-0000-0000-0000-000000039003', 'pp2-admin@example.test', 'Admin', 'pp2_admin', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000039001', '00000000-0000-0000-0000-000000039011'),
  ('00000000-0000-0000-0000-000000039003', '00000000-0000-0000-0000-000000039012');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000039001', '00000000-0000-0000-0000-000000039011', 'learner'),
  ('00000000-0000-0000-0000-000000039003', '00000000-0000-0000-0000-000000039012', 'afcj_admin');

insert into programme (id, name, kuerzel, status) values
  ('00000000-0000-0000-0000-000000039021', 'Programm', 'PP2-P1', 'published');

insert into pruefprotokoll (id, kennung, titel, status) values
  ('00000000-0000-0000-0000-000000039031', 'test-ortsfest-neu', 'Ortsfest, Neuprüfung', 'published'),
  ('00000000-0000-0000-0000-000000039032', 'test-entwurf', 'Entwurf', 'unpublished');

insert into pruefprotokoll_punkt (pruefprotokoll_id, kennung, nr, teil, titel) values
  ('00000000-0000-0000-0000-000000039031', 's1', 1, 'spannungsfrei', 'Besichtigen'),
  ('00000000-0000-0000-0000-000000039031', 'u1', 2, 'unter_spannung', 'Schleifenimpedanz messen'),
  ('00000000-0000-0000-0000-000000039032', 'x1', 1, 'spannungsfrei', 'Entwurf');

insert into field_job_type (id, titel, programme_id, reihenfolge, status, ablauf, pruefprotokoll_id) values
  ('00000000-0000-0000-0000-000000039041', 'Auftrag ortsfest', '00000000-0000-0000-0000-000000039021', 1, 'published', 'gefuehrt',
   '00000000-0000-0000-0000-000000039031');

insert into field_job (id, organisation_id, datum, field_job_type_id, learner_id, phase, praxisflow) values
  ('00000000-0000-0000-0000-000000039081', '00000000-0000-0000-0000-000000039011', '2026-11-16',
   '00000000-0000-0000-0000-000000039041', '00000000-0000-0000-0000-000000039001', 'ausfuehren',
   '{"schritte": [{"id": "w1", "text": "Aufbau"}], "erledigt": [{"id": "w1", "am": "2026-11-16T09:00:00Z"}]}'::jsonb);

select is(
  (select pruefprotokoll_id from field_job where id = '00000000-0000-0000-0000-000000039081'),
  '00000000-0000-0000-0000-000000039031'::uuid,
  'Der Auftrag übernimmt beim Anlegen die Variante der Aufgabe'
);

-- ------------------------------------------------------------
-- Lernende A
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000039001', 'role', 'authenticated')::text, true);

select throws_ok(
  $$select fn_praxis_kontrolle_abhaken('00000000-0000-0000-0000-000000039081', 'a1')$$,
  'P0002', null,
  'Punkte der Standardliste gehören nicht zu dieser Variante'
);
select throws_ok(
  $$select fn_praxis_kontrolle_abhaken('00000000-0000-0000-0000-000000039081', 'u1')$$,
  '23514', null,
  'Punkte unter Spannung erst nach der Freigabe zum Zuschalten'
);
select is(
  jsonb_array_length(fn_praxis_kontrolle_abhaken('00000000-0000-0000-0000-000000039081', 's1') -> 'kontrolle'),
  1,
  'Punkt der Variante abhaken'
);
select is(
  (select count(*)::int from pruefprotokoll_punkt where pruefprotokoll_id = '00000000-0000-0000-0000-000000039031'),
  2,
  'Lernende lesen die Punkte einer veröffentlichten Variante'
);
select is_empty(
  $$select id from pruefprotokoll where status = 'unpublished'$$,
  'Unveröffentlichte Varianten sind für Lernende unsichtbar'
);
select throws_ok(
  $$insert into pruefprotokoll (kennung, titel) values ('eigene', 'Eigene')$$,
  '42501', null,
  'Lernende legen keine Variante an'
);

-- ------------------------------------------------------------
-- AfCJ admin pflegt Varianten
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000039003', 'role', 'authenticated')::text, true);
select lives_ok(
  $$insert into pruefprotokoll (kennung, titel, status) values ('test-ortsveraenderlich', 'Ortsveränderlich', 'published')$$,
  'AfCJ admin legt eine Variante an'
);

-- ------------------------------------------------------------
-- Superuser: Variante bleibt fest, Reihenfolge der Teile
-- ------------------------------------------------------------
reset role;
update field_job_type set pruefprotokoll_id = '00000000-0000-0000-0000-000000039032'
where id = '00000000-0000-0000-0000-000000039041';
select is(
  (select pruefprotokoll_id from field_job where id = '00000000-0000-0000-0000-000000039081'),
  '00000000-0000-0000-0000-000000039031'::uuid,
  'Ein laufender Auftrag behält seine Variante, wenn die Zuordnung der Aufgabe wechselt'
);
select throws_ok(
  $$update field_job set pruefprotokoll_id = '00000000-0000-0000-0000-000000039032' where id = '00000000-0000-0000-0000-000000039081'$$,
  '23514', null,
  'Die Variante eines Auftrags lässt sich nicht umstellen'
);
set constraints pruefprotokoll_reihenfolge immediate;
select throws_ok(
  $$insert into pruefprotokoll_punkt (pruefprotokoll_id, kennung, nr, teil, titel) values
      ('00000000-0000-0000-0000-000000039032', 'y1', 2, 'unter_spannung', 'Zu früh'),
      ('00000000-0000-0000-0000-000000039032', 'x2', 3, 'spannungsfrei', 'Nach unter Spannung')$$,
  '23514', null,
  'Punkte unter Spannung dürfen nicht vor Punkten ohne Spannung stehen'
);
select lives_ok(
  $$insert into field_job (organisation_id, datum, field_job_type_id, learner_id) values
      ('00000000-0000-0000-0000-000000039011', '2026-11-17', '00000000-0000-0000-0000-000000039041', '00000000-0000-0000-0000-000000039001')$$,
  'Neuer Auftrag übernimmt die neue Zuordnung'
);

select * from finish();
rollback;
