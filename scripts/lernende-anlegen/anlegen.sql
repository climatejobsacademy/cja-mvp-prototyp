-- scripts/lernende-anlegen/anlegen.sql
-- SR-48: Lernende an einem vorhandenen Auth-Konto einrichten, sodass sie sich
-- danach selbst per Magic Link anmelden können (requireCurrentLearner in
-- src/lib/queries/session.ts: person, org_membership, role_assignment
-- learner, aktive enrolment mit Kohorte). Wird nur über
-- scripts/lernende-anlegen.mjs ausgeführt, das diese Datei zusammen mit den
-- Zeilen der CSV und BEGIN ... ROLLBACK (Probelauf) bzw. COMMIT an psql gibt.
-- Anleitung: docs/lernende-anlegen.md.
--
-- Legt nur temporäre Objekte an (pg_temp), keine Schemaänderung. Liest
-- auth.users (Auth-Konto über die E-Mail), schreibt nie in auth.users.
-- Idempotent: person, org_membership, role_assignment und enrolment werden
-- nur angelegt, wenn sie fehlen; vorhandene Zeilen werden weder geändert noch
-- gelöscht. Eine bestehende andere aktive Einschreibung ist ein Konflikt (das
-- Skript hängt nicht um). Demo-Konten (+demo@, Kohorte "DEMO …"): Abbruch.
--
-- Meldungen enthalten keine Namen und keine E-Mail im Klartext, nur die
-- Zeilennummer der CSV und die maskierte Adresse (kommt aus dem Skript).

create temp table lernende_bericht (
  nr serial,
  lauf integer not null,
  tabelle text not null,
  aktion text not null,
  anzahl integer not null default 0,
  primary key (lauf, tabelle, aktion)
) on commit drop;

create temp table lernende_zeile (
  lauf integer not null,
  zeile integer not null,
  konto text not null,
  status text not null,
  hinweis text,
  primary key (lauf, zeile)
) on commit drop;

create function pg_temp.zaehle(p_lauf integer, p_tabelle text, p_aktion text)
returns void language sql as $$
  insert into lernende_bericht (lauf, tabelle, aktion, anzahl)
  values (p_lauf, p_tabelle, p_aktion, 1)
  on conflict (lauf, tabelle, aktion) do update set anzahl = lernende_bericht.anzahl + 1;
$$;

-- Gleiche Regel wie istDemoKohorte in eingabe.mjs: Name beginnt mit "DEMO".
create function pg_temp.ist_demo_kohorte(p text)
returns boolean language sql immutable as $$
  select coalesce(p ~* '^\s*demo(\s|$)', false);
$$;

create function pg_temp.lernende_anlegen(p jsonb, p_programm text, p_lauf integer)
returns void
language plpgsql
as $fn$
declare
  r jsonb;
  v_prog uuid;
  v_n integer;
  v_org uuid;
  v_org_typ text;
  v_kohorte uuid;
  v_kohorte_prog uuid;
  v_kohorte_ende date;
  v_uid uuid;
  v_email text;
  v_neu integer;
  v_person_neu boolean;
  v_konflikt text;
  v_hinweis text;
  v_status text;
  v_vor text;
