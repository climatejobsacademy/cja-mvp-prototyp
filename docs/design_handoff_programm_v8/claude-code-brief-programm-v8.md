# Claude Code Brief: Programmseite (v8) umsetzen

## 0. Kontext

Die Programmseite gibt Lernenden den Überblick über ihr ganzes Programm (18 Monate). Sie beantwortet drei Fragen:

1. **Wo stehe ich im Programm?** – Module als Weg, aktuelles Modul markiert
2. **Wie läuft es im Modul?** – kurzes Tracking (Kompetenzen, Teilschritte, Lerntage)
3. **Mit wem lerne ich?** – Kohorte und Ansprechpersonen

Die Details zu einem Modul (Wochen → Themen → Lektionen) stehen nicht direkt auf der Seite, sondern in einem **Seitenpanel**, das man bei Bedarf öffnet. So bleibt die Seite ruhig.

Abgrenzung zu den anderen Seiten:
- **Stundenplan** = wann etwas stattfindet
- **Kompetenzen** = Lernstand im Detail (Teilschritte)
- **Programm** = Gesamtüberblick + Inhalte der Module

Visuelle Referenz: `programm-v8-referenz.html` (Template – Inhalte erscheinen als `{{…}}`, Beispieldaten im `<script>` am Dateiende; Layout, Abstände, Farben und Typografie übernehmen, nicht den Code-Stil).

Design-System identisch mit Home, Kompetenzen und Stundenplan – vorhandene Tokens und Komponenten wiederverwenden.

---

## 1. Arbeitsweise

1. **Erst analysieren, dann bauen.** Bestehende Programmseite, Komponenten und Datenstruktur (Programm, Modul, Woche, Thema/Lektion, Live-Termin, Selbstlernmodul, Kohorte, Trainer:innen, Fortschritt) ansehen und kurz zusammenfassen. Dann auf Freigabe warten.
2. **Bestehende Wochen-Ansicht wiederverwenden:** Es gibt im Tool bereits eine aufklappbare Ansicht „Woche → Thema (Segment-Leiste, x/2 Lektionen) → Live-Termin / Selbstlernmodul mit Status“. Diese Logik und Komponente bitte für das Seitenpanel nutzen, nicht neu erfinden.
3. **Branch:** Demo-Branch.
4. **Keine Datenbank-Änderungen ohne Rückfrage.** Fehlende Felder auflisten, Vorschlag machen, warten.
5. **Nicht anfassen:** Home, Kompetenzen, Stundenplan, Praxis-Workflow.
6. Entscheidungen in einfacher Sprache erklären.

---

## 2. Seitenaufbau

Weißer Hintergrund, max. Breite 1240 px, seitlich 40 px (mobil 16 px).

### 2.1 Header
Wie Home. Aktiver Navigationspunkt: **Programm**.

### 2.2 Kopfbereich
- Überzeile „Dein Programm“ (12 px, Großbuchstaben, Sperrung 0.12em, grau)
- Programmname (Anton 48 px)
- Eine Zeile grau: „Start {Datum} · 18 Monate · {n} Module“
- **Nicht** anzeigen: Fortschrittsbalken, Abschluss, Kurzbeschreibung.

