-- 0033_person_spaltenrechte.sql
-- Eigene person-Zeile: nur Rufname und Profilfoto selbst änderbar (SR-77,
-- Paket G, Entscheidung 2026-10-13).
--
-- Bisher erlaubte person_self_update (0009) zusammen mit dem Tabellen-Grant
-- "update on person" das Ändern aller Spalten der eigenen Zeile -- über die
-- API also auch email, name, username, geburtsdatum, geschlecht, sprache und
-- vorerfahrung. person.email konnte so von auth.users.email abweichen.
-- Die App schreibt selbst nur rufname und foto_pfad (Profil-Dialog,
-- src/app/(learner)/profil-actions.ts).
--
-- Jetzt: Spalten-Grant nur für rufname und foto_pfad. Die Policies bleiben
-- (Zeile: nur die eigene; AfCJ admin alle). Folge: Auch AfCJ admin ändert in
-- der App nur diese beiden Spalten -- AfCJ admin pflegt Personen heute im
-- Supabase-Dashboard (Rolle postgres, nicht betroffen). Vorerfahrung und
-- Sprache folgen mit der Profilseite (Übergabe Paket G), falls Lernende sie
-- selbst ändern sollen.

revoke update on person from authenticated;
grant update (rufname, foto_pfad) on person to authenticated;

comment on policy person_self_update on person is
  'Eigene Zeile; welche Spalten, regelt der Spalten-Grant (seit 0033 nur rufname, foto_pfad; SR-77).';
