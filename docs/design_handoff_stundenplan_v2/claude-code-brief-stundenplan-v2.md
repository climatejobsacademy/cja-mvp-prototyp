# Claude Code Brief: Stundenplan (v2) umsetzen

## 0. Kontext

Nach Home und Kompetenzen bauen wir den Stundenplan neu, nach dem Prinzip von Google Kalender. Die Seite beantwortet für Lernende drei Fragen:

1. **Was steht wann an?** – Termine auf einer Zeitachse, Dauer auf einen Blick
2. **Was mache ich flexibel?** – Selbstlern-Einheiten ohne feste Uhrzeit
3. **Wo stehe ich in der Woche?** – Tagestyp (Theorie / Praxis / Lernen), Erledigtes, jetzt

Visuelle Referenzen (Templates – Inhalte erscheinen als `{{…}}`, die Beispieldaten stehen im `<script>` am Dateiende; Layout, Abstände, Farben und Typografie übernehmen, nicht den Code-Stil):

- `stundenplan-v2-woche-referenz.html` – Wochenansicht (Desktop, Standard)
- `stundenplan-v2-tag-referenz.html` – Tagesansicht (Desktop)
- `stundenplan-v2-mobil-referenz.html` – Tagesansicht (Mobil, Standard auf dem Handy)

Design-System (Farben, Schriften, Header, Aktivitäts-Icons, Glow) ist identisch mit Home und Kompetenzen – bitte die vorhandenen Tokens und Komponenten wiederverwenden.

---

## 1. Arbeitsweise

1. **Erst analysieren, dann bauen.** Bestehende Stundenplan-Seite, Komponenten und Datenstruktur (Lektion, Live-Termin, Field Job / Praxistag, Selbstlern-Einheit, Fortschritt der Lernenden, Modul/Woche) ansehen und kurz zusammenfassen, was vorhanden ist. Dann auf Freigabe warten.
2. **Wiederverwenden:** Header, Navigation, Aktivitäts-Icons und -Farben, CTA-Button, Glow-Ring von Home.
3. **Branch:** Demo-Branch.
4. **Keine Datenbank-Änderungen ohne Rückfrage.** Fehlende Felder/Relationen auflisten, Vorschlag machen, warten.
5. **Nicht anfassen:** Home, Kompetenzen, Programmseite, Praxis-Workflow.
6. **Keine Kalender-Bibliothek ohne Rückfrage.** Das Raster ist einfach genug für eine eigene Komponente (CSS Grid + absolut positionierte Blöcke). Falls du eine Bibliothek für sinnvoll hältst: Vorschlag mit Begründung, warten.
7. Entscheidungen in einfacher Sprache erklären.

---

## 2. Seitenaufbau

Weißer Hintergrund, max. Breite 1240 px, seitlich 40 px (mobil 16 px).

### 2.1 Header
Wie Home. Aktiver Navigationspunkt: **Stundenplan**.

### 2.2 Kopfbereich
- Überzeile: Programmname · Modul (12 px, Großbuchstaben, Sperrung 0.12em, grau), darunter „Stundenplan“ (Anton 48 px).

### 2.3 Steuerleiste (wie Google Kalender)
Von links nach rechts:
- Button **„Heute“** – springt zur aktuellen Woche bzw. zum heutigen Tag
- Pfeile **‹ ›** – vorherige/nächste Woche (bzw. Tag in der Tagesansicht)
- Zeitraum fett (20 px), z. B. „5. – 9. Oktober 2026“, daneben grau „· Woche 2 von Modul 2“
- rechts: Legende (Live / Selbstlernen / Praxis mit Icons) und Segmented Control **Tag | Woche | Monat**
  - **Monat ist in dieser Runde nicht gestaltet** → Button ausblenden oder deaktiviert anzeigen, nicht selbst entwerfen.