### 2.3 „Dein Weg“ – Modulpfad
- Alle Module nebeneinander, verbunden durch eine Linie mit nummerierten Punkten.
  - abgeschlossen: grüner Punkt mit Häkchen, grüne Linie, Karte weiß, „Abgeschlossen“
  - aktuell: dunkler Punkt, **dunkle Karte (#23321E), weiße Schrift, Label „Hier bist du“ (Charge Green #A2E500)**
  - kommend: weißer Punkt mit grauem Rand, Karte weiß, Text grau, Zeitraum
- Karte: „Modul {n}“ (Überzeile), Modulname (15 px fett), darunter Zeitraum bzw. Status.
- Karten sind **Buttons**: Klick wählt das Modul aus (dunkler Rahmen) und zeigt darunter dessen Tracking. Beim Öffnen ist das aktuelle Modul gewählt.
- Viele Module → horizontal scrollbar.

### 2.4 Zwei Spalten unter dem Pfad
**Links (ca. 60 %) – Tracking zum gewählten Modul**, Karte mit Rahmen #EEF1EB, Radius 20 px:
- Überzeile „Modul {n} · {Zeitraum}“ + Status-Pill (Abgeschlossen grün-hell / Aktuell dunkel / Kommt noch grau)
- Modulname (Anton 28 px)
- 3 Kacheln (#F4F7F1, Radius 14 px), Zahl in Anton 30 px:
  - **Kompetenzen** (Anzahl im Modul)
  - **Teilschritte erreicht** („3 / 18“)
  - **Lerntage absolviert** („4 / 12“)
- Button **„Inhalte des Moduls →“** (dunkel) → öffnet das Seitenpanel (2.5)
- Link „Kompetenzen im Modul →“ → Kompetenzseite mit gewähltem Modul

**Bewusst nicht** auf der Seite: „Woche x von y“, Modulaufbau (Theorie-/Praxistage), Button zum Stundenplan, Kurzbeschreibung, Abschluss.

**Rechts (ca. 40 %)**
- **Deine Kohorte:** Name der Kohorte, Avatare (max. 5 + „+n“), Anzahl Lernende. Kohorten-Chat-Link nur, wenn es den Chat gibt.
- **Deine Ansprechpersonen:** je Person Avatar, Name, Rolle (z. B. „Trainer:in · Live-Unterricht“, „Lernbegleitung · Fragen zum Programm“), Button „Nachricht“.

### 2.5 Seitenpanel „Inhalte des Moduls“
- Fährt von rechts herein (Breite ca. 680 px, mobil volle Breite), Hintergrund dahinter abgedunkelt. Schließen per X, Klick daneben oder Esc.
- Kopf: „Modul {n} · {Zeitraum}“ + Status-Pill, Modulname (Anton 30 px).
- **Keine** Kurzbeschreibung, **kein** Abschluss.
- Inhalt in drei Ebenen, jeweils aufklappbar:
  1. **Woche:** Titel wie im Tool („Woche 1 – Theorie (online), 28.09.–02.10.2026“), darunter „{x}/{y} Lektionen“. Aktuelle Woche mit Label „Diese Woche“ (Charge Green), komplett erledigte Woche mit grünem Häkchen.
  2. **Thema:** Titel, Segment-Leiste (ein Strich pro Lektion, grün = erledigt, grau = offen), „{x}/{y} Lektionen“.
  3. **Lektion:** Icon-Kachel in Typfarbe (Live Lylac, Selbstlernen Eco Green, Praxis Coral), Bezeichnung („Live-Termin“, „Selbstlernmodul“, „Praxisaufgabe“), optional Zeit („Heute, 13:00“), Status-Pill rechts + Pfeil:
     - Offen: weiß, grauer Rand
     - Erledigt: grün-hell, Text grün
     - Heute: dunkel, Text weiß
- Beim Öffnen: **aktuelle Woche und aktuelles Thema aufgeklappt**, alles andere zu. Bei abgeschlossenen/kommenden Modulen: erste Woche auf.
- Klick auf eine Lektion → Lektion / Live-Raum / Praxis-Workflow.

### 2.6 Mobil
- Modulpfad horizontal scrollbar, aktuelles Modul beim Laden sichtbar.
- Tracking-Karte und Kohorte/Ansprechpersonen untereinander.
- Seitenpanel als Vollbild mit Zurück-/Schließen-Button.

---

## 3. Interaktion

- Gewähltes Modul in der URL speichern (`?modul=…`), Panel optional (`&inhalte=1`), damit man direkt verlinken kann.
- Tastatur: Modulkarten, Panel-Button, Wochen/Themen per Tab erreichbar; `aria-expanded` an aufklappbaren Elementen; Fokus beim Öffnen ins Panel, beim Schließen zurück zum Button.

---

## 4. Daten – bitte prüfen

Für jeden Punkt: **vorhanden / teilweise / fehlt** + Vorschlag bei „fehlt“ (nicht selbst anlegen).

| Benötigt | Wofür | Fallback, falls es fehlt |
|---|---|---|
| Programm: Name, Startdatum, Dauer, Module in Reihenfolge | Kopf, Pfad | Startdatum weglassen |
| Modul: Name, Zeitraum, aktuelles Modul der lernenden Person | Pfad, Status | aktuelles Modul = Modul der nächsten geplanten Lektion |
| Wochen je Modul mit Typ und Datum, Themen, Lektionen (Live / Selbstlernen / Praxis) | Seitenpanel | – (existiert laut Tool bereits) |
| Status je Lektion für die lernende Person | Segment-Leiste, Pills, „x/y Lektionen“ | alles „Offen“ |
| Anzahl Kompetenzen je Modul | Kachel | Kachel ausblenden |
| Erreichte / alle Teilschritte je Modul | Kachel | Kachel ausblenden |
| Absolvierte / alle Lerntage je Modul | Kachel | Kachel ausblenden – **Definition „Lerntag absolviert“ bitte mit Anna klären** |
| Kohorte: Name, Mitglieder | Kohorten-Karte | Karte ausblenden |
| Ansprechpersonen je Kohorte/Modul (Name, Rolle, Kontaktweg) | Ansprechpersonen | Karte ausblenden |
| Nachrichtenfunktion / Kohorten-Chat | Buttons | Buttons ausblenden |

Fortschritt nie aus „angesehen“ berechnen – nur aus erledigten Lektionen bzw. erreichten Teilschritten.

---

## 5. Akzeptanzkriterien

1. Beim Öffnen ist das aktuelle Modul gewählt und im Pfad als „Hier bist du“ markiert.
2. Klick auf ein Modul zeigt dessen Tracking; Zahlen stimmen mit Kompetenzseite und Lektionsstatus überein.
3. „Inhalte des Moduls“ öffnet das Panel mit aktueller Woche und aktuellem Thema aufgeklappt.
4. Segment-Leisten und „x/y Lektionen“ stimmen mit dem Status der Lektionen überein.
5. Seite zeigt keine Kurzbeschreibung, keinen Abschluss, kein „Woche x von y“.
6. Fehlende Daten → Element ausblenden, nie Fehler oder erfundene Werte.
7. Mobil nutzbar, Tastatur-bedienbar, Kontrast WCAG AA.

---

## 6. Reihenfolge

1. Analyse + Datenprüfung → Rückmeldung, warten.
2. Kopfbereich + Modulpfad mit Auswahl.
3. Tracking-Karte mit 3 Kacheln.
4. Kohorte + Ansprechpersonen.
5. Seitenpanel mit bestehender Wochen-Komponente.
6. URL-Parameter, Mobil, Barrierefreiheit, Feinschliff.

Nach jedem Schritt kurz zeigen, was sich geändert hat, und auf Feedback warten.
