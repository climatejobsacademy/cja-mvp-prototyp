# Praxisflow-Realbau: Analyse und Migrationsentwurf

Stand 06.11.2026. **Analyse und Entwurf.** Umgesetzt ist davon Migration 0058 (Ablauf, Phase, Fortschritt, SR-64); alles Weitere ist Entwurf. Das Dokument ersetzt die Fassung vom 13./14.10.2026 (vier Codewort-Freigaben, Foto ohne Upload, Schnitte S/M/L); die alte Fassung und ihr SQL-Entwurf stehen in der Git-Historie.

Grundlagen:
- **Matrix „Pilot, Praxistage Plochingen, Modul II, Praxisflow“** im Miro-Board der Produktleitung (Frame „User Journey“): je Phase Zweck, Zahl der Schritte, Anzeige, Eingabe, Tätigkeit, Inhalte, Gespeichertes, Verhalten bei Fehlschlag, Bestätigung.
- **Partner-Feedback vom 15.10.2026** (Notion-Seite „Praxisflow: Partner-Feedback 15.10. und Umbau bis 16.11.“) und die Umsetzung in `origin/demo` bis `dd688d9`.
- `dev` mit den Migrationen bis 0057 und die SRs aus Notion (Auszug `docs/requirements.md`).

Kennzeichnung: **belegt** heißt im Code, in der Matrix oder in Notion gelesen; **Vorschlag** und **Vermutung** heißen nicht geprüft und nicht abgestimmt. Alle Stunden sind geschätzt, nicht gemessen.

## 1. Ausgangslage

**demo** (`/praxisflow-demo`, belegt) ist ein Prototyp ohne Server. Der gesamte Stand liegt im Browser (`localStorage`, Präfix `cja-praxisflow-demo:`), Dateien werden nur im Browser gehalten, das Codewort wird im Browser geprüft. Seit dem Partner-Feedback hat demo:
- die Phasen der vollständigen Handlung (Informieren, Planen, Entscheiden, Ausführen, Kontrollieren, Bewerten),
- die Ansicht „Jetzt dran“ (ein Schritt groß, Fortschritt oben) mit Unterlagen-Leiste (Auftrag, Hilfen, Pläne, Protokoll) und Vorschau,
- Uploads für Auftrag, Hilfen, Pläne und Prüfprotokoll (`UPLOAD_FORMATE`),
- Kontrollieren in drei Teilen nach DIN VDE 0100-600 (spannungsfrei, Freigabe zur Inbetriebnahme per Codewort, unter Spannung) und Upload des Prüfprotokolls,
- Bewerten mit Selbst-, Peer- und Trainer-Einschätzung am Gerät der Lernenden, Trainer-Einschätzung erst nach Codewort, Vergleich,
- eine Auftragsakte mit Verlauf, druckbar über den Browser,
- Diktat aus (`DIKTAT_AN = false`).

**dev** (`/praxistag/[fieldJobId]`, belegt) ist der echte, aber einfache Ablauf in drei Schritten: Vorbereitung lesen → Durchführung bestätigen (erledigt oder Problem) → Reflexion (Single-Choice) und absenden. Gespeichert wird in `field_job`, `field_capture` (phase `abschluss`) und `field_capture_antwort`. Es gibt keinen Plan, keine Dateien je Auftrag, keine Uploads, keine Einschätzung und keine Freigabe. Dieser Ablauf bleibt der **Rückfall**, falls der neue Ablauf für einen Auftrag nicht eingeschaltet ist.

## 2. Zielablauf laut Matrix

Rahmen (belegt, Matrix): Fortschritt oben über alle sechs Phasen; Seitenleiste mit Auftrag, Hilfen, Plänen und Protokoll, in der hochgeladene Dateien jederzeit erreichbar bleiben.

