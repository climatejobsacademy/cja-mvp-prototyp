# Claude Code Brief: Learner Home (v6) umsetzen

## 0. Kontext in einem Satz

Wir bauen die Startseite (Home) der Lernplattform der Academy for Climate Jobs neu. Sie soll Lernenden sofort zeigen: **Was steht heute an, was ist mein nächster Schritt, und an welchen Kompetenzen arbeite ich gerade.** Das Design ist entschieden (Version „v6“). Deine Aufgabe ist die Umsetzung im bestehenden Prototyp.

Als visuelle Referenz liegen zwei HTML-Dateien bei:

- `home-v6-referenz.html` – Startseite, Zustand „Morgens, Live-Unterricht um 13:00“
- `home-v6-zustaende-referenz.html` – der Tagesbereich in vier weiteren Zuständen

Die Dateien sind statische Mockups (Inline-Styles, Platzhalterdaten). Übernimm Layout, Abstände, Farben und Typografie, **nicht** den Code-Stil.

---

## 1. Arbeitsweise – bitte zuerst lesen

1. **Erst analysieren, dann bauen.** Lies vor jeder Änderung die bestehende Home-Seite, die vorhandenen UI-Komponenten, das Theme/Styling und die Supabase-Datenstruktur. Fasse kurz zusammen, was du gefunden hast und was du wiederverwenden willst, bevor du Code schreibst.
2. **Wiederverwenden statt neu bauen.** Bestehende Komponenten (Header, Navigation, Buttons, Icons, Datenabfragen) übernehmen und anpassen. Keine neue UI-Bibliothek einführen.
3. **Branch:** Arbeite im **Demo-Branch** (nicht in `dev`), es sei denn, wir sagen etwas anderes.
4. **Keine Datenbank-Änderungen ohne Rückfrage.** Wenn eine Tabelle, Spalte, Relation oder RLS-Policy fehlt: aufschreiben, Vorschlag machen, auf Freigabe warten. Für die Demo lieber mit einer klar markierten Fallback-Logik arbeiten (siehe Abschnitt 6).
5. **Nicht anfassen:** Praxis-Workflow, Kompetenzseite, Stundenplanseite, Lektionsansicht. Home verlinkt nur dorthin.
6. Erkläre Entscheidungen in **einfacher Sprache** – das Team ist nicht durchgehend technisch.

---

## 2. Seitenaufbau und Hierarchie

Weißer Hintergrund. Inhaltsbreite max. **1120 px**, zentriert, seitlich 40 px Innenabstand (mobil 16 px). Vertikale Abstände zwischen den Hauptbereichen ca. **52 px**.

Von oben nach unten:

### 2.1 Header (bestehend, angepasst)
- Links: Logo (Anton, 4-zeilig „The Academy for Climate Jobs“), dünner Trennstrich, Programmname klein in Grau („Elektrofachkraft Erneuerbare Energien“).
- Mitte/rechts: Navigation **Home · Stundenplan · Kompetenzen · Programm**. Aktiver Punkt: Hintergrund Eco Deep Green, Text weiß, Radius 10 px.
- Ganz rechts: Glocke (Benachrichtigungen) mit kleinem Coral-Punkt bei ungelesenen Nachrichten, Profil-Avatar (Initiale).

### 2.2 Begrüßung
- „Hallo {Vorname}“ – Anton, 60 px.
- Darunter eine Zeile: Datum („Freitag, 9. Oktober“) + kleines Label für den Tagestyp:
  - **Theorietag** (Lylac-Label, Kamera-Icon) – wenn heute Live-Unterricht stattfindet
  - **Praxistag** (Coral-Label, Werkzeug-Icon) – wenn heute eine Praxisaufgabe/Field Job geplant ist
  - kein Label, wenn heute nichts geplant ist

