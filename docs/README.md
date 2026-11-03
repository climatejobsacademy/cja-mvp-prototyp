# Dokumentation: Einstieg

Dieses Verzeichnis enthält den technischen Stand der Plattform, ihre Abläufe und die technischen Entscheidungen. Das Repository ist öffentlich: Hier stehen weder Personennamen noch E-Mail-Adressen noch Listen mit Personenbezug, und es stehen hier keine Zugangsdaten. Rollen (Produkt-Lead, Trainer:in, Terminal) ersetzen Namen.

## Was steht wo

Jede Art von Information hat genau einen Ort. Gibt es zu einer Sache zwei Fassungen, gilt die am Ort aus der Tabelle; die andere wird gelöscht oder durch einen Verweis ersetzt.

| Was | Wo |
|---|---|
| Aufgaben, Status, Prioritäten, Termine, Bauzeiträume | nur in Asana |
| Technischer Stand, Abläufe, technische Entscheidungen | Repository, dieses Verzeichnis `docs/` |
| System Requirements (SR-Datenbank, SR-Nummern), Produkt-Handbuch, Datenschutz-Dokumentation, alles mit Personenbezug (Kontaktwege, Listen, Zuständigkeiten mit Namen) | Notion |
| Skizzen und Diagramme ohne Status | Miro |
| Passwörter, Schlüssel, Zugangsdaten | nur im Team-Passwort-Manager, nie in Chat, Notion, Asana oder Repository |

Statusdokumente („Stand vom …“, „offen“, „erledigt“) gehören nicht nach `docs/`. Ein Dokument beschreibt, wie etwas funktioniert oder warum es so entschieden wurde, und bleibt damit gültig, bis sich der Mechanismus ändert. Was sich pro Woche ändert, steht in Asana. Wie die Arbeit mit dem Terminal abläuft, steht in `arbeitsweise.md`; die Regeln für den Code stehen in `CLAUDE.md` im Wurzelverzeichnis.

## Index

**Spezifikation und Datenmodell.** `requirements.md` ist der Auszug der System Requirements aus Notion (Nummer, Titel, Typ, Acceptance Check) und wird nicht von Hand geändert; die Nummern vergibt ausschließlich die Notion-SR-Datenbank, und `sr-registry.json` führt die dort vergebenen Nummern, gegen die ein Test den Code prüft. `traceability.md` ordnet SR-Nummern den Pull Requests zu und enthält die Tabelle der alten, im Repo vergebenen Nummern. `data-model.md` beschreibt die Entitäten und Attribute, `er-diagram.md` stellt sie als Mermaid-Diagramm dar, und `access-matrix.md` legt fest, welche Rolle welche Daten lesen und schreiben darf.

**Entscheidungen und offene Fragen.** `decisions.md` ist das Entscheidungslog (neue Einträge unten anhängen, alte nicht umschreiben). `open-questions.md` sammelt Annahmen aus dem ersten Datenbankbau, die eine Antwort brauchten, und `review-checklist-notes.md` hält die Nachweise zur damaligen Review-Checkliste fest.

**Design.** `design-specifications.md` enthält Design-Tokens, Abläufe und die Grundsätze für Dienste mit Personendaten. In `design_handoff_lernplattform/` liegen die HTML-Referenzen und der Auftrag der Design-Übergabe; sie sind Vorlage und kein Produktionscode.

**Betrieb und Release.** `runbook.md` sagt, was zu tun ist, wenn etwas bricht, und wer entscheidet. `release.md` beschreibt den Weg von `dev` nach Production mit Checkliste und Rückweg. `definition-of-done.md` legt fest, wann ein Pull Request fertig ist.

**Importe und Skripte.** `import-plan.md` beschreibt den Excel-Import für Stundenplan, Kompetenzen, Aufträge und Fachsprache-Einheiten, `lernende-anlegen.md` das Anlegen von Konten, Profilen und Einschreibungen, `scorm-einspielen.md` das Einspielen von Selbstlern-Paketen und `live-links.md` das Hinterlegen der Teams-Links. `lernmaterialien-upload.md` erklärt, wie Dateien an Lektionen hängen.

**Funktionen im Betrieb.** `fachsprache.md` ist die Betriebsanleitung für die Fachsprache-Einheiten einschließlich Schalter und Fehlersuche. `fragen-thread.md` beschreibt den Fragen-Thread je Lektion, `organisations-logo.md` das Organisations-Logo im Header, und `praxisflow-realbau.md` ist die Analyse und der Migrationsentwurf für den echten Praxisflow.

**Datenschutz.** `datenschutz-offene-punkte.md` führt, was an der Datenschutzerklärung noch zu klären ist, und `datenschutz-kohortenansicht-entwurf.md` enthält den Textvorschlag für die Kohortenansicht. `loeschweg.md` beschreibt, wie die Daten einer Person manuell gelöscht werden, `verarbeitungsverzeichnis.md` ist der Entwurf des Verzeichnisses nach Art. 30 DSGVO und `tia-supabase.md` der Entwurf der Risikoanalyse zur Drittlandübermittlung. Alle Datenschutzdokumente sind Entwürfe ohne rechtliche Prüfung.

**Planung.** `paket-g-plan.md` ist die Analyse zu den Datenlücken 5 bis 7 und 11; sie ist ein Planungsdokument und kein Arbeitsstand.

## Regeln für neue Dokumente

Ein neues Dokument bekommt einen Satz in diesem Index. Es nennt Rollen statt Namen, keine Kalenderdaten für geplante Arbeit und keinen Fortschritt. Was nach der Lektüre ein Mensch noch tun muss, steht als Aufgabe in Asana und höchstens als Verweis in der Datei. Unsicheres wird als Vermutung gekennzeichnet; „belegt“ heißt, dass es im Code, in einer Migration oder im Git-Verlauf nachzulesen ist. Ein Stand-Datum im Dokument gilt nicht als Beleg für Aktualität, die Git-Historie zeigt, wann eine Datei zuletzt geändert wurde. Bearbeitungsstände wie Entwurf, offen, in Arbeit oder nicht angewendet stehen nicht in `docs/`, und Entscheidungseinträge tragen ein Datum und einen Gültigkeitsstatus (`gültig` oder `ersetzt`).
