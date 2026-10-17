-- 0054_thread_live_standard.sql
-- Fragen-Thread (SR-74): an Live-Lektionen standardmäßig an (Anna 2026-10-17).
--   - Neue Lektionen ohne Angabe zu chat_aktiv: Live an, alle anderen aus
--     (Trigger beim Anlegen). Dafür entfällt der feste Standard false; wer
--     beim Anlegen chat_aktiv ausdrücklich setzt (z. B. false), behält den Wert.
--   - Ausschalten geht weiter je Lektion (scripts/sql/thread_aktivieren.sql);
--     der Trigger greift nur beim Anlegen, nie bei späteren Änderungen.
--   - Termine, die an einem Kurs statt an einer Lektion hängen (z. B.
--     Deutsch/Fachdeutsch, Softskills Coaching), haben keine Lektion und damit
--     keinen Thread.
--   - Einmalig: alle bestehenden Live-Lektionen werden eingeschaltet.
-- Keine neue Tabelle, keine Änderung an Rechten oder Policies.

create or replace function fn_lesson_thread_live_standard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.chat_aktiv is null then
    new.chat_aktiv := (new.content_type = 'live');
  end if;
  return new;
end;
$$;

comment on function fn_lesson_thread_live_standard() is
  'Ohne Angabe beim Anlegen: chat_aktiv = true für Live-Lektionen, sonst false. SR-74, 0054.';

alter table lesson alter column chat_aktiv drop default;

create trigger lesson_thread_live_standard
  before insert on lesson
  for each row execute function fn_lesson_thread_live_standard();

update lesson set chat_aktiv = true where content_type = 'live' and not chat_aktiv;

comment on column lesson.chat_aktiv is
  'Fragen-Thread an dieser Lektion freigeschaltet. Live-Lektionen beim Anlegen an (0054), sonst aus; je Lektion abschaltbar. SR-74.';