begin
  -- ========== Voraussetzungen ==========
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'person' and column_name = 'rufname')
     or not exists (select 1 from pg_constraint
                     where conname = 'role_assignment_rolle_check' and pg_get_constraintdef(oid) like '%trainer%') then
    raise exception 'Abbruch: Migrationen bis 0030 fehlen in dieser Datenbank (person.rufname, Rolle trainer).';
  end if;
  select id into v_prog from programme where kuerzel = p_programm;
  if v_prog is null then
    raise exception 'Abbruch: Programm % nicht gefunden.', p_programm;
  end if;

  for r in select * from jsonb_array_elements(p) loop
    v_vor := format('Zeile %s (%s)', r->>'zeile', r->>'konto');
    v_konflikt := null;
    v_hinweis := null;

    -- ========== Betrieb (organisation.name, eindeutig, employer) ==========
    select count(*) into v_n from organisation where name = r->>'betrieb';
    if v_n <> 1 then
      raise exception 'Abbruch: %: Betrieb „%“ % in der Datenbank.', v_vor, r->>'betrieb',
        case when v_n = 0 then 'nicht gefunden' else format('%s-mal', v_n) end;
    end if;
    select id, typ into v_org, v_org_typ from organisation where name = r->>'betrieb';
    if v_org_typ <> 'employer' then
      raise exception 'Abbruch: %: Betrieb „%“ ist kein Arbeitgeber (typ %).', v_vor, r->>'betrieb', v_org_typ;
    end if;

    -- ========== Kohorte (cohort.name, eindeutig, im Programm, keine Demo) ==========
    if pg_temp.ist_demo_kohorte(r->>'kohorte') then
      raise exception 'Abbruch: %: Demo-Kohorte wird nie angefasst.', v_vor;
    end if;
    select count(*) into v_n from cohort where name = r->>'kohorte';
    if v_n <> 1 then
      raise exception 'Abbruch: %: Kohorte „%“ % in der Datenbank.', v_vor, r->>'kohorte',
        case when v_n = 0 then 'nicht gefunden' else format('%s-mal', v_n) end;
    end if;
    select id, programme_id, end_datum into v_kohorte, v_kohorte_prog, v_kohorte_ende
      from cohort where name = r->>'kohorte';
    if v_kohorte_prog <> v_prog then
      raise exception 'Abbruch: %: Kohorte „%“ gehört nicht zum Programm %.', v_vor, r->>'kohorte', p_programm;
    end if;
    if v_kohorte_ende is not null and v_kohorte_ende < (now() at time zone 'Europe/Berlin')::date then
      v_hinweis := format('Kohorte endete am %s.', to_char(v_kohorte_ende, 'DD.MM.YYYY'));
    end if;

    -- ========== Auth-Konto (nur lesen) ==========
    select count(*) into v_n from auth.users where lower(email) = lower(r->>'email');
    if v_n = 0 then
      insert into lernende_zeile values (p_lauf, (r->>'zeile')::int, r->>'konto', 'Auth-Konto fehlt',
        'Auth-Konto zuerst im Dashboard anlegen (Add user, Create new user, Auto Confirm).');
      continue;
    elsif v_n > 1 then
      raise exception 'Abbruch: %: mehrere Auth-Konten mit dieser E-Mail.', v_vor;
    end if;
    select id, email into v_uid, v_email from auth.users where lower(email) = lower(r->>'email');

    -- ========== Demo-Schutz ==========
    if v_email ~* '\+demo@'
       or exists (select 1 from person where id = v_uid and email ~* '\+demo@')
       or exists (select 1 from enrolment e join cohort c on c.id = e.cohort_id
                   where e.learner_id = v_uid and pg_temp.ist_demo_kohorte(c.name)) then
      raise exception 'Abbruch: %: Demo-Konto wird nie angefasst.', v_vor;
    end if;

    -- ========== Konflikte (dann wird für die Zeile nichts geschrieben) ==========
    if exists (select 1 from role_assignment where person_id = v_uid and rolle in ('trainer', 'afcj_admin')) then
      v_konflikt := 'Konto hat die Rolle trainer oder afcj_admin; Lernende brauchen ein eigenes Konto.';
    elsif exists (select 1 from person where lower(email) = lower(v_email) and id <> v_uid) then
      v_konflikt := 'Eine andere Person hat diese E-Mail schon (anderes Auth-Konto).';
    elsif not exists (select 1 from person where id = v_uid)
          and exists (select 1 from person where username = 'lernende-' || v_uid::text) then
      v_konflikt := 'Benutzername schon vergeben.';
    elsif exists (select 1 from enrolment
                   where learner_id = v_uid and status = 'aktiv'
                     and (cohort_id <> v_kohorte or organisation_id <> v_org)) then
      select format('Schon aktiv eingeschrieben: Kohorte „%s“, Betrieb „%s“. Nicht umgehängt.', c.name, o.name)
        into v_konflikt
        from enrolment e join cohort c on c.id = e.cohort_id join organisation o on o.id = e.organisation_id
       where e.learner_id = v_uid and e.status = 'aktiv'
       order by e.created_at limit 1;
    elsif exists (select 1 from enrolment where learner_id = v_uid and cohort_id = v_kohorte and status <> 'aktiv') then
      select format('Einschreibung in dieser Kohorte hat den Status „%s“, wird nicht geändert.', status)
        into v_konflikt
        from enrolment where learner_id = v_uid and cohort_id = v_kohorte;
    end if;
    if v_konflikt is not null then
      insert into lernende_zeile values (p_lauf, (r->>'zeile')::int, r->>'konto', 'Konflikt', v_konflikt);
      continue;
    end if;

    -- ========== Schreiben: nur ergänzen ==========
    v_neu := 0;
    v_person_neu := false;
    if exists (select 1 from person where id = v_uid) then
      -- Vorhandene Person bleibt, wie sie ist (Name, Rufname, Sprache …).
      perform pg_temp.zaehle(p_lauf, 'person', 'unverändert');
    else
      -- email aus auth.users (gleich wie beim Login), sprache und geschlecht
      -- über die Spalten-Defaults (DE, keine Angabe).
      insert into person (id, email, name, username, rufname)
      values (v_uid, v_email, r->>'name', 'lernende-' || v_uid::text, r->>'rufname');
      perform pg_temp.zaehle(p_lauf, 'person', 'neu');
      v_neu := v_neu + 1;
      v_person_neu := true;
    end if;

    insert into org_membership (person_id, organisation_id) values (v_uid, v_org) on conflict do nothing;
    get diagnostics v_n = row_count;
    perform pg_temp.zaehle(p_lauf, 'org_membership', case when v_n > 0 then 'neu' else 'unverändert' end);
    v_neu := v_neu + v_n;

    insert into role_assignment (person_id, organisation_id, rolle) values (v_uid, v_org, 'learner') on conflict do nothing;
    get diagnostics v_n = row_count;
    perform pg_temp.zaehle(p_lauf, 'role_assignment (learner)', case when v_n > 0 then 'neu' else 'unverändert' end);
    v_neu := v_neu + v_n;

    insert into enrolment (organisation_id, learner_id, cohort_id, status)
    values (v_org, v_uid, v_kohorte, 'aktiv') on conflict (learner_id, cohort_id) do nothing;
    get diagnostics v_n = row_count;
    perform pg_temp.zaehle(p_lauf, 'enrolment', case when v_n > 0 then 'neu' else 'unverändert' end);
    v_neu := v_neu + v_n;

    v_status := case when v_neu = 0 then 'unverändert' when v_person_neu then 'neu' else 'ergänzt' end;
    insert into lernende_zeile values (p_lauf, (r->>'zeile')::int, r->>'konto', v_status, v_hinweis);
  end loop;
end;
$fn$;
