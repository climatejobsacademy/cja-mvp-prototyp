# SCORM-Pakete einspielen (Selbstlern-Lektionen)

Skript: `scripts/scorm-einspielen.mjs` (Teile in `scripts/scorm-einspielen/`). SR-50 (Upload SCORM) und SR-85 (native Ansicht). Entscheidungen vom 17.10.2026.

Das Skript bringt eine Zip-Datei aus Elephant (oder ein anderes SCORM-1.2-Paket) zu ihrer Selbstlern-Lektion: Es lädt die Zip in den Bucket `scorm-packages`, packt bei Elephant-Paketen die Bilder, Töne und Videos aus, die der Kurs nutzt, trägt das Paket in der Datenbank ein und **veröffentlicht die Lektion**.

## Kurz

1. Zip-Dateien lokal in einen Ordner legen, z. B. `~/Projects/import-daten/scorm/`, **nicht ins Repo**.
2. Eine Liste (CSV) schreiben: welche Zip zu welcher Lektion gehört.
3. Analyse ohne Datenbank: `--nur-analyse`.
4. Probelauf gegen Staging. Das ist der Standard: Nichts wird hochgeladen, die Datenbank wird am Ende zurückgerollt.
5. Echter Lauf mit `--ausfuehren`, nur mit Freigabe.

```sh
DIR="$HOME/Projects/import-daten/scorm"
PLAN="$HOME/Projects/import-daten/Modul_II___Kompetenzen_Import.xlsx"

# Analyse (keine Datenbank, kein Hochladen)
node scripts/scorm-einspielen.mjs --datei "$DIR/scorm-staging.csv" --pakete-ordner "$DIR" \
  --plan-datei "$PLAN" --nur-analyse

# Probelauf Staging (kein Hochladen, Datenbank ROLLBACK)
node scripts/scorm-einspielen.mjs --datei "$DIR/scorm-staging.csv" --pakete-ordner "$DIR" \
  --plan-datei "$PLAN" --ziel staging

# Echter Lauf Staging: gleicher Aufruf mit --ausfuehren
node scripts/scorm-einspielen.mjs --datei "$DIR/scorm-staging.csv" --pakete-ordner "$DIR" \
  --plan-datei "$PLAN" --ziel staging --ausfuehren

# Production: nur mit --production-freigabe (auch für den Probelauf);
# der echte Lauf fragt zusätzlich die Projekt-Ref ab
node scripts/scorm-einspielen.mjs --datei "$DIR/scorm-production.csv" --pakete-ordner "$DIR" \
  --plan-datei "$PLAN" --ziel production --production-freigabe [--ausfuehren]
```

`--plan-datei` ist nur nötig, wenn die Liste Termin-Kennungen enthält (siehe unten).

## Voraussetzungen

- `npm ci` im Repo (das Skript nutzt `fflate` und Code der App aus `src/lib/`).
- Node 24 (lädt die TypeScript-Dateien der App direkt).
- Ein Mac: Audio, das nicht MP3 oder M4A ist (z. B. WAV), wandelt das Skript mit `afconvert` um. Das Programm gehört zu macOS (`/usr/bin/afconvert`). Fehlt es, bricht das Skript ab, bevor es etwas tut.
- `psql` 17. Gesucht wird in `PSQL`, dann `/opt/homebrew/opt/postgresql@17/bin/psql`, dann `psql`.
- Passwort der Datenbank: `PGPASSWORD` in der eigenen Shell oder ein macOS-Schlüsselbund-Eintrag (`cja-db-irl` für Staging, `cja-db-fra` für Production), wie beim Plan-Import. Das Skript gibt das Passwort nie aus.
- Anmeldung der Supabase CLI für das Hochladen, einmal je Rechner:
  ```sh
  npx supabase@2.117.0 login
  ```
  Die CLI holt sich damit selbst den Schlüssel des Projekts. Er steht nie im Code, nie in einer Datei des Repos und nie in der Ausgabe.
