# Lernmaterialien hochladen und an Lektionen hängen

Stand 2026-10-07, SR folgt (Notion führt die Anforderung als SR-68, im Repo ist SR-68 anders belegt). Schema: `supabase/migrations/0023_lesson_resources_bucket.sql`. Die Anzeige für Lernende folgt in einem eigenen PR.

## Was gilt

- Bucket `lesson-resources`, privat, höchstens 50 MB (52428800 Byte) je Datei.
- Erlaubte Formate: PDF, PNG, JPEG, WebP, DOCX, PPTX, XLSX. Nicht erlaubt: SVG, ZIP, .doc, .xls, Videos. Videos werden nur als Link angehängt.
- Materialien gehen an jede Lektion (Repository, Live, SCORM).
- Lernende sehen sie nur, wenn die Lektion veröffentlicht ist und sie in das Programm der Lektion eingeschrieben sind (Status aktiv oder abgeschlossen). Anonyme sehen nichts, Lernende laden nichts hoch.
- Hochladen nur durch AfCJ.

## Namenskonvention für Dateien im Bucket

Nur Kleinbuchstaben a–z, Ziffern und Bindestriche, Ordner mit `/`, eine Endung. Keine Umlaute, kein ß, keine Leerzeichen.

| Statt | So |
|---|---|
| `Datenblatt Wechselrichter Ä1.pdf` | `datenblatt-wechselrichter-a1.pdf` |
| `Modul 2/Übung Löten.pptx` | `modul-2/uebung-loeten.pptx` |

Der lesbare Name mit Umlauten und Leerzeichen kommt in den **Titel**. Den Dateinamen für Lernende leitet die App aus dem Objektnamen ab.

## Ablauf

Immer zuerst auf Staging (Irland, `keijrwvegmwgpvprpoxa`), Production (Frankfurt, `vqfnmkcfjsudsujiuoqm`) erst nach Freigabe.

1. **Datei umbenennen** nach der Konvention oben.
2. **Hochladen**: Supabase-Dashboard → Storage → Bucket `lesson-resources` → ggf. Ordner öffnen → Upload. Zu große oder nicht erlaubte Dateien lehnt der Bucket ab.
3. **Objektnamen kopieren**: der Pfad im Bucket ohne Bucket-Namen, z. B. `modul-2/uebung-loeten.pptx`.
4. **Lektions-ID heraussuchen**: Table Editor → `lesson`.
5. **SQL-Vorlage ausführen**: Inhalt von `scripts/sql/lernmaterial_anlegen.sql` in den SQL Editor kopieren, im Block „EINGABEN“ Lektions-ID, Titel und Pfad eintragen (für einen Video-Link stattdessen `p_link` setzen und `p_pfad := null`), ausführen.
   - Der erste Lauf ist ein **Probelauf**: Er endet absichtlich mit der Meldung „PROBELAUF ok, nichts gespeichert …“ und zeigt Lektion, Titel, Position, Format und Größe.
   - Passt alles: `p_probelauf := false` setzen und noch einmal ausführen.
6. **Prüfen**: Table Editor → `lesson_resource`, neue Zeile mit Titel und Position.

Die Vorlage prüft vorher, dass die Lektion existiert, ein Titel gesetzt ist, der Objektname der Konvention folgt und die Datei wirklich im Bucket liegt. Dateiname und Format übernimmt sie aus dem Bucket. Hängt dieselbe Datei schon an einer anderen Lektion, verwendet sie den vorhandenen `file_asset`-Eintrag wieder.

## Entfernen

Eine Zuordnung entfernen: Zeile in `lesson_resource` löschen. Die Datei selbst bleibt im Bucket und in `file_asset`, bis sie dort bewusst gelöscht wird.
