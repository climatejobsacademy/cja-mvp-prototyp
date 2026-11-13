# Definition of Done — AfCJ MVP-Prototyp

Quelle: [MVP April 2027 — Product Development Playbook](https://app.notion.com/p/climatejobsacademy/MVP-April-2027-Product-Development-Playbook-3ce48915565b810db222c7e70679063b) (Notion), Schritt 6a. Stand: 2026-09-10.

Ein Pull Request ist fertig, wenn:

- Er seine SR-xx nennt
- Schema-Änderungen als Migrationen vorliegen, mit Policies in derselben Datei
- RLS-Tests hinzugefügt oder aktualisiert wurden, wo sich Zugriff geändert hat
- CI grün ist (Types, Lint, Unit-Tests, RLS-Tests)
- `/pr-check` gelaufen ist (bei Release-PRs der Review-Agent gegen `origin/main`, `release.md`) und jeder Befund behoben oder in der PR begründet ist (`arbeitsweise.md`)
- Die Person, mit der die Sitzung gearbeitet hat, den Diff gelesen und das Verhalten auf der Preview durchgeklickt hat; eine Zweitfreigabe durch eine zweite Person ist weder nach `dev` noch für Releases Pflicht (`decisions.md`, 2026-11-04), den Ablauf eines Releases regelt `release.md`
- Die Traceability-Tabelle aktualisiert ist

## Wöchentliches Ritual (1 Stunde)

Offene PRs gegen die Definition of Done prüfen, Traceability-Tabelle aktualisieren, prüfen ob etwas gebaut wurde, das kein SR verlangt hat (entfernen oder parken), neue Entscheidungen loggen.
