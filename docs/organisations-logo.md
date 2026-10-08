# Organisations-Logo im Header

Stand 2026-10-08, SR-76. Schema: `supabase/migrations/0025_organisation_logo.sql`, RLS-Test `supabase/tests/database/014_organisation_logo.test.sql`.

## Was gilt

- Der Header zeigt: Academy-Wortmarke | Trennstrich | Logo der Organisation der eingeloggten Person, danach den Programmnamen (nur Abstand, kein zweiter Strich).
- Ohne Logo: Header wie bisher, nur die Wortmarke, kein Strich für das Logo.
- Alt-Text ist der Name der Organisation (`organisation.name`).
- Fester Kasten: Desktop 120 × 32 px, mobil 72 × 24 px. Das Logo wird eingepasst, nicht verzerrt, und links ausgerichtet. Wird es mobil eng, kürzt sich der Programmname mit „…“.
- Welche Organisation: die aus der ältesten aktiven Einschreibung der Person (wie Programm und Kohorte im Header). Lesbar ist sie nur, wenn die Person in `org_membership` dieser Organisation steht.
- Bucket `org-logos`: **öffentlich**. Jede Person mit der URL kann das Bild abrufen. Deshalb gehören dort ausschließlich Logos hinein, nie andere Dateien.
- Erlaubt: PNG, WebP, JPEG, höchstens 500 KB (512000 Byte). Kein SVG. Der Bucket lehnt alles andere ab.
- Hochladen nur durch AfCJ admin im Dashboard. Die App kann nicht in den Bucket schreiben, und es gibt keine Admin-Oberfläche.
- Geschützt ist die Zuordnung: `organisation.logo_pfad` sehen Lernende nur für die eigene Organisation (SR-06).

## Datei vorbereiten

- Format PNG (am besten mit transparentem Hintergrund), WebP oder JPEG.
- Empfehlung: etwa 64 bis 128 px hoch, Seitenverhältnis bis etwa 4:1. Sehr breite oder sehr hohe Logos wirken im Kasten klein.
- **Dateiname = neue UUID in Kleinbuchstaben plus Endung**, keine Ordner. Im Terminal:

  ```sh
  echo "$(uuidgen | tr A-Z a-z).jpg"
  ```

  Ergebnis z. B. `3f2b8c1e-0d4a-4b6e-9c7f-1a2b3c4d5e6f.jpg`. Datei auf genau diesen Namen umbenennen (Endung passend zum Format: `.png`, `.webp`, `.jpg` oder `.jpeg`).
- Logo-Dateien nicht ins Repo legen (nicht nach `public/` oder `src/`, nicht committen).

## Ablauf

Immer zuerst auf Staging (Irland, `keijrwvegmwgpvprpoxa`), Production (Frankfurt, `vqfnmkcfjsudsujiuoqm`) erst nach Freigabe und erst, wenn 0025 dort angewendet ist.

1. **Hochladen:** Supabase-Dashboard → Storage → Bucket `org-logos` → Upload, direkt ins Wurzelverzeichnis (keinen Ordner anlegen).
   - **Die Datei vorher umbenennen.** Das Dashboard übernimmt den lokalen Dateinamen, z. B. `energiehelden-logo-rgb 1.jpg`. Mit diesem Namen lehnen Vorlage und Datenbank das Eintragen ab (so auf Staging passiert, 2026-10-08).
   - Schon mit falschem Namen hochgeladen: im Dashboard die Datei über „Rename“ auf den UUID-Namen umbenennen, oder sie löschen und richtig benannt neu hochladen.
2. **Organisations-ID heraussuchen:** Table Editor → `organisation`.
3. **SQL-Vorlage ausführen:** Inhalt von `scripts/sql/organisation_logo_setzen.sql` in den SQL Editor kopieren, im Block „EINGABEN“ Organisations-ID und Objektnamen eintragen, ausführen.
   - Der erste Lauf ist ein **Probelauf**: Er endet absichtlich mit „PROBELAUF ok, nichts gespeichert …“ und zeigt Organisation, bisheriges und neues Logo, Format und Größe.
   - Passt alles: `p_probelauf := false` setzen und noch einmal ausführen.
   - Alternativ per psql: `psql "<Verbindung>" -v ON_ERROR_STOP=1 -f scripts/sql/organisation_logo_setzen.sql` mit einer lokal angepassten Kopie (Werte nicht committen).
4. **Prüfen:** als Person dieser Organisation einloggen; das Logo steht hinter dem Trennstrich. Ein neues Logo erscheint nach dem nächsten Seitenaufruf.

Die Vorlage prüft vorher, dass die Organisation existiert, der Name dem UUID-Muster folgt und die Datei wirklich im Bucket liegt. Zusätzlich lehnt die Datenbank jeden `logo_pfad` außerhalb des Musters ab.

## Ersetzen und Entfernen

- **Ersetzen:** neue Datei mit **neuer** UUID hochladen, Vorlage mit dem neuen Namen ausführen, danach die alte Datei im Bucket löschen. Eine neue UUID statt Überschreiben verhindert, dass Browser das alte Bild aus dem Cache zeigen.
- **Entfernen:** Vorlage mit `p_pfad := null` ausführen, danach die Datei im Bucket löschen. Der Header zeigt dann wieder nur die Wortmarke.
