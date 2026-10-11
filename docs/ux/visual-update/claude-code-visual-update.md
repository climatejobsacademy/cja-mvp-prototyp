# Visuelles Update: Farben, Schriften, Flächen (nur Optik)

## 0. Das Wichtigste zuerst

Das ist ein **rein visuelles Update**. Bitte **nichts** ändern an:

- Seitenstruktur und Aufteilung (Spalten, Reihenfolge, Abschnitte)
- Komponenten, Buttons, Links, Texten, Navigation
- Datenmodell, Datenbank, Abfragen, Logik, URLs
- Verhalten (Klicks, Zustände, Mobil-Umbrüche)

Geändert werden nur: **Farben, Hintergründe, Schriftgrößen/-gewichte, Rundungen, Schatten, Abstände innerhalb von Elementen.**

Die Screenshots (`ref-*.png`) zeigen die **Stimmung und die Farbregeln**, nicht das exakte Layout. Unsere echte App sieht an einigen Stellen anders aus als die Screenshots. **Das ist gewollt – das Layout der App bleibt.** Wo es ein Element in der App gibt, das in den Screenshots fehlt oder anders aussieht: Regeln aus Abschnitt 4 anwenden und selbst sinnvoll füllen. Im Zweifel: lieber ruhiger (neutral) als bunter.

Arbeitsweise:
1. Erst prüfen, wie das Styling aufgebaut ist (Tailwind-Theme, CSS-Variablen, Komponenten-Klassen) und kurz zusammenfassen. Auf Freigabe warten.
2. Farben und Werte **zentral als Design-Tokens** anlegen (eine Stelle), dann Komponenten auf Tokens umstellen. Keine Farbwerte verstreut im Code.
3. Seite für Seite umsetzen, jeweils Vorher/Nachher-Screenshot zeigen.
4. Demo-Branch.

---

## 1. Design-Tokens

### Farben
| Token | Wert | Wofür |
|---|---|---|
| `bg-page` | `#FAFAF7` | Seitenhintergrund (warmes Weiß) |
| `bg-card` | `#FFFFFF` | Karten |
| `bg-subtle` | `#F1F2EC` | ausgewählte Listeneinträge, Segment-Control-Hintergrund |
| `line` | `#ECEEE8` | Trennlinien in Karten |
| `text` | `#1F1A2E` | Haupttext, Titel |
| `text-muted` | `#5F6B5A` | Nebentext |
| `text-subtle` | `#8A9486` | Meta, Kontextzeilen, Labels |
| `brand` (Lila) | `#6E44D6` | Navigation aktiv, Primär-Buttons, lila Akzente |
| `brand-2` | `#9164E1` | zweite Verlaufsfarbe |
| `brand-tint` | `#F1EBFC` | helle Live-Flächen |
| `praxis` | `#E8692A` | Praxis-Akzent, Streifen, Icons |
| `praxis-2` | `#F59A5E` | zweite Verlaufsfarbe Praxis |
| `praxis-tint` | `#FFF1E8` | helle Praxis-Flächen |
| `self` | `#239669` | Selbstlernen: Icons |
| `self-tint` | `#E9F5EF` | Selbstlernen: Flächen, „Flexibel“-Chips |
| `lime` | `#A2E500` | „Als Nächstes“, „Aktuell“, „Hier bist du“, Buttons auf Anker-Flächen, „heute dran“-Leuchten |
| `on-lime` | `#1F2A12` | Text auf Lime |
| `progress` | `#23321E` | Fortschrittsringe, Haken („erreicht“) |
| `progress-track` | `#E7E9E2` | Hintergrund der Ringe/Balken |

### Verläufe & Schatten
- `anchor-brand`: `linear-gradient(135deg, #6E44D6 0%, #9164E1 100%)`, Schatten `0 14px 34px rgba(110,68,214,0.30)`
- `anchor-praxis`: `linear-gradient(135deg, #E8692A 0%, #F59A5E 100%)`, Schatten `0 14px 34px rgba(232,105,42,0.28)`
- `shadow-card`: `0 1px 2px rgba(40,20,90,0.04), 0 12px 32px rgba(40,20,90,0.06)` – Karten haben **keinen Rahmen**, nur diesen Schatten
- `glow-today`: `0 0 0 5px rgba(162,229,0,0.25), 0 0 20px 4px rgba(162,229,0,0.45)`

### Rundungen
- Karten: `26px` · kleinere Flächen/Listenzeilen: `18px` · Buttons, Pills, Nav-Tabs: `999px` (voll rund)

### Schrift
- **Anton**: Seitentitel (52px, line-height 1) und **große Zahlen** (z. B. „5 / 16“, „4 / 15“, Kennzahlen; 36px, Gewicht 400)
- **Work Sans** für alles andere. Karten-Titel 22–26px / 700, Abschnittstitel 18px / 700, Text 15px, Meta 13px.
- Prozentzahlen in Ringen: Work Sans 600.

---

## 2. Die Farbregeln

