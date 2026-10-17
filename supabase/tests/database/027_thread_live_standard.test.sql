-- 027_thread_live_standard.test.sql
-- SR-74 (0054): Live-Lektionen bekommen beim Anlegen ohne Angabe den
-- Fragen-Thread, andere Lektionen nicht; ausdrücklich gesetzte Werte bleiben; Ausschalten bleibt möglich und wird beim Ändern
-- nicht überschrieben.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(6);

insert into programme (id, name, kuerzel, status) values
  ('00000000-0000-0000-0000-000000027021', 'Programm', 'TS-P1', 'published');

insert into course (id, programme_id, name, typ, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000027031', '00000000-0000-0000-0000-000000027021', 'Kurs', 'synchron', 1, 'published');

insert into lesson (id, course_id, name, content_type, reihenfolge, status) values
  ('00000000-0000-0000-0000-000000027041', '00000000-0000-0000-0000-000000027031', 'Live', 'live', 1, 'published'),
  ('00000000-0000-0000-0000-000000027042', '00000000-0000-0000-0000-000000027031', 'Selbstlernen', 'scorm', 2, 'published'),
  ('00000000-0000-0000-0000-000000027043', '00000000-0000-0000-0000-000000027031', 'Material', 'repository', 3, 'published');

select is((select chat_aktiv from lesson where id = '00000000-0000-0000-0000-000000027041'), true,
  'Live-Lektion: Thread beim Anlegen an');
select is((select chat_aktiv from lesson where id = '00000000-0000-0000-0000-000000027042'), false,
  'SCORM-Lektion: Thread bleibt aus');
select is((select chat_aktiv from lesson where id = '00000000-0000-0000-0000-000000027043'), false,
  'Repository-Lektion: Thread bleibt aus');

insert into lesson (id, course_id, name, content_type, reihenfolge, status, chat_aktiv) values
  ('00000000-0000-0000-0000-000000027044', '00000000-0000-0000-0000-000000027031', 'Live ohne Thread', 'live', 4, 'published', false);
select is((select chat_aktiv from lesson where id = '00000000-0000-0000-0000-000000027044'), false,
  'Live-Lektion mit ausdrücklich chat_aktiv = false bleibt aus');

update lesson set chat_aktiv = false where id = '00000000-0000-0000-0000-000000027041';
select is((select chat_aktiv from lesson where id = '00000000-0000-0000-0000-000000027041'), false,
  'Live-Lektion: Thread lässt sich ausschalten');

update lesson set name = 'Live (neu)' where id = '00000000-0000-0000-0000-000000027041';
select is((select chat_aktiv from lesson where id = '00000000-0000-0000-0000-000000027041'), false,
  'Ausgeschalteter Thread bleibt beim Ändern der Lektion aus');

select * from finish();
rollback;