| Phase | Zweck | Schritte | Was Lernende tun | Eingabe | Inhalte und wer sie liefert | Gespeichert | Bestätigung |
|---|---|---|---|---|---|---|---|
| Informieren | Informationen zur Aufgabe sammeln | 2 | Unterlagen lesen, Arbeitsauftrag und ggf. eigene Dateien hochladen | Upload Arbeitsauftrag (Pflicht), weitere Dateien (optional) | Instruktion (generisch); Zusatzmaterial je Auftrag | hochgeladene Dateien | offen |
| Planen | Informationen zu einem Arbeitsablauf strukturieren | 4 | Werkzeuge, Materialien und Arbeitsschritte auflisten; Plan hochladen (optional) | Texteingabe; Datei-Upload eines Plans (optional) | Instruktion; Inhalte kommen von den Lernenden | Eingaben zu Werkzeugen, Materialien, Arbeitsschritten; ggf. Dateien | offen |
| Entscheiden | Plan prüfen | 1 | Zusammenfassung lesen und bestätigen oder zurück zum Plan | keine | Zusammenfassung aus Werkzeugen, Materialien, Schritten, Planskizze | nichts | Lernende selbst |
| Ausführen | Aufgabe Schritt für Schritt bearbeiten | x = Zahl der geplanten Schritte | Schritte der Reihe nach abarbeiten und abhaken | keine | die eigenen Schritte aus dem Plan | nichts | Lernende selbst |
| Kontrollieren | Systematische Überprüfung des Auftrags | 9 | Kontrollschritte abhaken („Erledigt“), Prüfprotokoll hochladen | Upload des Prüfprotokolls am Ende (Pflicht) | Instruktion, Kontrollschritte | hochgeladenes Prüfprotokoll | Abhaken der Kontrollschritte |
| Bewerten | Selbst- und Fremdeinschätzung (Peer und Trainer:in) | 19 | sich selbst einschätzen, Peer holen, Trainer:in holen | Punktzahl je Item; Codewort der Trainer:in vor deren Einschätzung; Freitext „Was machst du beim nächsten Mal anders?“ (optional); Zusammenfassung drucken oder als PDF speichern | Instruktion; Items, drei gleiche Sets für Lernende, Peer und Trainer:in; Zusammenfassung der Bewertung | alle Einschätzungen und wer sie gemacht hat (selbst, Peer, Trainer:in) | Codewort der Trainer:in |

In allen Phasen ist laut Matrix **offen**, was bei einem Fehlschlag passiert (z. B. „nicht bestanden“).

Die 19 Schritte in Bewerten passen zu demo (belegt): 5 Kriterien im Standard-Bewertungsbogen × 3 Einschätzungen = 15, dazu Instruktion, Codewort, Freitext und Zusammenfassung (Vermutung zur Zählweise).

## 3. Abweichungen zwischen Matrix, demo und SRs

| Punkt | Matrix | demo | SR | Folge |
|---|---|---|---|---|
| Freigabe vor dem Arbeiten unter Spannung | nicht genannt | Codewort zwischen „spannungsfrei“ und „unter Spannung“ | SR-65 | **entschieden 06.11.:** ja, immer, per Codewort der Trainer:in |
| Freigabe durch die Trainer:in | Codewort am Gerät der Lernenden | Codewort im Browser | SR-65 (serverseitig, Hash, Sperre, ein Codewort je Kohorte); SR-67 (eigener Login, Stage Later) | **entschieden 06.11.:** Codewort am Gerät der Lernenden, eins je Kohorte für beide Gates |
| Peer-Einschätzung | ein Set Items, „wer sie gemacht hat“ wird gespeichert | am selben Gerät, ohne Identität | SR-89 | **entschieden 06.11.:** nur die Rolle „Peer“ wird gespeichert |
| Ergebnis „bestanden / nicht bestanden“ | offen | K.-o.-Kriterien (Funktion, Schutzmaßnahmen) führen zur Nacharbeit | SR-66 (Stage Later, im Pilot nicht umgesetzt); SR-89 | **entschieden 06.11.:** kein eigenes Ergebnis; nur ein K.-o.-Kriterium mit 0 in der Trainer-Einschätzung verhindert die Anrechnung. Was Lernende danach tun, klärt das Trainer-Feedback |
| Dateien je Auftrag | Zusatzmaterial je Auftrag, Hilfen auch von Lernenden | Hilfen mit eigenem Upload | SR-68 (Lektionen und Praxisaufgaben); SR-88 (Uploads der Lernenden) | Unterlagen je Auftrag von AfCJ nach SR-68, eigene Uploads nach SR-88 |
| Zusammenfassung als PDF | drucken oder als PDF speichern | Auftragsakte mit `window.print()` | SR-90 | Druckfunktion des Browsers reicht für den Pilot |
| Abschluss als Nachweis | nicht genannt | nur Auftragsakte | SR-02, SR-03, SR-89 | **entschieden 06.11.:** kein Verifizierungsschritt im Pilot; das System legt beim Abschluss die Verifizierung an (SR-03), außer bei K.-o. |
| Phasen-Namen | Informieren … Bewerten | ebenso | SR-64 (angeglichen) | im Code bleiben die ids aus demo (`analyse`, `durchfuehren`, `kontrolle`) oder werden beim Bau umbenannt |

