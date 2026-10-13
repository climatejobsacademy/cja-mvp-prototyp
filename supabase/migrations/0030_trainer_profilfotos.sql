-- 0030_trainer_profilfotos.sql
-- Trainer:innen je Termin und Profilfotos (SR-77, SR-78, Datenlücken Nr. 5
-- und Nr. 14, Entscheidungen 2026-10-13):
--   - neue Rolle "trainer" in role_assignment. Trainer:innen sind eigene
--     Personen mit Auth-Konto ohne Login-Nutzung, getrennt von evtl.
--     vorhandenen Lernenden-Konten derselben Person. Zugeordnet werden sie
--     über die bestehenden Spalten live_session.trainer_id und
--     field_job.instructor_id.
--   - person.foto_pfad: Profilfoto im privaten Bucket profilfotos, Pfad
--     "<person_id>/<uuid>.jpg", abgerufen über signierte Links.
--   - fn_meine_trainer(): Name, Rufname und Fotopfad der eigenen
--     Trainer:innen -- ohne die Tabelle person für Lernende zu öffnen
--     (dort stehen E-Mail und Geburtsdatum).
--   - fn_darf_foto_sehen(): eigenes Foto, Fotos der eigenen Trainer:innen,
--     AfCJ admin alle. Keine Fotos anderer Lernender (Nr. 6 Kohortensicht
--     kommt später).
-- Hängt an 0029 (person.rufname).

-- ============================================================
-- Rolle trainer
-- ============================================================
alter table role_assignment
  drop constraint role_assignment_rolle_check,
  add constraint role_assignment_rolle_check check (rolle in ('learner', 'afcj_admin', 'trainer'));

comment on table role_assignment is
  'Rolle einer Person in einer Organisation: learner, afcj_admin, trainer (seit 0030; '
  'Trainer:innen ohne Login-Nutzung, nur für Anzeige an Terminen).';

-- ============================================================
-- person.foto_pfad
-- ============================================================
alter table person
  add column foto_pfad text,
  add constraint person_foto_pfad_eigener_ordner check (
    foto_pfad is null
    or foto_pfad ~ ('^' || id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$')
  );

comment on column person.foto_pfad is
  'Profilfoto im privaten Bucket profilfotos, "<person_id>/<uuid>.jpg", null = kein Foto. '
  'Der Check erzwingt den eigenen Ordner, weil person_self_update alle Spalten der '
  'eigenen Zeile freigibt (SR-77, Entscheidung 2026-10-13).';

-- ============================================================
-- Bucket profilfotos (privat)
-- Die App verkleinert und schneidet im Browser zu (512 x 512 px, JPEG), der
-- Bucket nimmt darum nur JPEG bis 1 MB an.
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profilfotos', 'profilfotos', false, 1048576, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================
-- fn_meine_trainer
-- Personen mit Rolle trainer, die im eigenen Plan stehen: als Trainer:in
-- einer Live-Session (Eintrag der eigenen Kohorte oder Einschreibung) oder
-- als begleitende Person eines eigenen Praxistags. Ohne Rolle trainer
-- erscheint niemand, auch wenn er in trainer_id steht.
-- ============================================================
create or replace function fn_meine_trainer()
returns table (person_id uuid, name text, rufname text, foto_pfad text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.name, p.rufname, p.foto_pfad
  from person p
  where exists (
      select 1 from role_assignment ra
      where ra.person_id = p.id and ra.rolle = 'trainer'
    )
    and p.id in (
      select ls.trainer_id
      from live_session ls
      join schedule_entry se on se.live_session_id = ls.id
      where se.cohort_id in (select fn_current_cohort_ids())
         or se.enrolment_id in (select fn_current_enrolment_ids())
      union
      select fj.instructor_id
      from field_job fj
      where fj.learner_id = auth.uid()
    );
$$;

comment on function fn_meine_trainer() is
  'Name, Rufname und Fotopfad der Trainer:innen im eigenen Plan (Rolle trainer). '
  'Öffnet die Tabelle person nicht für Lernende (SR-78, Entscheidung 2026-10-13).';

-- ============================================================
-- fn_darf_foto_sehen
-- Parameter ist der Ordnername im Bucket (Text), damit ein Objekt mit
-- anderem Namen keinen Cast-Fehler auslöst.
-- ============================================================
create or replace function fn_darf_foto_sehen(p_ordner text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_ordner = auth.uid()::text
      or fn_is_afcj_admin()
      or exists (select 1 from fn_meine_trainer() t where t.person_id::text = p_ordner);
$$;

comment on function fn_darf_foto_sehen(text) is
  'Darf die eingeloggte Person die Fotos im Ordner p_ordner (= person_id) sehen? '
  'Eigenes Foto, Fotos der eigenen Trainer:innen, AfCJ admin alle. Keine Fotos '
  'anderer Lernender (Entscheidung 2026-10-13, Nr. 6 folgt).';

revoke execute on function fn_meine_trainer() from public, anon;
grant execute on function fn_meine_trainer() to authenticated;
revoke execute on function fn_darf_foto_sehen(text) from public, anon;
grant execute on function fn_darf_foto_sehen(text) to authenticated;

-- ============================================================
-- storage.objects: Policies für profilfotos
-- Schreiben nur in den eigenen Ordner (AfCJ admin auch für Trainer:innen).
-- ============================================================
create policy profilfotos_lesen on storage.objects
  for select to authenticated
  using (bucket_id = 'profilfotos' and fn_darf_foto_sehen((storage.foldername(name))[1]));

create policy profilfotos_eigene_anlegen on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profilfotos'
    and ((storage.foldername(name))[1] = auth.uid()::text or fn_is_afcj_admin())
  );

create policy profilfotos_eigene_aendern on storage.objects
  for update to authenticated
  using (
    bucket_id = 'profilfotos'
    and ((storage.foldername(name))[1] = auth.uid()::text or fn_is_afcj_admin())
  )
  with check (
    bucket_id = 'profilfotos'
    and ((storage.foldername(name))[1] = auth.uid()::text or fn_is_afcj_admin())
  );

create policy profilfotos_eigene_loeschen on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'profilfotos'
    and ((storage.foldername(name))[1] = auth.uid()::text or fn_is_afcj_admin())
  );
