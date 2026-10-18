-- 0056: Moderierende lesen die Kohorte, die sie moderieren (SR-83, SR-75).
-- Entscheidung Anna 2026-10-18: Vertretung der Chat-Moderation über einen
-- Eintrag in kohorte_moderation statt Admin-Rolle. Die Chat-Rechte prüfen
-- schon heute kohorte_moderation (fn_chat_moderiert -> fn_moderiert_kohorte,
-- 0050). Es fehlte nur das Lesen der Kohortenzeile (Name, chat_aktiv), damit
-- der Trainer-Bereich die Kohorte im Chat anbietet. Keine weiteren Daten:
-- Einschreibungen, Termine und Personen bleiben zu.

create policy cohort_moderation_select on cohort
  for select to authenticated
  using (fn_moderiert_kohorte(id));
