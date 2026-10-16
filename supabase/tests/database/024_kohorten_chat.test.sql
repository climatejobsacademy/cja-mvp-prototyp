-- 024_kohorten_chat.test.sql
-- Kohorten-Chat (0050; SR-83): zwei Kanäle je Kohorte. Lesen alle der
-- Kohorte (über Arbeitgeber hinweg), Treffpunkt schreiben Lernende mit
-- aktiver Einschreibung, Ankündigungen nur Trainer:innen der Kohorte und das
-- Team; Schalter cohort.chat_aktiv; Löschen, Melden, Gelesen-Stand,
-- Anonymisieren bei Account-Löschung.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(44);

-- ------------------------------------------------------------
-- Fixtures (als Superuser)
-- Betrieb A (…24011): L1 (K1 aktiv), L3 (K2 aktiv), L4 (K1 abgeschlossen), L5 (K1 abgebrochen)
-- Betrieb B (…24012): L2 (K1 aktiv)
-- AfCJ (…24013): A1 AfCJ admin, T1 Trainer:in mit Live in K1, T2 Trainer:in mit Live nur in K2
-- K1 und K2 Chat an, K3 Chat aus (L6 aktiv in K3, Betrieb A)
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000024001', 'chat-l1@example.test'),
  ('00000000-0000-0000-0000-000000024002', 'chat-l2@example.test'),
  ('00000000-0000-0000-0000-000000024003', 'chat-l3@example.test'),
  ('00000000-0000-0000-0000-000000024004', 'chat-l4@example.test'),
  ('00000000-0000-0000-0000-000000024005', 'chat-l5@example.test'),
  ('00000000-0000-0000-0000-000000024006', 'chat-l6@example.test'),
  ('00000000-0000-0000-0000-000000024007', 'chat-admin@example.test'),
  ('00000000-0000-0000-0000-000000024008', 'chat-t1@example.test'),
  ('00000000-0000-0000-0000-000000024009', 'chat-t2@example.test');

insert into organisation (id, name, typ, status) values
  ('00000000-0000-0000-0000-000000024011', 'Betrieb A', 'employer', 'aktiv'),
  ('00000000-0000-0000-0000-000000024012', 'Betrieb B', 'employer', 'aktiv'),
  ('00000000-0000-0000-0000-000000024013', 'AfCJ', 'afcj', 'aktiv');

insert into person (id, email, name, username, sprache) values
  ('00000000-0000-0000-0000-000000024001', 'chat-l1@example.test', 'Lea Maria Muster', 'ch_l1', 'DE'),
  ('00000000-0000-0000-0000-000000024002', 'chat-l2@example.test', 'Bert Beispiel', 'ch_l2', 'DE'),
  ('00000000-0000-0000-0000-000000024003', 'chat-l3@example.test', 'Andere Kohorte', 'ch_l3', 'DE'),
  ('00000000-0000-0000-0000-000000024004', 'chat-l4@example.test', 'Fertig Absolviert', 'ch_l4', 'DE'),
  ('00000000-0000-0000-0000-000000024005', 'chat-l5@example.test', 'Abbruch Ex', 'ch_l5', 'DE'),
  ('00000000-0000-0000-0000-000000024006', 'chat-l6@example.test', 'Ohne Chat', 'ch_l6', 'DE'),
  ('00000000-0000-0000-0000-000000024007', 'chat-admin@example.test', 'Admin Team', 'ch_admin', 'DE'),
  ('00000000-0000-0000-0000-000000024008', 'chat-t1@example.test', 'Trainer Eins', 'ch_t1', 'DE'),
  ('00000000-0000-0000-0000-000000024009', 'chat-t2@example.test', 'Trainer Zwei', 'ch_t2', 'DE');

insert into org_membership (person_id, organisation_id) values
  ('00000000-0000-0000-0000-000000024001', '00000000-0000-0000-0000-000000024011'),
  ('00000000-0000-0000-0000-000000024002', '00000000-0000-0000-0000-000000024012'),
  ('00000000-0000-0000-0000-000000024003', '00000000-0000-0000-0000-000000024011'),
  ('00000000-0000-0000-0000-000000024004', '00000000-0000-0000-0000-000000024011'),
  ('00000000-0000-0000-0000-000000024005', '00000000-0000-0000-0000-000000024011'),
  ('00000000-0000-0000-0000-000000024006', '00000000-0000-0000-0000-000000024011'),
  ('00000000-0000-0000-0000-000000024007', '00000000-0000-0000-0000-000000024013'),
  ('00000000-0000-0000-0000-000000024008', '00000000-0000-0000-0000-000000024013'),
  ('00000000-0000-0000-0000-000000024009', '00000000-0000-0000-0000-000000024013');