- Migration 0055 (Leserecht für ausgepackte Medien) im Ziel. Fehlt sie, warnt der Probelauf und der echte Lauf bricht ab, sobald etwas auszupacken ist.
- Upload-Grenze des Projekts groß genug für die größte Zip (Dashboard → Storage → Settings, „Upload file size limit“; Stand 17.10.: Pakete bis ca. 180 MB). Der Bucket selbst hat keine eigene Grenze; hätte er eine, prüft das Skript sie vorher.
- Für Termin-Kennungen: Der Plan ist schon importiert (Kurs und Selbstlern-Lektion gibt es in der Datenbank).

## Die Liste (CSV)

Reine CSV (in TextEdit „Format → In reinen Text umwandeln“), Komma oder Semikolon. Eine Zeile je Lektion. Zwei Varianten, je Datei genau eine:

```csv
Kennung,Datei
M02-S002,Lernmodul 2_ Die Installation -2026-10-15T12_14_00_649Z.zip
M02-S010,Lernmodul 2_ Elektrotechnische Bauelemente-2026-10-15T12_12_47_512Z.zip
```

```csv
lesson_id,Datei
0b6f2c1e-3a4d-4e5f-8a9b-0c1d2e3f4a5b,EFKffT Teil 1_ Grundlagen Elektrotechnik-2026-10-15T12_01_06_917Z.zip
```

- **Kennung**: Termin-Kennung aus dem Tab Stundenplan der Plan-Excel, wie bei der Fachsprache. Das Skript sucht Termin → Kurs (Woche + Kursname) → die Selbstlern-Lektion dieses Kurses. Dafür `--plan-datei` angeben. Zwei Kennungen desselben Kurses mit derselben Datei werden einmal eingespielt; mit verschiedenen Dateien bricht das Skript ab.
- **lesson_id**: direkt die Lektion (für Sonderfälle, z. B. Modul I Wochen 1–2). Die ids sind auf Staging und Production verschieden.
- **Datei**: Dateiname der Zip im Paket-Ordner, ohne Ordner. Weitere Spalten (Bemerkungen) werden ignoriert.
- Wie bei der Trainer-Datei: Bei `--ziel staging` muss „staging“ im Dateinamen der Liste stehen (z. B. `scorm-staging.csv`), bei `--ziel production` darf es nicht drinstehen.

## Parameter

| Parameter | Bedeutung |
|---|---|
| `--datei <liste.csv>` | Liste (Pflicht) |
| `--pakete-ordner <ordner>` | Ordner mit den Zip-Dateien (Pflicht) |
| `--plan-datei <plan.xlsx>` | Plan-Excel, nur für Termin-Kennungen |
| `--module I,II` | Module, deren Termine gelesen werden (Standard `I,II`) |
| `--ziel staging\|production` | Projekt (Pflicht, außer bei `--nur-analyse`) |
| `--nur-analyse` | nur Pakete prüfen, keine Datenbank, nichts hochladen |
| `--ausfuehren` | echter Lauf: hochladen, eintragen, veröffentlichen (COMMIT) |
| `--production-freigabe` | Pflicht für jedes `--ziel production`, auch für den Probelauf |
| `--arbeitsordner <ordner>` | wohin das Skript kurz auspackt und umwandelt (Standard: temporärer Ordner des Systems); wird danach gelöscht |

## Was die drei Läufe tun

**Analyse** (`--nur-analyse`, ohne Datenbank): öffnet jede Zip, liest `imsmanifest.xml` (SCORM-Version, Titel, Einstiegsdatei) und prüft, ob die Einstiegsdatei im Paket liegt. Erkennt Elephant-Pakete, zählt die Modularten und meldet unbekannte. Zeigt Größe, Speichername, Anzahl und Summe der auszupackenden Medien und die fünf größten. Wandelt Audio zur Probe in M4A um und zeigt die Größe vorher und nachher; die Probe-Dateien werden gleich wieder gelöscht.

