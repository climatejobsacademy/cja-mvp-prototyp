-- 0072_praxisflow_einstieg.sql
-- SR-92 (Acceptance Check ergänzt am 11.11.2026): Beim Öffnen eines
-- Praxisauftrags entsteht ein Ereignis „auftrag_geoeffnet“ mit dem Einstieg
-- als Schritt: home, stundenplan, tagesuebersicht, programm, kompetenzen,
-- naechster (Knopf „nächster Praxisauftrag“ nach dem Abschluss) oder direkt
-- (ohne Herkunft, z. B. Lesezeichen). Ausgewertet wird nur
-- aggregiert (Öffnungen je Einstieg). Keine Inhalte, keine neuen Spalten.
--
-- Nur Erweiterung: die erlaubten Arten der Tabelle und
-- fn_praxis_ereignis_melden (Fassung aus 0064); sonst unverändert. Rechte,
-- RLS und Trigger bleiben wie in 0064.

alter table praxis_ereignis drop constraint praxis_ereignis_art_check;
alter table praxis_ereignis add constraint praxis_ereignis_art_check check (art in (
  'auftrag_geoeffnet',
  'schritt_geoeffnet', 'schritt_beendet', 'hilfe_geoeffnet', 'vorschau_geoeffnet',
  'datei_hochgeladen', 'datei_geloescht', 'plan_geaendert',
  'freigabe_ok', 'freigabe_fehler', 'phase_gewechselt', 'ruecksprung', 'abschluss'
));

create or replace function fn_praxis_ereignis_melden(p_job uuid, p_ereignisse jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v field_job;
  v_anzahl int;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet' using errcode = '42501';
  end if;
  if jsonb_typeof(p_ereignisse) <> 'array' or jsonb_array_length(p_ereignisse) > 20 then
    raise exception 'Höchstens 20 Ereignisse je Aufruf' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_ereignisse) e
    where coalesce(e ->> 'art', '') not in ('auftrag_geoeffnet', 'schritt_geoeffnet', 'schritt_beendet', 'hilfe_geoeffnet', 'vorschau_geoeffnet')
       or coalesce(e ->> 'schritt', '') !~ '^[a-z0-9:_-]{1,80}$'
       -- Einstieg nur aus der festen Liste (SR-92, 0072)
       or (e ->> 'art' = 'auftrag_geoeffnet'
           and e ->> 'schritt' not in ('home', 'stundenplan', 'tagesuebersicht', 'programm', 'kompetenzen', 'naechster', 'direkt'))
  ) then
    raise exception 'Unbekanntes Ereignis' using errcode = '22023';
  end if;

  select fj.* into v
  from field_job fj
  join field_job_type t on t.id = fj.field_job_type_id
  where fj.id = p_job and fj.learner_id = auth.uid() and t.ablauf = 'gefuehrt';
  if not found then
    raise exception 'Praxisauftrag nicht gefunden' using errcode = 'P0002';
  end if;

  insert into praxis_ereignis (created_at, updated_at, organisation_id, field_job_id, learner_id, phase, schritt, art)
  select clock_timestamp(), clock_timestamp(), v.organisation_id, v.id, v.learner_id, v.phase, e ->> 'schritt', e ->> 'art'
  from jsonb_array_elements(p_ereignisse) with ordinality as x(e, nr)
  order by x.nr;
  get diagnostics v_anzahl = row_count;
  return v_anzahl;
end;
$$;