### 2.3 „Dein Tag“ (wichtigster Bereich)
- Kleine Überschrift „Dein Tag“ links, Link „Woche ansehen →“ rechts (führt zum Stundenplan).
- Zwei Karten nebeneinander (Verhältnis ca. 2 : 1, mobil untereinander):

**Fokus-Karte (links, groß)** – Hintergrund Eco Deep Green, Text weiß, Radius 20 px.
- Links: Label „Als Nächstes“ (Charge Green, 14 px) und die Uhrzeit sehr groß (Anton, 96 px).
- Rechts: Aktivitätstyp mit Icon (z. B. „Live-Unterricht“ in hellem Lylac), Titel der Lektion (28 px, semibold), Zeile „Stärkt: {Kompetenz A} · {Kompetenz B}“ (14 px, gedämpft).
- Aktionen: Primärbutton in Charge Green mit dunkler Schrift (z. B. „Zum Live-Unterricht →“) + quadratischer „⋯“-Button, der ein kleines Menü mit **Unterlagen** und **Chat** öffnet.

**Zweite Karte (rechts, ruhig)** – Hintergrund #F4F7F1, kein Rahmen.
- „Danach · flexibel“, Icon + „Selbstlernen · Wissen festigen“, Titel der Selbstlernlektion, schmaler Fortschrittsbalken mit „30 % erledigt“, Link „Weiterlernen →“. Ganze Karte klickbar.

### 2.4 Kompetenzen des aktuellen Moduls
- Kleine Zeile: „Modul {Nr} · {Modulname}“, darunter Überschrift „Diese Kompetenzen baust du auf“ (Anton, 32 px). Rechts Link „Alle Kompetenzen →“.
- Raster mit allen Kompetenzen des aktuellen Moduls (im Beispiel 4), je: **Fortschrittsring** (80 px, Eco Green auf hellgrauer Spur, Prozentzahl in der Mitte) + Kompetenzname.
- **Kompetenzen, die durch die heutigen Aktivitäten gestärkt werden, „leuchten“:** weicher Charge-Green-Glow um den Ring. Kein Text, kein Label, keine Legende. Für Screenreader: `aria-label` mit „… heute dran“.
- Keine Teilschritte auf Home. Klick führt auf die Kompetenzseite.
- Mehr als 6 Kompetenzen im Modul: die ersten 6 zeigen (heute relevante zuerst), Rest über „Alle Kompetenzen“.

---

## 3. Zustände des Tagesbereichs

Gleiche Struktur, nur Inhalt der beiden Karten wechselt. Logik in einer eigenen, gut testbaren Funktion (z. B. `getDayState(now, activities)`), nicht im Template verstreut.

| Zustand | Wann | Fokus-Karte | Zweite Karte |
|---|---|---|---|
| **A – Als Nächstes** | Live-Session oder Praxisaufgabe heute, Start liegt in der Zukunft | „Als Nächstes“ + Uhrzeit, Titel, Button „Zum Live-Unterricht“ / „Praxisaufgabe öffnen“ | „Danach · flexibel“ (Selbstlernen) |
| **B – Läuft gerade** | Zwischen Start und Ende der Live-Session | Pulsierender Lylac-Punkt „Läuft gerade“, groß „Jetzt“, „Live-Unterricht · seit 13:00“, Button „Jetzt beitreten“ | Selbstlernen ausgegraut, Hinweis „Nach dem Unterricht“ |
| **C – Nach dem Unterricht** | Live-Session vorbei, Selbstlernen offen | Selbstlern-Lektion wird Fokus: Icon, Titel, Fortschritt, Button „Weiterlernen“ | „Erledigt“: abgeschlossene Live-Session + Link „Unterlagen ansehen“ |
| **D – Alles erledigt** | Alle heutigen Aktivitäten erledigt | „Für heute · Alles erledigt“ (Anton) + Vorschau auf den nächsten geplanten Tag, z. B. „Montag: Praxistag ab 07:30“; die heute gestärkten Kompetenzringe mit Glow | „Heute erledigt“: Liste mit Häkchen + „Woche ansehen“ |
| **E – Praxistag** | Heute ist eine Praxisaufgabe/Field Job geplant | Uhrzeit, Praxis-Icon in Coral, „Praxisaufgabe · {Betrieb}“, Titel, Button **„Praxisaufgabe öffnen“** → öffnet den bestehenden Praxis-Workflow | Optional: „Noch offen von {Wochentag}“ – unerledigte Selbstlernlektion vom Vortag |
| **F – Nichts geplant** | Heute keine datierten Aktivitäten | Ruhige Karte: nächster geplanter Termin + ggf. „Weiterlernen“ | entfällt oder zuletzt bearbeitete Selbstlernlektion |