## 4. Was dev schon hat

| Baustein | Tabelle bzw. Migration | Zugriff heute |
|---|---|---|
| Auftrag | `field_job_type` (0005, 0010, 0014, 0015): Titel, Beschreibung, `vorbereitung_text`, `nachbereitung_text`, Zuordnung zu Modul oder Programm | Learner lesen nur `published`, Schreiben nur AfCJ admin |
| Reflexionsfragen | `field_job_type_frage` (0011): `phase` start/abschluss, Single-Choice mit 3–5 Optionen | wie `field_job_type` |
| Praxistag einer Person | `field_job` (0005, 0011, 0026): Datum, Uhrzeit, `instructor_id`, Status geplant/durchgeführt, `ergebnis`, `problem_beschreibung` | Learner lesen die eigene Zeile und schreiben nur `durchgefuehrt_bestaetigt_am`, `ergebnis`, `problem_beschreibung` (0012) |
| Selbstauskunft | `field_capture` (0006, 0011, 0013) mit `text`, `media` (inaktiv), Status submitted/verified/rejected; `field_capture_antwort` | Learner schreiben die eigenen Zeilen, Status nur per Trigger; AfCJ admin liest |
| Verifizierung | `verification` (0006, 0009, 0032), Trigger setzt den Status der Selbstauskunft | AfCJ admin und Trainer:innen in ihren Kohorten (0032); unveränderlich, Korrektur per Storno |
| Kompetenzen | `field_job_type_competency_mapping` (0018, nur praktische Teilschritte, SR-71), `competency_evidence` zählt nur `verified` | lesen wie `competency_*` |
| Dateien | `file_asset`, `lesson_resource`, privater Bucket `lesson-resources` (0023) | an Lektionen gebunden, nicht an Aufträge |
| Trainer:in | Rolle `trainer` (0030), Login (0032), `fn_trainer_kohorten_ids()`, Bereich `/trainer` (Anwesenheit, SR-81) | lesen ihre Kohorten, Anwesenheit und Verifizierung anlegen |

Voraussetzung im Betrieb (belegt bei der Pilotauswertung, nicht im Schema): Trainer:innen der Praxistage müssen als Person mit Rolle `trainer` angelegt und `field_job.instructor_id` muss befüllt sein; sonst sehen sie die Kohorte in `/trainer` nicht (E3 über eigene Termine).

## 5. Entwurf Datenmodell

### 5.1 Regeln

- **Nur additiv:** neue Tabellen, neue Spalten mit Standardwert oder nullable, neue Funktionen; keine Änderung bestehender Spalten, Constraints oder Rechte. Ein neuer Bucket gilt als additiv, wenn ein pgTAP-Test belegt, dass kein bestehender Bucket gelockert wird.
- **Nummern:** fortlaufend ab der nächsten freien Nummer auf `dev` (derzeit 0058). Die frühere Reservierung 0035–0049 gilt nicht mehr.
- **Migrationen** gehen als kleine eigene PRs nach `dev` und werden danach auf Staging angewendet; App-Code kann auf einem Feature-Branch bleiben, bis er nach `dev` geht.
- **Einschalten je Auftrag:** `field_job_type.ablauf` mit Standard `einfach`; nur `gefuehrt` zeigt den neuen Ablauf. Rückfall ohne Datenverlust.
- **Übergänge nur serverseitig** über RPCs (security definer, atomar, SR-08). Lernende schreiben keine Phase und keinen Fortschritt direkt.

### 5.2 Vorschlag: Fortschritt als JSON, Dateien und Codewort als Tabellen

