# Claude Code Brief: Kompetenzseite (v1) umsetzen

## 0. Kontext

Nach Home bauen wir die Kompetenzseite neu. Sie beantwortet für Lernende drei Fragen:

1. **Wo stehe ich?** – Programm, Modul, Fortschritt im Modul
2. **Was habe ich schon?** – Kompetenzen des Moduls mit ihrem Fortschritt
3. **Wie komme ich weiter?** – Teilschritte einer Kompetenz und die Lernaktivitäten, die darauf einzahlen

Das ist unsere zentrale USP: **Lernaktivität → Teilschritt → Kompetenz**. Die Seite soll diese Verbindung sichtbar machen.

Visuelle Referenz: `kompetenzen-v1-referenz.html`. Achtung: Die Datei ist ein Template – Inhalte erscheinen als `{{…}}`, die Beispieldaten stehen im `<script>` am Dateiende. Übernimm Layout, Abstände, Farben und Typografie, nicht den Code-Stil.

Design-System (Farben, Schriften, Header, Ringe, Glow) ist identisch mit der neuen Home-Seite – bitte die dort angelegten Tokens und Komponenten wiederverwenden.

---

## 1. Arbeitsweise

1. **Erst analysieren, dann bauen.** Bestehende Kompetenzseite, Komponenten und Datenstruktur (Kompetenz, Teilschritt, Modul, Lektion, Field Job, Fortschritt der Lernenden) ansehen und kurz zusammenfassen, was vorhanden ist. Dann auf Freigabe warten.
2. **Wiederverwenden:** Header, Navigation, Fortschrittsring, Glow, Aktivitäts-Icons von Home.
3. **Branch:** Demo-Branch.
4. **Keine Datenbank-Änderungen ohne Rückfrage.** Fehlende Felder/Relationen auflisten, Vorschlag machen, warten.
5. **Nicht anfassen:** Home, Stundenplan, Programmseite, Praxis-Workflow.
6. Entscheidungen in einfacher Sprache erklären.

---

## 2. Seitenaufbau

Weißer Hintergrund, max. Breite 1200 px, seitlich 40 px (mobil 16 px).

### 2.1 Header
Wie Home. Aktiver Navigationspunkt: **Kompetenzen**.

### 2.2 Kopfbereich
- Links: Überzeile Programmname (12 px, Großbuchstaben, Sperrung 0.12em, grau), darunter „Deine Kompetenzen“ (Anton 48 px).
- Rechts: **Modul-Tabs** als Segmented Control (gleicher Stil wie die Hauptnavigation):
  - abgeschlossene Module mit kleinem grünem Häkchen
  - aktuelles Modul aktiv, Label „Modul {n} · aktuell“
  - zukünftige Module grau, aber anklickbar (Vorschau)
  - bei vielen Modulen horizontal scrollbar
- Standard beim Öffnen: aktuelles Modul.

