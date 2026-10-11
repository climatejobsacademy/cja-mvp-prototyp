# Home – Änderungen: Zustand „freier Tag“

Betrifft nur den Zustand, wenn heute **kein Termin** stattfindet (Wochenende, freier Tag). Alle anderen Zustände von Home bleiben unverändert. Referenzen: `home-freier-tag-referenz.html` (Layout) und `home-freier-tag-texte-referenz.html` (Text-Regeln).

Erst kurz bestätigen, was du änderst, dann umsetzen. Demo-Branch, keine Datenbank-Änderungen ohne Rückfrage.

## 1. Layout
- Zwei Spalten wie im Normalzustand: links der Tag (ca. 2/3), rechts die Kompetenzen (ca. 1/3).
- Begrüßung bleibt: „Hallo {Vorname}“ + Datum. Kein Tagestyp-Pill.
- Den grauen Kasten „Heute ist nichts geplant“ **ersetzen** durch die Karte unten.

## 2. Karte „Heute frei“ (links oben)
- Hintergrund Coral-hell **#FFE3D1**, Radius 24 px, Innenabstand 36/40 px. Keine Deko-Kreise.
- Inhalt von oben nach unten:
  - weißes Label „Heute frei“ (Pill, 13 px, fett)
  - Headline in Anton 56 px, Farbe #23321E (Text siehe Abschnitt 4)
  - Unterzeile 17 px, Farbe #5B4636 (Text siehe Abschnitt 4)
  - Wochenreihe Mo–Fr: Kreise 40 px. **Erledigter Tag:** dunkel (#23321E) mit Häkchen in #FFE3D1. **Nicht erledigter Tag:** leerer Kreis, Rand 2 px rgba(35,50,30,0.25). Darunter Kürzel (12 px, fett).
- Die Wochenreihe nur in Zustand 1 und 2 zeigen (siehe Abschnitt 4).

## 3. Unter der Karte – zwei schlichte Zeilen
Weiß, Rand 1 px #EEF1EB, Radius 16 px, Innenabstand 16/22 px:
1. Live-Icon (Lylac) · „Weiter geht’s **{Wochentag}, {Uhrzeit}** · {Typ}“ · rechts „Stundenplan →“
2. Nur wenn etwas offen ist: Buch-Icon (Eco Green) · „Wenn du magst: **{Titel}** · Selbstlernen“ · rechts „Weiterlernen →“
   - Ersetzt die bisherige Karte „Noch offen von Freitag“.
   - Bei mehreren offenen Einheiten nur die älteste zeigen.

## 4. Welcher Text gilt? (Text-Regeln)
Grundlage: Anteil **erledigter** Live-Termine + Selbstlern-Einheiten der letzten Programmwoche.

| Zustand | Bedingung | Headline | Unterzeile | Wochenreihe |
|---|---|---|---|---|
| 1 | ≥ 90 % erledigt | Starke Woche, {Vorname}. | Alle {n} Live-Termine geschafft. Genieß deinen {Wochentag}. | ja |
| 2 | 50–89 % | Gute Woche, {Vorname}. | {x} von {n} Tagen geschafft. Den Rest holst du ganz entspannt nach – aber erst nach dem {Wochentag}. | ja |
| 3 | < 50 % | {Nächster Wochentag} geht’s weiter. | Genieß deinen {Wochentag}. Die offenen Einheiten warten auf dich, wenn du so weit bist. | **nein** |
| 4 | erste Woche / keine Daten | Schön, dass du dabei bist. | Genieß deinen {Wochentag} – am {nächster Wochentag} startet dein Programm. | nein |

- Grundsatz: **loben, was gut lief – nie zeigen, was fehlt.** In Zustand 3 und 4 keine Zahlen.
- Schwellen (90 % / 50 %) als Konstanten anlegen, damit wir sie leicht ändern können.
- „Tag geschafft“ = alle Live-Termine und Selbstlern-Einheiten dieses Tages erledigt.

## 5. Rechte Spalte – Kompetenzen
- Überschrift „Deine Kompetenzen · Modul {n}“ + „Alle →“.
- **Alle** Kompetenzen des aktuellen Moduls untereinander: Ring 44 px (Fortschritt in Eco Green, Prozent in der Mitte) + Name. Kein Kasten, kein „Heute dran“, kein Leuchten.

## 6. Bug
- „Dein Fortschritt in Modul 3“ ist falsch – aktuell ist **Modul 1**. Bitte Berechnung des aktuellen Moduls prüfen.

## Akzeptanzkriterien
1. An Tagen ohne Termin erscheint die Coral-Karte statt „Heute ist nichts geplant“.
2. Der richtige Text-Zustand wird aus den Daten der letzten Woche gewählt; in Zustand 3/4 keine Zahlen und keine Wochenreihe.
3. Nächster Termin korrekt; Selbstlern-Zeile nur, wenn etwas offen ist.
4. Rechts alle Kompetenzen des aktuellen Moduls, korrektes Modul.
