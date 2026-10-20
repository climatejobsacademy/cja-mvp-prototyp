-- 0034_kohortensicht.sql
-- Kohortensicht (SR-30, Datenlücke Nr. 6, Entscheidung Vera 2026-10-14):
-- Lernende sehen die anderen Lernenden ihrer Kohorte mit Anzeigename
-- (Rufname plus Initial des Nachnamens) und, wenn vorhanden, mit Foto.
--   - Nur gleiche Kohorte UND gleiche Organisation, nur aktive
--     Einschreibungen. Die Organisation hängt an der Einschreibung, nicht an
--     org_membership.
--   - Der Foto-Upload ist die Freigabe: wer ein Foto hat, zeigt es der
--     Kohorte; Entfernen nimmt es zurück. Keine neuen Spalten an person.
--   - Keine Trainer-Liste, keine Vorerfahrung, kein Geburtsdatum, keine
--     E-Mail, kein Arbeitgeber.
-- Die Tabelle person bleibt für Lernende auf die eigene Zeile beschränkt;
-- die Sicht läuft über eine security-definer-Funktion (wie fn_meine_trainer).
--
-- Keine neuen Policies auf Tabellen. fn_darf_foto_sehen wird um die
-- Kohortenregel erweitert; die vorhandene Storage-Policy profilfotos_lesen
-- (0030) nutzt sie bereits.

-- ============================================================
-- fn_meine_kohorte
-- Mitglieder der eigenen Kohorte(n) ohne die eigene Person. Anzeigename wie
-- im Fragen-Thread (0024): erstes Wort bzw. Rufname plus Initial des letzten
-- Worts von name; hat name nur ein Wort, steht nur der Rufname da.
-- ============================================================
create or replace function fn_meine_kohorte()
returns table (person_id uuid, anzeigename text, foto_pfad text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id,
         case
           when array_length(n.teile, 1) > 1
             then p.rufname || ' ' || upper(left(n.teile[array_length(n.teile, 1)], 1)) || '.'
           else p.rufname
         end,
         p.foto_pfad
  from enrolment ich
  join enrolment e
    on e.cohort_id = ich.cohort_id
   and e.organisation_id = ich.organisation_id
  join person p on p.id = e.learner_id
  cross join lateral (select regexp_split_to_array(btrim(p.name), '\s+') as teile) n
  where ich.learner_id = auth.uid()
    and ich.status = 'aktiv'
    and e.status = 'aktiv'
    and e.learner_id <> auth.uid()
  group by p.id, p.name, p.rufname, p.foto_pfad, n.teile
  order by 2, 1;
$$;

comment on function fn_meine_kohorte() is
  'Andere Lernende der eigenen Kohorte (gleiche Kohorte und gleiche Organisation, '
  'nur aktive Einschreibungen): person_id, Anzeigename (Rufname + Initial), foto_pfad. '
  'Kein E-Mail, Geburtsdatum, Vorerfahrung oder Arbeitgeber (SR-30, 2026-10-14).';

revoke execute on function fn_meine_kohorte() from public, anon;
grant execute on function fn_meine_kohorte() to authenticated;

-- ============================================================
-- fn_darf_foto_sehen: Foto eines Mitglieds der eigenen Kohorte
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
      or exists (select 1 from fn_meine_trainer() t where t.person_id::text = p_ordner)
      or exists (select 1 from fn_meine_kohorte() k where k.person_id::text = p_ordner);
$$;

comment on function fn_darf_foto_sehen(text) is
  'Darf die eingeloggte Person die Fotos im Ordner p_ordner (= person_id) sehen? '
  'Eigenes Foto, Fotos der eigenen Trainer:innen, Fotos der Mitglieder der eigenen '
  'Kohorte (gleiche Organisation, aktive Einschreibung; der Upload ist die '
  'Freigabe, SR-30), AfCJ admin alle.';

revoke execute on function fn_darf_foto_sehen(text) from public, anon;
grant execute on function fn_darf_foto_sehen(text) to authenticated;