### 2.4 Wochenansicht (Desktop-Standard)
Eine Karte (Rahmen #EEF1EB, Radius 20 px) mit drei Zeilen über 5 Spalten (Mo–Fr) plus 64 px Zeitspalte links:

1. **Tageskopf:** große Datumszahl (Anton 22 px) in 44 px Kreis + Kurzname (MO, DI …). Heute: Kreis dunkel (#23321E), Zahl weiß, Spalte leicht getönt (#F7FAF3). Darunter Tagestyp-Pill: Theorietag (Lylac-hell), Praxistag (Coral-hell), Lerntag (Grün-hell).
2. **Zeile „Flexibel“** (wie „ganztägig“ bei Google): Selbstlern-Einheiten des Tages als grüne Chips (Icon + Titel, gekürzt mit „…“). Erledigt: Häkchen + 55 % Deckkraft.
3. **Zeitraster** 07:00–17:00, 52 px pro Stunde, feine Stundenlinien, Stundenlabels links.
   - Termine als Blöcke: Position = Startzeit, Höhe = Dauer. Hintergrund hell in Typfarbe, links 4 px Streifen in Typfarbe (Live #9164E1, Praxis #FFA573).
   - Inhalt: Icon + Uhrzeit, Titel (13 px fett). Erledigt: Häkchen + 55 % Deckkraft.
   - Nächster/aktueller Termin: 2 px dunkler Rahmen + Button „Zum Live-Unterricht →“ (bzw. „Zur Praxisaufgabe →“).
   - **Jetzt-Linie:** 2 px dunkle Linie mit Punkt in der heutigen Spalte, auf aktueller Uhrzeit, aktualisiert sich jede Minute.
   - Zeitbereich dynamisch erweitern, wenn ein Termin außerhalb 07–17 Uhr liegt.
   - Überlappende Termine nebeneinander (Breite teilen), wie Google.

### 2.5 Tagesansicht (Desktop)
- Steuerleiste zeigt „Freitag, 9. Oktober 2026“ + Tagestyp-Pill; Pfeile wechseln den Tag.
- Links (300 px): „Woche 2 · 5. – 9. Oktober“ + **Wochenstreifen** mit 5 Tagen (Kurzname, Datumszahl, farbiger Punkt = Tagestyp). Klick wechselt den Tag; heute dunkel umrandet.
- Rechts: Karte mit Zeile „Flexibel“ und Zeitraster für einen Tag. Termine zeigen zusätzlich **Untertitel** und **„Stärkt {Kompetenz}“** mit leuchtendem Mini-Ring (gleicher Glow wie Home); Klick darauf → Kompetenzseite mit `?kompetenz=…`.

### 2.6 Mobil (< 768 px)
- **Standard = Tagesansicht** (die Woche mit 5 Spalten ist auf dem Handy nicht lesbar).
- Aufbau: kompakter Header, „Stundenplan“ (Anton 34 px) + „Heute“, Wochennavigation ‹ Woche 2 · 5. – 9. Okt. ›, Wochenstreifen, Tagesname + Typ-Pill, Karte mit „Flex“-Zeile und Zeitraster (40 px pro Stunde, 48 px Zeitspalte).
- Wischen links/rechts auf dem Raster wechselt den Tag (nice to have).
- **Untere Navigationsleiste** (Home / Stundenplan / Kompetenzen / Programm) ist in der Referenz zu sehen, **aber noch nicht freigegeben** – betrifft alle Seiten. Bis zur Freigabe die bestehende mobile Navigation beibehalten.

---

## 3. Interaktion

- Ansicht und Datum in der URL speichern, z. B. `?ansicht=woche&datum=2026-10-05`, damit Home („Woche ansehen →“) direkt verlinken kann.
- Desktop öffnet mit Woche, Mobil mit Tag – jeweils auf heute.
- Klick auf einen Termin → Lektion bzw. Live-Raum bzw. Praxis-Workflow. Klick auf einen Flex-Chip → Selbstlern-Einheit.
- Tastatur: Pfeile, „Heute“, Tag/Woche-Umschalter und alle Termine per Tab erreichbar; `aria-pressed` für die aktive Ansicht; Termine mit vollständigem `aria-label` (Typ, Uhrzeit, Titel, Status).

---

## 4. Daten – bitte prüfen

Für jeden Punkt: **vorhanden / teilweise / fehlt** + Vorschlag bei „fehlt“ (nicht selbst anlegen).

| Benötigt | Wofür | Fallback, falls es fehlt |
|---|---|---|
| Startzeit **und Endzeit** von Live-Terminen und Praxistagen | Position und Höhe der Blöcke | Standarddauer anzeigen (z. B. 3 h) und im Code markieren – nicht als echt ausgeben |
| Tagestyp je Tag (Theorie / Praxis / Lernen) | Pill, Punkt im Wochenstreifen | aus den Terminen ableiten (Praxis-Termin → Praxistag, Live → Theorietag, sonst Lerntag) |
| Zuordnung Selbstlern-Einheit → Tag (oder Frist) | Zeile „Flexibel“ | Einheiten der Woche am Tag der zugehörigen Live-Lektion zeigen; sonst Montag |
| Status je Termin/Einheit für die lernende Person (erledigt / offen) | Häkchen, Deckkraft | alles „offen“, nichts erfinden |
| Modul und Woche im Modul | Überzeile, „Woche 2 von Modul 2“ | nur Modulname |
| Untertitel der Lektion | Tagesansicht | weglassen |
| Zuordnung Lektion/Field Job → Kompetenz | „Stärkt …“ in der Tagesansicht | weglassen |
| Zeitzone | Jetzt-Linie, Positionen | Europe/Berlin |

**Offene Fragen an Anna, bitte in der Analyse aufgreifen:** Wie werden Selbstlern-Einheiten einem Tag zugeordnet (Vorschlag, Frist, gar nicht)? Wer setzt die Endzeit von Live-Terminen?

---

## 5. Akzeptanzkriterien

1. Desktop öffnet die aktuelle Woche, Mobil den heutigen Tag.
2. Blöcke stehen zur richtigen Uhrzeit, Höhe entspricht der Dauer; Überlappungen sind lesbar.
3. Jetzt-Linie steht auf der aktuellen Uhrzeit und nur am heutigen Tag.
4. Nächster Termin ist hervorgehoben und mit einem Klick erreichbar – identisch zum CTA auf Home.
5. Selbstlern-Einheiten erscheinen nur in „Flexibel“, nie mit erfundener Uhrzeit.
6. Farben und Icons der Aktivitätstypen identisch mit Home und Kompetenzen.
7. Fehlende Daten führen nie zu Fehlern oder erfundenen Werten.
8. Mobil nutzbar, Tastatur-bedienbar, Kontrast WCAG AA.

---

## 6. Reihenfolge

1. Analyse + Datenprüfung → Rückmeldung, warten.
2. Kopfbereich + Steuerleiste (Heute, ‹ ›, Zeitraum, Tag/Woche).
3. Wochenansicht: Tageskopf mit Typ-Pill + Zeitraster mit Blöcken.
4. Zeile „Flexibel“ + Status (erledigt/offen).
5. Hervorhebung nächster Termin + Jetzt-Linie.
6. Tagesansicht Desktop mit Wochenstreifen + „Stärkt …“.
7. Mobil-Tagesansicht.
8. URL-Parameter, Verlinkung von Home, Barrierefreiheit, Feinschliff.

Nach jedem Schritt kurz zeigen, was sich geändert hat, und auf Feedback warten.
