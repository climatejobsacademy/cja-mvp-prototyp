# Definition of Done — AfCJ MVP-Prototyp

Quelle: [MVP April 2027 — Product Development Playbook](https://app.notion.com/p/climatejobsacademy/MVP-April-2027-Product-Development-Playbook-3ce48915565b810db222c7e70679063b) (Notion), Schritt 6a. Stand: 2026-09-10.

Ein Pull Request ist fertig, wenn:

- Er seine SR-xx nennt
- Schema-Änderungen als Migrationen vorliegen, mit Policies in derselben Datei
- RLS-Tests hinzugefügt oder aktualisiert wurden, wo sich Zugriff geändert hat
- CI grün ist (Types, Lint, Unit-Tests, RLS-Tests)
- Er laut Teamregel von der zweiten Person reviewt wurde (technisch erzwungen ist ein Approval nur auf `main`, siehe `decisions.md`, 2026-11-03) und auf `dev` durchgeklickt wurde
- Die Traceability-Tabelle aktualisiert ist

## Wöchentliches Ritual (1 Stunde)

Offene PRs gegen die Definition of Done prüfen, Traceability-Tabelle aktualisieren, prüfen ob etwas gebaut wurde, das kein SR verlangt hat (entfernen oder parken), neue Entscheidungen loggen.
