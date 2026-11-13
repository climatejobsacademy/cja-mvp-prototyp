-- 038_praxisflow_variante_b.test.sql
-- SR-64 (Migration 0065, Variante B): Messen gehört zu Ausführen und
-- beginnt erst nach allen Arbeitsschritten; Kontrollieren heißt Messwerte
-- deuten, zu jedem Prüfpunkt ein Freitext (Pflicht); ein K.-o. leert auch
-- die Deutungen.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(15);

-- ------------------------------------------------------------
-- Fixtures (als Superuser)
-- 38081: Ausführen, ein Arbeitsschritt offen. 38082: Kontrollieren.
-- 38083: Bewerten mit Deutungen und K.-o.-Einschätzung der Trainer:in.
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000038001', 'pv-a@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000038011', 'Betrieb', 'employer', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000038001', 'pv-a@example.test', 'Lernende A', 'pv_a', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000038001', '00000000-0000-0000-0000-000000038011');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000038001', '00000000-0000-0000-0000-000000038011', 'learner');

insert into programme (id, name, kuerzel, status) values
  ('00000000-0000-0000-0000-000000038021', 'Programm', 'PV-P1', 'published');

insert into field_job_type (id, titel, programme_id, reihenfolge, status, ablauf) values
  ('00000000-0000-0000-0000-000000038041', 'Auftrag geführt', '00000000-0000-0000-0000-000000038021', 1, 'published', 'gefuehrt');

insert into field_job (id, organisation_id, datum, field_job_type_id, learner_id, phase, praxisflow) values
  ('00000000-0000-0000-0000-000000038081', '00000000-0000-0000-0000-000000038011', '2026-11-16',
   '00000000-0000-0000-0000-000000038041', '00000000-0000-0000-0000-000000038001', 'ausfuehren',
   '{"schritte": [{"id": "s1", "text": "Aufbau"}, {"id": "s2", "text": "Anschluss"}], "erledigt": [{"id": "s1", "am": "2026-11-16T09:00:00Z"}]}'::jsonb),
  ('00000000-0000-0000-0000-000000038082', '00000000-0000-0000-0000-000000038011', '2026-11-17',
   '00000000-0000-0000-0000-000000038041', '00000000-0000-0000-0000-000000038001', 'kontrollieren', '{}'::jsonb),
  ('00000000-0000-0000-0000-000000038083', '00000000-0000-0000-0000-000000038011', '2026-11-18',
   '00000000-0000-0000-0000-000000038041', '00000000-0000-0000-0000-000000038001', 'bewerten',
   '{"deutungen": [{"id": "a1", "text": "Durchgängig", "am": "2026-11-18T10:00:00Z"}],
     "einschaetzung": {"trainer": {"funktion": 0, "ausfuehrung": 7, "schutz": 10, "protokoll": 7, "unterlagen": 9}},
     "bewertung_freigegeben_am": "2026-11-18T11:00:00Z",
     "rueckblick_am": "2026-11-18T10:30:00Z"}'::jsonb);

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000038001', 'role', 'authenticated')::text, true);

-- Messen in Ausführen
select throws_ok(
  $$select fn_praxis_kontrolle_abhaken('00000000-0000-0000-0000-000000038081', 'a1')$$,
  '23514', null,
  'Messen erst nach allen Arbeitsschritten'
);
select throws_ok(
  $$select fn_praxis_gate('00000000-0000-0000-0000-000000038081', 'zuschalten', 'egal')$$,
  '23514', null,
  'Freigabe zum Zuschalten erst nach allen Arbeitsschritten'
);
select lives_ok(
  $$select fn_praxis_schritt_abhaken('00000000-0000-0000-0000-000000038081', 's2')$$,
  'Letzten Arbeitsschritt abhaken'
);
select is(
  jsonb_array_length(fn_praxis_kontrolle_abhaken('00000000-0000-0000-0000-000000038081', 'a1') -> 'kontrolle'),
  1,
  'Danach ist Messen in Ausführen möglich'
);
select throws_ok(
  $$select fn_praxis_weiter('00000000-0000-0000-0000-000000038081', 'ausfuehren')$$,
  '23514', null,
  'Ausführen endet erst mit allen Messungen und Prüfprotokoll'
);
select throws_ok(
  $$select fn_praxis_kontrolle_abhaken('00000000-0000-0000-0000-000000038082', 'a1')$$,
  '23514', null,
  'In Kontrollieren wird nicht mehr gemessen'
);

-- Deuten in Kontrollieren
select throws_ok(
  $$select fn_praxis_deutung_speichern('00000000-0000-0000-0000-000000038081', 'a1', 'Wert ok')$$,
  '23514', null,
  'Deuten nur in Kontrollieren'
);
select throws_ok(
  $$select fn_praxis_deutung_speichern('00000000-0000-0000-0000-000000038082', 'x9', 'Wert ok')$$,
  'P0002', null,
  'Unbekannter Prüfpunkt'
);
select throws_ok(
  $$select fn_praxis_deutung_speichern('00000000-0000-0000-0000-000000038082', 'a1', '   ')$$,
  '23514', null,
  'Leere Deutung wird abgelehnt'
);
select lives_ok(
  $t$do $d$ declare p text; begin
      foreach p in array array['a1', 'a2', 'a3', 'a4', 'c1', 'c2'] loop
        perform fn_praxis_deutung_speichern('00000000-0000-0000-0000-000000038082', p, 'Grenzwert eingehalten');
      end loop;
    end $d$$t$,
  'Zu jedem Prüfpunkt eine Deutung speichern'
);
select is(
  (select jsonb_array_length(praxisflow -> 'deutungen') from field_job where id = '00000000-0000-0000-0000-000000038082'),
  6,
  'Sechs Deutungen gespeichert'
);
select is(
  jsonb_array_length(fn_praxis_deutung_speichern('00000000-0000-0000-0000-000000038082', 'a1', '0,4 Ohm, unter 1 Ohm, also gut') -> 'deutungen'),
  6,
  'Eine neue Deutung ersetzt die alte desselben Punkts'
);
select is(
  fn_praxis_weiter('00000000-0000-0000-0000-000000038082', 'kontrollieren'),
  'bewerten',
  'Mit allen Deutungen: Kontrollieren -> Bewerten'
);

-- K.-o. leert die Deutungen
select is(fn_praxis_abschliessen('00000000-0000-0000-0000-000000038083', 'Funktion prüfen'), 'ko', 'K.-o. in der Trainer-Einschätzung');
reset role;
select ok(
  (select not (praxisflow ? 'deutungen') and praxisflow #>> '{durchlaeufe,0,ergebnis}' = 'ko'
     from field_job where id = '00000000-0000-0000-0000-000000038083'),
  'Nach dem K.-o. beginnt der neue Durchlauf ohne Deutungen'
);

select * from finish();
rollback;
