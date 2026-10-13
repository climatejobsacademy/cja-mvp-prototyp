-- scripts/import-plan/import.sql
-- Schreibt einen Importplan (aus plan.mjs) in die Datenbank. Wird nur über
-- scripts/import-plan.mjs ausgeführt, das diese Datei zusammen mit dem Plan
-- und BEGIN ... ROLLBACK (Probelauf) bzw. COMMIT an psql gibt. Anleitung:
-- docs/import-plan.md.
--
-- Legt nur temporäre Objekte an (pg_temp), keine Schemaänderung. Idempotent:
-- Jede Zeile wird zuerst über ihren Schlüssel gesucht und nur angelegt oder
-- geändert, wenn sie fehlt oder abweicht. Gelöscht werden nur Zuordnungen, die
-- nach einer Typänderung gegen die Typ-Regel (SR-71) verstoßen würden.
--
-- Schlüssel (ohne eigene Kennungsspalte, keine Migration):
--   modul                 Programm EFK-EE + Reihenfolge (I = 1 … Abschluss = 6)
--   module (Woche)        Modul + Nummer im Modul (Rang nach Reihenfolge)
--   competency            modul_competency.kuerzel = Kennung (M02-K03); beim
--                         ersten Lauf: bisheriges Kürzel (M2.03) oder, für
--                         Modul I, über die Namen der Teilschritte
--   competency_step       Kompetenz + Name (normalisiert, ohne Klammern)
--   field_job_type        kategorie = Auftragsnummer (M02-A07); beim ersten
--                         Lauf Modul I: Reihenfolge = Auftragsnummer
--   course / lesson       Woche + Kursname; Lektion je Kurs und content_type
--   Begleitkurs           Programm + Name (Deutsch/Fachdeutsch, Softskills Coaching)
--   live_session          Kohorte (über schedule_entry) + Lektion bzw. Kurs + Datum
--   field_job             Lernende:r + Auftrag + Datum
--   Trainer:in            person.username = trainer-<kennung>, z. B. trainer-tr-02

create temp table import_bericht (
  nr serial,
  lauf integer not null,
  tabelle text not null,
  aktion text not null,
  anzahl integer not null default 0,
  primary key (lauf, tabelle, aktion)
) on commit drop;

create temp table import_meldung (
  nr serial,
  lauf integer not null,
  art text not null,
  text text not null
) on commit drop;

create function pg_temp.zaehle(p_lauf integer, p_tabelle text, p_aktion text, p_anzahl integer default 1)
returns void language sql as $$
  insert into import_bericht (lauf, tabelle, aktion, anzahl)
  values (p_lauf, p_tabelle, p_aktion, p_anzahl)
  on conflict (lauf, tabelle, aktion) do update set anzahl = import_bericht.anzahl + excluded.anzahl;
$$;

create function pg_temp.melde(p_lauf integer, p_art text, p_text text)
returns void language sql as $$
  insert into import_meldung (lauf, art, text) values (p_lauf, p_art, p_text);
$$;

-- "Lötstelle nach den „3 G’s“ (glänzend …)" -> "lötstelle nach den 3 gs"
create function pg_temp.norm(p text)
returns text language sql immutable as $$
  select btrim(regexp_replace(regexp_replace(lower(regexp_replace(p, '\([^()]*\)', '', 'g')), '[^[:alnum:] ]', '', 'g'), '\s+', ' ', 'g'));
$$;

create function pg_temp.import_plan(p jsonb, p_kohorten jsonb, p_lauf integer)
returns void
language plpgsql
as $fn$
declare
  v_prog uuid;
  v_afcj uuid;
  r jsonb;
  t jsonb;
  k jsonb;
  v_modul uuid;
  v_id uuid;
  v_id2 uuid;
  v_ids uuid[];
  v_n integer;
  v_text text;
  v_alt record;
  v_kohorte record;
  v_org uuid;
  v_datum date;
  v_enr record;
  v_trainer uuid;
  v_job uuid;
  a text;