**Probelauf** (Standard bei `--ziel`): zusätzlich liest er die Datenbank (nur lesend): Welche Lektion gehört zu jeder Zeile, welchen Status hat sie, hat sie schon ein Paket, was liegt schon im Bucket. Er zeigt je Lektion, wie viele Dateien der echte Lauf hochladen würde und welche schon da sind. Dann trägt er alles in einer Transaktion ein, zeigt das Ergebnis je Tabelle (neu, geändert, unverändert) und rollt zurück. **Er lädt nichts hoch und speichert nichts.** Dass Dateien noch fehlen, meldet er nur.

**Echter Lauf** (`--ausfuehren`), in dieser Reihenfolge:

1. Prüfungen wie im Probelauf. Konflikt (siehe Sicherungen) → Abbruch, bevor etwas passiert.
2. Medien auspacken und Audio umwandeln, in einen eigenen Arbeitsordner.
3. Hochladen mit der Supabase CLI, je Lektion erst die Zip, dann die Medien. Nur Dateien, die noch fehlen.
4. In der Datenbank prüfen, dass jede erwartete Datei im Bucket liegt (mit erwarteter Größe).
5. Erst dann eintragen und veröffentlichen, in einer Transaktion, mit Idempotenz-Prüfung (COMMIT).

Bricht das Hochladen ab, wird nichts eingetragen und nichts veröffentlicht. Schon hochgeladene Dateien bleiben im Bucket; der nächste Lauf erkennt sie als vorhanden und lädt nur den Rest.

## Was das Skript schreibt

**Bucket `scorm-packages`** (nur neue Objekte):

- Zip: `<lesson_id>/<speichername>.zip`. Der Speichername kommt aus dem Dateinamen: klein, Umlaute umgeschrieben (ä → ae), alles außer a–z und 0–9 wird zu Bindestrichen. Beispiel: `Lernmodul 2_ Die Installation -2026-10-15T12_14_00_649Z.zip` → `lernmodul-2-die-installation-2026-10-15t12-14-00-649z.zip`.
- Ausgepackte Medien (nur Elephant-Pakete, die die native Ansicht zeigen kann): `<lesson_id>/<speichername>.zip.entpackt/<Pfad im Zip>`, z. B. `…zip.entpackt/assets/images/x.jpg`. Nur Medien, die der Kurs wirklich nutzt, nur unter `assets/images|tts|videos|audio|documents/` und nur jpg, jpeg, png, webp, gif, avif, mp3, m4a, mp4 (kein HTML, JavaScript oder SVG).
- Audio, das nicht MP3 oder M4A ist (z. B. WAV): als M4A (AAC, 96 kbit/s) mit Endung `.m4a`, z. B. `…/x.wav` → `…/x.m4a`. Die WAV wird nicht hochgeladen (sie bleibt nur in der Zip). Beispiel: Eine WAV mit 148 MB (knapp 10 Minuten) wird ein M4A mit 6,5 MB.
- Die Kursdaten (JSON) bleiben nur in der Zip.

**Datenbank** (eine Transaktion):

- `file_asset` je Zip (`dateiname` = Name der lokalen Datei, `dateityp` `application/zip`, `storage_pfad` wie oben, ohne Organisation = AfCJ-Content, ohne `hochgeladen_von`). Gibt es schon eins mit demselben Pfad, wird es wiederverwendet.
- `scorm_package` je Lektion (über `lesson_id`): Paket, Einstiegsdatei und Titel aus dem Manifest. Hatte die Lektion schon ein anderes Paket (z. B. den Demo-Platzhalter), zeigt sie danach auf das neue; das alte bleibt unverändert im Bucket und in der Datenbank.
- `lesson.status = 'published'`.

**Nicht-Elephant-Pakete** und Elephant-Pakete mit unbekannter Modulart: nur die Zip und die Einträge, nichts wird ausgepackt (Hinweis in der Ausgabe). Die Lektion zeigt dann den SCORM-Player.

## Sicherungen

