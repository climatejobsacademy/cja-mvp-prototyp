-- 024_fachsprache_einheit.test.sql
-- Fachsprache Stufe 2 (0050; SR folgt): Tabelle fachsprache_einheit mit
-- Inhaltsprüfung (Quiz: genau eine richtige Antwort; Bilder: nur Dateiname,
-- PNG/JPG/WebP, Alternativtext Pflicht), Veröffentlichung nur mit beiden
-- Prüfungen, Trigger (setzt bei geändertem Inhalt zurück, bei unverändertem
-- nicht), Zeilenrechte und Bucket fachsprache-bilder mit Storage-Policies.
--
-- Nicht per pgTAP prüfbar (manuell, siehe PR): tatsächlicher Upload über die
-- Storage-API (Größenlimit 2 MB, MIME-Typ-Ablehnung, SVG-Ablehnung) und das
-- Ausliefern per Signed URL. Der Test prüft die Bucket-Einstellungen und die
-- Policies auf storage.objects.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(60);

-- ------------------------------------------------------------
-- Fixtures (als Superuser), Kennungen …0500xx
-- L1 Programm P1 eingeschrieben, L2 Programm P2 eingeschrieben, L3 nicht eingeschrieben
-- ADM AfCJ admin, R2 zweite Prüf-Person (admin)
-- Lektionen: LA (P1, veröffentlicht, Einheit veröffentlicht), LB (P1, Einheit Entwurf),
-- LC (P1, Lektion unveröffentlicht, Einheit veröffentlicht), LD (P2, Einheit veröffentlicht),
-- LE (P1, noch ohne Einheit)
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000050001', 'fs-l1@example.test'),
  ('00000000-0000-0000-0000-000000050002', 'fs-l2@example.test'),
  ('00000000-0000-0000-0000-000000050003', 'fs-l3@example.test'),
  ('00000000-0000-0000-0000-000000050004', 'fs-adm@example.test'),
  ('00000000-0000-0000-0000-000000050005', 'fs-r2@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000050011', 'Betrieb A', 'employer', 'aktiv'),
  ('00000000-0000-0000-0000-000000050013', 'AfCJ', 'afcj', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000050001', 'fs-l1@example.test', 'Lernende Eins', 'fs_l1', 'DE'),
  ('00000000-0000-0000-0000-000000050002', 'fs-l2@example.test', 'Lernende Zwei', 'fs_l2', 'DE'),
  ('00000000-0000-0000-0000-000000050003', 'fs-l3@example.test', 'Lernende Drei', 'fs_l3', 'DE'),
  ('00000000-0000-0000-0000-000000050004', 'fs-adm@example.test', 'Admin', 'fs_adm', 'DE'),
  ('00000000-0000-0000-0000-000000050005', 'fs-r2@example.test', 'Prüfer Zwei', 'fs_r2', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000050001', '00000000-0000-0000-0000-000000050011'),
  ('00000000-0000-0000-0000-000000050002', '00000000-0000-0000-0000-000000050011'),
  ('00000000-0000-0000-0000-000000050003', '00000000-0000-0000-0000-000000050011'),
  ('00000000-0000-0000-0000-000000050004', '00000000-0000-0000-0000-000000050013'),
  ('00000000-0000-0000-0000-000000050005', '00000000-0000-0000-0000-000000050013');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000050001', '00000000-0000-0000-0000-000000050011', 'learner'),
  ('00000000-0000-0000-0000-000000050002', '00000000-0000-0000-0000-000000050011', 'learner'),
  ('00000000-0000-0000-0000-000000050003', '00000000-0000-0000-0000-000000050011', 'learner'),
  ('00000000-0000-0000-0000-000000050004', '00000000-0000-0000-0000-000000050013', 'afcj_admin'),
  ('00000000-0000-0000-0000-000000050005', '00000000-0000-0000-0000-000000050013', 'afcj_admin');

insert into programme (id, name, kuerzel, status) values
  ('00000000-0000-0000-0000-000000050021', 'Programm 1', 'FS-P1', 'published'),
  ('00000000-0000-0000-0000-000000050022', 'Programm 2', 'FS-P2', 'published');

insert into course (id, programme_id, name, typ, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000050031', '00000000-0000-0000-0000-000000050021', 'Kurs 1', 'synchron', 1, 'published'),
  ('00000000-0000-0000-0000-000000050032', '00000000-0000-0000-0000-000000050022', 'Kurs 2', 'synchron', 1, 'published');

insert into lesson (id, course_id, name, content_type, reihenfolge, status) values
  ('00000000-0000-0000-0000-0000000500a1', '00000000-0000-0000-0000-000000050031', 'LA', 'live', 1, 'published'),
  ('00000000-0000-0000-0000-0000000500a2', '00000000-0000-0000-0000-000000050031', 'LB', 'live', 2, 'published'),
  ('00000000-0000-0000-0000-0000000500a3', '00000000-0000-0000-0000-000000050031', 'LC', 'live', 3, 'unpublished'),
  ('00000000-0000-0000-0000-0000000500a4', '00000000-0000-0000-0000-000000050032', 'LD', 'live', 1, 'published'),
  ('00000000-0000-0000-0000-0000000500a5', '00000000-0000-0000-0000-000000050031', 'LE', 'live', 4, 'published');

insert into cohort (id, programme_id, name, start_datum) values
  ('00000000-0000-0000-0000-000000050051', '00000000-0000-0000-0000-000000050021', 'K1', '2026-11-02'),
  ('00000000-0000-0000-0000-000000050052', '00000000-0000-0000-0000-000000050022', 'K2', '2026-11-02');

insert into enrolment (id, organisation_id, learner_id, cohort_id, status) values
  ('00000000-0000-0000-0000-000000050061', '00000000-0000-0000-0000-000000050011', '00000000-0000-0000-0000-000000050001', '00000000-0000-0000-0000-000000050051', 'aktiv'),
  ('00000000-0000-0000-0000-000000050062', '00000000-0000-0000-0000-000000050011', '00000000-0000-0000-0000-000000050002', '00000000-0000-0000-0000-000000050052', 'aktiv');

-- Zeilen, die ein DML-Befehl unter den Rechten des aktuellen Users trifft
create function pg_temp.zeilen(p_sql text) returns integer
language plpgsql as $$
declare n integer;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end;
$$;
grant execute on function pg_temp.zeilen(text) to public;

-- Inhalt mit Bild (Dateiname = bild1.png usw.), über Hilfsfunktion zusammengesetzt
create function pg_temp.inhalt(p_quiz text default null, p_wort text default null) returns jsonb
language sql as $$
  select jsonb_build_object(
    'wortkarten', coalesce(p_wort, '[{"wort":"die Diode","erklaerung":"Ein Bauteil.","beispiel":"Ich prüfe die Diode."}]')::jsonb,
    'quiz', coalesce(p_quiz, '[{"frage":"Was ist eine Diode?","antworten":["A","B","C"],"richtig":1,"erklaerung":"Weil B."}]')::jsonb,
    'saetze', '["Ich prüfe die Diode."]'::jsonb
  );
$$;

insert into fachsprache_einheit (id, lesson_id, titel, inhalt, status, fachlich_geprueft_von, fachlich_geprueft_am, sprachlich_geprueft_von, sprachlich_geprueft_am) values
  ('00000000-0000-0000-0000-0000000500b1', '00000000-0000-0000-0000-0000000500a1', 'Einheit A',
   pg_temp.inhalt(null, '[{"wort":"die Diode","erklaerung":"Ein Bauteil.","beispiel":"Ich prüfe die Diode.","bild":"bild1.png","bild_alt":"Schaltzeichen der Diode"}]'),
   'veroeffentlicht', '00000000-0000-0000-0000-000000050004', now(), '00000000-0000-0000-0000-000000050005', now()),
  ('00000000-0000-0000-0000-0000000500b3', '00000000-0000-0000-0000-0000000500a3', 'Einheit C',
   pg_temp.inhalt(null, '[{"wort":"die Diode","erklaerung":"Ein Bauteil.","beispiel":"Ich prüfe die Diode.","bild":"c.png","bild_alt":"Bild C"}]'),
   'veroeffentlicht', '00000000-0000-0000-0000-000000050004', now(), '00000000-0000-0000-0000-000000050005', now()),
  ('00000000-0000-0000-0000-0000000500b4', '00000000-0000-0000-0000-0000000500a4', 'Einheit D',
   pg_temp.inhalt(null, '[{"wort":"die Diode","erklaerung":"Ein Bauteil.","beispiel":"Ich prüfe die Diode.","bild":"d.png","bild_alt":"Bild D"}]'),
   'veroeffentlicht', '00000000-0000-0000-0000-000000050004', now(), '00000000-0000-0000-0000-000000050005', now());
insert into fachsprache_einheit (id, lesson_id, titel, inhalt) values
  ('00000000-0000-0000-0000-0000000500b2', '00000000-0000-0000-0000-0000000500a2', 'Einheit B',
   pg_temp.inhalt(null, '[{"wort":"die Diode","erklaerung":"Ein Bauteil.","beispiel":"Ich prüfe die Diode.","bild":"b.png","bild_alt":"Bild B"}]'));

insert into storage.objects (bucket_id, name) values
  ('fachsprache-bilder', '00000000-0000-0000-0000-0000000500a1/bild1.png'),
  ('fachsprache-bilder', '00000000-0000-0000-0000-0000000500a1/verwaist.png'),
  ('fachsprache-bilder', '00000000-0000-0000-0000-0000000500a2/b.png'),
  ('fachsprache-bilder', '00000000-0000-0000-0000-0000000500a3/c.png'),
  ('fachsprache-bilder', '00000000-0000-0000-0000-0000000500a4/d.png');

-- ------------------------------------------------------------
-- Schema, Grants, Bucket
-- ------------------------------------------------------------
select has_table('public', 'fachsprache_einheit', 'Tabelle fachsprache_einheit existiert');
select is((select relrowsecurity from pg_class where oid = 'public.fachsprache_einheit'::regclass), true,
  'RLS ist auf fachsprache_einheit eingeschaltet');
select is(has_table_privilege('anon', 'public.fachsprache_einheit', 'select'), false,
  'anon hat keinen Zugriff auf fachsprache_einheit');
select results_eq(
  $$select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'fachsprache-bilder'$$,
  $$values (false, 2097152::bigint, array['image/png', 'image/jpeg', 'image/webp']::text[])$$,
  'Bucket fachsprache-bilder: privat, 2 MB, nur PNG/JPEG/WebP (kein SVG)'
);

-- ------------------------------------------------------------
-- Inhaltsprüfung: Quiz (genau eine richtige Antwort)
-- ------------------------------------------------------------
select is(fn_fachsprache_inhalt_gueltig(pg_temp.inhalt()), true, 'gültiger Inhalt wird akzeptiert');
select is(fn_fachsprache_inhalt_gueltig(pg_temp.inhalt('[{"frage":"F","antworten":["A","B","C"],"richtig":3,"erklaerung":"E"}]')), false,
  'richtig außerhalb der Antworten wird abgelehnt');
select is(fn_fachsprache_inhalt_gueltig(pg_temp.inhalt('[{"frage":"F","antworten":["A","B","C"],"richtig":-1,"erklaerung":"E"}]')), false,
  'negativer Index wird abgelehnt');
select is(fn_fachsprache_inhalt_gueltig(pg_temp.inhalt('[{"frage":"F","antworten":["A","B","C"],"richtig":"1","erklaerung":"E"}]')), false,
  'richtig als Text wird abgelehnt');
select is(fn_fachsprache_inhalt_gueltig(pg_temp.inhalt('[{"frage":"F","antworten":["A","B","C"],"richtig":1.5,"erklaerung":"E"}]')), false,
  'richtig als Dezimalzahl wird abgelehnt');
select is(fn_fachsprache_inhalt_gueltig(pg_temp.inhalt('[{"frage":"F","antworten":["A","B","C"],"erklaerung":"E"}]')), false,
  'fehlendes richtig wird abgelehnt');
select is(fn_fachsprache_inhalt_gueltig(pg_temp.inhalt('[{"frage":"F","antworten":["A"],"richtig":0,"erklaerung":"E"}]')), false,
  'nur eine Antwort wird abgelehnt');
select is(fn_fachsprache_inhalt_gueltig(pg_temp.inhalt('[{"frage":"F","antworten":["A","B","C","D","E"],"richtig":0,"erklaerung":"E"}]')), false,
  'fünf Antworten werden abgelehnt');
select is(fn_fachsprache_inhalt_gueltig(pg_temp.inhalt('[{"frage":"F","antworten":["A","A","C"],"richtig":0,"erklaerung":"E"}]')), false,
  'doppelte Antworten werden abgelehnt');
select is(fn_fachsprache_inhalt_gueltig(pg_temp.inhalt('[{"frage":"F","antworten":["A"," a ","C"],"richtig":0,"erklaerung":"E"}]')), true,
  'Groß-/Kleinschreibung zählt als verschieden (nur Leerraum am Rand wird ignoriert)');
select is(fn_fachsprache_inhalt_gueltig(pg_temp.inhalt('[{"frage":"F","antworten":["A","  ","C"],"richtig":0,"erklaerung":"E"}]')), false,
  'leere Antwort wird abgelehnt');
select is(fn_fachsprache_inhalt_gueltig(pg_temp.inhalt('[{"frage":" ","antworten":["A","B"],"richtig":0,"erklaerung":"E"}]')), false,
  'leere Frage wird abgelehnt');
select is(fn_fachsprache_inhalt_gueltig(pg_temp.inhalt('[{"frage":"F","antworten":["A","B"],"richtig":0,"erklaerung":""}]')), false,
  'leere Erklärung wird abgelehnt');
select is(fn_fachsprache_inhalt_gueltig(pg_temp.inhalt('[]')), false, 'Quiz ohne Fragen wird abgelehnt');
select is(fn_fachsprache_inhalt_gueltig(pg_temp.inhalt(null, '[]')), false, 'Einheit ohne Wortkarten wird abgelehnt');
select is(fn_fachsprache_inhalt_gueltig('{"wortkarten":[{"wort":"w","erklaerung":"e","beispiel":"b"}],"quiz":[{"frage":"F","antworten":["A","B"],"richtig":0,"erklaerung":"E"}]}'::jsonb), false,
  'fehlende saetze werden abgelehnt');

-- ------------------------------------------------------------
-- Inhaltsprüfung: Bilder
-- ------------------------------------------------------------
select is(fn_fachsprache_inhalt_gueltig(pg_temp.inhalt('[{"frage":"F","antworten":["A","B"],"richtig":0,"erklaerung":"E","bild":"foto-1.JPG","bild_alt":"Alt"}]')), true,
  'Quizfrage mit Bild (JPG) und Alternativtext ist gültig');
select is(fn_fachsprache_inhalt_gueltig(pg_temp.inhalt(null, '[{"wort":"w","erklaerung":"e","beispiel":"b","bild":"a.webp","bild_alt":"Alt"}]')), true,
  'Wortkarte mit Bild (WebP) und Alternativtext ist gültig');
select is(fn_fachsprache_inhalt_gueltig(pg_temp.inhalt(null, '[{"wort":"w","erklaerung":"e","beispiel":"b","bild":"a.png"}]')), false,
  'Bild ohne bild_alt wird abgelehnt');
select is(fn_fachsprache_inhalt_gueltig(pg_temp.inhalt(null, '[{"wort":"w","erklaerung":"e","beispiel":"b","bild":"a.png","bild_alt":" "}]')), false,
  'Bild mit leerem bild_alt wird abgelehnt');
select is(fn_fachsprache_inhalt_gueltig(pg_temp.inhalt(null, '[{"wort":"w","erklaerung":"e","beispiel":"b","bild_alt":"Alt"}]')), false,
  'bild_alt ohne Bild wird abgelehnt');
select is(fn_fachsprache_inhalt_gueltig(pg_temp.inhalt(null, '[{"wort":"w","erklaerung":"e","beispiel":"b","bild":"ordner/a.png","bild_alt":"Alt"}]')), false,
  'Bild mit Pfadanteil wird abgelehnt');
select is(fn_fachsprache_inhalt_gueltig(pg_temp.inhalt(null, '[{"wort":"w","erklaerung":"e","beispiel":"b","bild":"../a.png","bild_alt":"Alt"}]')), false,
  'Bild mit ../ wird abgelehnt');
select is(fn_fachsprache_inhalt_gueltig(pg_temp.inhalt(null, '[{"wort":"w","erklaerung":"e","beispiel":"b","bild":"a..b.png","bild_alt":"Alt"}]')), false,
  'Bild mit .. im Namen wird abgelehnt');
select is(fn_fachsprache_inhalt_gueltig(pg_temp.inhalt(null, '[{"wort":"w","erklaerung":"e","beispiel":"b","bild":"a.svg","bild_alt":"Alt"}]')), false,
  'SVG wird abgelehnt');
select is(fn_fachsprache_inhalt_gueltig(pg_temp.inhalt(null, '[{"wort":"w","erklaerung":"e","beispiel":"b","bild":"a.gif","bild_alt":"Alt"}]')), false,
  'GIF wird abgelehnt');
select is(fn_fachsprache_inhalt_gueltig(pg_temp.inhalt(null, '[{"wort":"w","erklaerung":"e","beispiel":"b","bild":"a.png.svg","bild_alt":"Alt"}]')), false,
  'Doppelendung mit SVG am Schluss wird abgelehnt');
select is(fn_fachsprache_inhalt_gueltig(pg_temp.inhalt(null, '[{"wort":"w","erklaerung":"e","beispiel":"b","bild":7,"bild_alt":"Alt"}]')), false,
  'Bild als Zahl wird abgelehnt');

-- ------------------------------------------------------------
-- Tabelle: Prüfung greift, Veröffentlichung, Trigger (als Superuser)
-- ------------------------------------------------------------
select throws_ok(
  $$insert into fachsprache_einheit (lesson_id, titel, inhalt)
    values ('00000000-0000-0000-0000-0000000500a5', 'X',
      '{"wortkarten":[],"quiz":[],"saetze":[]}'::jsonb)$$,
  '23514', null, 'Die Tabelle lehnt ungültigen Inhalt ab (CHECK ist verdrahtet)'
);
select throws_ok(
  $$insert into fachsprache_einheit (lesson_id, titel, inhalt)
    values ('00000000-0000-0000-0000-0000000500a1', 'Zweite', pg_temp.inhalt())$$,
  '23505', null, 'Je Lektion nur eine Einheit'
);
insert into fachsprache_einheit (id, lesson_id, titel, inhalt) values
  ('00000000-0000-0000-0000-0000000500b5', '00000000-0000-0000-0000-0000000500a5', 'Einheit E', pg_temp.inhalt());
select throws_ok(
  $$update fachsprache_einheit set status = 'veroeffentlicht' where id = '00000000-0000-0000-0000-0000000500b5'$$,
  '23514', null, 'Veröffentlichen ohne Prüfung wird abgelehnt'
);
select throws_ok(
  $$update fachsprache_einheit set status = 'veroeffentlicht',
      fachlich_geprueft_von = '00000000-0000-0000-0000-000000050004', fachlich_geprueft_am = now()
    where id = '00000000-0000-0000-0000-0000000500b5'$$,
  '23514', null, 'Veröffentlichen nur mit fachlicher Prüfung wird abgelehnt'
);
select throws_ok(
  $$update fachsprache_einheit set status = 'veroeffentlicht',
      sprachlich_geprueft_von = '00000000-0000-0000-0000-000000050005', sprachlich_geprueft_am = now()
    where id = '00000000-0000-0000-0000-0000000500b5'$$,
  '23514', null, 'Veröffentlichen nur mit sprachlicher Prüfung wird abgelehnt'
);
select throws_ok(
  $$update fachsprache_einheit set fachlich_geprueft_von = '00000000-0000-0000-0000-000000050004'
    where id = '00000000-0000-0000-0000-0000000500b5'$$,
  '23514', null, 'Prüfperson ohne Datum wird abgelehnt'
);
select lives_ok(
  $$update fachsprache_einheit set status = 'veroeffentlicht',
      fachlich_geprueft_von = '00000000-0000-0000-0000-000000050004', fachlich_geprueft_am = now(),
      sprachlich_geprueft_von = '00000000-0000-0000-0000-000000050005', sprachlich_geprueft_am = now()
    where id = '00000000-0000-0000-0000-0000000500b5'$$,
  'Mit beiden Prüfungen lässt sich veröffentlichen'
);

-- Trigger: unveränderter Inhalt -> nichts zurückgesetzt
update fachsprache_einheit set dauer_minuten = 5 where id = '00000000-0000-0000-0000-0000000500b5';
select results_eq(
  $$select status, fachlich_geprueft_von is not null and sprachlich_geprueft_von is not null, inhalt_version
    from fachsprache_einheit where id = '00000000-0000-0000-0000-0000000500b5'$$,
  $$values ('veroeffentlicht'::text, true, 1)$$,
  'Trigger: andere Spalte geändert -> Status, Prüfungen und Version bleiben'
);
update fachsprache_einheit set inhalt = pg_temp.inhalt(), titel = 'Einheit E'
  where id = '00000000-0000-0000-0000-0000000500b5';
select results_eq(
  $$select status, inhalt_version from fachsprache_einheit where id = '00000000-0000-0000-0000-0000000500b5'$$,
  $$values ('veroeffentlicht'::text, 1)$$,
  'Trigger: Inhalt und Titel mit gleichem Wert neu geschrieben -> kein Zurücksetzen'
);
-- Trigger: geänderter Inhalt -> zurück auf Entwurf, Prüfungen leer
update fachsprache_einheit
   set inhalt = pg_temp.inhalt('[{"frage":"Neu?","antworten":["A","B"],"richtig":0,"erklaerung":"E"}]')
 where id = '00000000-0000-0000-0000-0000000500b5';
select results_eq(
  $$select status, fachlich_geprueft_von is null and fachlich_geprueft_am is null
            and sprachlich_geprueft_von is null and sprachlich_geprueft_am is null, inhalt_version
    from fachsprache_einheit where id = '00000000-0000-0000-0000-0000000500b5'$$,
  $$values ('entwurf'::text, true, 2)$$,
  'Trigger: geänderter Inhalt -> Entwurf, beide Prüfungen leer, Version +1'
);

-- ------------------------------------------------------------
-- Als Lernende L1 (Programm P1)
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000050001', 'role', 'authenticated')::text, true);

select results_eq(
  $$select titel from fachsprache_einheit$$,
  $$values ('Einheit A'::text)$$,
  'L1 sieht nur die veröffentlichte Einheit einer lesbaren Lektion (nicht Entwurf, nicht unveröffentlichte Lektion, nicht anderes Programm)'
);
select throws_ok(
  $$insert into fachsprache_einheit (lesson_id, titel, inhalt)
    values ('00000000-0000-0000-0000-0000000500a5', 'Eigen', pg_temp.inhalt())$$,
  '42501', null, 'Lernende dürfen keine Einheit anlegen'
);
select is(
  pg_temp.zeilen($$update fachsprache_einheit set titel = 'Geändert'$$),
  0, 'Lernende dürfen keine Einheit ändern'
);
select is(
  pg_temp.zeilen($$delete from fachsprache_einheit$$),
  0, 'Lernende dürfen keine Einheit löschen'
);
select results_eq(
  $$select split_part(name, '/', 2) from storage.objects where bucket_id = 'fachsprache-bilder'$$,
  $$values ('bild1.png'::text)$$,
  'L1 sieht nur das im Inhalt benannte Bild der veröffentlichten Einheit (nicht verwaist, nicht Entwurf, nicht unveröffentlichte Lektion, nicht anderes Programm)'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('fachsprache-bilder', '00000000-0000-0000-0000-0000000500a1/eigen.png')$$,
  '42501', null, 'Lernende dürfen keine Bilder hochladen'
);
-- Direktes DELETE auf storage.objects sperrt Supabase ohnehin (nur Storage-API);
-- geprüft wird deshalb, dass außer dem Lesen für Lernende nur die Admin-Policy existiert.
select is(
  (select count(*)::int from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname::text like 'fachsprache_bilder%'),
  2, 'Auf dem Bucket gibt es genau zwei Policies'
);
select is(
  (select count(*)::int from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and ((policyname::text = 'fachsprache_bilder_lesen' and cmd::text = 'SELECT')
        or (policyname::text = 'fachsprache_bilder_admin' and cmd::text = 'ALL'))),
  2, 'Das sind Lesen (Lernende, nur SELECT) und die Admin-Policy; Lernende haben kein Schreib-/Löschrecht'
);

-- L2 (anderes Programm) sieht nur die eigene Einheit
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000050002', 'role', 'authenticated')::text, true);
select results_eq(
  $$select titel from fachsprache_einheit$$, $$values ('Einheit D'::text)$$,
  'L2 (anderes Programm) sieht nur die Einheit des eigenen Programms'
);
select results_eq(
  $$select split_part(name, '/', 2) from storage.objects where bucket_id = 'fachsprache-bilder'$$,
  $$values ('d.png'::text)$$,
  'L2 sieht nur das Bild des eigenen Programms'
);

-- L3 (nicht eingeschrieben)
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000050003', 'role', 'authenticated')::text, true);
select is((select count(*)::int from fachsprache_einheit), 0, 'Nicht eingeschriebene Person sieht keine Einheit');
select is((select count(*)::int from storage.objects where bucket_id = 'fachsprache-bilder'), 0,
  'Nicht eingeschriebene Person sieht kein Bild');

-- ------------------------------------------------------------
-- AfCJ admin
-- ------------------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000050004', 'role', 'authenticated')::text, true);
select is((select count(*)::int from fachsprache_einheit), 5, 'Admin sieht alle Einheiten (auch Entwürfe)');
select is((select count(*)::int from storage.objects where bucket_id = 'fachsprache-bilder'), 5, 'Admin sieht alle Bilder');
select lives_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('fachsprache-bilder', '00000000-0000-0000-0000-0000000500a5/neu.png')$$,
  'Admin darf ein Bild hochladen'
);
select lives_ok(
  $$update fachsprache_einheit set dauer_minuten = 7 where id = '00000000-0000-0000-0000-0000000500b2'$$,
  'Admin darf eine Einheit ändern'
);

-- ------------------------------------------------------------
-- Ohne Anmeldung
-- ------------------------------------------------------------
reset role;
set local role anon;
select throws_ok($$select * from fachsprache_einheit$$, '42501', null, 'Ohne Anmeldung ist fachsprache_einheit gesperrt');
select is((select count(*)::int from storage.objects where bucket_id = 'fachsprache-bilder'), 0,
  'Ohne Anmeldung ist kein Bild sichtbar');

reset role;

select * from finish();
rollback;
