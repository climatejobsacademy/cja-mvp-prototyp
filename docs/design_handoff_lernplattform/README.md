# Handoff: Lernplattform – Prototyp-Richtung 2a „Minimal“

## Überblick
Überarbeitung der Lernplattform für angehende Elektrofachkräfte (The Academy for Climate Jobs). Umfasst: Login, neuer Reiter **Home**, Stundenplan, Kompetenzen, Lernmaterialien (inkl. leerer Zustand), Kopfleiste mit Programm, Avatar-Menü. Desktop und Mobile (320–430 px).

## Über die Design-Dateien
Die Dateien in `design/` sind **Design-Referenzen in HTML**, kein Produktionscode. Aufgabe ist, sie **in der bestehenden Next.js-App (App Router, shadcn/ui, Tailwind)** nachzubauen – mit den vorhandenen Komponenten und Tailwind-Klassen. **Keine neuen Komponenten-Bibliotheken, keine neuen Design-Tokens, kein Custom-CSS.**
Öffnen: `design/Lernplattform Richtungen v2.dc.html` im Browser (Canvas mit allen Screens, Desktop + Mobile, Regeln, Notizen je Screen).

## Fidelity
**High-Fidelity.** Farben, Abstände, Typo und Zustände sind final. Inhalte (Namen, Termine, Kohorte, Kompetenzen) sind Beispieldaten → aus dem Backend.

---

