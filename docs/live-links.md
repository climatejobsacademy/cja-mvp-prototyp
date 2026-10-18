# Teams-Links für die Live-Termine

Skript: `scripts/live-links.mjs` (Teile in `scripts/live-links/`). Schreibt Teams-Links in die Live-Termine (`live_session.join_link`). SR-15 (Beitritts-Link je Live-Termin).

## Kurz

1. Die Link-Datei lokal unter `~/Projects/import-daten/` ablegen, **nicht ins Repo**: Teams-Links können Zugangsdaten enthalten (z. B. ein Kennwort im Link).
2. Datei prüfen ohne Datenbank: `--nur-pruefen`.
3. Probelauf gegen Staging. Das ist der Standard, am Ende wird alles zurückgerollt.
4. Echter Lauf mit `--ausfuehren`, nur mit Freigabe.

```sh
DIR="$HOME/Projects/import-daten"

# Datei prüfen (keine Datenbank)
node scripts/live-links.mjs --datei "$DIR/teams-links-staging.csv" --ziel staging --nur-pruefen

# Probelauf Staging (ROLLBACK)
node scripts/live-links.mjs --datei "$DIR/teams-links-staging.csv" --ziel staging

# Echter Lauf Staging: gleicher Aufruf mit --ausfuehren
node scripts/live-links.mjs --datei "$DIR/teams-links-staging.csv" --ziel staging --ausfuehren

# Production: nur mit --production-freigabe, auch für den Probelauf
node scripts/live-links.mjs --datei "$DIR/teams-links-production.csv" --ziel production --production-freigabe

# Echter Lauf Production: fragt zusätzlich die Projekt-Ref ab
node scripts/live-links.mjs --datei "$DIR/teams-links-production.csv" --ziel production --production-freigabe --ausfuehren
```

## Voraussetzungen

- `psql` 17 oder neuer, z. B. aus Homebrew oder Postgres.app (https://postgresapp.com). Gesucht wird in `PSQL`, dann `/opt/homebrew/opt/postgresql@17/bin/psql`, dann `/Applications/Postgres.app/Contents/Versions/latest/bin/psql`, dann `psql`.
- Passwort der Datenbank: entweder `PGPASSWORD` in der eigenen Shell oder ein macOS-Schlüsselbund-Eintrag (`cja-db-irl` für Staging, `cja-db-fra` für Production). Das Skript gibt das Passwort nie aus. Verbunden wird wie beim Plan-Import über den Session-Pooler als `postgres`, ohne Service-Role-Key.
- Die Datenbank steht mindestens auf Migration 0028 (Modul-Ebene), sonst bricht das Skript ab.
- Die Termine sind schon da: Das Skript legt keine Termine an. Erst den Stundenplan importieren (`docs/import-plan.md`), dann die Links.

## Die Link-Datei (CSV)

Reine CSV (nicht RTF; in TextEdit „Format → In reinen Text umwandeln“), Komma oder Semikolon als Trennzeichen. Der Dateiname muss zum Ziel passen, wie bei der Trainer-Datei: Bei `--ziel staging` muss „staging“ im Namen stehen, bei `--ziel production` darf es nicht drinstehen. Empfohlen: `teams-links-staging.csv` und `teams-links-production.csv`.

Es gibt zwei Varianten. Welche gilt, erkennt das Skript an der Kopfzeile.

**Je Modul** (ein Link für alle Live-Termine einer Kohorte in einem Modul):

```csv
Kohorte,Modul,Link
Energiehelden 28.09.26,II,https://teams.microsoft.com/l/meetup-join/...
```

- `Modul`: `I`, `II`, `III`, `IV`, `V` oder `Abschluss` (auch `Modul II`, `2` oder `M02`).
- Zum Modul gehört ein Termin, wenn sein Kurs in einer Woche dieses Moduls liegt.
- **Begleitkurse** (Deutsch/Fachdeutsch, Softskills Coaching) hängen an keinem Modul. Sie bekommen den Link nur mit `--mit-begleitkursen`, und zwar alle Begleitkurs-Termine der Kohorte zwischen dem ersten und letzten Termin des Moduls. Ohne den Schalter nennt der Lauf, wie viele ausgelassen wurden.

**Je Termin** (ein Link für einen einzelnen Termin):

```csv
Kohorte,Datum,Start,Link
Energiehelden 28.09.26,02.11.2026,08:00,https://teams.microsoft.com/l/meetup-join/...
```

- `Datum`: `TT.MM.JJJJ` oder `JJJJ-MM-TT`. `Start`: Beginn wie im Stundenplan, `HH:MM`, Berliner Zeit.
- Eine Spalte `Kennung` (z. B. `M02-S002`) geht nicht: Die Termin-Kennungen aus der Excel sind in der Datenbank nicht gespeichert.

Für beide gilt:

- `Kohorte` ist der Name wie in der Datenbank. Er muss eindeutig sein.
- Der Link muss mit `https://` beginnen und auf `teams.microsoft.com` oder `teams.live.com` zeigen, sonst bricht das Skript ab. Enthält der Link ein Komma oder Semikolon, ihn in Anführungszeichen setzen.
- Jede Zeile nur einmal (gleiche Kohorte und gleiches Modul bzw. gleicher Termin), sonst Abbruch.
- Jede Zeile muss mindestens einen Live-Termin treffen, sonst Abbruch mit Hinweis.
- Zwei Zeilen mit verschiedenen Links für denselben Termin: Abbruch.
- Leere Zeilen werden übersprungen. Alle Fehler kommen auf einmal, je Zeile.

## Parameter

| Parameter | Bedeutung |
|---|---|
| `--datei <pfad.csv>` | Link-Datei (Pflicht) |
| `--ziel staging\|production` | Datenbank (Pflicht, außer bei `--nur-pruefen`) |
| `--nur-pruefen` | nur die Datei prüfen und die Zeilen ausgeben, keine Datenbank |
| `--mit-begleitkursen` | nur je Modul: auch die Begleitkurs-Termine im Zeitraum des Moduls |
| `--ausfuehren` | speichert (COMMIT); ohne läuft nur der Probelauf (ROLLBACK) |
| `--production-freigabe` | Pflicht für jedes `--ziel production`, auch für den Probelauf |

## Was der Lauf ausgibt

- **Je Zeile:** Kohorte und Modul bzw. Datum und Start, die Domain des Links, die Anzahl der betroffenen Live-Termine und davon **neu** (bisher kein Link), **geändert** (anderer Link) und **unverändert**. Der Link selbst wird nie ausgegeben.
- **Meldungen:** ausgelassene Begleitkurs-Termine; Termine, die auch zu einer anderen Kohorte gehören (dort gilt der Link dann mit).
- **Zweiter Durchgang:** Das Skript läuft in derselben Transaktion ein zweites Mal. Ändert es dabei etwas, bricht es ab, und es wird nichts gespeichert. Ein zweiter echter Lauf mit derselben Datei meldet überall „unverändert“.

## Was das Skript nicht tut

- Es ändert nur `join_link`, sonst nichts. Es legt keine Termine an und löscht nichts.
- Einen Link entfernen geht damit nicht (die Spalte `Link` ist Pflicht).
- Kein Zugriff auf Production ohne `--production-freigabe`; der echte Lauf auf Production fragt die Projekt-Ref ab.