insert into role_assignment (person_id, organisation_id, rolle) values
  ('00000000-0000-0000-0000-000000024001', '00000000-0000-0000-0000-000000024011', 'learner'),
  ('00000000-0000-0000-0000-000000024002', '00000000-0000-0000-0000-000000024012', 'learner'),
  ('00000000-0000-0000-0000-000000024003', '00000000-0000-0000-0000-000000024011', 'learner'),
  ('00000000-0000-0000-0000-000000024004', '00000000-0000-0000-0000-000000024011', 'learner'),
  ('00000000-0000-0000-0000-000000024005', '00000000-0000-0000-0000-000000024011', 'learner'),
  ('00000000-0000-0000-0000-000000024006', '00000000-0000-0000-0000-000000024011', 'learner'),
  ('00000000-0000-0000-0000-000000024007', '00000000-0000-0000-0000-000000024013', 'afcj_admin'),
  ('00000000-0000-0000-0000-000000024008', '00000000-0000-0000-0000-000000024013', 'trainer'),
  ('00000000-0000-0000-0000-000000024009', '00000000-0000-0000-0000-000000024013', 'trainer');

insert into programme (id, name, kuerzel, status) values
  ('00000000-0000-0000-0000-000000024021', 'Programm', 'CH-P1', 'published');

