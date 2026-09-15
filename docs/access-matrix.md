# Access Matrix — AfCJ MVP-Prototyp

Quelle: [MVP April 2027 — Product Development Playbook](https://app.notion.com/p/climatejobsacademy/MVP-April-2027-Product-Development-Playbook-3ce48915565b810db222c7e70679063b) (Notion), Schritt 4c, ergänzt um Team-Entscheidungen vom 2026-09-11 zu den offenen Fragen aus dem ersten Build-Task (siehe `open-questions.md`). Stand: 2026-09-11.

Diese Tabelle wird wörtlich zu den RLS-Policies in der Datenbank. Weil die Regeln in der Datenbank liegen und nicht in der App, halten sie auch, wenn ein Screen falsch gebaut wird. Zugriff nie über das hier Gelistete hinaus erweitern, keine Rollen erfinden — siehe `data-model.md`.

## Zugriffs-Vokabular

Jede Zelle nennt, was eine Rolle **read** und was sie **write** darf, aus einem festen Vokabular:

| Wert | Bedeutung |
|---|---|
| Own | nur Datensätze über sich selbst |
| Org | alle Datensätze mit der eigenen Employer-Organisation-ID |
| Cohort | Datensätze der Kohorten, denen man zugewiesen ist (relevant für AfCJ trainer) |
| All | alles |
| — | nichts |

Prinzip: im Zweifel die engere Option. Erweitern ist später eine Zeile Code, Verengen nach Gewöhnung ein Kundengespräch.

## Rollen

Learner · Instructor / Team Lead · AfCJ trainer · Manager · AfCJ admin

## Matrix

| Entity / group | Learner | Instructor / Team Lead | AfCJ trainer | Manager | AfCJ admin |
|---|---|---|---|---|---|
| Organisation, membership | read Own; write — | read Org; write — | read Own; write — | read Org; write — | read All; write All |
| Qualification structure (Curriculum, Kompetenzen, Mappings) | read All (nur veröffentlicht); write — | read All (nur veröffentlicht); write — | read All (nur veröffentlicht); write — | read All (nur veröffentlicht); write — | read All; write All |
| Cohort, schedule, live sessions | read Own; write — | read Cohort; write — | read Cohort; write Cohort | read Org; write — | read All; write All |
| Enrolment | read Own; write — | read Cohort; write — | read Cohort; write — | read Org; write — | read All; write All |
| Field job | read Own; write Own (nur `durchgeführt_bestätigt_am`, `ergebnis`, `problem_beschreibung` — sonst nichts) | read Cohort; write Cohort | —; — | read Org; write — | read All; write All |
| Field job type, Field job type frage | read All (nur published); write — | read All (nur published); write — | read All (nur published); write — | read All (nur published); write — | read All; write All |
| File assets | read All; write — | read All; write — | read All; write — | read All; write — | read All; write All |
| Unit progress | read Own; write Own | read Cohort; write — | read Cohort; write — | read Org; write — | read All; write All |
| Attendance | read Own; write — | read Cohort; write Cohort | read Cohort; write Cohort | read Org; write — | read All; write All |
| Field capture — Status/Ergebnis | read Own; write — | read Cohort; write — | —; — | read Org; write — | read All; write — |
| Field capture — Rohinhalt/Antworten (Text/MC-Antworten/Media) | read Own; write Own | read Cohort; write — | —; — | —; — | read All; write — |
| Verification | read Own; write — | read Cohort; write Cohort | —; — | read Org (nur Ergebnis); write — | read All; write All |
| Competency evidence / profile | read Own; write — | read Cohort; write — | —; — | read Org; write — | read All; write — |
| Knowledge sources | —; — | —; — | —; — | —; — | read All; write All |
| Guidance conversations | — (noch nicht Prototype) | — (noch nicht Prototype) | — (noch nicht Prototype) | — (noch nicht Prototype) | — (noch nicht Prototype) |

## Anmerkungen

Entschieden 2026-09-04: Zehn von zwölf Zeilen ausgefüllt bei Erstanlage. "Field job" war zunächst offen (hängt an der Praxistag-Journey), ist mit Ergänzung 2026-09-09 als KI-Entwurf befüllt, analog zu Enrolment/Attendance — zur Bestätigung durch Malte zusammen mit Group 3 in `data-model.md` (Group 3 gilt dort bereits als abgenommen, da Malte vor Prototyp-Start kein Review mehr leisten kann). "Guidance conversations" bleibt leer, weil die zugrunde liegende Entität noch nicht Prototype ist (Build next).

"Field capture" ist bewusst in zwei Zeilen gesplittet, weil das feste Zugriffs-Vokabular (Own/Org/Cohort/All/—) "Status ja, Rohmaterial nein" nicht in einer Zelle ausdrücken kann — Begründung siehe die Manager-Media-Access-Entscheidung in `data-model.md` (Open Decisions). "Competency evidence / profile" hat bewusst kein Write für irgendeine Rolle — folgt aus der "computed only"-Entscheidung dort; Werte entstehen ausschließlich über `unit_progress`/`attendance`/`verification`. AfCJ trainer ist im Prototyp überwiegend "—", weil die Rolle noch nicht real existiert (AfCJ admin deckt sie ab) — die Spalte bleibt zur Vorbereitung auf das MVP stehen.

Entschieden 2026-09-11: "Field job" bekommt entgegen der ursprünglichen Annahme doch ein Learner-Write — aber bewusst eng auf drei Felder begrenzt (Bestätigungs-Zeitstempel, Ergebnis erledigt/Problem, Problembeschreibung), nicht auf die ganze Zeile. Grund: Der Praxistag-Flow braucht einen expliziten Bestätigungs-Schritt der Lernenden, unabhängig von den Start-/Abschluss-Fragen (die weiterhin ausschließlich über `field_capture`/`field_capture_antwort` laufen, siehe "Field capture" oben). "Field job type" und "File assets" waren bisher nicht als eigene Zeilen dokumentiert (siehe `open-questions.md`) — jetzt nachträglich ergänzt: beides lesend für alle offen, Schreiben ausschließlich AfCJ admin im Backend. "Field job type" zusätzlich mit "nur published", analog zur Qualification structure.

Zu "Cohort, schedule, live sessions" — Learner read Own: Die RLS-Policy `live_session_learner_select` prüft für `live_session` ausschließlich `schedule_entry.cohort_id`, nicht `enrolment_id`. Für `art = 'live'`-Einträge in `schedule_entry` muss deshalb immer `cohort_id` gesetzt sein, nie `enrolment_id` — passt zum konzeptionellen Verständnis "Live-Sessions sind kohortenweit" (siehe `data-model.md`, Group 3), ist aber nirgends als DB-Constraint erzwungen. Ein versehentlich `enrolment_id`-basierter live-Eintrag ist für den Learner unsichtbar (Tagesansicht zeigt nichts), wird aber in der Wochenübersicht trotzdem mitgezählt — am 2026-09-15 als Seeding-Fehler entdeckt und bestätigt, keine Code-Änderung nötig.