Plan, Haken, Kontrollschritte und Einschätzungen sind je Praxistag klein und werden nur über RPCs geschrieben. Ein `jsonb`-Feld an `field_job` spart vier Tabellen samt Policies; Dateien und Codewort brauchen dagegen eigene Tabellen (Storage-Rechte, Hash, Sperre).

| Element | Ort | Spalten bzw. Felder |
|---|---|---|
| Ablauf je Auftrag | `field_job_type.ablauf` | `text not null default 'einfach' check (ablauf in ('einfach','gefuehrt'))` |
| Auftragsnummer | `field_job_type.nummer` | `text unique`, nullable (z. B. `M02-A03`); Schlüssel für den Import (Abschnitt 6) |
| Phase | `field_job.phase`, `field_job.phase_seit` | `text not null default 'informieren' check (phase in ('informieren','planen','entscheiden','ausfuehren','kontrollieren','bewerten','abgeschlossen'))`; kein Schreibrecht für Lernende |
| Fortschritt | `field_job.praxisflow` | `jsonb not null default '{}'`; Felder: `werkzeuge[]`, `materialien[]`, `schritte[] {id, text, erledigt_am}`, `plan_bestaetigt_am`, `kontrolle[] {id, erledigt_am}`, `inbetriebnahme_freigegeben_am`, `einschaetzung {selbst, peer, trainer: {kriterium: punkte}}`, `trainer_freigegeben_am`, `naechstes_mal` (Freitext), `verlauf[] {zeit, text}`; Schreiben nur über RPC |
| Dateien (SR-88) | neue Tabelle `field_job_datei` | `organisation_id`, `field_job_id`, `art` (`auftrag`, `hilfe`, `plan`, `protokoll`), `storage_pfad`, `dateiname`, `mime_type`, `groesse`; Lesen, Anlegen und Löschen nur durch die lernende Person selbst, Löschen nur bis zum Abschluss des Auftrags |
| Unterlagen je Auftrag (von AfCJ) | neue Tabelle `field_job_type_unterlage` | `field_job_type_id`, `reihenfolge`, `kuerzel`, `titel`, `file_asset_id`; unique (`field_job_type_id`, `reihenfolge`) |
| Codewort (SR-65) | neue Tabelle `praxis_codewort` | `organisation_id`, `cohort_id` (ein Codewort je Kohorte, gilt für beide Gates `zuschalten` und `bewertung`), `hash`, `geaendert_am`; kein Lese- oder Schreibrecht für Lernende |
| Fehlversuche | neue Tabelle `praxis_codewort_versuch` | `field_job_id`, `gate`, `versucht_am`, `erfolgreich`; Sperre nach N Fehlversuchen (SR-65, N offen) |

Storage: ein **privater** Bucket `praxis-dateien`, Zugriff nur über signierte Links (Muster `lesson-resources`, `profilfotos`). Pfad `<learner_id>/<field_job_id>/<uuid>.<ext>`; die Storage-Policies erlauben Lesen und Hochladen nur, wenn der erste Pfadteil die eigene `auth.uid()` ist, Löschen zusätzlich nur, solange der Praxistag nicht abgeschlossen ist. In der Plattform sieht niemand sonst die Dateien, auch keine Trainer:in und kein AfCJ admin (SR-88); erreichbar sind sie nur über den Supabase-Zugang des Projekts. Formate (entschieden 06.11.) wie demo (`UPLOAD_FORMATE`): Bilder und PDF überall, CSV/Excel, bei Plänen zusätzlich DWG, DXF, GLB. Größengrenze 50 MB je Datei (Bucket-Einstellung und Prüfung vor dem Upload).

Später ohne Umbau möglich (Vermutung): JSON-Felder in Tabellen überführen (additive Migration plus Datenskript), Kriterien und Kontrollschritte je Auftrag statt global.

### 5.3 RPCs (Vorschlag)

Jede Funktion prüft Eigentum (`learner_id = auth.uid()`), `ablauf = 'gefuehrt'`, aktuelle Phase und Voraussetzungen und schreibt einen Eintrag in `verlauf`.

