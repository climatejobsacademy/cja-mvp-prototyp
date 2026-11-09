-- 037_praxisflow_ereignisse.test.sql
-- SR-92 (Migration 0064): Ereignisse im Praxisflow ohne Inhalte. Lernende
-- melden nur erlaubte Arten für eigene Praxisaufträge im geführten Ablauf,
-- lesen, ändern und löschen keine Ereignisse. Trigger schreiben Dateien,
-- Phasenwechsel, Planänderungen und Freigaben mit. Keine Änderung einer
-- Zeile, auch nicht als Superuser; beim Löschen des Praxisauftrags gehen
-- die Ereignisse mit (Löschweg).
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(19);

-- ------------------------------------------------------------
-- Fixtures (als Superuser)
-- 37001 Lernende A, 37002 Lernende B, 37003 AfCJ admin.
-- 37081: geführt, Informieren. 37082: einfacher Ablauf.
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000037001', 'pe-a@example.test'),
  ('00000000-0000-0000-0000-000000037002', 'pe-b@example.test'),
  ('00000000-0000-0000-0000-000000037003', 'pe-admin@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000037011', 'Betrieb', 'employer', 'aktiv'),
  ('00000000-0000-0000-0000-000000037012', 'AfCJ', 'afcj', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000037001', 'pe-a@example.test', 'Lernende A', 'pe_a', 'DE'),
  ('00000000-0000-0000-0000-000000037002', 'pe-b@example.test', 'Lernende B', 'pe_b', 'DE'),
  ('00000000-0000-0000-0000-000000037003', 'pe-admin@example.test', 'Admin', 'pe_admin', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000037001', '00000000-0000-0000-0000-000000037011'),
  ('00000000-0000-0000-0000-000000037002', '00000000-0000-0000-0000-000000037011'),
  ('00000000-0000-0000-0000-000000037003', '00000000-0000-0000-0000-000000037012');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000037001', '00000000-0000-0000-0000-000000037011', 'learner'),
  ('00000000-0000-0000-0000-000000037002', '00000000-0000-0000-0000-000000037011', 'learner'),
  ('00000000-0000-0000-0000-000000037003', '00000000-0000-0000-0000-000000037012', 'afcj_admin');

insert into programme (id, name, kuerzel, status) values
  ('00000000-0000-0000-0000-000000037021', 'Programm', 'PE-P1', 'published');

insert into field_job_type (id, titel, programme_id, reihenfolge, status, ablauf) values
  ('00000000-0000-0000-0000-000000037041', 'Auftrag geführt', '00000000-0000-0000-0000-000000037021', 1, 'published', 'gefuehrt'),
  ('00000000-0000-0000-0000-000000037042', 'Auftrag einfach', '00000000-0000-0000-0000-000000037021', 2, 'published', 'einfach');

insert into field_job (id, organisation_id, datum, field_job_type_id, learner_id) values
  ('00000000-0000-0000-0000-000000037081', '00000000-0000-0000-0000-000000037011', '2026-11-16', '00000000-0000-0000-0000-000000037041', '00000000-0000-0000-0000-000000037001'),
  ('00000000-0000-0000-0000-000000037082', '00000000-0000-0000-0000-000000037011', '2026-11-16', '00000000-0000-0000-0000-000000037042', '00000000-0000-0000-0000-000000037001');

select ok((select relrowsecurity from pg_class where oid = 'public.praxis_ereignis'::regclass),
  'RLS ist auf praxis_ereignis eingeschaltet');

set local role authenticated;

-- ------------------------------------------------------------
-- Lernende A
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000037001', 'role', 'authenticated')::text, true);

select is(
  fn_praxis_ereignis_melden('00000000-0000-0000-0000-000000037081',
    '[{"art": "schritt_geoeffnet", "schritt": "auftrag"}, {"art": "schritt_beendet", "schritt": "auftrag"}]'),
  2,
  'Erlaubte Ereignisse für den eigenen Praxisauftrag werden gespeichert'
);
select throws_ok(
  $$select fn_praxis_ereignis_melden('00000000-0000-0000-0000-000000037082', '[{"art": "schritt_geoeffnet", "schritt": "auftrag"}]')$$,
  'P0002', null,
  'Kein Ereignis für Aufträge im einfachen Ablauf'
);
select throws_ok(
  $$select fn_praxis_ereignis_melden('00000000-0000-0000-0000-000000037081', '[{"art": "abschluss", "schritt": "fertig"}]')$$,
  '22023', null,
  'Arten, die nur die Datenbank schreibt, lassen sich nicht melden'
);
select throws_ok(
  $$select fn_praxis_ereignis_melden('00000000-0000-0000-0000-000000037081', '[{"art": "schritt_geoeffnet", "schritt": "Mein Plan.pdf"}]')$$,
  '22023', null,
  'Inhalte oder Dateinamen als Schritt werden abgelehnt'
);
select throws_ok(
  $$select fn_praxis_ereignis_melden('00000000-0000-0000-0000-000000037081',
    (select jsonb_agg(jsonb_build_object('art', 'schritt_geoeffnet', 'schritt', 'auftrag')) from generate_series(1, 21)))$$,
  '22023', null,
  'Höchstens 20 Ereignisse je Aufruf'
);
select is_empty($$select id from praxis_ereignis$$, 'Lernende lesen keine Ereignisse');
select throws_ok(
  $$insert into praxis_ereignis (organisation_id, field_job_id, learner_id, phase, art)
    values ('00000000-0000-0000-0000-000000037011', '00000000-0000-0000-0000-000000037081', '00000000-0000-0000-0000-000000037001', 'informieren', 'abschluss')$$,
  '42501', null,
  'Lernende schreiben Ereignisse nicht direkt'
);
select throws_ok(
  $$delete from praxis_ereignis$$,
  '42501', null,
  'Lernende löschen keine Ereignisse'
);

-- Dateien und Phasenwechsel schreiben die Trigger mit.
select lives_ok(
  $$insert into field_job_datei (organisation_id, field_job_id, learner_id, art, storage_pfad, dateiname, mime_type, groesse) values
    ('00000000-0000-0000-0000-000000037011', '00000000-0000-0000-0000-000000037081', '00000000-0000-0000-0000-000000037001',
     'hilfe', '00000000-0000-0000-0000-000000037001/00000000-0000-0000-0000-000000037081/hilfe.pdf', 'hilfe.pdf', 'application/pdf', 1000)$$,
  'Hilfe hochladen'
);
select lives_ok(
  $$delete from field_job_datei where art = 'hilfe'$$,
  'Hilfe löschen'
);
select lives_ok(
  $$insert into field_job_datei (organisation_id, field_job_id, learner_id, art, storage_pfad, dateiname, mime_type, groesse) values
    ('00000000-0000-0000-0000-000000037011', '00000000-0000-0000-0000-000000037081', '00000000-0000-0000-0000-000000037001',
     'auftrag', '00000000-0000-0000-0000-000000037001/00000000-0000-0000-0000-000000037081/auftrag.pdf', 'auftrag.pdf', 'application/pdf', 1000)$$,
  'Auftrag hochladen'
);
select is(fn_praxis_weiter('00000000-0000-0000-0000-000000037081', 'informieren'), 'planen', 'Informieren -> Planen');
select lives_ok(
  $$select fn_praxis_plan_speichern('00000000-0000-0000-0000-000000037081', array['Abisolierzange'], array['NYM-J 3x1,5'], array['Leitung abmanteln'])$$,
  'Plan speichern'
);

-- ------------------------------------------------------------
-- Lernende B: kein Ereignis für fremde Aufträge
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000037002', 'role', 'authenticated')::text, true);
select throws_ok(
  $$select fn_praxis_ereignis_melden('00000000-0000-0000-0000-000000037081', '[{"art": "schritt_geoeffnet", "schritt": "auftrag"}]')$$,
  'P0002', null,
  'Kein Ereignis für fremde Praxisaufträge'
);

-- ------------------------------------------------------------
-- AfCJ admin liest alle Ereignisse
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000037003', 'role', 'authenticated')::text, true);
select is(
  (select array_agg(art order by created_at) from praxis_ereignis where field_job_id = '00000000-0000-0000-0000-000000037081'),
  array['schritt_geoeffnet', 'schritt_beendet', 'datei_hochgeladen', 'datei_geloescht', 'datei_hochgeladen',
        'phase_gewechselt', 'plan_geaendert']::text[],
  'Gemeldete und mitgeschriebene Ereignisse in Reihenfolge'
);

-- ------------------------------------------------------------
-- Superuser: Freigabe-Trigger, keine Änderung, Löschweg
-- ------------------------------------------------------------
reset role;
insert into praxis_codewort_versuch (organisation_id, field_job_id, gate, art, person_id) values
  ('00000000-0000-0000-0000-000000037011', '00000000-0000-0000-0000-000000037081', 'plan', 'fehlversuch', '00000000-0000-0000-0000-000000037001');
select is(
  (select schritt from praxis_ereignis where field_job_id = '00000000-0000-0000-0000-000000037081' and art = 'freigabe_fehler'),
  'plan',
  'Ein Fehlversuch am Codewort wird als Ereignis mitgeschrieben'
);
select throws_ok(
  $$update praxis_ereignis set schritt = 'x' where field_job_id = '00000000-0000-0000-0000-000000037081'$$,
  '42501', null,
  'Ereignisse lassen sich nicht ändern, auch nicht als Superuser'
);
select lives_ok(
  $$delete from field_job where id = '00000000-0000-0000-0000-000000037081'$$,
  'Praxisauftrag löschen (Löschweg) geht trotz der Trigger'
);

select * from finish();
rollback;