1. **Lila ist die Plattform-Farbe.** Aktiver Navigationspunkt (lila Pill, weiße Schrift), Primär-Buttons (lila, voll rund), Avatar, kleine Akzente („Heute dran“-Label, aktuelle Modulnummer).
2. **Ein Anker pro Seite.** Jede Seite hat genau **eine** kräftige Verlaufsfläche (`anchor-brand`, weiße Schrift, Lime-Button). Alles andere bleibt weiß/neutral.
3. **Farbe zeigt die Art der Aktivität:**
   - Live → Lila (Anker bzw. `brand-tint` + 3px Streifen `brand-2`)
   - Praxis → Coral (Anker `anchor-praxis` bzw. `praxis-tint` + 3px Streifen `praxis`)
   - Selbstlernen → Grün, **nie** als große Fläche: nur `self-tint`-Fläche mit grünem Icon
4. **Lime = jetzt/aktuell.** Pills „Als Nächstes“, „Aktuell“, „Hier bist du“ (Lime-Fläche, dunkler Text, dunkler Punkt), Buttons auf Anker-Flächen, Fortschrittsbalken auf Anker-Flächen, Leuchten bei „heute dran“.
5. **Fortschritt ist neutral.** Ringe und „erreicht“-Haken in Dunkelgrün (`progress`), Track `progress-track`. Nicht lila.

### Welcher Anker auf welcher Seite
| Seite / Zustand | Anker-Element | Farbe |
|---|---|---|
| Home, Tag mit Live-Unterricht | Karte „nächster Termin“ | `anchor-brand` |
| Home, Praxistag | Karte „nächster Termin“ | `anchor-praxis` |
| Home, freier Tag | Karte Wochenrückblick (Text-Regeln bleiben wie umgesetzt) | `anchor-brand`, Haken-Kreise Lime mit dunklem Haken |
| Stundenplan | **nur** der nächste/aktuelle Termin-Block | Farbe seines Typs (Live lila, Praxis coral), Button Lime |
| Kompetenzen | Modul-Fortschritt („x / y Kompetenzschritten“) | `anchor-brand`, Balken Lime auf weiß-transparentem Track |
| Programm | Karte des aktuellen Moduls im Pfad | `anchor-brand`, Pill „Hier bist du“ Lime |

Alle anderen Termin-Blöcke, Module, Listeneinträge: weiß bzw. helle Typ-Fläche.

---

## 3. Elemente im Detail

- **Header:** weiß, unten 1px `line`. Logo unverändert. Navigation: weißer Container mit `shadow-card`, aktiver Tab lila Pill.
- **Seitenkopf:** Kontextzeile `text-subtle` 13–14px, darunter Titel Anton 52px. Steuerung (Tabs, Segment-Control) rechts: Container `bg-subtle`, aktives Segment weiß mit leichtem Schatten.
- **Karten:** `bg-card`, Radius 26, `shadow-card`, kein Rahmen.
- **Listen in Karten:** Zeilen mit 1px `line` getrennt. Ausgewählter Eintrag: `bg-subtle`, Radius 18.
- **Kalender:** Stundenlinien `line`. Termin-Blöcke Radius 14–18, heller Typ-Hintergrund + 3px Streifen links. Nächster Termin: voller Typ-Verlauf, weiße Schrift, Lime-Button. Spalte „heute“ nicht extra rahmen.
- **Pills/Labels:** voll rund, 12px, 600.
- **Icons:** Typ-Icons immer in Typ-Farbe (Live lila, Praxis coral, Selbstlernen grün). Auf Anker-Flächen weiß in halbtransparenter weißer Kachel.
- **Kennzahlen:** Zahl in Anton 36px, Label `text-subtle` 13px, Trennung mit 1px `line`.

---

## 4. Lücken selbst füllen – Entscheidungsregeln

Für jedes Element, das hier nicht beschrieben ist, der Reihe nach fragen:

1. **Ist es der wichtigste nächste Schritt der Seite?** → Nur dann Anker (und nur ein Anker pro Seite).
2. **Gehört es zu einer Aktivität (Live / Praxis / Selbstlernen)?** → Helle Typ-Fläche oder Typ-Icon, nie volle Fläche (außer Anker).
3. **Ist es „jetzt/aktuell/neu“?** → Lime-Pill.
4. **Ist es eine Aktion?** → Hauptaktion: lila Pill-Button. Nebenaktion: Textlink `text` 600 mit „→“. Keine umrandeten Buttons, keine Unterstreichungen.
5. **Ist es Fortschritt/Status?** → Dunkelgrün (`progress`) auf `progress-track`.
6. **Alles andere** → neutral: weiß, `text`, `text-muted`, `line`.

Nie: neue Farben einführen, dunkle oder bunte Flächen ohne Regel, mehr als einen Anker pro Seite, Lila für Fortschrittsringe.

---

## 5. Akzeptanzkriterien

1. Struktur, Komponenten, Buttons, Texte, Daten und Verhalten sind **unverändert** (nur Styling-Änderungen im Diff).
2. Alle Farben/Werte kommen aus den zentralen Tokens.
3. Jede Seite hat genau einen Anker gemäß Tabelle.
4. Live/Praxis/Selbstlernen sind überall an derselben Farbe erkennbar.
5. Anton nur für Seitentitel und große Zahlen.
6. Kontrast mindestens WCAG AA (weiße Schrift auf Lila/Coral-Verlauf prüfen; falls zu schwach, Verlauf dunkler beginnen lassen).
7. Mobil sieht es genauso aus, nur gestapelt wie bisher.

Reihenfolge: Tokens → Header/Navigation → Home (alle Zustände) → Stundenplan → Kompetenzen → Programm. Nach jedem Schritt Vorher/Nachher zeigen.
