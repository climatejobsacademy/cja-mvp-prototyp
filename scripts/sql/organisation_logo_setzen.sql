-- scripts/sql/organisation_logo_setzen.sql
-- Vorlage: ein hochgeladenes Logo (Bucket org-logos) einer Organisation
-- zuordnen oder das Logo entfernen. Anleitung: docs/organisations-logo.md.
-- SR-76, Migration 0025.
--
-- Läuft im Supabase-Dashboard (SQL Editor) oder per psql. Standard ist der
-- Probelauf: am Ende wird absichtlich ein Fehler ausgelöst, dadurch wird alles
-- zurückgerollt (ROLLBACK) und die Meldung zeigt, was gesetzt worden wäre.
-- Erst wenn das passt, probelauf auf false setzen und erneut ausführen.
--
-- Nur die drei Werte im Block "EINGABEN" ändern. Keine echten
-- Organisations-IDs oder Dateinamen ins Repo committen.

do $$
declare
  -- ===================== EINGABEN =====================
  p_organisation_id uuid    := '00000000-0000-0000-0000-000000000000';      -- Organisations-ID
  p_pfad            text    := '00000000-0000-0000-0000-000000000000.png';  -- Objektname im Bucket org-logos; null = Logo entfernen
  p_probelauf       boolean := true;                                        -- true = ROLLBACK, false = speichern
  -- ====================================================

  v_name      text;
  v_alt       text;
  v_mimetype  text;
  v_groesse   bigint;
begin
  select name, logo_pfad into v_name, v_alt from organisation where id = p_organisation_id;
  if v_name is null then
    raise exception 'Abbruch: Organisation % gibt es nicht.', p_organisation_id;
  end if;

  if p_pfad is not null then
    -- Gleiches Muster wie der Check organisation_logo_pfad_format (0025).
    if p_pfad !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|webp|jpg|jpeg)$' then
      raise exception 'Abbruch: Objektname "%" ist keine UUID in Kleinbuchstaben mit .png, .webp, .jpg oder .jpeg.', p_pfad;
    end if;
    if p_pfad = '00000000-0000-0000-0000-000000000000.png' then
      raise exception 'Abbruch: Bitte den echten Objektnamen eintragen.';
    end if;

    select metadata->>'mimetype', (metadata->>'size')::bigint
      into v_mimetype, v_groesse
      from storage.objects
     where bucket_id = 'org-logos' and name = p_pfad;
    if v_mimetype is null then
      raise exception 'Abbruch: Objekt "%" liegt nicht im Bucket org-logos (direkt im Wurzelverzeichnis?).', p_pfad;
    end if;
  end if;

  update organisation set logo_pfad = p_pfad where id = p_organisation_id;

  if p_probelauf then
    raise exception 'PROBELAUF ok, nichts gespeichert: Organisation "%", bisher %, neu %, Format %, Größe % Byte. Zum Speichern p_probelauf := false setzen.',
      v_name, coalesce(v_alt, 'kein Logo'), coalesce(p_pfad, 'kein Logo'),
      coalesce(v_mimetype, '-'), coalesce(v_groesse::text, '-');
  end if;

  raise notice 'Gespeichert: Organisation "%", Logo %.', v_name, coalesce(p_pfad, 'entfernt');
end $$;
