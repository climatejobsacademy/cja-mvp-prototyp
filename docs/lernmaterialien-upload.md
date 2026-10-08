# Lernmaterialien hochladen und an Lektionen hängen

Stand 2026-10-07, SR folgt (Notion führt die Anforderung als SR-68, im Repo ist SR-68 anders belegt). Schema: `supabase/migrations/0023_lesson_resources_bucket.sql`. Die Anzeige für Lernende folgt in einem eigenen PR.

## Was gilt

- Bucket `lesson-resources`, privat, höchstens 50 MB (52428800 Byte) je Datei.
- Erlaubte Formate: PDF, PNG, JPEG, WebP, DOCX, PPTX, XLSX. Nicht erlaubt: SVG, ZIP, .doc, .xls, Videos. Videos werden nur als Link angehängt.
- Materialien gehen an jede Lektion (Repository, Live, SCORM).
- Lernende sehen sie nur, wenn die Lektion veröffentlicht ist und sie in das Programm der Lektion eingeschrieben sind (Status aktiv oder abgeschlossen). Anonyme sehen nichts, Lernende laden nichts hoch.
- Hochladen nur durch AfCJ.

## Namenskonvention für Dateien im Bucket

Nur Kleinbuchstaben a–z, Ziffern und Bindestriche, eine Endung. Keine Umlaute, kein ß, keine Leerzeichen, keine Ordner (siehe Ablauf, Schritt 2).

| Statt | So |
|---|---|
| `Datenblatt Wechselrichter Ä1.pdf` | `datenblatt-wechselrichter-a1.pdf` |
| `Modul 2 Übung Löten.pptx` | `modul-2-uebung-loeten.pptx` |

Der lesbare Name mit Umlauten und Leerzeichen kommt in den **Titel**. Den Dateinamen für Lernende leitet die App aus dem Objektnamen ab.

### Getestet auf Staging (2026-10-07, Dashboard-Upload in `lesson-resources`)

| Datei | Ergebnis |
|---|---|
| PDF, PNG, DOCX, PPTX, XLSX | angenommen; die MIME-Typen der Office-Formate kommen beim Dashboard-Upload richtig an |
| `Test Ä ö.pdf` | abgelehnt: „File name is invalid“. Umlaute im Objektnamen sind ungültig. |
| SVG | abgelehnt: „Mime type image/svg+xml is not supported“ |
| `test image.png` | angenommen. Leerzeichen gehen im Dashboard zwar, die Konvention oben gilt trotzdem; die SQL-Vorlage lehnt solche Namen ab. |

## Ablauf

Immer zuerst auf Staging (Irland, `keijrwvegmwgpvprpoxa`), Production (Frankfurt, `vqfnmkcfjsudsujiuoqm`) erst nach Freigabe.

