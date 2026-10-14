# Import Stundenplan, Kompetenzen und Aufträge aus der Excel

Skript: `scripts/import-plan.mjs` (Teile in `scripts/import-plan/`). Erstes Paket: Modul I (Rest, Wochen 4–5) und Modul II. Entscheidungen vom 13.10.2026; SR-05, SR-71, SR-78.

## Kurz

1. Die Excel von Content & Learning und die Trainer-Dateien lokal unter `~/Projects/import-daten/` ablegen, **nicht ins Repo**: Sie enthalten Trainer-Namen und E-Mail-Adressen.
2. Analyse ohne Datenbank: `--nur-analyse`.
3. Probelauf gegen Staging. Das ist der Standard, am Ende wird alles zurückgerollt.
4. Echter Lauf mit `--ausfuehren`, nur mit Freigabe.

```sh
DIR="$HOME/Projects/import-daten"
DATEI="$DIR/Modul_II___Kompetenzen_Import.xlsx"

# Analyse (keine Datenbank)
node scripts/import-plan.mjs --datei "$DATEI" --nur-analyse

# Probelauf Staging (ROLLBACK), beide Kohorten, DEMO Rim um eine Woche verschoben
node scripts/import-plan.mjs --datei "$DATEI" --ziel staging \
  --trainer-datei "$DIR/trainer-staging.csv" \
  --kohorte "Energiehelden 28.09.26" --kohorte "DEMO Rim@+7"

# Echter Lauf Staging (erst nach der Demo am 15.10.): gleicher Aufruf mit --ausfuehren

# Production: nur mit --production-freigabe; ohne Tagesplanung Modul II die Praxis weglassen;
# der echte Lauf fragt zusätzlich die Projekt-Ref ab
node scripts/import-plan.mjs --datei "$DATEI" --ziel production --production-freigabe \
  --trainer-datei "$DIR/trainer-production.csv" --ohne-praxis II --kohorte "<Kohortenname>" [--ausfuehren]
```

## Voraussetzungen

- `npm ci` im Repo (das Skript nutzt `fflate` aus den App-Abhängigkeiten).
- `psql` 17. Gesucht wird in `PSQL`, dann `/opt/homebrew/opt/postgresql@17/bin/psql`, dann `psql`.
- Passwort der Datenbank: entweder `PGPASSWORD` in der eigenen Shell oder ein macOS-Schlüsselbund-Eintrag (`cja-db-irl` für Staging, `cja-db-fra` für Production). Das Skript gibt das Passwort nie aus. Verbunden wird über den Session-Pooler als `postgres`, ohne Service-Role-Key.
- Die Datenbank muss mindestens auf Migration 0030 stehen, sonst bricht das Skript ab. **Production steht am 13.10. auf 0024**: Zuerst müssen 0025–0030 im Release angewendet werden.

## Vor dem Production-Lauf

- Migrationen 0025–0030 (und 0031 für die Kann-Sätze) sind auf Production angewendet.
- **Die Teilschritte ohne jede Zuordnung sind in der Excel korrigiert** (Stand 13.10.: 9, Liste mit `--nur-analyse`). Solange es welche gibt, bricht das Skript gegen Production ab. Abschalten nur bewusst mit `--ohne-zuordnung-erlauben`.
- Die Tagesplanung des Praxisblocks Modul II liegt vor. Bis dahin läuft Production mit `--ohne-praxis II`.
- Trainer-Konten sind im Dashboard angelegt, `trainer-production.csv` ist gepflegt.

## Trainer-Konten

Das Skript legt **keine Auth-Konten** an und schreibt nie in `auth.users`.

1. Konto im Supabase-Dashboard anlegen (Authentication → Users → Add user, echte E-Mail, ohne Einladung).
2. Zuordnungsdatei als reine CSV (nicht RTF, in TextEdit „Format → In reinen Text umwandeln“) mit Kopf `Kennung,E-Mail`, z. B. `TR-02,name@example.org`. Für Staging `trainer-staging.csv` **nur mit Test-Adressen**, weil Staging echte Mails über Brevo verschickt. Für Production `trainer-production.csv`.
3. Das Skript bricht ab, wenn bei `--ziel staging` eine Datei ohne „staging“ im Namen übergeben wird, oder bei `--ziel production` eine mit „staging“.
4. **Nur die Konten verknüpfen** (ohne Import, z. B. direkt nach dem Anlegen im Dashboard): `--nur-trainer` verknüpft alle Trainer:innen aus dem Tab Trainer (auch die zweite bei „Simon, Tom“), sonst nichts. Probelauf als Standard, speichern mit `--ausfuehren`:
   `node scripts/import-plan.mjs --datei "$DATEI" --ziel staging --trainer-datei "$DIR/trainer-staging.csv" --nur-trainer`
5. Gefundenes Konto: Das Skript legt die `person` (Name = Anzeigename aus der Excel, Benutzername `trainer-tr-xx`) mit Rolle `trainer` (AfCJ) an. Name, Rufname und Foto lassen sich danach händisch ändern, das Skript überschreibt sie nicht. Fehlt ein Konto oder eine Zeile in der Datei, werden die Termine ohne Trainer:in angelegt und gemeldet. Ein späterer Lauf trägt die Trainer:in nach, solange am Termin keine steht. Gehört das Konto einer lernenden Person, verknüpft das Skript es nicht.

## Parameter

