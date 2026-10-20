-- 0053_fachsprache_ohne_pruefung.sql
-- Fachsprache-Einheit: keine Prüfungen in der Datenbank mehr (Beschluss Vera,
-- 2026-10-16). Eine Einheit gilt als veröffentlicht, wenn status =
-- 'veroeffentlicht' gilt, sonst nichts. Prüfen bleibt ein Teamprozess außerhalb
-- der Datenbank; die Datenbank verhindert Veröffentlichen ohne Prüfung ab jetzt
-- NICHT mehr (siehe docs/decisions.md, Eintrag vom 2026-10-16).
--
-- Was sich ändert (alles an fachsprache_einheit aus 0051):
--   - Constraint fachsprache_nur_geprueft_veroeffentlichen entfällt
--   - Constraint fachsprache_pruefung_paarweise entfällt
--   - die vier Prüfspalten fachlich_geprueft_von/_am und
--     sprachlich_geprueft_von/_am entfallen (mit ihren Fremdschlüsseln auf person)
--   - fn_fachsprache_inhalt_geaendert setzt bei geänderten inhalt oder titel nur
--     noch den Status auf 'entwurf' (und zählt inhalt_version hoch, wie bisher);
--     es gibt keine Prüfungen mehr, die zurückzusetzen wären. Der Trigger
--     fachsprache_inhalt_geaendert bleibt bestehen
--   - comment on table: keine Prüfung, kein Lernstand, keine Evidenz
-- Unverändert: Spalten id, created_at, updated_at, lesson_id, titel,
-- dauer_minuten, inhalt, inhalt_version, status; Check auf den Inhalt
-- (fn_fachsprache_inhalt_gueltig); Policies, Grants, Bucket fachsprache-bilder.
-- 0051 selbst bleibt unverändert.
--
-- Keine Daten betroffen: Stand 2026-10-16 liegen auf Staging 7 Zeilen, alle
-- Prüfspalten sind leer (alle Zeilen Status 'entwurf'); keine Policy, View,
-- Funktion (außer der hier ersetzten Trigger-Funktion) und kein Index nennt die
-- Prüfspalten. 0051 ist nicht auf Production angewendet.
--
-- Warum das Löschen der Spalten hier vertretbar ist: Die Spalten sind noch nie
-- befüllt worden und 0051 ist nur auf Staging angewendet, es gehen also keine
-- Angaben verloren. Eine Prüfung als Datenbankfeld ist nicht mehr gewollt;
-- ungenutzte Spalten würden nur den Eindruck einer Prüfung in der Datenbank
-- erwecken.
--
-- Rückweg: eine Folge-Migration legt die vier Spalten und die beiden
-- Constraints wieder an (uuid references person (id) on delete restrict bzw.
-- timestamptz, Constraints wie in 0051) und stellt die alte Trigger-Funktion
-- wieder her. Das Constraint fachsprache_nur_geprueft_veroeffentlichen lässt
-- sich nur anlegen, solange keine Einheit ohne Prüfung veröffentlicht ist;
-- sonst vorher auf 'entwurf' setzen. Gelöschte Prüfangaben ließen sich nicht
-- zurückholen (aktuell leer).

-- ============================================================
-- Trigger-Funktion zuerst, damit sie die Spalten nicht mehr nennt
-- ============================================================
create or replace function fn_fachsprache_inhalt_geaendert()
returns trigger
language plpgsql
as $$
begin
  if new.inhalt is distinct from old.inhalt or new.titel is distinct from old.titel then
    new.inhalt_version := old.inhalt_version + 1;
    new.status := 'entwurf';
  end if;
  return new;
end;
$$;

-- ============================================================
-- Constraints und Spalten
-- ============================================================
alter table fachsprache_einheit drop constraint if exists fachsprache_nur_geprueft_veroeffentlichen;
alter table fachsprache_einheit drop constraint if exists fachsprache_pruefung_paarweise;

alter table fachsprache_einheit
  drop column if exists fachlich_geprueft_von,
  drop column if exists fachlich_geprueft_am,
  drop column if exists sprachlich_geprueft_von,
  drop column if exists sprachlich_geprueft_am;

comment on table fachsprache_einheit is
  'Fachsprache-Einheit (Wörter, Quiz, Sätze) zu genau einer Lektion. Veröffentlicht ist '
  'sie, wenn status = veroeffentlicht gilt; eine Prüfung gibt es in der Datenbank nicht '
  '(Teamprozess). Ändern sich Inhalt oder Titel, fällt der Status auf entwurf. '
  'Kein Lernstand, keine Evidenz.';
