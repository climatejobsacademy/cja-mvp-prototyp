-- 0025_organisation_logo.sql
-- SR-76: Logo der eigenen Organisation im Header.
--
-- Entschieden 2026-10-08 (Vera):
--   - öffentlicher Bucket org-logos (Lesen für alle), Dateinamen sind UUIDs
--   - nur PNG, WebP, JPEG, max. 500 KB (512000 Byte), kein SVG -- als
--     Bucket-Einstellung erzwungen
--   - Upload nur durch AfCJ admin im Supabase-Dashboard; keine Upload-Policy,
--     keine Schreibrechte der App, keine Admin-Oberfläche
--   - kein Logo -> Header zeigt nur das Academy-Logo, ohne Trennstrich
--
-- Pfad als Textspalte an organisation statt über file_asset: ein Logo gehört
-- genau zu einer Organisation (keine Mehrfachverwendung wie SR-55), und die
-- Spalte bleibt hinter organisation_learner_select (0009, nur eigene
-- Organisation). file_asset ist für alle Eingeloggten lesbar
-- (file_asset_read_all) und bräuchte einen zusätzlichen Handschritt je Logo.
-- Anleitung: docs/organisations-logo.md.

-- ============================================================
-- Bucket
-- Öffentlich: Bilder werden über die Public-URL ohne RLS ausgeliefert.
-- Bewusst keine Policy auf storage.objects für diesen Bucket -- ohne Insert-,
-- Update- oder Delete-Policy kann über die API niemand schreiben; das
-- Dashboard nutzt die Service-Rolle.
-- on conflict do update wie 0023: es gelten genau diese Einstellungen.
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'org-logos',
  'org-logos',
  true,
  512000,
  array['image/png', 'image/webp', 'image/jpeg']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================
-- organisation.logo_pfad
-- null = kein Logo. Erlaubt ist nur ein Objektname direkt im Bucket-Wurzel-
-- verzeichnis: UUID in Kleinbuchstaben plus .png, .webp, .jpg oder .jpeg.
-- Grants und Policies auf organisation bleiben unverändert (0009): Lernende
-- lesen die Zeile der eigenen Organisation, AfCJ admin alles.
-- ============================================================
alter table organisation
  add column logo_pfad text;

alter table organisation
  add constraint organisation_logo_pfad_format check (
    logo_pfad is null
    or logo_pfad ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|webp|jpg|jpeg)$'
  );

comment on column organisation.logo_pfad is
  'Objektname des Logos im öffentlichen Bucket org-logos (UUID + Endung), null = '
  'kein Logo. Gesetzt nur durch AfCJ admin über scripts/sql/organisation_logo_setzen.sql '
  '(SR-76, Entscheidung 2026-10-08).';