### 2.3 Modul-Fortschritt
Eine ruhige Zeile auf hellgrauer Fläche (#F6F6F4, Radius 14 px): schmaler Fortschrittsbalken + Text „{erreicht} von {gesamt} Teilschritten in Modul {n} erreicht“.

### 2.4 Zwei Spalten: Liste links, Details rechts
**Links – Kompetenzliste (ca. 40 %)**
- Jede Kompetenz des Moduls als Zeile (Button): Ring 56 px mit Prozent, Name, „{x} von {y} Teilschritten“, Pfeil rechts.
- Ausgewählte Zeile: dünner dunkler Rahmen (Eco Deep Green), Name fett.
- Kompetenzen, die heute durch eine Aktivität gestärkt werden: Ring mit **Charge-Green-Glow** (wie Home).
- Reihenfolge: zuerst „heute dran“, dann nach Fortschritt bzw. Curriculum-Reihenfolge.
- Kompetenzen, auf die mehrere Module einzahlen, erscheinen in jedem dieser Module.

**Rechts – Detailbereich (ca. 60 %)**, Rahmen #EEF1EB, Radius 20 px, Innenabstand 32 px:
- Kopf: großer Ring 112 px (Prozent in Anton), ggf. Label „Heute dran“, Name (26 px, fett), „{x} von {y} Teilschritten“.
- **Teilschritte**: Liste, je Zeile Statussymbol + Text + Status rechts:
  - erreicht: grüner gefüllter Kreis mit Häkchen, Text „erreicht“
  - heute dran / in Arbeit: Ring mit Charge-Green-Glow, Text „heute dran“
  - offen: leerer grauer Kreis, kein Text
- **„Hier lernst du das“**: Liste der Lernaktivitäten, die auf diese Kompetenz einzahlen – Icon nach Typ (Live = Lylac, Selbstlernen = Eco Green, Praxis = Coral), Titel, Meta-Zeile (z. B. „Live-Unterricht · heute, 13:00“, „Selbstlernen · offen“, „Praxis · Montag“). Klick öffnet die Lektion bzw. den Praxis-Workflow.

Mobil: Liste oben; Tippen auf eine Kompetenz öffnet die Details als eigene Ansicht (mit Zurück-Link) statt daneben.

---

## 3. Interaktion

- Klick auf eine Kompetenz in der Liste → Detailbereich zeigt diese Kompetenz. Auswahl in der URL speichern (z. B. `?kompetenz=…`), damit Home („Stärkt …“, Ringe) direkt auf eine Kompetenz verlinken kann.
- Modul-Tab wechseln → Liste und Details zeigen das gewählte Modul; erste Kompetenz ausgewählt.
- Tastatur: Liste mit Tab erreichbar, Enter wählt aus, `aria-pressed` für die Auswahl.

---

## 4. Daten – bitte prüfen

Für jeden Punkt: **vorhanden / teilweise / fehlt** + Vorschlag bei „fehlt“ (nicht selbst anlegen).

| Benötigt | Wofür | Fallback, falls es fehlt |
|---|---|---|
| Module des Programms in Reihenfolge, aktuelles Modul der lernenden Person | Tabs, Startansicht | Modul der nächsten geplanten Lektion |
| Zuordnung Kompetenz ↔ Modul (inkl. modulübergreifender Kompetenzen) | Liste pro Modul | – |
| Teilschritte je Kompetenz, mit Reihenfolge | Detailbereich, Zähler | – |
| Status je Teilschritt für die lernende Person (erreicht / offen) | Ringe, Häkchen, Fortschritt | alles „offen“ anzeigen, nichts erfinden |
| Zuordnung Lektion/Field Job → Teilschritt (oder → Kompetenz) | „Hier lernst du das“, „heute dran“ | Bereich „Hier lernst du das“ ausblenden |
| Datum/Status der Lektionen und Field Jobs | Meta-Zeile, „heute dran“ | nur Titel ohne Datum |

Wichtig: Fortschritt ausschließlich aus **erreichten Teilschritten** berechnen – nie aus „Lektion angesehen“. Wer einen Teilschritt als erreicht markiert (Trainer, Praxisaufgabe, Test), bitte dokumentieren, aber nicht ändern.

---

## 5. Akzeptanzkriterien

1. Beim Öffnen ist das aktuelle Modul gewählt und die erste („heute dran“) Kompetenz im Detail sichtbar.
2. Ringe und Zähler stimmen mit den erreichten Teilschritten überein.
3. Heute gestärkte Kompetenzen leuchten – identisch zu Home.
4. Jede Aktivität in „Hier lernst du das“ führt mit einem Klick zur Lektion bzw. zum Praxis-Workflow.
5. Link von Home („Stärkt …“, Kompetenzringe) öffnet die Seite mit der richtigen Kompetenz ausgewählt.
6. Fehlende Daten führen nie zu Fehlern oder erfundenen Werten.
7. Mobil nutzbar, Tastatur-bedienbar, Kontrast WCAG AA.

---

## 6. Reihenfolge

1. Analyse + Datenprüfung → Rückmeldung, warten.
2. Kopfbereich + Modul-Tabs + Modul-Fortschritt.
3. Kompetenzliste mit Ringen (ohne Glow).
4. Detailbereich mit Teilschritten.
5. „Hier lernst du das“ – sobald die Zuordnung Lektion → Teilschritt/Kompetenz geklärt ist.
6. Glow „heute dran“, Verlinkung von Home, URL-Parameter.
7. Mobil-Ansicht, Barrierefreiheit, Feinschliff.

Nach jedem Schritt kurz zeigen, was sich geändert hat, und auf Feedback warten.
