# Lernende anlegen

Skript: `scripts/lernende-anlegen.mjs` (Teile in `scripts/lernende-anlegen/`). Richtet Lernende so ein, dass sie sich danach selbst per Magic Link anmelden können. SR-48.

## Kurz

1. Auth-Konten im Supabase-Dashboard anlegen (ohne Einladung).
2. Lernenden-Datei (CSV) lokal unter `~/Projects/import-daten/` ablegen, **nicht ins Repo**: Sie enthält Namen und E-Mail-Adressen.
3. Datei prüfen ohne Datenbank: `--nur-pruefen`.
4. Probelauf gegen Staging. Das ist der Standard, am Ende wird alles zurückgerollt.
5. Echter Lauf mit `--ausfuehren`, nur mit Freigabe.
6. Plan-Import erneut laufen lassen (Praxistage), dann Startnachricht an die Lernenden.

```sh
DIR="$HOME/Projects/import-daten"

# Datei prüfen (keine Datenbank)
node scripts/lernende-anlegen.mjs --datei "$DIR/lernende-staging.csv" --ziel staging --nur-pruefen

# Probelauf Staging (ROLLBACK)
node scripts/lernende-anlegen.mjs --datei "$DIR/lernende-staging.csv" --ziel staging

# Echter Lauf Staging
node scripts/lernende-anlegen.mjs --datei "$DIR/lernende-staging.csv" --ziel staging --ausfuehren

# Production: nur mit --production-freigabe, auch für den Probelauf
node scripts/lernende-anlegen.mjs --datei "$DIR/lernende-production.csv" --ziel production --production-freigabe

# Echter Lauf Production: fragt zusätzlich die Projekt-Ref ab
node scripts/lernende-anlegen.mjs --datei "$DIR/lernende-production.csv" --ziel production --production-freigabe --ausfuehren
```

## Voraussetzungen