insert into course (id, programme_id, name, typ, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000024031', '00000000-0000-0000-0000-000000024021', 'Kurs', 'synchron', 1, 'published');

insert into cohort (id, programme_id, name, start_datum, chat_aktiv) values
  ('00000000-0000-0000-0000-000000024051', '00000000-0000-0000-0000-000000024021', 'K1', '2026-11-02', true),
  ('00000000-0000-0000-0000-000000024052', '00000000-0000-0000-0000-000000024021', 'K2', '2026-11-02', true),
  ('00000000-0000-0000-0000-000000024053', '00000000-0000-0000-0000-000000024021', 'K3', '2026-11-02', false);

insert into enrolment (id, organisation_id, learner_id, cohort_id, status) values
  ('00000000-0000-0000-0000-000000024061', '00000000-0000-0000-0000-000000024011', '00000000-0000-0000-0000-000000024001', '00000000-0000-0000-0000-000000024051', 'aktiv'),
  ('00000000-0000-0000-0000-000000024062', '00000000-0000-0000-0000-000000024012', '00000000-0000-0000-0000-000000024002', '00000000-0000-0000-0000-000000024051', 'aktiv'),
  ('00000000-0000-0000-0000-000000024063', '00000000-0000-0000-0000-000000024011', '00000000-0000-0000-0000-000000024003', '00000000-0000-0000-0000-000000024052', 'aktiv'),
  ('00000000-0000-0000-0000-000000024064', '00000000-0000-0000-0000-000000024011', '00000000-0000-0000-0000-000000024004', '00000000-0000-0000-0000-000000024051', 'abgeschlossen'),
  ('00000000-0000-0000-0000-000000024065', '00000000-0000-0000-0000-000000024011', '00000000-0000-0000-0000-000000024005', '00000000-0000-0000-0000-000000024051', 'abgebrochen'),
  ('00000000-0000-0000-0000-000000024066', '00000000-0000-0000-0000-000000024011', '00000000-0000-0000-0000-000000024006', '00000000-0000-0000-0000-000000024053', 'aktiv');

-- T1 hält einen Live-Termin in K1, T2 nur in K2.
insert into live_session (id, course_id, datum, start, ende, trainer_id) values
  ('00000000-0000-0000-0000-000000024071', '00000000-0000-0000-0000-000000024031', '2026-11-03', '09:00', '12:00', '00000000-0000-0000-0000-000000024008'),
  ('00000000-0000-0000-0000-000000024072', '00000000-0000-0000-0000-000000024031', '2026-11-03', '13:00', '16:00', '00000000-0000-0000-0000-000000024009');
insert into schedule_entry (organisation_id, datum, art, reihenfolge, cohort_id, enrolment_id, live_session_id, field_job_id) values
  ('00000000-0000-0000-0000-000000024011', '2026-11-03', 'live', 1, '00000000-0000-0000-0000-000000024051', null, '00000000-0000-0000-0000-000000024071', null),
  ('00000000-0000-0000-0000-000000024011', '2026-11-03', 'live', 2, '00000000-0000-0000-0000-000000024052', null, '00000000-0000-0000-0000-000000024072', null);

-- ------------------------------------------------------------
-- Schema und Funktionsrechte
-- ------------------------------------------------------------
select has_table('public', 'chat_nachricht', 'chat_nachricht existiert');
select has_table('public', 'chat_gelesen', 'chat_gelesen existiert');
select is(
  (select column_default from information_schema.columns
   where table_schema = 'public' and table_name = 'cohort' and column_name = 'chat_aktiv'),
  'false',
  'cohort.chat_aktiv ist standardmäßig false'
);
select is(has_function_privilege('anon', 'fn_chat_nachricht_loeschen(uuid)', 'execute'), false,
  'anon darf fn_chat_nachricht_loeschen nicht ausführen');
select is(has_function_privilege('anon', 'fn_chat_darf_lesen(uuid)', 'execute'), false,
  'anon darf fn_chat_darf_lesen nicht ausführen');
select is(has_table_privilege('anon', 'chat_nachricht', 'select'), false,
  'anon darf chat_nachricht nicht lesen');

-- ------------------------------------------------------------
-- Als L1 (K1 aktiv, Betrieb A)
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000024001', 'role', 'authenticated')::text, true);

select lives_ok(
  $$insert into chat_nachricht (id, cohort_id, kanal, text)
    values ('00000000-0000-0000-0000-0000000240a1', '00000000-0000-0000-0000-000000024051', 'treffpunkt', 'Wer kommt zum Vcafé? ☕')$$,
  'Aktiv eingeschriebene Lernende schreiben im Treffpunkt ihrer Kohorte'
);
select is(
  (select person_id::text || ' | ' || autor_anzeigename from chat_nachricht where id = '00000000-0000-0000-0000-0000000240a1'),
  '00000000-0000-0000-0000-000000024001 | Lea M.',
  'person_id und Anzeigename (Rufname + Initial des Nachnamens) setzt der Trigger'
);
select lives_ok(
  $$insert into chat_nachricht (id, cohort_id, kanal, text)
    values ('00000000-0000-0000-0000-0000000240a4', '00000000-0000-0000-0000-000000024051', 'treffpunkt', 'Bis morgen')$$,
  'Zweite Nachricht von L1'
);
select throws_ok(
  $$insert into chat_nachricht (cohort_id, kanal, text)
    values ('00000000-0000-0000-0000-000000024051', 'ankuendigungen', 'Ich kündige an')$$,
  '42501', null,
  'Lernende dürfen nicht in Ankündigungen schreiben'
);
select throws_ok(
  $$insert into chat_nachricht (cohort_id, kanal, text)
    values ('00000000-0000-0000-0000-000000024052', 'treffpunkt', 'Falsche Kohorte')$$,
  '42501', null,
  'Lernende dürfen nicht in einer fremden Kohorte schreiben'
);
select throws_ok(
  $$insert into chat_nachricht (cohort_id, kanal, text)
    values ('00000000-0000-0000-0000-000000024051', 'treffpunkt', '')$$,
  '23514', null,
  'Leere Nachricht wird abgelehnt'
);
select throws_ok(
  format($$insert into chat_nachricht (cohort_id, kanal, text) values ('00000000-0000-0000-0000-000000024051', 'treffpunkt', %L)$$, repeat('x', 1001)),
  '23514', null,
  'Nachricht mit mehr als 1000 Zeichen wird abgelehnt'
);
select throws_ok(
  $$select organisation_id from chat_nachricht$$,
  '42501', null,
  'organisation_id ist für Lernende nicht lesbar'
);
select throws_ok(
  $$update chat_nachricht set text = 'geändert' where id = '00000000-0000-0000-0000-0000000240a1'$$,
  '42501', null,
  'Nachrichten lassen sich nicht bearbeiten'
);

-- ------------------------------------------------------------
-- Als T1 (Trainer:in mit Termin in K1)
-- ------------------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000024008', 'role', 'authenticated')::text, true);

select lives_ok(
  $$insert into chat_nachricht (id, cohort_id, kanal, text)
    values ('00000000-0000-0000-0000-0000000240a2', '00000000-0000-0000-0000-000000024051', 'ankuendigungen', 'Morgen startet der Live-Unterricht um 9 Uhr.')$$,
  'Trainer:in der Kohorte schreibt in Ankündigungen'
);
select is(
  (select count(*)::int from chat_nachricht where cohort_id = '00000000-0000-0000-0000-000000024051'),
  3,
  'Trainer:in der Kohorte liest den Chat der Kohorte'
);
select is(
  (select count(*)::int from chat_nachricht where cohort_id = '00000000-0000-0000-0000-000000024052'),
  0,
  'Trainer:in liest nicht den Chat einer Kohorte ohne eigenen Termin'
);

reset role;
select is(
  (select organisation_id::text from chat_nachricht where id = '00000000-0000-0000-0000-0000000240a2'),
  '00000000-0000-0000-0000-000000024013',
  'Nachrichten von Trainer:innen gehören zur AfCJ-Organisation'
);

-- ------------------------------------------------------------
-- Als T2 (Trainer:in nur in K2)
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000024009', 'role', 'authenticated')::text, true);

select throws_ok(
  $$insert into chat_nachricht (cohort_id, kanal, text)
    values ('00000000-0000-0000-0000-000000024051', 'ankuendigungen', 'Nicht meine Kohorte')$$,
  '42501', null,
  'Trainer:in ohne Termin in der Kohorte darf dort nicht schreiben'
);

-- ------------------------------------------------------------
-- Als L2 (K1 aktiv, Betrieb B)
-- ------------------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000024002', 'role', 'authenticated')::text, true);

select is(
  (select count(*)::int from chat_nachricht where cohort_id = '00000000-0000-0000-0000-000000024051'),
  3,
  'Lernende eines anderen Betriebs in derselben Kohorte sehen alle Nachrichten der Kohorte'
);
select lives_ok(
  $$insert into chat_nachricht (id, cohort_id, kanal, text)
    values ('00000000-0000-0000-0000-0000000240a3', '00000000-0000-0000-0000-000000024051', 'treffpunkt', 'Ich komme!')$$,
  'L2 schreibt im Treffpunkt'
);
select throws_ok(
  $$select fn_chat_nachricht_loeschen('00000000-0000-0000-0000-0000000240a1')$$,
  '42501', null,
  'Lernende dürfen fremde Nachrichten nicht löschen'
);
select lives_ok(
  $$select fn_chat_nachricht_melden('00000000-0000-0000-0000-0000000240a1')$$,
  'Lernende können eine Nachricht der Kohorte melden'
);
select lives_ok(
  $$select fn_chat_nachricht_melden('00000000-0000-0000-0000-0000000240a1')$$,
  'Doppelte Meldung ist ohne Fehler'
);
select is_empty(
  $$select id from chat_meldung$$,
  'Lernende sehen keine Meldungen'
);
select results_eq(
  $$select kanal, anzahl from fn_chat_ungelesen('00000000-0000-0000-0000-000000024051') order by kanal$$,
  $$values ('ankuendigungen'::text, 1), ('treffpunkt'::text, 2)$$,
  'Ungelesen zählt fremde Nachrichten je Kanal, die eigene nicht'
);
select lives_ok(
  $$select fn_chat_gelesen_setzen('00000000-0000-0000-0000-000000024051', 'treffpunkt')$$,
  'Gelesen-Stand setzen'
);
select results_eq(
  $$select kanal, anzahl from fn_chat_ungelesen('00000000-0000-0000-0000-000000024051') order by kanal$$,
  $$values ('ankuendigungen'::text, 1), ('treffpunkt'::text, 0)$$,
  'Nach dem Lesen ist der Treffpunkt ohne Ungelesenes'
);

reset role;
select is(
  (select organisation_id::text from chat_nachricht where id = '00000000-0000-0000-0000-0000000240a3'),
  '00000000-0000-0000-0000-000000024012',
  'organisation_id kommt aus der Einschreibung der Autor:in (Betrieb B)'
);

-- ------------------------------------------------------------
-- Als L3 (andere Kohorte K2)
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000024003', 'role', 'authenticated')::text, true);

select is_empty(
  $$select id from chat_nachricht where cohort_id = '00000000-0000-0000-0000-000000024051'$$,
  'Lernende einer anderen Kohorte sehen nichts'
);
select throws_ok(
  $$select fn_chat_nachricht_melden('00000000-0000-0000-0000-0000000240a1')$$,
  'P0002', null,
  'Nachrichten fremder Kohorten lassen sich nicht melden'
);

-- ------------------------------------------------------------
-- Als L4 (K1 abgeschlossen) und L5 (K1 abgebrochen)
-- ------------------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000024004', 'role', 'authenticated')::text, true);

select is(
  (select count(*)::int from chat_nachricht where cohort_id = '00000000-0000-0000-0000-000000024051'),
  4,
  'Mit abgeschlossener Einschreibung bleibt der Chat lesbar'
);
select throws_ok(
  $$insert into chat_nachricht (cohort_id, kanal, text)
    values ('00000000-0000-0000-0000-000000024051', 'treffpunkt', 'Noch da')$$,
  '42501', null,
  'Mit abgeschlossener Einschreibung kann man nicht mehr schreiben'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000024005', 'role', 'authenticated')::text, true);

select is_empty(
  $$select id from chat_nachricht$$,
  'Mit abgebrochener Einschreibung ist der Chat nicht lesbar'
);

-- ------------------------------------------------------------
-- Als L6 (K3, Chat aus)
-- ------------------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000024006', 'role', 'authenticated')::text, true);

select throws_ok(
  $$insert into chat_nachricht (cohort_id, kanal, text)
    values ('00000000-0000-0000-0000-000000024053', 'treffpunkt', 'Chat ist aus')$$,
  '42501', null,
  'Ist der Chat der Kohorte aus, kann niemand dort schreiben'
);

-- ------------------------------------------------------------
-- Moderation als T1
-- ------------------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000024008', 'role', 'authenticated')::text, true);

select is(
  (select count(*)::int from chat_meldung where erledigt_am is null),
  1,
  'Trainer:in der Kohorte sieht die offene Meldung'
);
select lives_ok(
  $$select fn_chat_nachricht_loeschen('00000000-0000-0000-0000-0000000240a1')$$,
  'Trainer:in der Kohorte löscht eine Nachricht von Lernenden'
);
select ok(
  (select text is null and person_id is null and autor_anzeigename is null and geloescht_am is not null
   from chat_nachricht where id = '00000000-0000-0000-0000-0000000240a1'),
  'Soft-Delete leert Text, person_id und Anzeigename'
);
select is(
  (select count(*)::int from chat_meldung where erledigt_am is null),
  0,
  'Mit dem Löschen ist die Meldung erledigt'
);

reset role;
select is(
  (select aktion from chat_moderationsprotokoll where nachricht_id = '00000000-0000-0000-0000-0000000240a1'),
  'geloescht_moderation',
  'Das Löschen wird ohne Text protokolliert'
);

-- ------------------------------------------------------------
-- Eigene Nachricht löschen (L2) und Account-Löschung (L1)
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000024002', 'role', 'authenticated')::text, true);

select lives_ok(
  $$select fn_chat_nachricht_loeschen('00000000-0000-0000-0000-0000000240a3')$$,
  'Lernende löschen ihre eigene Nachricht'
);

reset role;
delete from auth.users where id = '00000000-0000-0000-0000-000000024001';
select ok(
  (select text is null and person_id is null and autor_anzeigename is null and geloescht_am is not null
   from chat_nachricht where id = '00000000-0000-0000-0000-0000000240a4'),
  'Account-Löschung anonymisiert die Nachrichten der Person'
);
select is(
  (select text from chat_nachricht where id = '00000000-0000-0000-0000-0000000240a2'),
  'Morgen startet der Live-Unterricht um 9 Uhr.',
  'Nachrichten anderer Personen bleiben bei der Account-Löschung unverändert'
);

select * from finish();
rollback;