| Parameter | Bedeutung |
|---|---|
| `--datei <pfad>` | Excel-Datei (Pflicht) |
| `--ziel staging\|production` | Datenbank (Pflicht, außer bei `--nur-analyse`) |
| `--kohorte "Name"` | Kohorte, die die Termine bekommt; mehrfach möglich. `"Name@+7"` verschiebt alle Termine um 7 Tage. Ohne `--kohorte` werden nur Inhalte und Kompetenzen importiert. |
| `--trainer-datei <pfad.csv>` | Zuordnung Kennung → E-Mail der Trainer-Konten (siehe oben) |
| `--module I,II` | Module im Umfang (Standard `I,II`) |
| `--ohne-praxis II` | Praxistermine dieser Module weglassen (Aufträge und Zuordnungen werden trotzdem angelegt) |
| `--ohne-zuordnung-erlauben` | Production trotz Teilschritten ohne Zuordnung |
| `--ausfuehren` | speichert (COMMIT); ohne läuft nur der Probelauf (ROLLBACK) |
| `--production-freigabe` | Pflicht für jedes `--ziel production`, auch für den Probelauf |
| `--nur-analyse` | nur die Excel prüfen und die Listen ausgeben |
| `--nur-trainer` | nur Trainer-Konten verknüpfen (braucht `--trainer-datei`), kein Import |

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
| Termin Praxis | `field_job` und `schedule_entry` (feld) **je aktiver Einschreibung**, `instructor_id` = Trainer:in. Nach dem Anlegen neuer Lernender das Skript erneut laufen lassen, dann bekommen sie ihre Praxistage; alles andere bleibt unverändert |
| Kompetenzen | `competency` (Name = Kurztitel, Kann-Satz in `kann_satz`, sobald Migration 0031 angewendet ist), `competency_programme`, `modul_competency` mit Kürzel = Kennung (M02-K03). Ein bisheriges Kürzel (M2.03) wird umgestellt, ohne Dublette |
| Teilschritte | `competency_step` und `competency_competency_step` (Reihenfolge). Theoretisch: `content_competency_mapping` zu den Live-Lektionen der genannten Theorietage. Praktisch: `field_job_type_competency_mapping` zu den Aufträgen |
| Aufträge | `field_job_type` mit `kategorie` = Auftragsnummer, Woche des ersten Termins |
| Trainer | `person` mit Rolle `trainer` (AfCJ) am vorhandenen Auth-Konto (siehe „Trainer-Konten“). Eine Trainer:in je Termin, bei „Simon, Tom“ die erste |

Nicht importiert werden: die Spalte „Offen“, SCORM, PDFs, Zoom-Links und Ort bei Live-Terminen (`live_session` hat kein Ortsfeld). Gelöscht wird nichts, außer Lektion-Zuordnungen eines Teilschritts, dessen Typ laut Excel auf „praktisch“ wechselt (und umgekehrt). Sonst würden sie gegen SR-71 verstoßen. Die Excel ist führend (Entscheidung 13.10.): In Modul I betrifft das 8 Lektion-Zuordnungen. Jede Löschung steht in den Meldungen.

### Wiedererkennen beim zweiten Lauf

Es gibt keine eigene Spalte für die Kennungen aus Spalte A (keine Migration). Wiedererkannt wird über diese Schlüssel:

- Kompetenz: `modul_competency.kuerzel`
- Teilschritt: Kompetenz und Name (normalisiert, Klammern ignoriert)
- Auftrag: `field_job_type.kategorie`
- Woche: Nummer im Modul
- Kurs: Woche und Name
- Live-Termin: Kohorte, Lektion bzw. Kurs und Datum
- Praxistag: Lernende:r, Auftrag und Datum
- Trainer:in: Auth-Konto über die E-Mail

Folge: Ändert sich in der Excel der **Titel eines Teilschritts** oder **Kurstitel/Thema eines Theorietags**, entsteht ein neuer Datensatz. Der alte bleibt und wird als „zusätzlich“ gemeldet. Titel deshalb vorher in der Datenbank anpassen oder den alten Datensatz händisch entfernen.

### Modul I: Theorietage M01-T01–T11

Die Theorietage sind die Foliensätze der Wochen 1–2. Sie werden über `lesson.thema` den bestehenden Live-Lektionen zugeordnet (Tabelle `FOLIENSAETZE_MODUL_I` in `scripts/import-plan/plan.mjs`): T01 Grundeinheiten, T02 und T03 Schaltungen/Bauteile, T04 Widerstand, T05 Kondensator, T06 Spule, T07 und T08 Transistor/Dioden, T09 Baugruppen, T10 Löttechnik, T11 Multimeter Teil 1 und 2. Abgeleitet ist das aus den bestehenden Zuordnungen auf Staging.

### Praxisblock ohne Tagesbindung (Modul II, 16.–24.11.): vorläufig

**Vorläufig, die Tagesplanung von Malte fehlt.** `field_job` hat genau ein Datum, und Home zeigt die offene Praxisaufgabe von heute („Zur Praxisaufgabe“). Als Platzhalter verteilt das Skript die Aufträge der Reihe nach auf die Blocktage: zwei pro Tag, am letzten Tag einer, ganztägig ohne Uhrzeit. Die Ausgabe kennzeichnet das als „VORLÄUFIG“. Für Production mit `--ohne-praxis II` laufen lassen, bis die Planung da ist. Danach die Verteilung im Skript bzw. in der Excel nachziehen. Achtung: Wurden Platzhalter-Praxistage schon gespeichert (Staging), legt ein Lauf mit neuer Verteilung die neuen Tage zusätzlich an (Schlüssel ist das Datum). Die alten Platzhalter dann vorher entfernen oder verschieben.
