-- 013_lektion_beitrag.test.sql
-- Fragen-Thread pro Lektion (0024, SR folgt (Fragen-Thread)): Lesen und
-- Schreiben nur in der eigenen Kohorte bei freigeschalteter, lesbarer Lektion,
-- Länge 1-1000, eine Antwortebene, kein Bearbeiten/direktes Löschen,
-- Soft-Delete über fn_beitrag_loeschen (Autor:in, Moderierende, AfCJ admin),
-- Account-Löschung setzt person_id auf null und anonymisiert die Beiträge;
-- im Moderationsprotokoll wird person_id auf null gesetzt.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(48);

-- ------------------------------------------------------------
-- Fixtures (als Superuser)
-- 901 Anna (aktiv K1, Betrieb A), 902 Bernd (aktiv K1, Betrieb B),
-- 903 abgeschlossen K1, 904 abgebrochen K1, 905 aktiv K2 (gleiches Programm),
-- 906 aktiv K3 (anderes Programm), 907 ohne Einschreibung,
-- 908 Moderation K1 (nicht eingeschrieben), 909 AfCJ admin
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000901', 'anna@example.test'),
  ('00000000-0000-0000-0000-000000000902', 'bernd@example.test'),
  ('00000000-0000-0000-0000-000000000903', 'abgeschlossen@example.test'),
  ('00000000-0000-0000-0000-000000000904', 'abgebrochen@example.test'),
  ('00000000-0000-0000-0000-000000000905', 'k2@example.test'),
  ('00000000-0000-0000-0000-000000000906', 'p2@example.test'),
  ('00000000-0000-0000-0000-000000000907', 'ohne@example.test'),
  ('00000000-0000-0000-0000-000000000908', 'moderation@example.test'),
  ('00000000-0000-0000-0000-000000000909', 'admin@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000000911', 'Betrieb A', 'employer', 'aktiv'),
  ('00000000-0000-0000-0000-000000000912', 'Betrieb B', 'employer', 'aktiv'),
  ('00000000-0000-0000-0000-000000000913', 'AfCJ', 'afcj', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000000901', 'anna@example.test', 'Anna Maria Beispiel', 'lb_anna', 'DE'),
  ('00000000-0000-0000-0000-000000000902', 'bernd@example.test', 'Bernd Muster', 'lb_bernd', 'DE'),
  ('00000000-0000-0000-0000-000000000903', 'abgeschlossen@example.test', 'Carla Fertig', 'lb_carla', 'DE'),
  ('00000000-0000-0000-0000-000000000904', 'abgebrochen@example.test', 'Dora Weg', 'lb_dora', 'DE'),
  ('00000000-0000-0000-0000-000000000905', 'k2@example.test', 'Emil Zwei', 'lb_emil', 'DE'),
  ('00000000-0000-0000-0000-000000000906', 'p2@example.test', 'Fritz Anders', 'lb_fritz', 'DE'),
  ('00000000-0000-0000-0000-000000000907', 'ohne@example.test', 'Gina Ohne', 'lb_gina', 'DE'),
  ('00000000-0000-0000-0000-000000000908', 'moderation@example.test', 'Mona Mod', 'lb_mona', 'DE'),
  ('00000000-0000-0000-0000-000000000909', 'admin@example.test', 'Ada Admin', 'lb_ada', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000000901', '00000000-0000-0000-0000-000000000911'),
  ('00000000-0000-0000-0000-000000000902', '00000000-0000-0000-0000-000000000912'),
  ('00000000-0000-0000-0000-000000000909', '00000000-0000-0000-0000-000000000913');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000000901', '00000000-0000-0000-0000-000000000911', 'learner'),
  ('00000000-0000-0000-0000-000000000902', '00000000-0000-0000-0000-000000000912', 'learner'),
  ('00000000-0000-0000-0000-000000000909', '00000000-0000-0000-0000-000000000913', 'afcj_admin');

insert into programme (id, name, kuerzel) values
  ('00000000-0000-0000-0000-000000000921', 'Programm 1', 'PRG-1'),
  ('00000000-0000-0000-0000-000000000922', 'Programm 2', 'PRG-2');

insert into course (id, programme_id, name, typ, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000000923', '00000000-0000-0000-0000-000000000921', 'Kurs P1', 'asynchron', 1, 'published'),
  ('00000000-0000-0000-0000-000000000924', '00000000-0000-0000-0000-000000000922', 'Kurs P2', 'asynchron', 1, 'published');

-- L1 offen, L2 Chat aus, L3 unveröffentlicht, L4 in Programm 2
insert into lesson (id, course_id, name, content_type, reihenfolge, status, chat_aktiv) values
  ('00000000-0000-0000-0000-000000000931', '00000000-0000-0000-0000-000000000923', 'L1 Chat an', 'live', 1, 'published', true),
  ('00000000-0000-0000-0000-000000000932', '00000000-0000-0000-0000-000000000923', 'L2 Chat aus', 'live', 2, 'published', false),
  ('00000000-0000-0000-0000-000000000933', '00000000-0000-0000-0000-000000000923', 'L3 unveröffentlicht', 'live', 3, 'unpublished', true),
  ('00000000-0000-0000-0000-000000000934', '00000000-0000-0000-0000-000000000924', 'L4 Programm 2', 'live', 1, 'published', true);

insert into cohort (id, programme_id, name, start_datum) values
  ('00000000-0000-0000-0000-000000000941', '00000000-0000-0000-0000-000000000921', 'K1', current_date),
  ('00000000-0000-0000-0000-000000000942', '00000000-0000-0000-0000-000000000921', 'K2', current_date),
  ('00000000-0000-0000-0000-000000000943', '00000000-0000-0000-0000-000000000922', 'K3', current_date);

insert into enrolment (organisation_id, learner_id, cohort_id, status) values
  ('00000000-0000-0000-0000-000000000911', '00000000-0000-0000-0000-000000000901', '00000000-0000-0000-0000-000000000941', 'aktiv'),
  ('00000000-0000-0000-0000-000000000912', '00000000-0000-0000-0000-000000000902', '00000000-0000-0000-0000-000000000941', 'aktiv'),
  ('00000000-0000-0000-0000-000000000911', '00000000-0000-0000-0000-000000000903', '00000000-0000-0000-0000-000000000941', 'abgeschlossen'),
  ('00000000-0000-0000-0000-000000000911', '00000000-0000-0000-0000-000000000904', '00000000-0000-0000-0000-000000000941', 'abgebrochen'),
  ('00000000-0000-0000-0000-000000000911', '00000000-0000-0000-0000-000000000905', '00000000-0000-0000-0000-000000000942', 'aktiv'),
  ('00000000-0000-0000-0000-000000000911', '00000000-0000-0000-0000-000000000906', '00000000-0000-0000-0000-000000000943', 'aktiv');

insert into kohorte_moderation (cohort_id, person_id, created_by) values
  ('00000000-0000-0000-0000-000000000941', '00000000-0000-0000-0000-000000000908', '00000000-0000-0000-0000-000000000909');

-- Beiträge ohne Session (person_id wird übernommen):
-- 961 Bernd in L2 (Chat aus), 962 Emil in K2, 963 und 964 Bernd in L1/K1
insert into lektion_beitrag (id, lesson_id, cohort_id, person_id, text) values
  ('00000000-0000-0000-0000-000000000961', '00000000-0000-0000-0000-000000000932', '00000000-0000-0000-0000-000000000941', '00000000-0000-0000-0000-000000000902', 'Frage bei Chat aus'),
  ('00000000-0000-0000-0000-000000000962', '00000000-0000-0000-0000-000000000931', '00000000-0000-0000-0000-000000000942', '00000000-0000-0000-0000-000000000905', 'Frage in K2'),
  ('00000000-0000-0000-0000-000000000963', '00000000-0000-0000-0000-000000000931', '00000000-0000-0000-0000-000000000941', '00000000-0000-0000-0000-000000000902', 'Frage von Bernd'),
  ('00000000-0000-0000-0000-000000000964', '00000000-0000-0000-0000-000000000931', '00000000-0000-0000-0000-000000000941', '00000000-0000-0000-0000-000000000902', 'Zweite Frage von Bernd');

-- ------------------------------------------------------------
-- Schema, Konsistenz, Funktionsrechte
-- ------------------------------------------------------------
select is(
  (select column_default from information_schema.columns
   where table_schema = 'public' and table_name = 'lesson' and column_name = 'chat_aktiv'),
  'false',
  'lesson.chat_aktiv ist standardmäßig false'
);
select throws_ok(
  $$insert into lektion_beitrag (lesson_id, cohort_id, person_id, text)
    values ('00000000-0000-0000-0000-000000000934', '00000000-0000-0000-0000-000000000941', '00000000-0000-0000-0000-000000000901', 'falsches Programm')$$,
  '23514', null,
  'Kohorte aus einem anderen Programm als die Lektion wird abgelehnt'
);
select is(has_function_privilege('anon', 'fn_beitrag_loeschen(uuid)', 'execute'), false,
  'anon darf fn_beitrag_loeschen nicht ausführen');
select is(has_function_privilege('authenticated', 'fn_beitrag_loeschen(uuid)', 'execute'), true,
  'authenticated darf fn_beitrag_loeschen ausführen');
select is(has_function_privilege('anon', 'fn_moderiert_kohorte(uuid)', 'execute'), false,
  'anon darf fn_moderiert_kohorte nicht ausführen');

-- ------------------------------------------------------------
-- Als Anna (aktiv in K1, Betrieb A)
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000901', 'role', 'authenticated')::text, true);

select lives_ok(
  $$insert into lektion_beitrag (lesson_id, cohort_id, text)
    values ('00000000-0000-0000-0000-000000000931', '00000000-0000-0000-0000-000000000941', 'Erste Frage 🙂')$$,
  'Aktiv eingeschriebene Learner können im Thread ihrer Kohorte schreiben'
);
select is(
  (select person_id::text || ' | ' || autor_anzeigename from lektion_beitrag where text = 'Erste Frage 🙂'),
  '00000000-0000-0000-0000-000000000901 | Anna B.',
  'person_id und Anzeigename (Vorname + Initial) werden per Trigger gesetzt'
);
select throws_ok(
  $$select organisation_id from lektion_beitrag$$,
  '42501', null,
  'organisation_id ist für Learner nicht lesbar'
);
select throws_ok(
  $$insert into lektion_beitrag (lesson_id, cohort_id, text)
    values ('00000000-0000-0000-0000-000000000931', '00000000-0000-0000-0000-000000000941', '')$$,
  '23514', null,
  'Leerer Beitrag (0 Zeichen) wird abgelehnt'
);
select throws_ok(
  format($$insert into lektion_beitrag (lesson_id, cohort_id, text)
    values ('00000000-0000-0000-0000-000000000931', '00000000-0000-0000-0000-000000000941', %L)$$, repeat('x', 1001)),
  '23514', null,
  'Beitrag mit 1001 Zeichen wird abgelehnt'
);
select lives_ok(
  format($$insert into lektion_beitrag (lesson_id, cohort_id, text)
    values ('00000000-0000-0000-0000-000000000931', '00000000-0000-0000-0000-000000000941', %L)$$, repeat('y', 1000)),
  'Beitrag mit 1000 Zeichen ist erlaubt'
);
select throws_ok(
  $$insert into lektion_beitrag (lesson_id, cohort_id, text)
    values ('00000000-0000-0000-0000-000000000931', '00000000-0000-0000-0000-000000000942', 'in fremder Kohorte')$$,
  '42501', null,
  'Learner können nicht in eine fremde Kohorte schreiben'
);
select throws_ok(
  $$insert into lektion_beitrag (lesson_id, cohort_id, text)
    values ('00000000-0000-0000-0000-000000000932', '00000000-0000-0000-0000-000000000941', 'Chat aus')$$,
  '42501', null,
  'Learner können nicht schreiben, wenn chat_aktiv aus ist'
);
select throws_ok(
  $$insert into lektion_beitrag (lesson_id, cohort_id, text)
    values ('00000000-0000-0000-0000-000000000933', '00000000-0000-0000-0000-000000000941', 'unveröffentlicht')$$,
  '42501', null,
  'Learner können an einer unveröffentlichten Lektion nicht schreiben'
);
select lives_ok(
  $$insert into lektion_beitrag (lesson_id, cohort_id, parent_id, text)
    values ('00000000-0000-0000-0000-000000000931', '00000000-0000-0000-0000-000000000941',
            '00000000-0000-0000-0000-000000000963', 'Antwort von Anna')$$,
  'Antwort auf einen Beitrag erster Ebene ist erlaubt'
);
select throws_ok(
  $$insert into lektion_beitrag (lesson_id, cohort_id, parent_id, text)
    values ('00000000-0000-0000-0000-000000000931', '00000000-0000-0000-0000-000000000941',
            (select id from lektion_beitrag where text = 'Antwort von Anna'), 'Antwort auf Antwort')$$,
  '23514', null,
  'Antwort auf eine Antwort wird abgelehnt (eine Antwortebene)'
);
select throws_ok(
  $$insert into lektion_beitrag (lesson_id, cohort_id, person_id, text)
    values ('00000000-0000-0000-0000-000000000931', '00000000-0000-0000-0000-000000000941',
            '00000000-0000-0000-0000-000000000902', 'im Namen von Bernd')$$,
  '42501', null,
  'Learner können person_id nicht selbst setzen'
);
select throws_ok(
  $$update lektion_beitrag set text = 'geändert' where text = 'Erste Frage 🙂'$$,
  '42501', null,
  'Learner können Beiträge nicht bearbeiten'
);
select throws_ok(
  $$delete from lektion_beitrag where text = 'Erste Frage 🙂'$$,
  '42501', null,
  'Learner können Beiträge nicht direkt löschen'
);
select is(
  (select count(id)::int from lektion_beitrag where id = '00000000-0000-0000-0000-000000000961'),
  0,
  'Learner sehen keine Beiträge an Lektionen mit chat_aktiv aus'
);
select is(
  (select count(id)::int from lektion_beitrag where id = '00000000-0000-0000-0000-000000000962'),
  0,
  'Learner sehen keine Beiträge einer fremden Kohorte'
);
select throws_ok(
  $$select fn_beitrag_loeschen('00000000-0000-0000-0000-000000000963')$$,
  '42501', null,
  'Learner können fremde Beiträge nicht löschen'
);

-- ------------------------------------------------------------
-- Andere Personen in K1 und außerhalb
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000902', 'role', 'authenticated')::text, true);
select is(
  (select count(id)::int from lektion_beitrag where text = 'Erste Frage 🙂'),
  1,
  'Learner derselben Kohorte (anderer Betrieb) sehen den Beitrag'
);

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000903', 'role', 'authenticated')::text, true);
select is(
  (select count(id)::int from lektion_beitrag where text = 'Erste Frage 🙂'),
  1,
  'Learner mit abgeschlossener Einschreibung lesen mit'
);
select throws_ok(
  $$insert into lektion_beitrag (lesson_id, cohort_id, text)
    values ('00000000-0000-0000-0000-000000000931', '00000000-0000-0000-0000-000000000941', 'nach Abschluss')$$,
  '42501', null,
  'Learner mit abgeschlossener Einschreibung können nicht schreiben'
);

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000904', 'role', 'authenticated')::text, true);
select is((select count(id)::int from lektion_beitrag), 0,
  'Learner mit abgebrochener Einschreibung sehen nichts');

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000905', 'role', 'authenticated')::text, true);
select is(
  (select count(id)::int from lektion_beitrag where cohort_id = '00000000-0000-0000-0000-000000000941'),
  0,
  'Learner einer anderen Kohorte desselben Programms sehen den Thread von K1 nicht'
);

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000906', 'role', 'authenticated')::text, true);
select is((select count(id)::int from lektion_beitrag), 0,
  'Learner eines anderen Programms sehen nichts');

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000907', 'role', 'authenticated')::text, true);
select is((select count(id)::int from lektion_beitrag), 0,
  'Personen ohne Einschreibung sehen nichts');

-- ------------------------------------------------------------
-- Anna löscht den eigenen Beitrag
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000901', 'role', 'authenticated')::text, true);
select lives_ok(
  $$select fn_beitrag_loeschen((select id from lektion_beitrag where text = 'Erste Frage 🙂'))$$,
  'Autor:innen können eigene Beiträge löschen'
);
select is(
  (select count(id)::int from lektion_beitrag
   where geloescht_am is not null and text is null and person_id is null and autor_anzeigename is null
     and lesson_id = '00000000-0000-0000-0000-000000000931'),
  1,
  'Gelöschter Beitrag bleibt als leere Zeile im Thread sichtbar'
);

-- ------------------------------------------------------------
-- Als Moderation K1 (nicht eingeschrieben)
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000908', 'role', 'authenticated')::text, true);
select is(
  (select count(id)::int from lektion_beitrag where id = '00000000-0000-0000-0000-000000000961'),
  1,
  'Moderierende sehen Beiträge ihrer Kohorte auch bei chat_aktiv aus'
);
select lives_ok(
  $$select fn_beitrag_loeschen('00000000-0000-0000-0000-000000000963')$$,
  'Moderierende können fremde Beiträge ihrer Kohorte löschen'
);
select throws_ok(
  $$select fn_beitrag_loeschen('00000000-0000-0000-0000-000000000962')$$,
  '42501', null,
  'Moderierende können Beiträge anderer Kohorten nicht löschen'
);
select throws_ok(
  $$insert into lektion_beitrag (lesson_id, cohort_id, text)
    values ('00000000-0000-0000-0000-000000000931', '00000000-0000-0000-0000-000000000941', 'von Moderation')$$,
  '42501', null,
  'Moderierende ohne aktive Einschreibung können nicht schreiben'
);

-- ------------------------------------------------------------
-- Als AfCJ admin
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000909', 'role', 'authenticated')::text, true);
select is(
  (select count(id)::int from lektion_beitrag
   where id in ('00000000-0000-0000-0000-000000000961', '00000000-0000-0000-0000-000000000962')),
  2,
  'AfCJ admin sieht Beiträge aller Kohorten, auch bei chat_aktiv aus'
);
select lives_ok(
  $$select fn_beitrag_loeschen('00000000-0000-0000-0000-000000000962')$$,
  'AfCJ admin kann Beiträge jeder Kohorte löschen'
);
select lives_ok(
  $$select fn_beitrag_loeschen('00000000-0000-0000-0000-000000000962')$$,
  'Erneutes Löschen eines gelöschten Beitrags ist ohne Fehler'
);
select is(
  (select string_agg(aktion, ',' order by aktion) from moderationsprotokoll),
  'geloescht_autor,geloescht_moderation,geloescht_moderation',
  'Moderationsprotokoll hat genau drei Einträge (Autor:in, Moderation, Admin)'
);

-- ------------------------------------------------------------
-- Zurück als Anna: Protokoll und Moderation sind nicht zugänglich
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000901', 'role', 'authenticated')::text, true);
select is((select count(id)::int from moderationsprotokoll), 0,
  'Learner sehen das Moderationsprotokoll nicht');
select throws_like(
  $$insert into kohorte_moderation (cohort_id, person_id)
    values ('00000000-0000-0000-0000-000000000941', '00000000-0000-0000-0000-000000000901')$$,
  '%row-level security%',
  'Learner können sich nicht selbst zur Moderation eintragen'
);

-- ------------------------------------------------------------
-- Anonym
-- ------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
select throws_ok($$select count(id) from lektion_beitrag$$, '42501', null,
  'Anonyme haben keinen Zugriff auf lektion_beitrag');

-- ------------------------------------------------------------
-- Superuser: Inhalte und Account-Löschung prüfen
-- ------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '', true);

select is(
  (select b.organisation_id::text from lektion_beitrag b where b.text = 'Antwort von Anna'),
  '00000000-0000-0000-0000-000000000911',
  'organisation_id kommt aus der Einschreibung der Autor:in (Betrieb A)'
);
select is(
  (select count(*)::int from lektion_beitrag b
   join moderationsprotokoll mp on mp.beitrag_id = b.id
   where mp.aktion = 'geloescht_autor'
     and b.text is null and b.person_id is null and b.autor_anzeigename is null and b.geloescht_am is not null),
  1,
  'Soft-Delete leert Text, person_id und Anzeigename und setzt geloescht_am'
);

delete from auth.users where id = '00000000-0000-0000-0000-000000000902';
select ok(
  (select person_id is null from lektion_beitrag where id = '00000000-0000-0000-0000-000000000964'),
  'Account-Löschung setzt person_id der Beiträge auf null'
);
select ok(
  (select text is null and autor_anzeigename is null and geloescht_am is not null
   from lektion_beitrag where id = '00000000-0000-0000-0000-000000000964'),
  'Account-Löschung anonymisiert den Beitrag (Text und Anzeigename leer, geloescht_am gesetzt)'
);
select is(
  (select text || ' | ' || person_id::text || ' | ' || autor_anzeigename from lektion_beitrag
   where parent_id = '00000000-0000-0000-0000-000000000963' and text = 'Antwort von Anna'),
  'Antwort von Anna | 00000000-0000-0000-0000-000000000901 | Anna B.',
  'Antworten anderer Personen bleiben bei der Account-Löschung unverändert'
);

delete from auth.users where id = '00000000-0000-0000-0000-000000000908';
select is(
  (select count(*)::int from moderationsprotokoll where aktion = 'geloescht_moderation' and person_id is null),
  1,
  'Account-Löschung der moderierenden Person setzt person_id im Moderationsprotokoll auf null'
);

select * from finish();
rollback;
