# Design Specifications — Qualifizierungsplattform Elektrofachkraft Erneuerbare Energien (Prototyp)

> Quelle: Notion-Seite "🎨 MVP April 2027: Design Specifications" (schließt die im
> ursprünglichen Projekt-Briefing vorgesehene, in den Playbook-Schritten 1–6 aber
> nicht verortete Lücke "Design Specifications"). Stand 2026-09-09.
>
> Diese Datei wird zusammen mit `data-model.md` und `access-matrix.md` gelesen —
> sie liefert das Design-System-Fundament und die kritischsten User-Flows, so
> weit spezifiziert, dass Claude Code sie bauen kann, ohne visuelle
> Grundsatzentscheidungen selbst zu treffen. Bewusst schlank, kein vollständiges
> UI-Kit vor dem Prototyp.

## 1. Design-Prinzipien (Design-System-Fundament)

| Frage | Antwort / Entscheidung | Status |
|---|---|---|
| Komponentenbibliothek | shadcn/ui + Tailwind — kuratierte, zugängliche Komponenten statt Eigendesign, Standard-Stack für Teams ohne Designer:in, die KI-gestützt bauen | Entschieden 2026-09-09 |
| Ton & Stil | Nüchtern-pragmatisch, passend zur Zielgruppe (Fachkräfte im Elektrohandwerk, Quereinsteiger:innen) | Entschieden 2026-09-09 |
| Corporate-Design-Tokens (Farben, Logo, Schrift) | **Primärfarben:** Eco Green `#239669` (Marken-/Aktionsfarbe für große UI-Elemente, Buttons, Icons — 3.72:1 auf Weiß, reicht für große Schrift/UI, nicht für Fließtext), Charge Green `#A2E500` (nur als Hintergrund mit dunkler Schrift, 1.53:1 auf Weiß reicht nicht als Vordergrundfarbe), Eco Deep Green `#23321E` (Haupt-Textfarbe, 13.58:1 auf Weiß — beste Wahl für Fließtext und kleine Icons). **Sekundärfarben:** Lylac `#9164E1` (4.11:1 auf Weiß, für große Schrift/UI-Umrandungen ok, für Fließtext knapp zu hell), Coral `#FFA573` (1.93:1 auf Weiß, wie Charge Green nur als Hintergrundfarbe geeignet). **Schrift:** Anton für Headlines/Hero/CTA-Labels (reine Display-Schrift, für Fließtext zu schwer lesbar), Work Sans für Fließtext, UI-Labels und Formulare. Logo, Icons und Key Visuals liegen im [Brand-Assets-Ordner (Drive)](https://drive.google.com/drive/folders/1rWvlIqeL9P1OOrJBaaspzbQny-QNKYhf) — **Übernahme ins Repo ist bewusst Schritt 5, nicht Teil dieser Datei/dieses Commits.** | Werte erfasst 2026-09-09, WCAG-Einsatzregeln festgelegt |
| Barrierefreiheit | Ziel: WCAG 2.1 AA von Anfang an (nicht nachrüsten) — umsetzbar über shadcn/ui, dessen Radix-Basis Tastaturbedienung, ARIA-Rollen und Fokus-Management für die meisten Komponenten schon mitbringt. Eigene Aufgabe bleibt: Fokus-Ring-Kontrast erhöhen (Standard 2.4:1, gefordert 3:1), Platzhaltertext-Kontrast prüfen (`text-muted-foreground` liegt oft unter 4.5:1), Alt-Texte/Screenreader-Labels für Icons und Kompetenz-Dashboard, `prefers-reduced-motion` bei Animationen | Entschieden 2026-09-09 |
| Referenz-Plattformen / Vorbilder | — | Bewusst übersprungen 2026-09-09 — für den Prototyp nicht vertieft, geplant für die nächste Phase mit dedizierter UX-Kapazität |
| Icons | Interaktive UI-Icons (Buttons, Navigation, Status) über die Standard-Icon-Bibliothek von shadcn/ui (Lucide) statt eigener Icons — konsistent, mit denselben Fokus-/Kontrast-Garantien wie die übrigen shadcn-Komponenten. Das eigene Icon-Set wird gezielt für Marken-/Illustrations-Zwecke eingesetzt (z. B. Kategorie-Icons für Praxistag-Tätigkeiten, Onboarding), nicht für jedes UI-Element. Quelle: [Brand-Assets-Ordner (Drive)](https://drive.google.com/drive/folders/1rWvlIqeL9P1OOrJBaaspzbQny-QNKYhf) — Übernahme ins Repo erfolgt in Schritt 5 | Entschieden 2026-09-09 |
| Semantische Farben (Erfolg / Warnung / Info / Fehler) | shadcn/ui bringt von Haus aus nur `destructive` (Fehler/kritische Aktionen) mit — `success`/`warning`/`info` fehlen und müssen ergänzt werden. Erfolg = Eco Green/Eco Deep Green, Warnung = Coral, Info = Lylac — jeweils als helle Hintergrundfläche mit Eco Deep Green als Text/Icon-Farbe (nicht als Textfarbe direkt, Kontrastgründe s. o.). Fehler/Destructive bleibt bewusst shadcn-Standard-Rot statt Markenfarbe (Rot = universelle Fehler-Konvention). **Prinzip: Status nie nur über Farbe zeigen (WCAG 1.4.1), immer zusätzlich Icon + Text-Label** — relevant vor allem für Verifizierungs-Status (pending/verified/rejected) im Praxistag-Flow und Kompetenz-Dashboard | Entschieden 2026-09-09 |

## 2. Kritische Flows

Priorisierung entschieden am 2026-09-09: 1. Praxistag-Flow — 2. Learner Day
View/Schedule — 3. Kompetenz-Dashboard — 4. Content Library/Lektionsansicht
(niedrigere Priorität, kann nach Pilotstart folgen).

### 2.1 Praxistag-Flow (Priorität 1)

| Screen / Schritt | Elemente | Datenbezug (siehe `data-model.md`) | Offene Fragen / Entscheidung |
|---|---|---|---|
| Mein Schedule (Programm / Woche / Tag) | Ansicht-Umschalter, Tageskachel markiert Praxistag | `schedule_entry`, `cohort` | Entschieden 2026-09-09: Eigenes Icon (Lucide, z. B. Werkzeug) plus Text-Label "Praxistag" auf der Tageskachel, nicht nur Farbe |
| Aufgabenliste | Liste von Tätigkeiten mit Titel, Bild/Icon, Beschreibung | `field_job_type`, `field_job` | Entschieden 2026-09-09: Für den Prototyp reicht eine einfache Liste ohne Filter/Sortierung, überschaubare Anzahl Aufgaben pro Tag; Filter erst ab MVP |
| Vorbereitung | Fragen / Instruktion / Theory-Refresh zur gewählten Tätigkeit, optional verlinkte Lektion | `field_job_type.vorbereitung_text` / `vorbereitung_content_id` | Entschieden 2026-09-09: Klarer Primär-Button "Vorbereitung abgeschlossen, Einsatz starten" am Ende, danach kein weiterer Screen bis zur Bestätigung nach dem Einsatz |
| Durchführung | Kein Screen — User ist nicht am Telefon | — | — |
| Bestätigung nach Einsatz | Bestätigungs-Button "Einsatz erledigt" | `field_job.durchgefuehrt_bestaetigt_am` | Entschieden 2026-09-09: Ein Klick "Erledigt", kein Formular — passt zum schlanken Prototyp-Ansatz |
| Reflexion / Nachbereitung | Vorgegebene Auswahl-Fragen zur Reflexion/Wiederholung (kein Freitext im Prototyp), optional verlinkte Lektion | `field_job_type.nachbereitung_text` / `nachbereitung_content_id`, `field_capture` | Entschieden 2026-09-09: Vorgegebene Auswahl-Fragen, kein Freitext — schneller für Learner, einfacher auszuwerten |
| Abschluss-Hinweis | Meldung "wird verifiziert" | `verification` (Status: pending) | — |

### 2.2 Learner Day View / Schedule (Priorität 2)

Standardansicht beim Öffnen von "Mein Schedule" ist Tag (heute), mit Umschalter
zu Woche und Programm-Überblick.

| Screen / Schritt | Elemente | Datenbezug | Offene Fragen / Entscheidung |
|---|---|---|---|
| Ansicht-Einstieg "Mein Schedule" | Standardansicht Tag (heute), Umschalter zu Woche und Programm-Überblick | `schedule_entry`, `cohort`, `enrolment` | Entschieden 2026-09-09: Tabs (shadcn/ui-Standardkomponente, barrierefrei out of the box) |
| Tagesansicht — Praxistag | Verweist auf den eigenen Praxistag-Flow (siehe 2.1) | `field_job_type`, `field_job` | — |
| Tagesansicht — Theorietag | Volle Tagesagenda: alle für den Tag angesetzten Lektionen unabhängig vom Format (SCORM/Live/Repository) als gemeinsame Liste, je Eintrag Titel, Format-Icon, Status | `schedule_entry`, `lesson` (content_type), `unit_progress` | Entschieden 2026-09-09: Chronologisch nach Uhrzeit; Live-Termine bekommen einen "Jetzt beitreten"-Button in der Liste, sobald die Session beginnt |
| Wochenansicht | Kalenderartige Übersicht über die Woche, je Tag Typ-Kennzeichnung (Praxistag/Theorietag/frei) plus grobe Anzahl offener Lektionen | `schedule_entry`, `cohort` | Entschieden 2026-09-09: Zusätzlich ein einfacher Abschluss-Indikator je Tag, da die Daten über `unit_progress`/`attendance` ohnehin vorliegen |
| Programm-Überblick | Start-/Enddatum des Programms, grobe Phasen/Module als Zeitleiste | `programme`, `module`, `cohort` (start_datum/end_datum) | Entschieden 2026-09-09: Für den Prototyp reine Orientierung, nicht interaktiv klickbar |

### 2.3 Kompetenz-Dashboard (Priorität 3)

Zwei parallele Fortschrittsansichten: Kompetenz-Fortschritt (aufklappbar bis auf
Teilschritt-Ebene) und Curriculum-Fortschritt (wie weit im Programm/Modul), beide
als einfache Prozent-Balken.

| Screen / Schritt | Elemente | Datenbezug | Offene Fragen / Entscheidung |
|---|---|---|---|
| Kompetenz-Fortschritt (Übersicht) | Je Kompetenz eine Zeile mit Fortschrittsbalken (%), ausklappbar | `competency`, `competency_evidence` | Entschieden 2026-09-09: Nach Curriculum-Reihenfolge, spiegelt wider, wie unterrichtet wird |
| Kompetenz-Fortschritt (Detail, ausgeklappt) | Teilschritte je Kompetenz mit Status (abgeschlossen/offen/in Prüfung/abgelehnt), visuelle Unterscheidung praktisch vs. theoretisch über Icon + Label, nicht nur Farbe | `competency_step`, `unit_progress`, `attendance`, `verification`, `field_capture` | Entschieden 2026-09-09: Icon plus Text-Label (z. B. "Praxis"/"Theorie"), nicht nur Farbe |
| Curriculum-Fortschritt | Paralleler Fortschrittsbalken für Programm/Modul (% abgeschlossen), unabhängig von der Kompetenz-Ansicht | `programme`, `module`, `course`, `unit_progress` | Entschieden 2026-09-09: Auf derselben Seite, parallel zum Kompetenz-Fortschritt, kein eigener Tab |
| Verifizierungsstatus sichtbar | Teilschritte mit offenem (pending) oder abgelehntem (rejected) Status werden mit Status-Icon + Text-Label markiert (Info-Farbe für pending, Warnung/Fehler für rejected) | `verification` | Entschieden 2026-09-09: Im Prototyp nur Status anzeigen, kein "Erneut einreichen"-Button; Klärung läuft vorerst außerhalb der App |

> **Hinweis für die Umsetzung:** `verification`-Status hier ist "pending" /
> "rejected" (UI-Sprache) — im Schema (`data-model.md`/`0006_progress_and_evidence.sql`)
> gibt es kein `pending`; ein `field_capture` ohne `verification`-Zeile *ist*
> pending. Siehe `docs/open-questions.md`, neuer Punkt Q-CAPTURE-PENDING-UI unten.

### 2.4 Content Library / Lektionsansicht (Priorität 4)

| Screen / Schritt | Elemente | Datenbezug | Offene Fragen / Entscheidung |
|---|---|---|---|
| Content Library (Einstieg) | Liste aller Kurse/Lektionen des Programms, gruppiert nach Kurs (Modul falls vorhanden), mit Format-Icon (SCORM/Live/Repository). Abgeschlossene Kurse bleiben sichtbar, Badge mit Häkchen-Icon + Text "Abgeschlossen" (Erfolgsfarbe Eco Green). Begonnene, noch nicht abgeschlossene Kurse zeigen einen Fortschrittsbalken (Eco Green) darunter | `course`, `module` (optional), `lesson`, `unit_progress` | Entschieden 2026-09-09: Abgeschlossene und laufende Kurse bleiben beide sichtbar, mit visueller Unterscheidung — keine Kurse werden ausgeblendet |
| Lektion öffnen — SCORM | Startet eingebetteten SCORM-Player, merkt sich Fortschritt | `lesson` (content_type=scorm), `unit_progress` | — |
| Lektion öffnen — Live | Zeigt Termin-Info; bei bevorstehender Session Link zum Beitreten. Keine Aufzeichnungs-Wiedergabe im Prototyp | `lesson` (content_type=live), `live_session` | Entschieden 2026-09-09: Sessions werden extern aufgezeichnet (z. B. Fathom), im Prototyp nicht in die Plattform eingebunden; Nutzung zur Skalierung wird nach der Testphase entschieden |
| Lektion öffnen — Repository | Öffnet verlinkte Datei/Link in neuem Tab oder als Download | `lesson` (content_type=repository) | — |
| Filter/Suche | Für den Prototyp keine Filter/Suche, einfache Liste reicht bei überschaubarer Lektionsanzahl | — | Offen: Ab welcher Lektionsanzahl wird Suche/Filter nötig (spätestens MVP)? |

## 3. Admin-Oberfläche (AfCJ)

> Bewusst zurückgestellt (Entscheidung 2026-09-09): Fokus für den Prototyp liegt
> auf den Learner-Flows. Verifizierung von Field Captures und
> Fortschritts-Übersicht für AfCJ-Admin werden nach Prototyp-Start spezifiziert,
> bis dahin ggf. übergangsweise direkt in Supabase erledigt.

## 4. Offene Fragen

| Frage | Betrifft | Seit wann offen | Status |
|---|---|---|---|
| Welche Corporate-Design-Elemente bestehen schon genau (Farbe/Logo/Font) und wo liegen sie? | Abschnitt 1 | 2026-09-09 | Beantwortet 2026-09-09: Farben, Fonts, Logo, Icons und Key Visuals erfasst bzw. verlinkt (siehe Abschnitt 1) |
| Braucht die Content Library vor Pilotstart eine eigene Spezifikation oder reicht zunächst eine generische Listen-Ansicht? | Abschnitt 2.4 | 2026-09-09 | Beantwortet 2026-09-09: Eigene kurze Spezifikation erstellt, siehe Abschnitt 2.4 |
| Ab wann werden motivierende/gamifizierte Elemente (Fortschrittsbalken, Badges) ergänzt? | Abschnitt 1 | 2026-09-09 | Zurückgestellt auf MVP/V1 |
| Gibt es durch AZAV-Förderung zusätzlich zu WCAG 2.1 AA noch eigene Barrierefreiheits-Vorgaben? | Abschnitt 1 | 2026-09-09 | WCAG 2.1 AA als Zielstandard entschieden; ob AZAV darüber hinaus etwas verlangt, offen — ggf. beim Fördergeber nachfragen |
| Gilt das BFSG (Barrierefreiheitsstärkungsgesetz) für unser B2B-finanziertes, individuell genutztes Angebot? Falls ja: Pflicht zur Barrierefreiheitserklärung nach § 14 BFSG | Abschnitt 1 | An Rechtsberatung übergeben (2026-09-14), noch offen. WCAG 2.1 AA als Zielstandard gilt davon unabhängig. Details und Quellen: [Barrierefreiheit & Einwilligung — offene rechtliche Fragen](https://app.notion.com/p/3db48915565b81e4a5b0de82c5b4e52f) (Notion) |

## 5. Entscheidungs-Log

| Datum | Entscheidung | Begründung | Verworfene Alternative |
|---|---|---|---|
| 2026-09-09 | Komponentenbibliothek shadcn/ui + Tailwind statt Eigenentwicklung | Kein Designer:in im Team, KI-gestütztes Bauen, etablierter Referenz-Stack für genau diese Situation | Custom-Design-System von Grund auf |
| 2026-09-09 | Ton & Stil: nüchtern-pragmatisch | Passt zur Zielgruppe berufliche Qualifizierung, schnellste und konsistenteste Umsetzung mit shadcn/ui | Gamifizierter Stil (vorerst zurückgestellt) |
| 2026-09-09 | Admin-Oberfläche zunächst zurückgestellt | Fokus auf Learner-Flows für den Prototyp, begrenzte Kapazität | Admin-UI jetzt mitspezifizieren |
| 2026-09-09 | Priorisierung der Flows: Praxistag > Day View > Kompetenz-Dashboard > Content Library | Praxistag ist der komplexeste und gerade erst im Detail finalisierte Flow | Gleichrangige Behandlung aller vier Flows |
| 2026-09-09 | Ziel-Standard Barrierefreiheit: WCAG 2.1 AA von Anfang an | Bei reinem B2B-Vertrieb rechtlich unklar ob BFSG greift, aber Nachrüsten war beim alten LMS teuer; shadcn/ui (Radix-Basis) deckt Kernanforderungen weitgehend ab | Barrierefreiheit erst bei Bedarf/Nachfrage nachrüsten |
| 2026-09-09 | Farbeinsatz nach Kontrastprüfung festgelegt: Eco Deep Green als Textfarbe, Eco Green/Lylac für große UI-Elemente, Charge Green/Coral nur als Hintergrundfarbe | Markenfarben halten nicht alle WCAG-2.1-AA-Kontraste in jeder Verwendung ein, richtig aufgeteilt bleibt die Palette trotzdem nutzbar | Palette unabhängig vom Einsatzort einheitlich verwenden |
| 2026-09-09 | Anton nur für Headlines/CTA-Labels, Work Sans für Fließtext und UI | Anton ist reine Display-Schrift, bei längeren Texten schwer lesbar; Work Sans für Bildschirme optimiert | Anton durchgängig verwenden |
| 2026-09-09 | Semantische Farben bestätigt: Erfolg = Eco Green/Eco Deep Green, Warnung = Coral, Info = Lylac, Fehler = shadcn-Standard-Rot | Konsistenz mit etablierten Farb-Konventionen (Rot = Fehler) wichtiger als durchgängiger Marken-Purismus bei seltenen negativen Zuständen | Eigene Markenfarbe auch für Fehlerzustände |
| 2026-09-09 | Bestätigung nach Praxis-Einsatz: ein Klick statt Formular | Passt zum schlanken Prototyp-Ansatz, kein zusätzliches Datenfeld nötig außer Zeitstempel | Kurzes Formular mit Dauer/Notiz |
| 2026-09-09 | Reflexion/Nachbereitung: vorgegebene Auswahl-Fragen statt Freitext | Schneller für Learner, einfacher auszuwerten; Freitext im Prototyp für alle Tätigkeiten schwer vorzubereiten | Freitext oder Kombination |
| 2026-09-09 | Content Library bekommt vor dem Piloten eine eigene Kurzspezifikation | Vermeidet Überraschungen bei Sonderfällen (Formate, Gruppierung), obwohl Flow-Priorität niedrig bleibt | Nur generische Listenansicht |
| 2026-09-09 | Abgelehnte Verifizierung: im Prototyp nur Status anzeigen, kein Resubmit-Flow in der App | Spart einen zusätzlichen Screen/Flow; Klärung bei Ablehnung ist selten und läuft außerhalb der App | Direkter "Erneut einreichen"-Button |
| 2026-09-09 | Abgeschlossene und laufende Kurse bleiben in der Content Library sichtbar, markiert mit Erfolgsfarbe/Badge bzw. Fortschrittsbalken | Orientierung für den Learner; nutzt bereits definierte semantische Farben | Abgeschlossene Kurse ausblenden |
| 2026-09-09 | Live-Session-Aufzeichnungen im Prototyp nicht in die Plattform integriert | Aufzeichnung läuft ohnehin extern (z. B. Fathom); Einbindung erst bei Skalierung relevant | Aufzeichnungen direkt im Prototyp einbinden |
| 2026-09-09 | Referenz-Plattformen/Vorbilder für den Prototyp nicht vertieft | Fehlende UX-Kapazität aktuell, bewusst auf nächste Phase verschoben | Jetzt noch selbst recherchieren |

## 6. Instruktion für Claude Code

> Design-Tokens und Komponentenbibliothek respektieren, die beschriebenen Flows
> umsetzen, nichts darüber hinaus erfinden, Lücken als Rückfrage markieren statt
> zu raten. Gilt zusammen mit der Instruktion in `data-model.md` (4e): dieselben
> Grundsätze — nichts über das hier Gelistete hinaus bauen, Fehlendes als offene
> Frage zurückmelden.

*(Quelle: Notion-Abschnitt "6. Handoff an Claude Code" — dort als Ankündigung
formuliert, dass `data-model.md`s Instruktion um den Verweis auf diese Datei
ergänzt wird, sobald sie existiert. Diese Datei ist dieser Verweis; die
Ergänzung in `data-model.md` steht als kurzer Zusatz direkt unter der
ursprünglichen 4e-Instruktion, siehe dort.)*

## Nicht Teil dieser Datei (bewusst, siehe Quelle)

- **Brand-Assets** (Logo, Icons, Key Visuals aus dem [Drive-Ordner](https://drive.google.com/drive/folders/1rWvlIqeL9P1OOrJBaaspzbQny-QNKYhf)) —
  Übernahme ins Repo ist explizit "Schritt 5" und damit nicht Teil dieses Commits.
- **Admin-Oberfläche** — zurückgestellt, siehe Abschnitt 3.
- **Gamifizierte Elemente, Referenz-Plattformen** — siehe Abschnitt 4/5.