## Design-Tokens (nur Bestehendes)
| Rolle | Wert | Tailwind |
|---|---|---|
| Text / aktiver Tab / Buttons | #23321E | `text-eco-deep-green`, `bg-eco-deep-green` |
| Akzent (Flächen, Segmente, Icons, Fokus-Ring) | #239669 | `bg-eco-green`, `bg-eco-green/10`, `ring-eco-green` |
| Highlight (sparsam) | #a2e500 | `bg-charge-green` – aktuell nicht im Inhalt verwendet |
| Panel (Login-Bild) | #f5f5f0 | `bg-off-white` |
| Hintergrund | #ffffff | `bg-white` |
| Rand / Trennlinie | #e4e4e7 | `border` (shadcn border) |
| Sekundärtext | #71717a | `text-muted-foreground` |
| Icon-Kachel / Avatar | #f4f4f5 | `bg-muted` |
| Fehler | Coral (Platzhalter #F07167) | `border-coral`, Icon `text-coral` |
| Ausstehend | Lylac (Platzhalter #B8A9E8) | `bg-lylac/30` |

**Wichtig (Kontrast WCAG AA):** Weiß auf Eco Green (3,7:1) und Eco Green als Text fallen durch → **Buttons `bg-eco-deep-green text-white hover:bg-eco-deep-green/90`**, Texte immer Deep Green. Eco Green nur für Flächen, Icons, Segmente, Ring. *(Markenfreigabe steht aus.)*

### Typo
- Schrift: wie in der bestehenden App (Screens nutzen Anton für H1, Work Sans für Text).
- H1: Anton, `text-[40px]` / mobil `text-[32px]`, `leading-tight`, einzige Zeile im Seitenkopf (keine Eyebrow, keine Unterzeile).
- Sektion (h2 außerhalb Karten): `text-base font-semibold`
- Kartentitel: `text-[15px] font-semibold`
- Zeilentitel: `text-sm font-medium`
- Meta: `text-[13px] text-muted-foreground`
- Label über Titel: `text-xs text-muted-foreground`
- Buttons `text-[15px] font-medium`, Links `text-sm font-medium`. **Kein Uppercase.**
- Prozentzahl: `text-[40px] font-bold tracking-tight`, „ %“ `text-xl text-muted-foreground`

### Abstände, Radien, Schatten
- Inhalt: `max-w-3xl` (768 px) zentriert, `py-10 pb-16`; mobil `px-4 pt-5 pb-8`. Vertikaler Abstand `gap-6`.
- Karten `p-4 rounded-xl`, Zeilen `min-h-14 px-4`, Buttons `h-11 rounded-lg`, Badges/Tabs `rounded-full`, Icon-Kachel `size-10 rounded-[10px] bg-muted`.
- Icons (lucide): Kopf/Zeile 18 px, Kachel 20 px, Badge 14 px, Chevron 20 px `text-muted-foreground`, Link-Pfeil 16 px `text-eco-green`.
- Übergang: `transition-[background-color,box-shadow] duration-150 motion-reduce:transition-none`.

---

## Interaktions-Regeln (strikt einheitlich)
| Element | Aussehen | Hover |
|---|---|---|
| Klickbare Karte | `border rounded-xl shadow-sm`, Chevron rechts | `hover:bg-eco-green/10 hover:shadow-md` |
| Klickbare Zeile in Karte | `border-t min-h-14`, Chevron rechts | `hover:bg-eco-green/10` |
| Aufklapp-Kopf (Collapsible) | Chevron rechts, up/down | `hover:bg-eco-green/10` |
| Link-Zeile am Kartenende | `min-h-12 border-t`, Text + `ArrowRight` | `hover:bg-eco-green/10` |
| Container / Info-Zeile (nicht klickbar) | `border rounded-xl`, **kein Schatten, kein Hover, kein Pfeil** | – |
| Ghost (Nav inaktiv, Tabs inaktiv, Pfeile, Avatar) | `text-muted-foreground` | `hover:bg-eco-green/10 hover:text-eco-deep-green` |
| Nav aktiv | `bg-eco-green/10 font-semibold text-eco-deep-green`, Icon `text-eco-green` | – |
| Tab aktiv (Stundenplan) | `bg-eco-deep-green text-white rounded-full` | – |
| Fokus (alle) | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eco-green focus-visible:ring-offset-2` | – |

**Grundsatz: Ohne Zielseite kein Hover und kein Pfeil.** Offen: Heute-Zeilen (Home) und Lektionszeilen (Lernmaterialien) – wenn kein Ziel existiert, Hover/Pfeil entfernen.

Touch-Ziele ≥ 44 px (`h-11` / `min-h-11`) überall.

### Status-Badges (einzige drei)
- **Offen**: `border`, Icon `CircleDashed`
- **Abgeschlossen**: `bg-eco-green/10 border-transparent`, Icon `CircleCheck`
- **Ausstehend · ab TT.MM.**: `bg-lylac/30 border-transparent`, Icon `Clock`
Immer Icon + Text, `px-2.5 py-1 text-[13px] font-medium rounded-full`.

### Fortschritt
Segmentbalken statt Progress-Bar: `flex gap-[3px]`, je Segment `h-2 flex-1 rounded-sm` (Curriculum) bzw. `h-1.5` (Karten/Zeilen, Container `max-w-[200px]`). Gefüllt `bg-eco-green`, leer `bg-border`. **Kein Zähl-Text daneben** – Wert per `sr-only` („1 von 2 Lektionen“) und `role="progressbar" aria-valuenow aria-valuemax`, Segmente `aria-hidden`. Sichtbare Zahl nur das Curriculum-Prozent. Ausnahme: Modulkopf „1/8 Lektionen“.

### Wording
- „abgeschlossen“ (nie „erledigt“), Brüche „1/20“ ohne Leerzeichen
- Zähl-Einheiten: Lektionen · Kompetenzschritte · Praxisaufgaben
- Lektionstypen: Live-Termin (`Video`) · Selbstlernmodul (`BookOpen`)
- Links: „Zum Stundenplan“, „Zu den Kompetenzen“
- Seitentitel = Nav-Label („Stundenplan“, nicht „Mein Stundenplan“); Home: „Hallo {Vorname}“; Sektionen wiederholen den Seitentitel nicht („Alle Kompetenzen“)
- Datum: Überschriften „Di, 29. September“, Fließtext „Mi, 30.09.“, Zeiten „13:00–17:00“

---

## Screens

### Kopfleiste (alle App-Screens)
- **Desktop** `h-16 border-b px-8 flex items-center gap-4`: Logo (Anton-Wortmarke, 4 Zeilen, 10 px) · Programm (`border-l pl-4 h-8`, Icon `GraduationCap` 16 px + „{Programmname}“ `text-[13px] text-muted-foreground`, **nicht gekürzt**) · Nav `ml-auto` (Home `House`, Stundenplan `Calendar`, Kompetenzen `Target`, Lernmaterialien `BookOpen`; `h-11 px-3.5 rounded-lg text-[15px]`) · Avatar `size-11 rounded-full bg-muted` mit Initiale.
- **Mobile** `h-[60px] px-4`: Logo · Programm (`truncate`, 12 px) · Avatar. Nav als Bottom-Bar `fixed inset-x-0 bottom-0 md:hidden border-t`, je Item Icon in `w-14 h-[30px] rounded-full` (aktiv `bg-eco-green/10`) + Label 12 px, `min-h-14`.

### Avatar-Menü (shadcn `DropdownMenu`, 300 px, `rounded-xl shadow-lg`)
1. Avatar 40 px + Name `text-[15px] font-semibold` + E-Mail `text-[13px] text-muted-foreground truncate`
2. `border-t p-4 gap-3`: Info-Zeilen (kein Hover) – `GraduationCap` „Programm“ / {Programm}; `Users` „Kohorte“ / {Kohortenname}. Label `text-xs text-muted-foreground`, Wert `text-sm font-medium`.
3. `border-t p-1`: Menüpunkt „Abmelden“ (`LogOut`, `min-h-11 px-3 rounded-lg hover:bg-eco-green/10`).
Trigger offen: `bg-eco-green/10` + Fokus-Ring.

### Home
H1 „Hallo {Vorname}“ (`border-b pb-5`). Darunter `grid gap-4 md:grid-cols-2`, zwei Container-Karten (`border rounded-xl overflow-hidden flex flex-col`):
- **Heute**: Kopf `p-4` – `Calendar` 18 + h2 „Heute“ + rechts Datum „Di, 29. September“ (Meta). Zeilen `border-t min-h-14 px-4`: Uhrzeit (`w-[52px] text-[13px] font-semibold tabular-nums`, „flexibel“ bei Selbstlernmodul) · Typ-Icon 18 · Titel · Chevron. Ende: Link-Zeile „Zum Stundenplan“.
  - **Leer** (keine Termine heute): statt Zeilen `border-t p-4`: „Heute finden keine Kurse statt.“ (`text-sm font-medium`) + „Nächster Termin: Mi, 30.09., 13:00“ (Meta). Link bleibt.
- **Curriculum-Fortschritt**: `Target` 18 + h2, „5 %“, 20 Segmente. Ende: Link-Zeile „Zu den Kompetenzen“.

### Stundenplan
H1 „Stundenplan“. Tabs Tag · Woche · Programm (`h-11 px-5 rounded-full`). Tagesnavigation: Ghost-Pfeile `size-11 rounded-full` + Datum `text-[15px] font-semibold`. Karten (klickbar): Icon-Kachel · Titel (15/600) · Meta „Live-Termin · 13:00–17:00“ · Status-Badge · Chevron. Badge bricht mobil unter den Text (`flex flex-wrap gap-x-4 gap-y-2`, Textblock `basis-60 grow`).

### Kompetenzen
- Container „Curriculum-Fortschritt“ – identischer Aufbau wie auf Home (ohne Link-Zeile).
- h2 „Alle Kompetenzen“, dann Collapsible-Karten (`shadow-sm`): Kopf = Trigger (Label Kategorie `text-xs`, Titel 15/600, Segmente je Kompetenzschritt, Chevron). Aufgeklappt: Info-Zeilen `border-t min-h-14` – Icon (Theorie `BookOpen` / Praxis `Wrench`) · „Kompetenzschritt n · Theorie“ · Status-Badge. **Nicht klickbar.**

### Lernmaterialien (Katalog – keine tagesbezogenen Hinweise)
- Karte je Modul (`shadow-sm`, Collapsible): Kopf `min-h-14` – „Modul I“ (Meta) · h2 Titel (15/600) · rechts „1/8 Lektionen“ · Chevron.
- Themen-Label `border-t px-4 py-2.5 text-xs text-muted-foreground` („Grundlagen der Elektrotechnik“).
- Einheiten (Collapsible-Zeilen) `border-t min-h-16`: Titel `text-sm font-medium` + Segmente. Aufgeklappt: Lektionszeilen `pl-8 min-h-14` – Typ-Icon · Typ · Status-Badge · Chevron.
- Gesperrtes Modul: Container ohne Schatten/Hover, Titel `text-muted-foreground`, Badge „Ausstehend · ab 26.10.“.
- **Leer** (nichts freigeschaltet): `border-2 border-dashed rounded-xl text-center py-16` (mobil `py-10 px-5`): Kreis `size-14 bg-eco-green/10` mit `BookOpen` eco-green · h2 „Noch keine Lernmaterialien freigeschaltet“ (`text-xl font-semibold`) · Button outline „Zum Stundenplan →“ (`w-full md:w-auto`).

### Praxis-Flow · Ende (Reflexion)
- Nav aktiv: Stundenplan. Kopf: Zurück-Link „‹ Stundenplan“ (Ghost, `ChevronLeft` 16, `min-h-11 text-sm font-medium text-muted-foreground`) über H1. H1 = Aufgabenname ohne Klammer („Übungen an den ETS-Boards“); das Thema („Grundlagen der Elektrotechnik“) entfällt hier. *(Englisch „Zurück zum Schedule“ ersetzen.)*
- Schrittbalken `max-w-[200px]`, Segmente `h-1.5` je Flow-Schritt, aktueller/erledigte gefüllt; `sr-only` „Schritt 3 von 3“.
- Karte „Reflexion“ (Container, `p-4 gap-5`): Kopf `MessageSquareText` 18 + h2. Je Frage (Multiple Choice, Einfachauswahl): Frage `text-sm font-medium`, shadcn `RadioGroup`; jede Option als ganze klickbare Zeile `min-h-11 px-3 py-2.5 rounded-lg border text-sm`, `hover:bg-eco-green/10`; gewählt `border-eco-deep-green bg-eco-green/10`, Radio gefüllt Deep Green. Absenden erst aktiv, wenn alle Fragen beantwortet sind (`disabled` = `opacity-50 cursor-not-allowed`, kein Hover; im Mock gezeigt, da Frage 2 offen ist). Primär-Button „Reflexion absenden“ (`Send` 18, `bg-eco-deep-green h-11`, mobil `w-full`).
- **Keine Fragen**: Karte mit Kopf + `border-t p-4` „Für diese Übung sind keine Reflexionsfragen hinterlegt.“ (`text-sm text-muted-foreground`), **kein Button**. *(Klären, ob der Flow dann trotzdem abgeschlossen werden muss.)*
- **Abgeschlossen**: Bestätigungskarte – Kachel `bg-eco-green/10` + `CircleCheck` eco-green · „Praxisaufgabe abgeschlossen“ · „Deine Reflexion ist abgesendet.“ · Button outline „Zum Stundenplan →“.

### Login
- Desktop: `grid md:grid-cols-[46%_1fr]`, Höhe Viewport minus Footer. Links `bg-off-white` mit Bild; rechts `bg-white`, Formular `max-w-[380px]` vertikal zentriert, `gap-8`.
- Mobile: Bild oben (Illustration `h-[260px]` / Foto `h-[236px] px-4 pt-4 rounded-2xl`), Kopf zentriert.
- Kopf: H1 „The Academy for Climate Jobs“ + eine Zeile „Qualifizierungsplattform · Fachkräfte für die Energiewende“ (`text-[15px] text-muted-foreground`).
- Label „E-Mail-Adresse“ (`text-sm font-medium`), `Input h-11 rounded-lg`, Button „Login-Link anfordern“ (`Mail` Icon, `h-11 w-full bg-eco-deep-green`).
- Bild-Varianten (Prop/Config): Illustration (`object-contain object-bottom`), Foto Werkstatt / Detail (`p-6 rounded-xl object-cover`, Ausschnitt per `object-position`, Alt-Texte siehe Datei). Chefin entscheidet.
- Zustände: **Fokus** Ring; **Fehler** `border-2 border-coral` + `CircleAlert` + „Diese E-Mail-Adresse ist nicht registriert. Bitte prüfe die Schreibweise oder wende dich an deine Ansprechperson.“; **Gesendet** Karte ersetzt Formular: Kachel `MailCheck` · „Login-Link gesendet“ · „Wir haben einen Link an {E-Mail} geschickt. Er ist 15 Minuten gültig.“ (Gültigkeit prüfen) · Buttons „Erneut senden“ (outline) / „Andere E-Mail-Adresse“ (ghost).
- Footer `border-t`: Logo · Links Impressum / Datenschutz / Barrierefreiheit (`min-h-11 px-2.5 rounded-lg text-[13px] text-muted-foreground hover:bg-eco-green/10`) · „© 2026 The Academy for Climate Jobs“. Mobil gestapelt, zentriert.

---

## Nicht gestaltete Screens (z. B. Praxis-Flow, Lektionsansicht)
Diese Screens sind nicht im Design enthalten. Sie werden **nicht neu entworfen**, sondern an die Regeln oben angeglichen – nur Konsistenz, keine neuen Muster:

**Checkliste je Screen**
- Seitenkopf: nur H1 (Anton), `border-b pb-5`, keine Eyebrow/Unterzeile. Titel = Nav-Label bzw. Name der Lektion/Aufgabe.
- Zurück-Navigation (neu nötig in Unterseiten): Ghost-Link über der H1, `ChevronLeft` 16 px + Ziel („Lernmaterialien“, „Kompetenzen“), `min-h-11 text-sm font-medium text-muted-foreground hover:bg-eco-green/10 hover:text-eco-deep-green rounded-lg px-2 -ml-2`.
- **Buttons – genau drei Varianten:**
  - Primär (eine pro Ansicht): `h-11 rounded-lg bg-eco-deep-green text-white text-[15px] font-medium hover:bg-eco-deep-green/90`
  - Sekundär: shadcn `variant="outline"`, `h-11 rounded-lg text-[15px] font-medium hover:bg-eco-green/10`
  - Tertiär: shadcn `variant="ghost"`, `text-muted-foreground hover:bg-eco-green/10 hover:text-eco-deep-green`
  - Mobil Primär/Sekundär `w-full`; kein Button innerhalb einer klickbaren Karte.
  - Icons in Buttons 18 px links (z. B. `Upload`, `Check`), weiter/fertig ohne Pfeil-Icon.
- Mehrschritt-Flows (Praxis): Schrittanzeige als Segmentbalken (`h-1.5`, 1 Segment = 1 Schritt) + `sr-only` „Schritt 2 von 4“, **keine** nummerierten Kreise. Fußleiste mit „Zurück“ (outline) links, Primär rechts; mobil `sticky bottom-0 border-t bg-white p-4`.
- Formulare: Label `text-sm font-medium`, `Input`/`Textarea` `rounded-lg`, Höhe `h-11`, Fehler `border-2 border-coral` + `CircleAlert` + Text (wie Login). Datei-Upload als gestrichelter Bereich `border-2 border-dashed rounded-xl` (Muster des leeren Zustands).
- Inhalte (Lektionstext, Video, PDF): Lesebreite `max-w-3xl`, Fließtext `text-[15px] leading-relaxed`, Medien `rounded-xl border`.
- Status nur die drei Badges; Fortschritt nur Segmente; Hover/Pfeil nur bei echtem Ziel; Wording-Liste gilt.
- Bestätigung/Abschluss: Muster „Login-Link gesendet“ (Karte mit Icon-Kachel `bg-eco-green/10`, Titel 15/600, ein Satz, Buttons).
- Wenn ein Screen ein Muster braucht, das hier nicht beschrieben ist: **nachfragen statt erfinden** (`// TODO(design):`).

## Semantik / Barrierefreiheit
- `<nav aria-label="Hauptnavigation">`, aktiver Punkt `aria-current="page"`
- Collapsibles über shadcn (setzt `aria-expanded`)
- Eine `h1` je Seite, Karten/Sektionen `h2`
- Icons neben Text `aria-hidden`
- Status nie nur über Farbe
- 200 % Zoom / 320 px ohne horizontales Scrollen

## Daten / State
- User: Vorname, Name, E-Mail, Programm, Kohorte
- Heute: Termine des Tages (Uhrzeit oder „flexibel“, Typ, Titel), nächster Termin falls leer
- Curriculum: abgeschlossene / gesamte Lektionen → Prozent + Segmente
- Kompetenzen: Kategorie, Titel, Kompetenzschritte (Typ, Status)
- Module: Nummer, Titel, Freischaltdatum, Einheiten → Lektionen (Typ, Status)
- UI-State: offene Collapsibles, Stundenplan-Tab + Datum, Login-Zustand (idle/focus/error/sent)

## Offene Punkte
1. Markenfreigabe Button-Farbe Deep Green
2. Echte Hex-Werte für Coral / Lylac
3. Zielseiten für Heute-Zeilen und Lektionszeilen – sonst Hover/Pfeil entfernen
4. Tab „Programm“ im Stundenplan kollidiert begrifflich mit „Programm“ in der Kopfleiste
5. Gültigkeit Login-Link

## Assets (`design/`)
- `login-hero.png` – Illustration, aus Screenshot ausgeschnitten → **Original aus dem Repo verwenden**
- `login-foto-werkstatt.jpg`, `login-foto-detail.jpg` – Fotos Praxisübung
- Icons: lucide-react (bereits bei shadcn)

## Dateien (`design/`)
- `Lernplattform Richtungen v2.dc.html` – Übersicht aller Screens + Regeln (Einstieg)
- `AppScreen.dc.html` – App-Screens (Props: page, rstate, mobile, menu, noToday)
- `Login.dc.html` – Login (Props: photo, state, mobile)
- `Icon.dc.html`, `support.js` – Hilfsdateien für die Vorschau