begin
  -- ========== Voraussetzungen ==========
  if to_regclass('public.modul') is null
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'lesson' and column_name = 'thema')
     or not exists (select 1 from pg_constraint where conname = 'role_assignment_rolle_check' and pg_get_constraintdef(oid) like '%trainer%') then
    raise exception 'Abbruch: Migrationen bis 0030 fehlen in dieser Datenbank.';
  end if;

  select id into strict v_prog from programme where kuerzel = 'EFK-EE';
  select id into strict v_afcj from organisation where typ = 'afcj';

  create temp table if not exists _woche (modul text, nummer integer, id uuid) on commit drop;
  create temp table if not exists _trainer (kennung text, id uuid) on commit drop;
  create temp table if not exists _kompetenz (kennung text, id uuid) on commit drop;
  create temp table if not exists _schritt (kennung text, id uuid) on commit drop;
  create temp table if not exists _auftrag (kennung text, id uuid) on commit drop;
  create temp table if not exists _kurs (schluessel text, id uuid, live_id uuid, scorm_id uuid) on commit drop;
  create temp table if not exists _begleit (name text, id uuid) on commit drop;
  create temp table if not exists _modul (modul text, id uuid, reihenfolge integer) on commit drop;
  truncate _woche, _trainer, _kompetenz, _schritt, _auftrag, _kurs, _begleit, _modul;

  -- ========== modul ==========
  for r in select * from jsonb_array_elements(p->'module') loop
    select id into v_modul from modul where programme_id = v_prog and reihenfolge = (r->>'reihenfolge')::int;
    if v_modul is null then
      raise exception 'Abbruch: Modul % (Reihenfolge %) fehlt -- Migration 0028 legt die sechs Module an.', r->>'modul', r->>'reihenfolge';
    end if;
    insert into _modul values (r->>'modul', v_modul, (r->>'reihenfolge')::int);
    update modul set name = r->>'titel' where id = v_modul and name is distinct from r->>'titel';
    get diagnostics v_n = row_count;
    perform pg_temp.zaehle(p_lauf, 'modul', case when v_n > 0 then 'geändert' else 'unverändert' end);
  end loop;

  -- ========== module (Wochen) ==========
  for r in select * from jsonb_array_elements(p->'wochen') loop
    select id into v_modul from _modul where modul = r->>'modul';
    select w.id into v_id
      from (select id, row_number() over (order by reihenfolge, created_at) as nr from module where modul_id = v_modul) w
     where w.nr = (r->>'nummer')::int;
    if v_id is null then
      select count(*) into v_n from module where modul_id = v_modul;
      if v_n <> (r->>'nummer')::int - 1 then
        raise exception 'Abbruch: Modul % hat % Wochen, Woche % kann nicht angelegt werden (Lücke).', r->>'modul', v_n, r->>'nummer';
      end if;
      insert into module (programme_id, modul_id, name, reihenfolge, wochentyp, lage, status)
      values (
        v_prog, v_modul,
        format('Woche %s – %s (%s)', r->>'nummer',
               case r->>'wochentyp' when 'theorie' then 'Theorie' else 'Praxis' end,
               case r->>'lage' when 'online' then 'online' when 'praesenz' then 'Präsenz' else 'im Betrieb' end),
        (select reihenfolge from _modul where modul = r->>'modul') * 100 + (r->>'nummer')::int,
        r->>'wochentyp', r->>'lage', 'published')
      returning id into v_id;
      perform pg_temp.zaehle(p_lauf, 'module (Woche)', 'neu');
    else
      update module set wochentyp = r->>'wochentyp', lage = r->>'lage'
       where id = v_id and (wochentyp is distinct from r->>'wochentyp' or lage is distinct from r->>'lage');
      get diagnostics v_n = row_count;
      perform pg_temp.zaehle(p_lauf, 'module (Woche)', case when v_n > 0 then 'geändert' else 'unverändert' end);
    end if;
    insert into _woche values (r->>'modul', (r->>'nummer')::int, v_id);
  end loop;

  -- ========== Trainer:innen (person, Rolle trainer, ohne Login) ==========
  for r in select * from jsonb_array_elements(p->'trainer') loop
    select id into v_id from person where username = 'trainer-' || lower(r->>'kennung');
    if v_id is null then
      v_id := gen_random_uuid();
      -- Auth-Konto ohne Passwort und ohne bestätigte E-Mail: Anmeldung nicht möglich.
      -- Platzhalter-Adresse unter .invalid (RFC 2606), später händisch änderbar.
      insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
      values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
              lower(r->>'kennung') || '@trainer.invalid',
              '{"provider": "email", "providers": ["email"]}', '{}', now(), now());
      insert into person (id, email, name, username, rufname)
      values (v_id, lower(r->>'kennung') || '@trainer.invalid', r->>'anzeigename', 'trainer-' || lower(r->>'kennung'), r->>'anzeigename');
      perform pg_temp.zaehle(p_lauf, 'person (Trainer:in)', 'neu');
    else
      -- Name und E-Mail werden nach dem Anlegen nicht überschrieben (händisch änderbar).
      perform pg_temp.zaehle(p_lauf, 'person (Trainer:in)', 'unverändert');
    end if;
    insert into org_membership (person_id, organisation_id) values (v_id, v_afcj) on conflict do nothing;
    get diagnostics v_n = row_count;
    perform pg_temp.zaehle(p_lauf, 'org_membership', case when v_n > 0 then 'neu' else 'unverändert' end);
    insert into role_assignment (person_id, organisation_id, rolle) values (v_id, v_afcj, 'trainer') on conflict do nothing;
    get diagnostics v_n = row_count;
    perform pg_temp.zaehle(p_lauf, 'role_assignment (trainer)', case when v_n > 0 then 'neu' else 'unverändert' end);
    insert into _trainer values (r->>'kennung', v_id);
  end loop;

  -- ========== competency, competency_programme, modul_competency ==========
  for r in select * from jsonb_array_elements(p->'kompetenzen') loop
    select id into v_modul from _modul where modul = r->>'modul';
    v_id := null;
    select competency_id into v_id from modul_competency where modul_id = v_modul and kuerzel = r->>'kennung';
    if v_id is null and r->>'bisher' is not null then
      update modul_competency set kuerzel = r->>'kennung'
       where modul_id = v_modul and kuerzel = r->>'bisher'
      returning competency_id into v_id;
      if v_id is not null then
        perform pg_temp.zaehle(p_lauf, 'modul_competency', 'geändert');
        perform pg_temp.melde(p_lauf, 'kuerzel', format('%s: Kürzel %s umgestellt.', r->>'kennung', r->>'bisher'));
      end if;
    end if;
    if v_id is null then
      -- Erster Lauf ohne Kürzel: bestehende Kompetenz über die Namen ihrer Teilschritte finden.
      select array_agg(distinct ccs.competency_id) into v_ids
        from jsonb_array_elements(p->'teilschritte') s
        join competency_step cs on pg_temp.norm(cs.name) = pg_temp.norm(s->>'name')
        join competency_competency_step ccs on ccs.competency_step_id = cs.id
        join competency_programme cp on cp.competency_id = ccs.competency_id and cp.programme_id = v_prog
       where s->>'kompetenz' = r->>'kennung';
      if coalesce(array_length(v_ids, 1), 0) > 1 then
        raise exception 'Abbruch: Teilschritte von % gehören in der Datenbank zu mehreren Kompetenzen.', r->>'kennung';
      end if;
      v_id := v_ids[1];
      if v_id is not null and exists (select 1 from modul_competency where competency_id = v_id and modul_id = v_modul) then
        raise exception 'Abbruch: % passt zu einer Kompetenz, die im Modul schon ein anderes Kürzel hat.', r->>'kennung';
      end if;
    end if;
    if v_id is null then
      insert into competency (name, kompetenzbereich, quelle)
      values (r->>'name', 'Modul ' || (r->>'modul'), 'EFK-EE')
      returning id into v_id;
      perform pg_temp.zaehle(p_lauf, 'competency', 'neu');
    else
      update competency set name = r->>'name' where id = v_id and name is distinct from r->>'name';
      get diagnostics v_n = row_count;
      perform pg_temp.zaehle(p_lauf, 'competency', case when v_n > 0 then 'geändert' else 'unverändert' end);
    end if;
    insert into competency_programme (competency_id, programme_id) values (v_id, v_prog) on conflict do nothing;
    get diagnostics v_n = row_count;
    perform pg_temp.zaehle(p_lauf, 'competency_programme', case when v_n > 0 then 'neu' else 'unverändert' end);

    if exists (select 1 from modul_competency where modul_id = v_modul and competency_id = v_id) then
      update modul_competency set kuerzel = r->>'kennung', reihenfolge = (r->>'reihenfolge')::int
       where modul_id = v_modul and competency_id = v_id
         and (kuerzel is distinct from r->>'kennung' or reihenfolge <> (r->>'reihenfolge')::int);
      get diagnostics v_n = row_count;
      perform pg_temp.zaehle(p_lauf, 'modul_competency', case when v_n > 0 then 'geändert' else 'unverändert' end);
    else
      insert into modul_competency (modul_id, competency_id, kuerzel, reihenfolge)
      values (v_modul, v_id, r->>'kennung', (r->>'reihenfolge')::int);
      perform pg_temp.zaehle(p_lauf, 'modul_competency', 'neu');
    end if;
    insert into _kompetenz values (r->>'kennung', v_id);
  end loop;

  -- ========== competency_step, competency_competency_step ==========
  for r in select * from jsonb_array_elements(p->'teilschritte') loop
    select id into v_id2 from _kompetenz where kennung = r->>'kompetenz';
    v_id := null;
    select cs.id into v_id
      from competency_step cs
      join competency_competency_step ccs on ccs.competency_step_id = cs.id and ccs.competency_id = v_id2
     where pg_temp.norm(cs.name) = pg_temp.norm(r->>'name')
     limit 1;
    if v_id is null then
      insert into competency_step (competency_id, name, typ)
      values (v_id2, r->>'name', r->>'typ')
      returning id into v_id;
      insert into competency_competency_step (competency_id, competency_step_id, reihenfolge)
      values (v_id2, v_id, (r->>'reihenfolge')::int);
      perform pg_temp.zaehle(p_lauf, 'competency_step', 'neu');
      perform pg_temp.zaehle(p_lauf, 'competency_competency_step', 'neu');
    else
      select * into v_alt from competency_step where id = v_id;
      if v_alt.typ <> r->>'typ' then
        -- Typänderung: Zuordnungen, die danach gegen SR-71 verstoßen, entfernen.
        if r->>'typ' = 'praktisch' then
          for v_text in
            delete from content_competency_mapping m using lesson l
             where m.competency_step_id = v_id and l.id = m.lesson_id
            returning coalesce(l.thema, l.name)
          loop
            perform pg_temp.zaehle(p_lauf, 'content_competency_mapping', 'gelöscht');
            perform pg_temp.melde(p_lauf, 'typänderung', format('%s wird praktisch: Zuordnung zur Lektion "%s" entfernt.', r->>'kennung', v_text));
          end loop;
        else
          for v_text in
            delete from field_job_type_competency_mapping m using field_job_type f
             where m.competency_step_id = v_id and f.id = m.field_job_type_id
            returning f.titel
          loop
            perform pg_temp.zaehle(p_lauf, 'field_job_type_competency_mapping', 'gelöscht');
            perform pg_temp.melde(p_lauf, 'typänderung', format('%s wird theoretisch: Zuordnung zum Auftrag "%s" entfernt.', r->>'kennung', v_text));
          end loop;
        end if;
        perform pg_temp.melde(p_lauf, 'typänderung', format('%s: Typ %s -> %s.', r->>'kennung', v_alt.typ, r->>'typ'));
      end if;
      update competency_step set name = r->>'name', typ = r->>'typ'
       where id = v_id and (name is distinct from r->>'name' or typ is distinct from r->>'typ');
      get diagnostics v_n = row_count;
      perform pg_temp.zaehle(p_lauf, 'competency_step', case when v_n > 0 then 'geändert' else 'unverändert' end);
      update competency_competency_step set reihenfolge = (r->>'reihenfolge')::int
       where competency_id = v_id2 and competency_step_id = v_id and reihenfolge <> (r->>'reihenfolge')::int;
      get diagnostics v_n = row_count;
      perform pg_temp.zaehle(p_lauf, 'competency_competency_step', case when v_n > 0 then 'geändert' else 'unverändert' end);
    end if;
    insert into _schritt values (r->>'kennung', v_id);
  end loop;

  -- Teilschritte der importierten Kompetenzen, die in der Excel fehlen (nicht gelöscht)
  for v_text in
    select format('%s: Teilschritt "%s" steht in der Datenbank, nicht in der Excel (bleibt).', k2.kennung, cs.name)
      from _kompetenz k2
      join competency_competency_step ccs on ccs.competency_id = k2.id
      join competency_step cs on cs.id = ccs.competency_step_id
     where not exists (select 1 from _schritt s where s.id = cs.id)
  loop
    perform pg_temp.melde(p_lauf, 'zusätzlich', v_text);
  end loop;

  -- ========== field_job_type (Aufträge) ==========
  for r in select * from jsonb_array_elements(p->'auftraege') loop
    v_id := null;
    select f.id into v_id
      from field_job_type f
      left join module w on w.id = f.module_id
     where f.kategorie = r->>'kennung' and coalesce(f.programme_id, w.programme_id) = v_prog;
    if v_id is null and r->>'modul' = 'I' then
      select f.id into v_id
        from field_job_type f
        left join module w on w.id = f.module_id
       where f.kategorie is null and f.reihenfolge = (r->>'reihenfolge')::int
         and (f.programme_id = v_prog or w.modul_id = (select id from _modul where modul = 'I'));
    end if;
    v_id2 := (select id from _woche where modul = r->>'modul' and nummer = (r->>'woche')::int);
    if v_id is null then
      if v_id2 is null then
        raise exception 'Abbruch: % hat keine Woche in diesem Lauf und fehlt in der Datenbank.', r->>'kennung';
      end if;
      insert into field_job_type (titel, kategorie, module_id, reihenfolge, status)
      values (r->>'titel', r->>'kennung', v_id2, (r->>'reihenfolge')::int,
              case when (r->>'sichtbar')::boolean then 'published' else 'unpublished' end)
      returning id into v_id;
      perform pg_temp.zaehle(p_lauf, 'field_job_type', 'neu');
    else
      update field_job_type
         set titel = r->>'titel',
             kategorie = r->>'kennung',
             reihenfolge = (r->>'reihenfolge')::int,
             status = case when (r->>'sichtbar')::boolean then 'published' else 'unpublished' end,
             module_id = coalesce(v_id2, module_id),
             programme_id = case when coalesce(v_id2, module_id) is null then programme_id end
       where id = v_id
         and (titel is distinct from r->>'titel'
           or kategorie is distinct from r->>'kennung'
           or reihenfolge <> (r->>'reihenfolge')::int
           or status <> case when (r->>'sichtbar')::boolean then 'published' else 'unpublished' end
           or (v_id2 is not null and module_id is distinct from v_id2));
      get diagnostics v_n = row_count;
      perform pg_temp.zaehle(p_lauf, 'field_job_type', case when v_n > 0 then 'geändert' else 'unverändert' end);
    end if;
    insert into _auftrag values (r->>'kennung', v_id);
  end loop;

  -- ========== course, lesson (Theorietage) ==========
  for r in select * from jsonb_array_elements(p->'kurse') loop
    v_id2 := (select id from _woche where modul = r->>'modul' and nummer = (r->>'woche')::int);
    v_id := null;
    select id into v_id from course where module_id = v_id2 and name = r->>'name';
    if v_id is null then
      insert into course (module_id, name, typ, reihenfolge, status)
      values (v_id2, r->>'name', 'synchron', (r->>'reihenfolge')::int, 'published')
      returning id into v_id;
      perform pg_temp.zaehle(p_lauf, 'course', 'neu');
    else
      perform pg_temp.zaehle(p_lauf, 'course', 'unverändert');
    end if;

    -- Live-Lektion (Reihenfolge 1, veröffentlicht)
    v_job := null;
    select id into v_job from lesson where course_id = v_id and content_type = 'live' order by reihenfolge limit 1;
    if v_job is null then
      insert into lesson (course_id, name, content_type, reihenfolge, status, thema)
      values (v_id, r->>'lektion', 'live', 1, 'published', r->>'thema')
      returning id into v_job;
      perform pg_temp.zaehle(p_lauf, 'lesson (live)', 'neu');
    else
      update lesson set name = r->>'lektion', thema = r->>'thema'
       where id = v_job and (name is distinct from r->>'lektion' or thema is distinct from r->>'thema');
      get diagnostics v_n = row_count;
      perform pg_temp.zaehle(p_lauf, 'lesson (live)', case when v_n > 0 then 'geändert' else 'unverändert' end);
    end if;

    -- Selbstlern-Lektion (Reihenfolge 2). SCORM-Paket folgt; bis dahin
    -- unveröffentlicht, damit Lernende keine leere Lektion sehen.
    v_id2 := null;
    select id into v_id2 from lesson where course_id = v_id and content_type in ('scorm', 'repository') order by reihenfolge limit 1;
    if v_id2 is null then
      insert into lesson (course_id, name, content_type, reihenfolge, status, thema)
      values (v_id, r->>'lektion', 'scorm', 2, 'unpublished', r->>'thema')
      returning id into v_id2;
      -- live_lektion_id erst nach dem Anlegen: fn_pruefe_live_lektion sucht das
      -- Programm über die id der Zeile, die beim Einfügen noch nicht existiert.
      update lesson set live_lektion_id = v_job where id = v_id2;
      perform pg_temp.zaehle(p_lauf, 'lesson (Selbstlernen)', 'neu');
    else
      update lesson set name = r->>'lektion', thema = r->>'thema'
       where id = v_id2 and (name is distinct from r->>'lektion' or thema is distinct from r->>'thema');
      get diagnostics v_n = row_count;
      perform pg_temp.zaehle(p_lauf, 'lesson (Selbstlernen)', case when v_n > 0 then 'geändert' else 'unverändert' end);
    end if;
    insert into _kurs values (r->>'schluessel', v_id, v_job, v_id2);
  end loop;

  -- ========== Begleitkurse am Programm (Deutsch/Fachdeutsch, Coaching) ==========
  v_n := 0;
  for a in select * from jsonb_array_elements_text(p->'begleitkurse') loop
    v_n := v_n + 1;
    v_id := null;
    select id into v_id from course where programme_id = v_prog and name = a;
    if v_id is null then
      insert into course (programme_id, name, typ, reihenfolge, status)
      values (v_prog, a, 'synchron', 900 + v_n, 'published')
      returning id into v_id;
      perform pg_temp.zaehle(p_lauf, 'course (Begleitkurs)', 'neu');
    else
      perform pg_temp.zaehle(p_lauf, 'course (Begleitkurs)', 'unverändert');
    end if;
    insert into _begleit values (a, v_id);
  end loop;

  -- ========== content_competency_mapping (nur theoretische Teilschritte) ==========
  for r in select * from jsonb_array_elements(p->'lektionZuordnungen') loop
    select id into v_id from _schritt where kennung = r->>'teilschritt';
    if r ? 'kurs' then
      v_ids := array(select live_id from _kurs where schluessel = r->>'kurs');
    else
      -- Modul I: Foliensatz -> bestehende Live-Lektion(en) mit diesem Thema in Modul I
      v_ids := array(
        select l.id from lesson l
          join course c on c.id = l.course_id
          join module w on w.id = c.module_id
         where w.modul_id = (select id from _modul where modul = 'I')
           and l.content_type = 'live'
           and l.thema in (select jsonb_array_elements_text(r->'themen')));
      if coalesce(array_length(v_ids, 1), 0) = 0 then
        perform pg_temp.melde(p_lauf, 'theorietag', format('%s: Foliensatz %s hat keine Live-Lektion in Modul I, nicht zugeordnet.', r->>'teilschritt', r->>'foliensatz'));
      end if;
    end if;
    for v_id2 in select unnest(v_ids) loop
      insert into content_competency_mapping (lesson_id, competency_step_id) values (v_id2, v_id) on conflict do nothing;
      get diagnostics v_n = row_count;
      perform pg_temp.zaehle(p_lauf, 'content_competency_mapping', case when v_n > 0 then 'neu' else 'unverändert' end);
    end loop;
  end loop;

  -- ========== field_job_type_competency_mapping (nur praktische Teilschritte) ==========
  for r in select * from jsonb_array_elements(p->'auftragZuordnungen') loop
    insert into field_job_type_competency_mapping (field_job_type_id, competency_step_id)
    values ((select id from _auftrag where kennung = r->>'auftrag'), (select id from _schritt where kennung = r->>'teilschritt'))
    on conflict do nothing;
    get diagnostics v_n = row_count;
    perform pg_temp.zaehle(p_lauf, 'field_job_type_competency_mapping', case when v_n > 0 then 'neu' else 'unverändert' end);
  end loop;

  -- Zuordnungen in der Datenbank, die die Excel nicht nennt (bleiben)
  for v_text in
    select format('%s: zusätzlich an Lektion "%s" (bleibt).', s.kennung, coalesce(l.thema, l.name))
      from _schritt s
      join content_competency_mapping m on m.competency_step_id = s.id
      join lesson l on l.id = m.lesson_id
     where not exists (
       select 1 from jsonb_array_elements(p->'lektionZuordnungen') z
        where z->>'teilschritt' = s.kennung
          and ((z ? 'kurs' and l.id in (select live_id from _kurs where schluessel = z->>'kurs'))
            or (z ? 'themen' and l.thema in (select jsonb_array_elements_text(z->'themen')))))
    union all
    select format('%s: zusätzlich an Auftrag "%s" (bleibt).', s.kennung, f.titel)
      from _schritt s
      join field_job_type_competency_mapping m on m.competency_step_id = s.id
      join field_job_type f on f.id = m.field_job_type_id
     where not exists (
       select 1 from jsonb_array_elements(p->'auftragZuordnungen') z
        where z->>'teilschritt' = s.kennung and (select id from _auftrag where kennung = z->>'auftrag') = f.id)
  loop
    perform pg_temp.melde(p_lauf, 'zusätzlich', v_text);
  end loop;

  -- ========== Termine je Kohorte ==========
  for k in select * from jsonb_array_elements(p_kohorten) loop
    select * into v_kohorte from cohort where name = k->>'name' and programme_id = v_prog;
    if not found then
      raise exception 'Abbruch: Kohorte "%" gibt es nicht.', k->>'name';
    end if;
    -- Organisation der kohortenweiten Einträge: wie bisherige Einträge, sonst die der Einschreibungen
    select array_agg(distinct organisation_id) into v_ids from schedule_entry where cohort_id = v_kohorte.id;
    if v_ids is null then
      select array_agg(distinct organisation_id) into v_ids from enrolment where cohort_id = v_kohorte.id;
    end if;
    if coalesce(array_length(v_ids, 1), 0) <> 1 then
      raise exception 'Abbruch: Kohorte "%" hat keine eindeutige Organisation.', k->>'name';
    end if;
    v_org := v_ids[1];

    for t in select * from jsonb_array_elements(p->'termine') loop
      v_datum := (t->>'datum')::date + coalesce((k->>'versatz')::int, 0);
      v_trainer := (select id from _trainer where kennung = t->>'trainer');

      if t->>'art' in ('kurs', 'begleit') then
        if t->>'art' = 'kurs' then
          select live_id, scorm_id into v_id, v_id2 from _kurs where schluessel = t->>'kurs';
        else
          v_id := null;
          v_id2 := (select id from _begleit where name = t->>'begleitkurs');
        end if;
        v_job := null;
        select ls.id into v_job
          from live_session ls
          join schedule_entry se on se.live_session_id = ls.id and se.cohort_id = v_kohorte.id
         where ls.datum = v_datum
           and ((v_id is not null and ls.lesson_id = v_id) or (v_id is null and ls.course_id = v_id2))
         limit 1;
        if v_job is null then
          insert into live_session (lesson_id, course_id, datum, start, ende, trainer_id)
          values (v_id, case when v_id is null then v_id2 end, v_datum, (t->>'start')::time, (t->>'ende')::time, v_trainer)
          returning id into v_job;
          insert into schedule_entry (organisation_id, datum, art, reihenfolge, cohort_id, live_session_id)
          values (v_org, v_datum, 'live', 1, v_kohorte.id, v_job);
          perform pg_temp.zaehle(p_lauf, 'live_session', 'neu');
          perform pg_temp.zaehle(p_lauf, 'schedule_entry (live)', 'neu');
        else
          -- Trainer:in nur setzen, solange keine eingetragen ist (händisch änderbar).
          update live_session
             set start = (t->>'start')::time, ende = (t->>'ende')::time, trainer_id = coalesce(trainer_id, v_trainer)
           where id = v_job
             and (start <> (t->>'start')::time or ende <> (t->>'ende')::time or (trainer_id is null and v_trainer is not null));
          get diagnostics v_n = row_count;
          perform pg_temp.zaehle(p_lauf, 'live_session', case when v_n > 0 then 'geändert' else 'unverändert' end);
        end if;

        if t->>'art' = 'kurs' then
          if exists (select 1 from schedule_entry where cohort_id = v_kohorte.id and lesson_id = v_id2 and datum = v_datum) then
            perform pg_temp.zaehle(p_lauf, 'schedule_entry (Selbstlernen)', 'unverändert');
          else
            insert into schedule_entry (organisation_id, datum, art, reihenfolge, cohort_id, lesson_id)
            values (v_org, v_datum, 'asynchron', 1, v_kohorte.id, v_id2);
            perform pg_temp.zaehle(p_lauf, 'schedule_entry (Selbstlernen)', 'neu');
          end if;
        end if;

      elsif t->>'art' = 'praxis' then
        for v_enr in select * from enrolment where cohort_id = v_kohorte.id and status = 'aktiv' loop
          for a in select * from jsonb_array_elements_text(t->'auftraege') loop
            v_id := (select id from _auftrag where kennung = a);
            v_job := null;
            select id into v_job from field_job where learner_id = v_enr.learner_id and field_job_type_id = v_id and datum = v_datum;
            if v_job is null then
              insert into field_job (organisation_id, datum, standort, field_job_type_id, learner_id, instructor_id, start, ende)
              values (v_enr.organisation_id, v_datum, t->>'ort', v_id, v_enr.learner_id, v_trainer, (t->>'start')::time, (t->>'ende')::time)
              returning id into v_job;
              perform pg_temp.zaehle(p_lauf, 'field_job', 'neu');
            else
              update field_job
                 set start = (t->>'start')::time, ende = (t->>'ende')::time,
                     instructor_id = coalesce(instructor_id, v_trainer),
                     standort = coalesce(standort, t->>'ort')
               where id = v_job
                 and (start is distinct from (t->>'start')::time or ende is distinct from (t->>'ende')::time
                   or (instructor_id is null and v_trainer is not null)
                   or (standort is null and t->>'ort' is not null));
              get diagnostics v_n = row_count;
              perform pg_temp.zaehle(p_lauf, 'field_job', case when v_n > 0 then 'geändert' else 'unverändert' end);
            end if;
            if exists (select 1 from schedule_entry where field_job_id = v_job) then
              perform pg_temp.zaehle(p_lauf, 'schedule_entry (Praxis)', 'unverändert');
            else
              insert into schedule_entry (organisation_id, datum, art, reihenfolge, enrolment_id, field_job_id)
              values (v_enr.organisation_id, v_datum, 'feld', 1, v_enr.id, v_job);
              perform pg_temp.zaehle(p_lauf, 'schedule_entry (Praxis)', 'neu');
            end if;
          end loop;
        end loop;
      end if;
    end loop;
  end loop;
end;
$fn$;