Wichtige Regel: **Solange eine Live-Session bevorsteht (Zustand A) oder läuft (B), wird nie eine alte Selbstlernlektion als Hauptaktion angeboten.**

Für die Demo muss Zustand **E (Praxistag)** zuverlässig funktionieren – er ist unser Einstieg in den Praxis-Workflow.

---

## 4. Aktivitätstypen – konsistent auf der ganzen Plattform

| Typ | Icon | Farbe |
|---|---|---|
| Live-Unterricht | Videokamera | Lylac `#9164E1` (auf dunkel: `#B79BF0`) |
| Selbstlernen | Aufgeschlagenes Buch | Eco Green `#239669` (auf dunkel: `#9FDCC0`) |
| Praxisaufgabe | Schraubenschlüssel | Coral `#FFA573` (Text dunkler: `#A9541C`) |

Unterschiede nie nur über Farbe – immer Icon + Text.

---

## 5. Design-Tokens

**Farben (Brand-Palette)**
- Eco Deep Green `#23321E` – Text, Fokus-Karte, aktive Navigation
- Eco Green `#239669` – Fortschritt, Selbstlernen
- Charge Green `#A2E500` – Primärbutton, „Als Nächstes“, Glow
- Lylac `#9164E1` – Live-Unterricht
- Coral `#FFA573` – Praxis, Benachrichtigungspunkt
- Hilfsfarben: Text gedämpft `#6A7566` / `#5B6857`, helle Fläche `#F4F7F1`, Linien `#EEF1EB`, Ring-Spur `#EDF1EA`

**Typografie**
- Anton (Google Fonts) – nur für „Hallo {Name}“ (60 px), große Uhrzeit (96 px), Bereichsüberschrift Kompetenzen (32 px), „Alles erledigt“
- Work Sans 400/500/600/700 – alles andere (Titel 28 / 19 px, Fließtext 15–17 px, Labels 13–14 px)

**Formen**
- Karten-Radius 20 px, Buttons 12 px, Labels/Pills 999 px
- Buttons min. 52 px hoch (Touch)
- Glow: `box-shadow: 0 0 0 6px rgba(162,229,0,0.22), 0 0 28px 6px rgba(162,229,0,0.45)`

Bitte als zentrale Tokens/Theme-Variablen anlegen (oder in die bestehenden einhängen), nicht hart in Komponenten.

---

## 6. Daten: was gebraucht wird – bitte prüfen

Für jeden Punkt bitte zurückmelden: **vorhanden / teilweise / fehlt** – und bei „fehlt“ einen Vorschlag machen, ohne ihn umzusetzen.