- `psql` 17 oder neuer, z. B. aus Homebrew oder Postgres.app (https://postgresapp.com). Gesucht wird in `PSQL`, dann `/opt/homebrew/opt/postgresql@17/bin/psql`, dann `/Applications/Postgres.app/Contents/Versions/latest/bin/psql`, dann `psql`.
- Passwort der Datenbank: entweder `PGPASSWORD` in der eigenen Shell oder ein macOS-Schlüsselbund-Eintrag (`cja-db-irl` für Staging, `cja-db-fra` für Production). Das Skript gibt das Passwort nie aus. Verbunden wird wie beim Plan-Import über den Session-Pooler als `postgres`, ohne Service-Role-Key.
- Die Datenbank steht mindestens auf Migration 0030 (Rufname, Rolle trainer), sonst bricht das Skript ab.
- Betrieb und Kohorte gibt es schon in der Datenbank. Das Skript legt keine Betriebe und keine Kohorten an.

## Schritt 1: Auth-Konten im Dashboard

Das Skript legt **keine Auth-Konten** an und schreibt nie in `auth.users`. Es verschickt auch keine Mail.

1. Supabase-Dashboard des Ziels öffnen (Staging Irland bzw. Production Frankfurt).
2. Authentication → Users → Add user → **Create new user**.
3. E-Mail der lernenden Person eintragen, **Auto Confirm User** anhaken. **Keine Einladung** verschicken („Send invitation“ nicht verwenden, auch nicht `scripts/invite-learner.mjs`: Diese Links funktionieren in der App nicht).
4. Für jede Person ein eigenes Konto. Ein Konto, das schon Trainer:in oder Admin ist, wird nicht als Lernende verknüpft.

Auf Staging nur Test-Adressen verwenden (z. B. `test+lernende1@example.org`), weil Staging echte Mails verschickt.

## Schritt 2: Skript

### Die Lernenden-Datei (CSV)

Reine CSV (nicht RTF; in TextEdit „Format → In reinen Text umwandeln“), Komma oder Semikolon als Trennzeichen.

```csv
E-Mail,Vorname,Nachname,Rufname,Betrieb,Kohorte
test+lernende1@example.org,Erika,Muster,,Testbetrieb GmbH,Energiehelden 28.09.26
```

| Spalte | Pflicht | Bedeutung |
|---|---|---|
| `E-Mail` | ja | dieselbe Adresse wie das Auth-Konto im Dashboard; jede Adresse nur einmal |
| `Vorname`, `Nachname` | ja | ergeben `person.name` („Vorname Nachname“) |
| `Rufname` | nein | Anrede in der App, höchstens 60 Zeichen; leer = Vorname. Die Spalte darf ganz fehlen |
| `Betrieb` | ja | genau der Name aus `organisation.name`; muss ein Arbeitgeber sein (`typ = employer`) |
| `Kohorte` | ja | genau der Name aus `cohort.name`; muss zum Programm gehören (Standard `EFK-EE`, sonst `--programm`) |

Der Dateiname muss zum Ziel passen, wie bei der Trainer-Datei: Bei `--ziel staging` muss „staging“ im Namen stehen, bei `--ziel production` darf es nicht drinstehen. Empfohlen: `lernende-staging.csv` und `lernende-production.csv`.

Sprache (`DE`), Geschlecht („keine Angabe“), Geburtsdatum und Vorerfahrung setzt das Skript nicht; sie bleiben leer bzw. beim Standardwert und lassen sich später händisch nachtragen.

### Probelauf und echter Lauf

- **Probelauf (Standard):** alles in einer Transaktion, die am Ende zurückgerollt wird. Im selben Lauf wird alles ein zweites Mal ausgeführt; legt der zweite Durchgang noch etwas an, bricht das Skript ab.
- **Echter Lauf (`--ausfuehren`):** speichert nur, wenn **jede** Zeile in Ordnung ist. Gibt es eine Zeile mit „Konflikt“ oder „Auth-Konto fehlt“, wird nichts gespeichert. Dann das Konto anlegen bzw. den Konflikt klären, oder die Zeile aus der CSV nehmen.
- **Production:** nur mit `--production-freigabe`, auch für den Probelauf. Der echte Lauf fragt zusätzlich die Projekt-Ref ab.

### Was der Lauf ausgibt

Je Zeile die Zeilennummer, die maskierte Adresse (`t***@example.org`, nie die ganze Adresse, nie den Namen) und den Status:

| Status | Bedeutung |
|---|---|
| neu | Person, Mitgliedschaft, Rolle und Einschreibung angelegt |
| ergänzt | Person gab es schon, Fehlendes (z. B. Einschreibung) wurde ergänzt |
| unverändert | alles war schon da |
| Konflikt | nichts geschrieben, Grund im Hinweis (siehe Regeln) |
| Auth-Konto fehlt | kein Konto mit dieser E-Mail: zuerst im Dashboard anlegen |

Danach je Tabelle, was neu bzw. unverändert ist, und den Hinweis auf Schritt 3 und 4.

### Was das Skript schreibt

Nur Zeilen, die fehlen. Vorhandene Zeilen werden nie geändert oder gelöscht.

| Tabelle | Spalten |
|---|---|
| `person` | `id` = Auth-ID, `email` aus dem Auth-Konto, `name`, `username` = `lernende-<Auth-ID>`, `rufname` |
| `org_membership` | `person_id`, `organisation_id` = Betrieb |
| `role_assignment` | `person_id`, `organisation_id` = Betrieb, `rolle` = `learner` |
| `enrolment` | `organisation_id` = Betrieb, `learner_id`, `cohort_id`, `status` = `aktiv` |

## Schritt 3: Plan-Import für die Praxistage

Praxistage (`field_job`) entstehen je aktiver Einschreibung beim Plan-Import. Neue Lernende bekommen sie erst, wenn der Plan-Import für ihre Kohorte noch einmal läuft. Erst Probelauf, dann `--ausfuehren`; alles andere bleibt dabei unverändert. Aufruf und Kohorten mit Versatz: `docs/import-plan.md`.

```sh
node scripts/import-plan.mjs --datei "$DIR/<plan.xlsx>" --ziel staging \
  --trainer-datei "$DIR/trainer-staging.csv" --kohorte "<Kohortenname>"
```

## Schritt 4: Startnachricht

Die Lernenden melden sich selbst an: Seite öffnen, E-Mail eingeben, Link aus der Mail öffnen.

- Production: https://learn.climatejobsacademy.com/login
- Staging (Vorschau): https://cja-mvp-prototyp-git-dev-af-cj-s.vercel.app/login

Keine Einladungsmail aus dem Dashboard oder über `scripts/invite-learner.mjs` verschicken.

## Regeln

- Ein Konto hat genau eine aktive Einschreibung. Gibt es schon eine aktive Einschreibung in einer anderen Kohorte oder bei einem anderen Betrieb, meldet das Skript „Konflikt“ und hängt **nicht** um. Umhängen heißt: neue Einschreibung anlegen und die alte beenden, nie die bestehende ändern; das passiert händisch.
- Eine beendete Einschreibung (abgeschlossen, abgebrochen) in derselben Kohorte wird nicht wieder aktiviert: Konflikt.
- Konten mit der Rolle Trainer:in oder Admin werden nicht als Lernende verknüpft (getrennte Konten): Konflikt.
- Gehört die E-Mail schon einer anderen Person (anderes Auth-Konto): Konflikt.
- Demo-Konten werden nie angefasst: Adresse mit `+demo@`, Kohorte, deren Name mit „DEMO“ beginnt (z. B. „DEMO Rim“), oder ein Konto, das in so einer Kohorte eingeschrieben ist. Dann bricht das Skript ab.
- Betrieb oder Kohorte nicht gefunden, doppelt, Betrieb kein Arbeitgeber oder Kohorte in einem anderen Programm: Abbruch, nichts gespeichert.
- Eine vorhandene Person bleibt, wie sie ist: Name und Rufname werden nicht überschrieben.

## Bekannte Grenzen

- Das SQL (`scripts/lernende-anlegen/anlegen.sql`) ist bisher nur am Schreibtisch geprüft, nicht gegen eine Datenbank. Der erste Probelauf auf Staging ist der erste echte Test.
- Getestet (in `npm test`) sind nur CSV, Maskierung, Dateiname und Demo-Schutz: `node --test scripts/lernende-anlegen/*.test.mjs`.
- Betrieb und Kohorte müssen genau so geschrieben sein wie in der Datenbank (Groß-/Kleinschreibung zählt).
- Sprache UK, Geburtsdatum, Geschlecht und Vorerfahrung kommen nicht aus der CSV.
- Endet die Kohorte schon in der Vergangenheit, steht das im Hinweis; angelegt wird trotzdem.
