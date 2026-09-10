# Zugriffsmatrix — Qualifizierungsplattform Elektrofachkraft Erneuerbare Energien (Prototyp)

> Quelle: Notion-Playbook "MVP April 2027: Product Development Playbook", Schritt 4c. Stand 2026-09-09.
>
> Diese Datei wird zusammen mit `data-model.md` gelesen — dort steht auch die Instruktion an Claude Code und die Review-Checkliste.

## Rollen (Kurzreferenz aus Schritt 1)

| Rolle | Wer | Phase | Bemerkung |
|---|---|---|---|
| Learner | Mitarbeitende:r in einem Qualifizierungsprogramm | Prototype | |
| Instructor / Team Lead | Ausbilder:in/Meister:in beim Betrieb | MVP | Existiert im Prototyp noch nicht als eigene Rolle |
| AfCJ trainer | AfCJ-Trainer:in für Live-Sessions | V1 | Existiert im Prototyp noch nicht als eigene Rolle |
| Manager | Ops/HR/L&D-Lead beim Betrieb | V1 | Existiert im Prototyp noch nicht als eigene Rolle |
| AfCJ admin | Wir | Prototype | Deckt im Prototyp Instructor-, Trainer- und Manager-Aufgaben mit ab |

## Vokabular

- **Own** — nur Datensätze über sich selbst
- **Org** — alle Datensätze mit der eigenen Employer-`organisation_id`
- **Cohort** — Datensätze der Kohorten, denen man zugewiesen ist
- **All** — alles
- **—** — nichts

Diese Matrix wird direkt zu RLS-Policies in Supabase. Weil sie in der Datenbank liegt, nicht in der App, hält sie auch, wenn ein Screen falsch gebaut wird.

## Matrix

| Entity / Group | Learner | Instructor / Team Lead | AfCJ trainer | Manager | AfCJ admin |
|---|---|---|---|---|---|
| Organisation, membership | read Own; write — | read Org; write — | read Own; write — | read Org; write — | read All; write All |
| Qualification structure (curriculum, competencies, mappings) | read All (nur veröffentlicht); write — | read All (nur veröffentlicht); write — | read All (nur veröffentlicht); write — | read All (nur veröffentlicht); write — | read All; write All |
| Cohort, schedule, live sessions | read Own; write — | read Cohort; write — | read Cohort; write Cohort | read Org; write — | read All; write All |
| Enrolment | read Own; write — | read Cohort; write — | read Cohort; write — | read Org; write — | read All; write All |
| Field job | read Own; write — | read Cohort; write Cohort | —; — | read Org; write — | read All; write All |
| Unit progress | read Own; write Own | read Cohort; write — | read Cohort; write — | read Org; write — | read All; write All |
| Attendance | read Own; write — | read Cohort; write Cohort | read Cohort; write Cohort | read Org; write — | read All; write All |
| Field capture — Status/Ergebnis | read Own; write — | read Cohort; write — | —; — | read Org; write — | read All; write — |
| Field capture — Rohinhalt (Text/Media) | read Own; write Own | read Cohort; write — | —; — | —; — | read All; write — |
| Verification | read Own; write — | read Cohort; write Cohort | —; — | read Org (nur Ergebnis); write — | read All; write All |
| Competency evidence / profile | read Own; write — | read Cohort; write — | —; — | read Org; write — | read All; write — |
| Knowledge sources | —; — | —; — | —; — | —; — | read All; write All |
| Guidance conversations | *(leer — Build next, nicht Prototyp)* | | | | |

## Anmerkungen

- **Field job** und **Field capture** (in zwei Zeilen gesplittet: Status/Ergebnis vs. Rohinhalt) trennen bewusst "ob etwas erledigt wurde" von "was genau drinsteht" — weil ein Manager laut 4d-Entscheidung nur Status/Ergebnis sehen darf, nie den Rohinhalt (Text/Media).
- **Competency evidence / profile** hat bewusst kein Write für irgendeine Rolle — folgt aus der "computed only"-Entscheidung in `data-model.md` (4d): Werte entstehen ausschließlich über `unit_progress`/`attendance`/`verification`.
- **AfCJ trainer** ist im Prototyp überwiegend "—", weil die Rolle noch nicht real existiert (Admin deckt sie ab) — die Spalte bleibt zur Vorbereitung auf MVP stehen.
- **Guidance conversations** bleibt leer: Build next, noch nicht Prototype, daher kein Zugriffsbedarf jetzt.
