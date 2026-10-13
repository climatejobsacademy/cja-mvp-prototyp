# Import Stundenplan, Kompetenzen und Aufträge aus der Excel

Skript: `scripts/import-plan.mjs` (Teile in `scripts/import-plan/`). Erstes Paket: Modul I (Rest, Wochen 4–5) und Modul II. Entscheidungen vom 13.10.2026; SR-05, SR-71, SR-78.

## Kurz

1. Die Excel von Content & Learning lokal ablegen, **nicht ins Repo**: Sie enthält Trainer-Namen.
2. Analyse ohne Datenbank: `--nur-analyse`.
3. Probelauf gegen Staging. Das ist der Standard, am Ende wird alles zurückgerollt.
4. Echter Lauf mit `--ausfuehren`, nur mit Freigabe.

```sh
DATEI="$HOME/Projects/Import Daten/Modul_II___Kompetenzen_Import.xlsx"

# Analyse (keine Datenbank)
node scripts/import-plan.mjs --datei "$DATEI" --nur-analyse

# Probelauf Staging (ROLLBACK)
node scripts/import-plan.mjs --datei "$DATEI" --ziel staging --kohorte "Energiehelden 28.09.26"

# Echter Lauf Staging (erst nach der Demo am 15.10.)
node scripts/import-plan.mjs --datei "$DATEI" --ziel staging --kohorte "Energiehelden 28.09.26" --ausfuehren

# Production: nur mit --production-freigabe, echter Lauf fragt zusätzlich die Projekt-Ref ab
node scripts/import-plan.mjs --datei "$DATEI" --ziel production --production-freigabe --kohorte "<Kohortenname>"
node scripts/import-plan.mjs --datei "$DATEI" --ziel production --production-freigabe --kohorte "<Kohortenname>" --ausfuehren
```

## Voraussetzungen

- `npm ci` im Repo (das Skript nutzt `fflate` aus den App-Abhängigkeiten).
- `psql` 17. Gesucht wird in `PSQL`, dann `/opt/homebrew/opt/postgresql@17/bin/psql`, dann `psql`.
- Passwort der Datenbank: entweder `PGPASSWORD` in der eigenen Shell oder ein macOS-Schlüsselbund-Eintrag (`cja-db-irl` für Staging, `cja-db-fra` für Production). Das Skript gibt das Passwort nie aus. Verbunden wird über den Session-Pooler als `postgres`, ohne Service-Role-Key.
- Die Datenbank muss mindestens auf Migration 0030 stehen, sonst bricht das Skript ab. **Production steht am 13.10. auf 0024**: Zuerst müssen 0025–0030 im Release angewendet werden.

## Parameter

| Parameter | Bedeutung |
|---|---|
| `--datei <pfad>` | Excel-Datei (Pflicht) |
| `--ziel staging\|production` | Datenbank (Pflicht, außer bei `--nur-analyse`) |
| `--kohorte "Name"` | Kohorte, die die Termine bekommt; mehrfach möglich. `"Name@+7"` verschiebt alle Termine um 7 Tage. Ohne `--kohorte` werden nur Inhalte und Kompetenzen importiert. |
| `--module I,II` | Module im Umfang (Standard `I,II`) |
| `--ausfuehren` | speichert (COMMIT); ohne läuft nur der Probelauf (ROLLBACK) |
| `--production-freigabe` | Pflicht für jedes `--ziel production`, auch für den Probelauf |
| `--nur-analyse` | nur die Excel prüfen und die Listen ausgeben |

## Was der Lauf ausgibt

- **Excel:** Anzahlen sowie die Zuordnungen, die die Typ-Regel SR-71 ausschließt (theoretische Teilschritte an Aufträgen, praktische an Theorietagen), außerdem Teilschritte ohne jede Zuordnung und Zeilen, die übersprungen werden (kein Datum, keine Uhrzeit, außerhalb des Umfangs).
- **Datenbank:** je Tabelle, was neu, geändert, gelöscht oder unverändert wäre bzw. ist, dazu Meldungen (Typänderungen, zusätzliche Zuordnungen, die bestehen bleiben).
- **Zweiter Durchgang:** Der Import läuft in derselben Transaktion ein zweites Mal. Ändert er dabei etwas, bricht das Skript ab, und es wird nichts gespeichert.

## Wie die Excel abgebildet wird