| RPC | Voraussetzung | Wirkung |
|---|---|---|
| `fn_praxis_informieren_fertig(job)` | mindestens eine Datei `auftrag` | `phase = planen` |
| `fn_praxis_plan_speichern(job, plan)` | Phase `planen` oder `entscheiden` | Listen speichern, Texte ≤ 300 Zeichen |
| `fn_praxis_plan_bestaetigen(job)` | mindestens ein Arbeitsschritt | `phase = ausfuehren`, `plan_bestaetigt_am`; „zurück zum Plan“ setzt `phase = planen` |
| `fn_praxis_schritt_abhaken(job, schritt)` | alle früheren Schritte erledigt | `erledigt_am`; nach dem letzten `phase = kontrollieren`, `durchgefuehrt_bestaetigt_am` setzen (bestehender Trigger leitet `status` ab) |
| `fn_praxis_kontrolle_abhaken(job, punkt)` | Reihenfolge der Kontrollschritte; Punkte unter Spannung erst nach Freigabe | `erledigt_am` |
| `fn_praxis_gate(job, gate, codewort)` | Codewort korrekt, nicht gesperrt (SR-65) | `inbetriebnahme_freigegeben_am` bzw. `trainer_freigegeben_am`; Versuch protokolliert |
| `fn_praxis_einschaetzen(job, rolle, werte)` | `selbst` und `peer` ohne Codewort, `trainer` nur nach Gate `bewertung` | Punkte je Kriterium auf der jeweiligen Skala |
| `fn_praxis_abschliessen(job, naechstes_mal)` | alle Kontrollschritte erledigt, Datei `protokoll` vorhanden, drei vollständige Einschätzungen | `phase = abgeschlossen`, danach keine Änderung mehr; legt `field_capture` (phase `abschluss`) an und, wenn kein K.-o.-Kriterium in der Trainer-Einschätzung 0 ist und `field_job.instructor_id` gesetzt ist, in derselben Transaktion eine `verification` (`verified`, `verifiziert_von = instructor_id`, Kommentar „automatisch, Praxisflow“) |

Einschätzungen sind **keine** Nachweise. Nachweis entsteht weiter nur über eine Verifizierung (Regel 6 in `CLAUDE.md`).

## 6. Import aus der Auftrags-Excel der Fachlichen Leitung Praxis

Gilt aus der Fassung vom 14.10. weiter: Spalten **Nummer**, **Titel**, **Modul**, **Teilschritte**, **Unterlagen-Nr.**, **Unterlagen**, **In Plattform zeigen**, **Ordner Praxisinhalte**, **Offen**.

