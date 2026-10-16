-- 0050_fachsprache_einheit.sql
-- Fachsprache Stufe 2: eine Einheit (Wörter, Quiz, Sätze) je Lektion, mit
-- optionalen Bildern. SR folgt (Notion). Ohne klickbare Fachbegriffe (Stufe 1).
-- Nummer 0050: Praxisflow reserviert 0035-0049.
--
-- Entwurfsentscheidungen (offen zur Korrektur, siehe PR-Beschreibung):
--   - genau eine Einheit je Lektion (lesson_id unique)
--   - Quiz: "richtig" ist der 0-basierte Index der Antwort; damit gibt es je
--     Frage genau eine richtige Antwort, die Prüfung stellt sicher, dass der
--     Index gültig ist
--   - Veröffentlichen nur mit fachlicher UND sprachlicher Prüfung (Person+Datum)
--   - Ändert sich Inhalt oder Titel, setzt ein Trigger beide Prüfungen zurück und
--     den Status auf 'entwurf'; bei unverändertem Inhalt bleibt alles stehen
--   - Lesen: Lernende nur veröffentlichte Einheiten lesbarer Lektionen
--     (fn_kann_lektion_lesen, 0023); Schreiben nur AfCJ admin
--   - Bilder: privater Bucket fachsprache-bilder, Pfad "<lesson_id>/<dateiname>",
--     im JSON steht nur der Dateiname (ohne Pfadanteile)
--   - keine organisation_id: Curriculum-Inhalt wie lesson (AfCJ-eigen)
--   - speichert keinen Lernstand und erzeugt keine competency_evidence

-- ============================================================
-- Prüffunktionen (immutable, damit sie in CHECK stehen dürfen)
-- ============================================================