| Excel | Datenbank |
|---|---|
| Module | `modul` über die Reihenfolge (I = 1 … Abschluss = 6), der Titel wird aktualisiert |
| Woche im Modul | `module` (Woche) mit `modul_id`, `wochentyp`, `lage`. Name „Woche n – Typ (Lage)“ ohne Datum |
| Theorietag (Kurstitel, Thema) | je Termin ein `course` „Kurstitel (Thema)“ mit Live-Lektion (veröffentlicht) und Selbstlern-Lektion (SCORM folgt, bis dahin unveröffentlicht, `live_lektion_id` gesetzt), wie in den Wochen 1–2. Gleicher Kurs zweimal im Modul ergibt „– Teil 1/2“ |
| Termin Theorie | `live_session` an der Live-Lektion und `schedule_entry` (live und asynchron) je Kohorte |
| Deutsch/Fachdeutsch, Softskills Coaching | Kurs am Programm, Termin als `live_session` am Kurs: erscheint im Stundenplan als Live-Block mit dem Kursnamen, ohne Kompetenzen |
| Termin Praxis | `field_job` und `schedule_entry` (feld) je aktiver Einschreibung, `instructor_id` = Trainer:in |
| Kompetenzen | `competency` (Name = Kurztitel), `competency_programme`, `modul_competency` mit Kürzel = Kennung (M02-K03). Ein bisheriges Kürzel (M2.03) wird umgestellt, ohne Dublette |
| Teilschritte | `competency_step` und `competency_competency_step` (Reihenfolge). Theoretisch: `content_competency_mapping` zu den Live-Lektionen der genannten Theorietage. Praktisch: `field_job_type_competency_mapping` zu den Aufträgen |
| Aufträge | `field_job_type` mit `kategorie` = Auftragsnummer, Woche des ersten Termins |
| Trainer | `person` mit Rolle `trainer` (AfCJ) und Auth-Konto ohne Passwort, E-Mail-Platzhalter `tr-xx@trainer.invalid`, Benutzername `trainer-tr-xx`. Name und E-Mail werden danach nicht mehr überschrieben |

Nicht importiert werden: die Spalte „Offen“, SCORM, PDFs, Zoom-Links und Ort bei Live-Terminen (`live_session` hat kein Ortsfeld). Gelöscht wird nichts, außer Lektion-Zuordnungen eines Teilschritts, dessen Typ laut Excel auf „praktisch“ wechselt (und umgekehrt). Sonst würden sie gegen SR-71 verstoßen. Jede dieser Löschungen steht in den Meldungen.

### Wiedererkennen beim zweiten Lauf

Es gibt keine eigene Spalte für die Kennungen aus Spalte A (keine Migration). Wiedererkannt wird über diese Schlüssel:

- Kompetenz: `modul_competency.kuerzel`
- Teilschritt: Kompetenz und Name (normalisiert, Klammern ignoriert)
- Auftrag: `field_job_type.kategorie`
- Woche: Nummer im Modul
- Kurs: Woche und Name
- Live-Termin: Kohorte, Lektion bzw. Kurs und Datum
- Praxistag: Lernende:r, Auftrag und Datum
- Trainer:in: Benutzername

Folge: Ändert sich in der Excel der **Titel eines Teilschritts** oder **Kurstitel/Thema eines Theorietags**, entsteht ein neuer Datensatz. Der alte bleibt und wird als „zusätzlich“ gemeldet. Titel deshalb vorher in der Datenbank anpassen oder den alten Datensatz händisch entfernen.

### Modul I: Theorietage M01-T01–T11

Die Theorietage sind die Foliensätze der Wochen 1–2. Sie werden über `lesson.thema` den bestehenden Live-Lektionen zugeordnet (Tabelle `FOLIENSAETZE_MODUL_I` in `scripts/import-plan/plan.mjs`): T01 Grundeinheiten, T02 und T03 Schaltungen/Bauteile, T04 Widerstand, T05 Kondensator, T06 Spule, T07 und T08 Transistor/Dioden, T09 Baugruppen, T10 Löttechnik, T11 Multimeter Teil 1 und 2. Abgeleitet ist das aus den bestehenden Zuordnungen auf Staging.

### Praxisblock ohne Tagesbindung (Modul II, 16.–24.11.)

`field_job` hat genau ein Datum, und Home zeigt die offene Praxisaufgabe von heute („Zur Praxisaufgabe“). Ohne Migration verteilt das Skript die Aufträge deshalb **der Reihe nach** auf die Blocktage. Bei 13 Aufträgen auf 7 Tage sind das zwei pro Tag, am letzten Tag einer. Sie stehen ganztägig ohne Uhrzeit im Plan, die Verteilung steht in der Ausgabe. Eine andere Verteilung legt die Trainer:in später über `field_job.datum` fest.