| Spalte | Ziel | Bemerkung |
|---|---|---|
| Nummer | `field_job_type.nummer` (neu, eindeutig) | Schlüssel; Wiederholung aktualisiert statt zu verdoppeln; Werte aus `kategorie` übernehmen, `kategorie` bleibt stehen |
| Titel | `field_job_type.titel` | |
| Modul | Zuordnung zum Modul | `field_job_type` hängt über `module_id` an einer Woche; Entscheidung Woche oder neue Spalte `modul_id` offen |
| Teilschritte | `field_job_type_competency_mapping` | Zuordnung über Kompetenz und Name (Import aus PR #102); nur praktische Teilschritte (SR-71) |
| Unterlagen | `field_job_type_unterlage` + `file_asset` | je Dateiname eine Zeile, `kuerzel` aus dem Präfix (AA, AU, BB, ML) |
| In Plattform zeigen | `field_job_type.status` | ja = `published` |

Ablauf wie die Skripte in `scripts/sql/`: zuerst Probelauf mit Zählung (neue und geänderte Aufträge, fehlende Dateien, unbekannte Teilschritte und Kürzel), danach erst Speichern. Belegt am 14.10.: nur ein Auftrag (M02-A03, Unterlagen E-02) hatte vollständige Unterlagen.

## 7. Zugriffsregeln je Rolle

Erweiterung der Zugriffsmatrix (Regel 3 in `CLAUDE.md`): `docs/access-matrix.md` wird im selben PR wie die Migration angepasst. Trainer-Rechte über die vorhandene `fn_trainer_kohorten_ids()` (Kohorten mit eigenem Termin).

| Daten | Learner | Trainer:in | AfCJ admin | Manager |
|---|---|---|---|---|
| `field_job.phase`, `praxisflow` | eigene lesen; schreiben nur über RPC | lesen in ihren Kohorten | alle | — |
| `field_job_datei`, Bucket `praxis-dateien` (SR-88) | eigene anlegen, lesen und löschen | — | — (nur über den Supabase-Zugang) | — |
| Unterlagen je Auftrag | lesen, wenn ein Praxistag dieses Typs existiert | lesen | alles | — |
| Codewort, Fehlversuche | nichts | nichts (Vorschlag; Pflege durch AfCJ) | alles, Sperre aufheben | — |
| Peer-Einschätzung | über die RPC am eigenen Gerät | lesen | lesen | — |
| Trainer-Einschätzung | eintragen nur nach Codewort am eigenen Gerät; lesen erst nach Abschluss (Vorschlag) | lesen | lesen | — |
| Verifizierung | lesen eigene | anlegen in ihren Kohorten (0032) | alles | lesen Ergebnis |

Im Pilot legt nur `fn_praxis_abschliessen` (security definer) die Verifizierung an; Lernende erhalten kein Schreibrecht auf `verification` (SR-03).

Der Fortschritt abgeschlossener Praxistage wird nicht mehr geändert und nicht gelöscht; kein Code darf das tun (wie Regel 7). Dateien darf die lernende Person löschen (SR-88).

Folge (Entscheidung Produktleitung 06.11.2026, für den Pilot): Weil Trainer:innen die Dateien nicht sehen, prüfen sie Prüfprotokoll und Pläne am Gerät der Lernenden oder auf Papier, nicht in der Plattform.

## 8. Produktfragen

Entschieden am 06.11.2026 (Produkt-Lead, Einträge in `decisions.md`):
- **Freigabe vor dem Zuschalten:** ja, immer, per Codewort der Trainer:in.
- **Codewort:** am Gerät der Lernenden, ein Codewort je Kohorte für beide Gates; Trainer-Login bleibt SR-67.
- **Peer:** nur die Rolle „Peer“, nicht die Person.
- **Anrechnung:** kein Verifizierungsschritt im Pilot; das System verifiziert beim Abschluss, außer ein K.-o.-Kriterium ist in der Trainer-Einschätzung 0.
- **Uploads:** Formate wie demo, 50 MB je Datei, sichtbar nur für die lernende Person, löschen bis zum Abschluss.

Offen:
1. **Fehlschlag.** Was tun Lernende nach einem durchgefallenen K.-o.-Kriterium: Auftrag neu, nur Ausführen oder Kontrollieren wiederholen, nur Vermerk? Frage an die Trainer:innen (Notion: „Feedback zum Praxisflow“).
2. **Inhalte.** Die 9 Kontrollschritte und die Items der Einschätzung: global für Modul II oder je Auftrag? Wer liefert die endgültigen Texte und Stufenbeschreibungen?
3. **Prüfprotokoll.** PDF aus dem Prüfgerät oder Foto; Pflicht für jeden Auftrag?
4. **Datenschutz.** Aufbewahrung der Uploads; die Datenschutzerklärung (Abschnitt „Uploads“) muss vor dem Einsatz ergänzt werden (`docs/datenschutz-offene-punkte.md`).
5. **Welche Aufträge** bekommen `ablauf = 'gefuehrt'`, und liegen für sie Unterlagen vor?
6. **Nach dem Pilot:** Verifizierung automatisiert oder über eine Trainer-Ansicht.

## 9. Anforderungen (SR)

SR-Nummern und SR-Texte entstehen nur in Notion. Stand des Abgleichs (belegt, Notion am 06.11.2026):

- **Vorhanden und tragend:** SR-64 (Phasen und Schritte in Reihenfolge, serverseitig), SR-65 (Codewort-Gate serverseitig), SR-08 (atomare Schreibvorgänge), SR-71 (praktische Teilschritte), SR-81 (Trainer:in bestätigt Anwesenheit am Praxistag).
- **Am 06.11.2026 in Notion angepasst:** SR-03 (automatische Verifizierung beim Abschluss im Praxisflow), SR-64 (Phasen-Namen; Abfragen sind Listen-Eingaben, Abhaken und Punktwahl), SR-65 (ein Codewort je Kohorte, zwei Gates), SR-66 (Stage Later, im Pilot nicht umgesetzt), SR-68 (Dateien auch je Praxisaufgabe), SR-88 (Löschen nur bis zum Abschluss), SR-89 (nur K.-o. in der Trainer-Einschätzung blockiert die Anrechnung; Peer nur als Rolle).
- **Neu:** SR-88 (Uploads der Lernenden, nur für sie selbst sichtbar, löschbar), SR-89 (Selbst-, Peer- und Trainer-Einschätzung), SR-90 (Zusammenfassung des Auftrags zum Drucken bzw. als PDF).
- **Neu zu bewerten:** SR-82 (Bezug zum neuen Ablauf).
- **SR folgt** für: Import der Aufträge mit Nummer und Unterlagen.

## 10. Aufwand und Schnitt

### 10.1 Aufwand je Paket (geschätzt, optimistisch–vorsichtig)

Die Bausteine aus demo (`src/components/praxisflow/*`, „Jetzt dran“, `praxisflow-logik.ts` mit Tests) werden übernommen; die Arbeit liegt im Umstellen von `localStorage` auf RPCs und Storage.

| Paket | Stunden |
|---|---|
| Migration Ablauf, Phase, `praxisflow jsonb`, RPCs, pgTAP | 12–18 |
| Migration Dateien: Tabelle, Bucket, Storage-Policies, pgTAP | 8–12 |
| Migration Codewort: Hash, Fehlversuche, Sperre, RPC, pgTAP (SR-65) | 6–9 |
| Informieren und Unterlagen-Leiste mit Upload und Vorschau | 4–6 |
| Planen und Entscheiden (Listen-Editor, Zusammenfassung, zurück zum Plan) | 5–8 |
| Ausführen und Kontrollieren (Abhaken, Freigabe, Protokoll-Upload) | 5–8 |
| Bewerten (drei Einschätzungen, Codewort, Freitext, Vergleich) | 6–9 |
| Auftragsakte, Zusammenfassung zum Drucken | 2–4 |
| Einstieg: `/praxistag/[id]` verzweigt nach `ablauf`, Verweise aus Home und Programm | 3–5 |
| Inhalte einspielen (Kontrollschritte, Bewertungsbogen, Unterlagen, `ablauf` je Auftrag) | 4–8 |
| Doku, Zugriffsmatrix, Datenschutzerklärung, SR, Traceability | 5–8 |
| Tests, Abnahme auf Staging, Korrekturen | 8–12 |
| **Summe** | **68–107** |

### 10.2 Schnitt (Vorschlag)

**Pilot-Schnitt:** alle sechs Phasen mit Speicherung auf dem Server, Uploads, Codewort serverseitig (SR-65), Kontrollschritte und Bewertungsbogen global im Code, `ablauf = 'gefuehrt'` nur für Aufträge mit Unterlagen. Ohne Trainer-Ansicht für Einschätzungen, ohne Neueinreichung, ohne Export. Etwa **60–90 h**.

**Danach:** Trainer-Ansicht und Verifizierung (SR-67, SR-82), Kriterien und Kontrollschritte je Auftrag, Neueinreichung, Export des Nachweis-Bündels.

**Kleiner, falls die Zeit nicht reicht (Vermutung: −15 bis −25 h):** Codewort als einfacher serverseitiger Vergleich ohne Sperre und Fehlversuchs-Tabelle (SR-65 dann nur teilweise erfüllt), Unterlagen je Auftrag als Dateien im Auftragstext statt eigener Tabelle.

**Rückfall:** Ohne `ablauf = 'gefuehrt'` läuft der einfache Praxistag von `dev` unverändert.

### 10.3 Was ohne die offenen Fragen schon gebaut werden kann

Nach den Entscheidungen vom 06.11. ist der ganze Ablauf baubar: Dateien, `ablauf` und `phase`, das JSON für Plan und Haken, Codewort, alle sechs Phasen und der Abschluss mit automatischer Verifizierung. Von den offenen Punkten in Abschnitt 8 hängen nur Texte und Inhalte ab (Kontrollschritte, Items, Prüfprotokoll) sowie das Verhalten nach einem durchgefallenen K.-o.-Kriterium; bis zur Klärung endet der Auftrag dann ohne Anrechnung.