- **Nie überschreiben, nie löschen**: Vor dem Hochladen liest das Skript `storage.objects`. Liegt eine Datei schon da und hat dieselbe Größe, gilt sie als „vorhanden“; bei anderer Größe bricht das Skript ab (Konflikt). Bei umgewandeltem Audio zählt nur, ob die Datei da ist (die Größe kennt das Skript erst nach der Umwandlung). Zusätzlich lädt das Skript jede Datei einzeln hoch (ohne `-r`); dabei lehnt Storage ein schon vorhandenes Objekt ab. Das Skript ruft nur `storage cp` auf, nie `rm` oder `mv`.
- **Neue Version eines Pakets** = neuer Dateiname. Elephant setzt beim Export Datum und Uhrzeit in den Namen, ein neuer Export hat also von selbst einen neuen Namen. Dann die Zeile in der Liste auf die neue Datei ändern; die Lektion zeigt danach auf das neue Paket.
- **Immer das richtige Projekt**: Hochladen nur mit `--project-ref` des Ziels (Staging `keijrwvegmwgpvprpoxa`, Production `vqfnmkcfjsudsujiuoqm`), nie `--linked`. Die Datenbank wird über den Session-Pooler desselben Ziels angesprochen.
- **Production** nur mit `--production-freigabe`; der echte Lauf fragt zusätzlich die Projekt-Ref ab. Die Liste für Production darf nicht „staging“ im Namen tragen und umgekehrt.
- **Idempotenz**: Im selben Lauf wird das Eintragen ein zweites Mal ausgeführt; ändert der zweite Durchgang etwas, bricht das Skript ab. Ein späterer Lauf mit derselben Liste meldet „unverändert“ und lädt nichts hoch.
- **Prüfungen vorher**: Endung `.zip`, Manifest vorhanden, Einstiegsdatei im Paket, keine Pfade mit `..`, nur erlaubte Medien und sichere Objektnamen, Lektion gefunden und wirklich eine Selbstlern-Lektion, jede Lektion nur einmal, Bucket vorhanden. Das Skript legt keinen Bucket an.
- **Keine Personendaten, keine Schlüssel in der Ausgabe**: Ausgegeben werden Zeile, Kennung bzw. lesson_id, Lektions- und Kursname, Dateinamen, Speicherpfade und Größen; keine signierten URLs. Fehlermeldungen der CLI werden vor der Ausgabe von Schlüsseln bereinigt.
- **Lokale Kopien**: Ausgepackt und umgewandelt wird nur in einem eigenen Arbeitsordner, der am Ende gelöscht wird. Die Zip-Dateien im Paket-Ordner bleiben unberührt.

## Bekannte Grenzen

- Bestehende Pakete auf Staging werden **nicht** nachträglich ausgepackt (Entscheidung 17.10.). Sie laufen weiter über die Zip.
- Hochgeladen wird Datei für Datei (ein CLI-Aufruf je Datei). Bei rund 100 Medien dauert das einige Minuten.
- Die Supabase CLI lädt jede Datei in einem Stück hoch (kein fortsetzbarer Upload). Bei sehr großen Zips und schwacher Verbindung kann das abbrechen; dann den Lauf einfach wiederholen.
- Zwischen der Prüfung und dem Hochladen könnte theoretisch jemand anderes dieselbe Datei hochladen. Dann lehnt Storage das Hochladen ab, das Skript bricht ab und veröffentlicht nichts.
- Zips über 4 GB (ZIP64) werden nicht unterstützt.
- Modul I Wochen 1–2 (Foliensätze M01-T…) haben ggf. keine passende Termin-Kennung im Stundenplan; dann `lesson_id` verwenden.
- Gibt es in einer Woche zwei Kurse mit gleichem Namen, bricht das Skript ab; dann `lesson_id` verwenden.
- Stand 17.10.: Das Eintragen in die Datenbank und das Hochladen sind noch nie gegen ein Projekt gelaufen. Erster Lauf: Probelauf auf Staging, dann ein echter Lauf mit einer einzelnen Lektion auf Staging, Ergebnis in der App ansehen.
