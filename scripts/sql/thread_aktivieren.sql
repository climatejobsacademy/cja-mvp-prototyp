-- scripts/sql/thread_aktivieren.sql
-- Vorlage: Fragen-Thread an einer Lektion ein- oder ausschalten und optional
-- eine Person als Moderation einer Kohorte eintragen. Anleitung:
-- docs/fragen-thread.md. SR-74/SR-75.
--
-- Nur für Staging und Production, immer zuerst als Probelauf. Läuft im
-- Supabase-Dashboard (SQL Editor) oder per psql. Standard ist der Probelauf:
-- am Ende wird absichtlich ein Fehler ausgelöst, dadurch wird alles
-- zurückgerollt (ROLLBACK), und die Meldung zeigt, was geändert worden wäre.
-- Erst wenn das passt, p_probelauf auf false setzen und erneut ausführen.
--
-- Nur die Werte im Block "EINGABEN" ändern. Keine echten IDs ins Repo committen.

do $$
declare
  -- ===================== EINGABEN =====================
  p_lesson_id         uuid    := '00000000-0000-0000-0000-000000000000';  -- Lektions-ID
  p_chat_aktiv        boolean := true;                                    -- true = einschalten, false = ausschalten
  p_moderation_person uuid    := null;                                    -- optional: person.id der Moderation
  p_moderation_kohorte uuid   := null;                                    -- optional: cohort.id, nur zusammen mit p_moderation_person
  p_probelauf         boolean := true;                                    -- true = ROLLBACK, false = speichern
  -- ====================================================

  v_lektion   text;
  v_status    text;
  v_vorher    boolean;
  v_programm  uuid;
  v_kohorte   text;
  v_mod_info  text := 'keine Änderung an der Moderation';
begin
  select l.name, l.status, l.chat_aktiv, coalesce(c.programme_id, m.programme_id)
    into v_lektion, v_status, v_vorher, v_programm
    from lesson l
    join course c on c.id = l.course_id
    left join module m on m.id = c.module_id
   where l.id = p_lesson_id;
  if v_lektion is null then
    raise exception 'Abbruch: Lektion % gibt es nicht.', p_lesson_id;
  end if;

  update lesson set chat_aktiv = p_chat_aktiv where id = p_lesson_id;

  if (p_moderation_person is null) <> (p_moderation_kohorte is null) then
    raise exception 'Abbruch: p_moderation_person und p_moderation_kohorte nur zusammen setzen.';
  end if;

  if p_moderation_person is not null then
    if not exists (select 1 from person where id = p_moderation_person) then
      raise exception 'Abbruch: Person % gibt es nicht.', p_moderation_person;
    end if;
    select co.name into v_kohorte from cohort co where co.id = p_moderation_kohorte;
    if v_kohorte is null then
      raise exception 'Abbruch: Kohorte % gibt es nicht.', p_moderation_kohorte;
    end if;
    if (select programme_id from cohort where id = p_moderation_kohorte) <> v_programm then
      raise exception 'Abbruch: Die Kohorte gehört nicht zum Programm der Lektion.';
    end if;

    if exists (select 1 from kohorte_moderation where cohort_id = p_moderation_kohorte and person_id = p_moderation_person) then
      v_mod_info := format('Moderation in Kohorte "%s" bestand schon', v_kohorte);
    else
      insert into kohorte_moderation (cohort_id, person_id) values (p_moderation_kohorte, p_moderation_person);
      v_mod_info := format('Moderation in Kohorte "%s" eingetragen', v_kohorte);
    end if;
  end if;

  if p_probelauf then
    raise exception 'PROBELAUF ok, nichts gespeichert: Lektion "%" (Status %), chat_aktiv % -> %; %. Zum Speichern p_probelauf := false setzen.',
      v_lektion, v_status, v_vorher, p_chat_aktiv, v_mod_info;
  end if;

  raise notice 'Gespeichert: Lektion "%", chat_aktiv % -> %; %.', v_lektion, v_vorher, p_chat_aktiv, v_mod_info;
end $$;