-- Dateiname eines Bildes: keine Pfadanteile, nur PNG/JPG/WebP (kein SVG),
-- Alternativtext Pflicht, sobald ein Bild gesetzt ist.
create or replace function fn_fachsprache_bild_gueltig(p_bild jsonb, p_alt jsonb)
returns boolean
language plpgsql
immutable
as $$
begin
  if p_bild is null or jsonb_typeof(p_bild) = 'null' then
    -- ohne Bild auch kein Alternativtext
    return p_alt is null or jsonb_typeof(p_alt) = 'null';
  end if;
  if jsonb_typeof(p_bild) <> 'string' then return false; end if;
  if (p_bild #>> '{}') !~* '^[a-z0-9][a-z0-9._-]{0,99}\.(png|jpe?g|webp)$' then return false; end if;
  if (p_bild #>> '{}') like '%..%' then return false; end if;
  if p_alt is null or jsonb_typeof(p_alt) <> 'string' or btrim(p_alt #>> '{}') = '' then return false; end if;
  return true;
end;
$$;

create or replace function fn_fachsprache_inhalt_gueltig(p jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  w jsonb;
  f jsonb;
  a jsonb;
  s jsonb;
begin
  if jsonb_typeof(p) is distinct from 'object' then return false; end if;

  if jsonb_typeof(p->'wortkarten') is distinct from 'array' or jsonb_array_length(p->'wortkarten') < 1 then
    return false;
  end if;
  for w in select * from jsonb_array_elements(p->'wortkarten') loop
    if jsonb_typeof(w) <> 'object'
       or jsonb_typeof(w->'wort') is distinct from 'string' or btrim(w->>'wort') = ''
       or jsonb_typeof(w->'erklaerung') is distinct from 'string' or btrim(w->>'erklaerung') = ''
       or jsonb_typeof(w->'beispiel') is distinct from 'string' or btrim(w->>'beispiel') = ''
       or not fn_fachsprache_bild_gueltig(w->'bild', w->'bild_alt')
    then return false; end if;
  end loop;

  if jsonb_typeof(p->'quiz') is distinct from 'array' or jsonb_array_length(p->'quiz') < 1 then
    return false;
  end if;
  for f in select * from jsonb_array_elements(p->'quiz') loop
    if jsonb_typeof(f) <> 'object' then return false; end if;
    a := f->'antworten';
    if jsonb_typeof(f->'frage') is distinct from 'string' or btrim(f->>'frage') = ''
       or jsonb_typeof(f->'erklaerung') is distinct from 'string' or btrim(f->>'erklaerung') = ''
       or jsonb_typeof(a) is distinct from 'array'
       or jsonb_array_length(a) not between 2 and 4
       or not fn_fachsprache_bild_gueltig(f->'bild', f->'bild_alt')
    then return false; end if;
    -- Antworten: nur nicht-leere Texte, alle verschieden
    if exists (select 1 from jsonb_array_elements(a) x
               where jsonb_typeof(x) <> 'string' or btrim(x #>> '{}') = '') then
      return false;
    end if;
    if (select count(distinct btrim(x #>> '{}')) from jsonb_array_elements(a) x) <> jsonb_array_length(a) then
      return false;
    end if;
    -- genau eine richtige Antwort: ganzzahliger Index innerhalb der Antworten
    if jsonb_typeof(f->'richtig') is distinct from 'number'
       or (f->>'richtig') !~ '^[0-9]+$'
       or (f->>'richtig')::int >= jsonb_array_length(a)
    then return false; end if;
  end loop;

  if jsonb_typeof(p->'saetze') is distinct from 'array' then return false; end if;
  for s in select * from jsonb_array_elements(p->'saetze') loop
    if jsonb_typeof(s) <> 'string' or btrim(s #>> '{}') = '' then return false; end if;
  end loop;

  return true;
end;
$$;

comment on function fn_fachsprache_inhalt_gueltig(jsonb) is
  'Struktur von fachsprache_einheit.inhalt: wortkarten (wort, erklaerung, beispiel, '
  'optional bild + bild_alt), quiz (frage, 2-4 verschiedene antworten, richtig = 0-basierter '
  'Index, erklaerung, optional bild + bild_alt), saetze (Texte). Bilder: nur Dateiname, '
  'PNG/JPG/WebP, bild_alt Pflicht.';

-- ============================================================
-- Tabelle
-- ============================================================
create table fachsprache_einheit (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  lesson_id uuid not null unique references lesson (id) on delete cascade,
  titel text not null check (btrim(titel) <> ''),
  dauer_minuten integer check (dauer_minuten between 1 and 60),
  inhalt jsonb not null check (fn_fachsprache_inhalt_gueltig(inhalt)),
  inhalt_version integer not null default 1,
  status text not null default 'entwurf' check (status in ('entwurf', 'veroeffentlicht')),
  fachlich_geprueft_von uuid references person (id) on delete restrict,
  fachlich_geprueft_am timestamptz,
  sprachlich_geprueft_von uuid references person (id) on delete restrict,
  sprachlich_geprueft_am timestamptz,
  constraint fachsprache_pruefung_paarweise check (
    (fachlich_geprueft_von is null) = (fachlich_geprueft_am is null)
    and (sprachlich_geprueft_von is null) = (sprachlich_geprueft_am is null)
  ),
  constraint fachsprache_nur_geprueft_veroeffentlichen check (
    status <> 'veroeffentlicht'
    or (fachlich_geprueft_von is not null and sprachlich_geprueft_von is not null)
  )
);

comment on table fachsprache_einheit is
  'Fachsprache-Einheit (Wörter, Quiz, Sätze) zu genau einer Lektion. Veröffentlicht nur '
  'nach fachlicher und sprachlicher Prüfung (Person + Datum). Kein Lernstand, keine Evidenz.';

create trigger set_updated_at before update on fachsprache_einheit
  for each row execute function set_updated_at();

-- Prüfung gilt für einen Stand: ändern sich Inhalt oder Titel, werden beide
-- Prüfungen geleert und der Status fällt auf 'entwurf'. Bei unverändertem
-- Inhalt (z.B. Prüfung eintragen, veröffentlichen) bleibt alles wie gesetzt.
create or replace function fn_fachsprache_inhalt_geaendert()
returns trigger
language plpgsql
as $$
begin
  if new.inhalt is distinct from old.inhalt or new.titel is distinct from old.titel then
    new.inhalt_version := old.inhalt_version + 1;
    new.status := 'entwurf';
    new.fachlich_geprueft_von := null;
    new.fachlich_geprueft_am := null;
    new.sprachlich_geprueft_von := null;
    new.sprachlich_geprueft_am := null;
  end if;
  return new;
end;
$$;

create trigger fachsprache_inhalt_geaendert before update on fachsprache_einheit
  for each row execute function fn_fachsprache_inhalt_geaendert();

-- ============================================================
-- Zeilenrechte
-- ============================================================
alter table fachsprache_einheit enable row level security;

revoke all on fachsprache_einheit from public, anon, authenticated;
grant select, insert, update, delete on fachsprache_einheit to authenticated;

create policy fachsprache_einheit_lesen on fachsprache_einheit
  for select to authenticated
  using (status = 'veroeffentlicht' and fn_kann_lektion_lesen(lesson_id));

create policy fachsprache_einheit_admin_all on fachsprache_einheit
  for all to authenticated
  using (fn_is_afcj_admin())
  with check (fn_is_afcj_admin());

-- ============================================================
-- Bucket fachsprache-bilder (privat, 2 MB, PNG/JPEG/WebP, kein SVG)
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fachsprache-bilder',
  'fachsprache-bilder',
  false,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Lernende lesen ein Objekt nur, wenn es unter "<lesson_id>/" liegt, die Einheit
-- dieser Lektion veröffentlicht und lesbar ist UND der Dateiname im Inhalt als
-- bild vorkommt (verwaiste Dateien bleiben unsichtbar).
create policy fachsprache_bilder_lesen on storage.objects
  for select to authenticated
  using (
    bucket_id = 'fachsprache-bilder'
    and exists (
      select 1
      from fachsprache_einheit fe
      where fe.lesson_id::text = (storage.foldername(storage.objects.name))[1]
        and fe.status = 'veroeffentlicht'
        and fn_kann_lektion_lesen(fe.lesson_id)
        and jsonb_path_exists(
          fe.inhalt,
          '$.**.bild ? (@ == $n)',
          jsonb_build_object('n', storage.filename(storage.objects.name))
        )
    )
  );

-- AfCJ admin: lesen, hochladen, ersetzen, löschen (auch Entwürfe, Vorschau).
create policy fachsprache_bilder_admin on storage.objects
  for all to authenticated
  using (bucket_id = 'fachsprache-bilder' and fn_is_afcj_admin())
  with check (bucket_id = 'fachsprache-bilder' and fn_is_afcj_admin());