| Benötigt | Wofür | Demo-Fallback, falls es fehlt |
|---|---|---|
| Aktuelles Programm, Kohorte und **aktuelles Modul** der lernenden Person | Modulzeile, Kompetenzauswahl | Modul aus der nächsten geplanten Lektion ableiten |
| Datierte Aktivitäten von heute: Live-Lektionen und Praxisaufgaben/Field Jobs mit **Startzeit** | Tagesbereich, Tagestyp-Label | – (muss vorhanden sein) |
| **Endzeit oder Dauer** der Live-Session | Wechsel A → B → C | Feste Annahme 90 Minuten, im Code als TODO markiert |
| Zuordnung asynchroner Inhalte zum Tag | „Danach · flexibel“ | Die Logik nutzen, mit der der jetzige Screen „flexibel“ schon anzeigt – bitte herausfinden und dokumentieren, wie das aktuell funktioniert |
| Bearbeitungsstand einer Selbstlernlektion (offen / angefangen / erledigt, ggf. %) | Fortschrittsbalken, Zustände C/D, „Noch offen von gestern“ | Nur „offen/erledigt“ anzeigen, keinen Prozentwert |
| Kompetenzen des Moduls | Kompetenzbereich | – |
| **Zuordnung Lektion → Kompetenz** (bzw. Lektion → Teilschritt → Kompetenz) | „Stärkt …“-Zeile und Glow | Glow und „Stärkt“ ausblenden, Rest funktioniert trotzdem |
| Kompetenzfortschritt aus erreichten Teilschritten | Prozent im Ring | Ring leer (0 %) anzeigen, nichts erfinden |
| Ungelesene Nachrichten | Coral-Punkt an der Glocke | Punkt ausblenden |

Wichtig: Fortschritt nie aus „Lektion angesehen“ ableiten und als „Kompetenz erreicht“ darstellen. Nur erreichte Teilschritte zählen.

---

## 7. Responsive

- Unter ca. 900 px: Fokus-Karte und zweite Karte untereinander, Fokus-Karte zuerst.
- Uhrzeit mobil 64 px, „Hallo“ 40 px.
- Kompetenzen: 2 pro Zeile auf Tablet, 1 pro Zeile auf dem Handy (Ring links, Name rechts).
- Navigation: bestehendes Mobile-Verhalten übernehmen.

---

## 8. Akzeptanzkriterien

1. Beim Öffnen von Home ist ohne Scrollen sichtbar: Begrüßung, Tagestyp, Fokus-Karte mit genau **einer** Hauptaktion.
2. Die Fokus-Karte zeigt je nach Uhrzeit korrekt Zustand A, B, C, D oder E (testbar über ein simuliertes „jetzt“, z. B. URL-Parameter `?now=2026-10-09T13:05` – nur im Demo-Branch).
3. „Zum Live-Unterricht“ führt mit einem Klick zur Live-Session; „Praxisaufgabe öffnen“ mit einem Klick in den Praxis-Workflow.
4. Unterlagen und Chat sind über „⋯“ erreichbar.
5. Es werden nur Kompetenzen des aktuellen Moduls gezeigt; heutige Kompetenzen leuchten, wenn die Zuordnung vorhanden ist.
6. Fehlende Daten führen nie zu Fehlern oder erfundenen Werten – der betroffene Teil wird ausgeblendet.
7. Alle Texte auf Deutsch, einfache Sprache, Kontrast WCAG AA, alle Buttons per Tastatur bedienbar.
8. Kein neuer Code im Praxis-Workflow, auf der Kompetenz- oder Stundenplanseite.

---

## 9. Reihenfolge

1. **Analyse** (Abschnitt 1 + Datenprüfung aus Abschnitt 6) → kurze Rückmeldung an uns, dann warten.
2. Design-Tokens und Fonts anlegen.
3. Header anpassen, Begrüßung + Tagestyp-Label.
4. Fokus-Karte + zweite Karte im Zustand A (statisch mit echten Daten von heute).
5. Zustandslogik `getDayState` mit allen Zuständen A–F + simuliertes „jetzt“ zum Testen.
6. Kompetenzbereich mit Ringen (zuerst ohne Glow).
7. Glow + „Stärkt“-Zeile, sobald die Zuordnung Lektion → Kompetenz geklärt ist.
8. „⋯“-Menü, Responsive, Barrierefreiheit, letzter Feinschliff.

Nach jedem Schritt: kurz zeigen, was sich geändert hat, und auf Feedback warten, bevor der nächste große Schritt beginnt.