1. **Datei umbenennen** nach der Konvention oben.
2. **Hochladen**: Supabase-Dashboard → Storage → Bucket `lesson-resources` → Upload, direkt ins Wurzelverzeichnis. Zu große oder nicht erlaubte Dateien lehnt der Bucket ab.
   - Beim Hochladen in einen Ordner entstanden auf Staging Objektnamen mit doppeltem Schrägstrich (test//...); die Ursache ist nicht geprüft. Im Dashboard deshalb direkt ins Wurzelverzeichnis hochladen und keine Ordner anlegen.
3. **Objektnamen kopieren**: der Name im Bucket ohne Bucket-Namen, z. B. `uebung-loeten.pptx`.
4. **Lektions-ID heraussuchen**: Table Editor → `lesson`.
5. **SQL-Vorlage ausführen**: Inhalt von `scripts/sql/lernmaterial_anlegen.sql` in den SQL Editor kopieren, im Block „EINGABEN“ Lektions-ID, Titel und Pfad eintragen (für einen Video-Link stattdessen `p_link` setzen und `p_pfad := null`), ausführen.
   - Der erste Lauf ist ein **Probelauf**: Er endet absichtlich mit der Meldung „PROBELAUF ok, nichts gespeichert …“ und zeigt Lektion, Titel, Position, Format und Größe.
   - Passt alles: `p_probelauf := false` setzen und noch einmal ausführen.
6. **Prüfen**: Table Editor → `lesson_resource`, neue Zeile mit Titel und Position.

Die Vorlage prüft vorher, dass die Lektion existiert, ein Titel gesetzt ist, der Objektname der Konvention folgt und die Datei wirklich im Bucket liegt. Dateiname und Format übernimmt sie aus dem Bucket. Hängt dieselbe Datei schon an einer anderen Lektion, verwendet sie den vorhandenen `file_asset`-Eintrag wieder.

## Hinweise

- Bei Links prüft die Datenbank nur, dass `external_url` gesetzt ist. Die https-Prüfung liegt in der Vorlage und in der Anzeige (PR 2), nicht in der Datenbank.

## Entfernen

Eine Zuordnung entfernen: Zeile in `lesson_resource` löschen. Die Datei selbst bleibt im Bucket und in `file_asset`, bis sie dort bewusst gelöscht wird.

## Anzeige für Lernende (PR 2)

- **Platzierung:** SCORM-Lektion: Abschnitt „Materialien“ über dem Player. Live-Lektion: unter den Angaben zur Session. Repository-Lektion: die Liste ist der Hauptinhalt; ohne Materialien steht dort „Für diese Lektion sind noch keine Materialien hinterlegt.“ Bei SCORM und Live erscheint ohne Materialien kein Abschnitt.
- **Je Zeile:** Titel, Dateiname (aus dem Objektnamen), Format, Größe. Aktionen: „Vorschau“ (nur PDF und Bilder, neuer Tab) und „Download“. Office-Dateien haben nur „Download“.
- **Links:** nur `https://`-Links, mit Hinweis „externer Link“ und „Öffnen“ in einem neuen Tab. Andere Adressen werden nicht angezeigt. Nichts wird vom externen Anbieter eingebettet.
- **Signierte Links:** entstehen erst beim Klick (`/content/<lektion>/material/<material>?aktion=vorschau|download`), gelten 1 Stunde, laufen mit der Sitzung der angemeldeten Person über die Storage-Policy aus 0023. Kein Service-Role-Key.
- **„heruntergeladen“:** nur in diesem Browser-Tab (sessionStorage), nicht in der Datenbank.
- **Größe:** aus den Storage-Metadaten über `list()` je Ordner (Grenze explizit 1000 Objekte statt der Standardgrenze von 100).

## Abnahme auf Staging

Voraussetzung: Materialien an der TEST Live-Session, der SCORM-Testlektion und der TEST Repository-Lektion (Testdaten-Skripte aus der Sitzung, nur Staging). Preview-Deployment des PR öffnen (Vercel Preview nutzt Staging).

1. **vera+testlearner2** (Test-Kohorte, EFK-EE) anmelden.
   - TEST Live-Session öffnen: Abschnitt „Materialien“ unter dem Termin, sechs Zeilen in der Reihenfolge PDF, Bild, Word, PowerPoint, Excel, Link, je mit Dateiname, Format, Größe.
   - „Vorschau“ bei PDF und Bild öffnet einen neuen Tab mit der Datei. Bei Word, PowerPoint, Excel gibt es nur „Download“.
   - „Download“ lädt die Datei mit ihrem Dateinamen herunter; die Zeile zeigt danach „heruntergeladen“. Neuer Tab oder neue Sitzung: Marker ist weg.
   - „Öffnen“ beim Link öffnet https://example.com in einem neuen Tab.
   - SCORM-Testlektion: Materialien über dem Player. TEST Repository-Lektion: Liste als Hauptinhalt, darunter „Als abgeschlossen markieren“.
   - Tastatur: mit Tab durch die Aktionen, Enter löst aus, Fokus-Ring sichtbar.
2. **vera+testlearner** (Energiehelden, ebenfalls EFK-EE): sieht dieselben Materialien, weil beide im selben Programm eingeschrieben sind. Der Fall „ohne Einschreibung“ ist auf Staging mit diesen Konten nicht nachstellbar und durch den pgTAP-Test 012 aus PR 1 abgedeckt.
3. **Unveröffentlicht:** Lektion im Dashboard auf `unpublished` setzen → Seite nicht erreichbar bzw. ohne Materialien; ein vorher kopierter Link `/content/<lektion>/material/<material>` liefert 404. Danach wieder auf `published`.
4. **Ablauf nach einer Stunde:** Bei „Vorschau“ die Adresse des neuen Tabs (signierter Link) kopieren, nach mehr als einer Stunde erneut aufrufen → Supabase meldet einen abgelaufenen Link. Ein neuer Klick auf „Vorschau“ erzeugt einen neuen, gültigen Link.
5. **Ohne Anmeldung:** `/content/<lektion>/material/<material>` in einem privaten Fenster → Weiterleitung auf `/login`.
