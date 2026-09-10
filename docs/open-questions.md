# Offene Fragen an Vera/Malte

> Aus der Instruktion (data-model.md, 4e): "Baue nichts über das hier Gelistete
> hinaus. Fehlt aus deiner Sicht etwas: als offene Frage zurückmelden, nicht
> einfach ergänzen." Diese Datei sammelt jede Stelle, an der Schema oder RLS eine
> Annahme treffen mussten, weil `data-model.md`/`access-matrix.md` keinen
> eindeutigen Wert vorgeben. Nichts davon blockiert den aktuellen Migrations-Stand —
alles ist mit einer expliziten, im Code kommentierten Annahme umgesetzt.

## Q-PUBLISHED — "nur veröffentlicht" für Qualification structure

`access-matrix.md` sagt für Learner auf `programme/module/course/lesson/
competency/competency_step/content_competency_mapping`: "read All (nur
veröffentlicht)". `data-model.md` definiert für keine dieser Entitäten ein
Veröffentlichungs-/Status-Feld.

**Umgesetzt als:** read All ohne Filter (jede Zeile ist für Learner sichtbar,
sobald sie existiert) — siehe `0009_rls_policies.sql`.
**Frage:** Soll es ein `status` (z. B. `entwurf`/`veröffentlicht`) auf einer oder
mehreren dieser Entitäten geben? Falls ja: auf welcher Ebene (nur `course`? auch
`lesson`?), und was passiert mit bereits laufenden Kohorten, wenn ein Kurs auf
"Entwurf" zurückgesetzt wird?

## Q-ENROLMENT-STATUS / Q-ATTENDANCE-STATUS — fehlende Wertelisten

`enrolment.status` und `attendance.status` sind laut Übersetzungsregeln
Statusfelder mit fester Werteliste, aber `data-model.md` nennt keine Werte (anders
als z. B. bei `unit_progress.status` oder `field_capture.status`).

**Umgesetzt als Annahme:**
- `enrolment.status`: `aktiv` / `abgeschlossen` / `abgebrochen`
- `attendance.status`: `anwesend` / `abwesend` / `entschuldigt`

**Frage:** Passen diese Werte, oder gibt es bereits eine andere Konvention (z. B.
aus dem Notion-Playbook), die hier gelten soll?

## Q-LESSON-INHALT — Struktur von `lesson.inhalt`

`data-model.md`: "`inhalt` (je nach content_type: SCORM-Paket-Referenz, leer bei
live, Datei-/Link-Referenzen bei repository)" — für `repository` explizit im
Plural ("Referenzen"), es ist aber nur ein Attribut vorgesehen, keine eigene
N:M-Tabelle.

**Umgesetzt als:** `lesson.inhalt jsonb`, flexibel je `content_type` befüllt (z. B.
`{"file_asset_id": "..."}` bei scorm, `{"items": [{"file_asset_id" oder "url": ...}]}`
bei repository, `null` bei live).
**Frage:** Ist diese jsonb-Form für den Content-Editor/Import praktikabel, oder
wird doch eine eigene `lesson_content_item`-Tabelle (1 Lektion : n Dateien/Links)
gebraucht? Aktuell bewusst nicht gebaut, um nicht über die Attributliste
hinauszugehen.

## Q-FIELD-JOB-TYPE-ACCESS — kein Zeile in access-matrix.md

`field_job_type` (die Katalog-Übungstypen) taucht in `access-matrix.md` nicht als
eigene Zeile auf — nur `field_job` (der konkrete Einsatz) hat eine Zeile.

**Umgesetzt als:** wie Qualification structure behandelt — read All für alle
eingeloggten Rollen, write nur AfCJ admin (Katalogdaten, nicht personenbezogen).
**Frage:** Ist das korrekt, oder sollte `field_job_type` denselben
Sichtbarkeitsregeln wie `field_job` (Own/Cohort/Org) folgen?

## Q-FILE-ASSET — keine Zeile in access-matrix.md, gemischtes Ownership

`file_asset` wird von mehreren Entitäten mit unterschiedlicher Sensibilität
referenziert (Lektion-Content, `field_job_type`-Bilder, `knowledge_source` — alle
AfCJ-weit; aber laut Owner-Spalte auch "Employer", vermutlich für zukünftige
Learner-/Employer-eigene Uploads wie `field_capture.media`).

**Umgesetzt als:** read All / write nur AfCJ admin — das ist für den aktuellen
Prototyp korrekt, weil `field_capture.media` laut data-model.md selbst "schema-
bereit, inaktiv" ist, also aktuell nur AfCJ-weiter Content tatsächlich befüllt
wird.
**Frage/Achtung:** Sobald Feld-Medien aktiv werden, braucht `file_asset` eine
eigene, vom referenzierenden Kontext abhängige RLS-Policy (Own für den
hochladenden Learner, Cohort/Org/All je nach Rolle wie bei "Field capture —
Rohinhalt") — das ist heute bewusst noch nicht gebaut.

## Q-PERSON-GESCHLECHT — Freitext oder feste Werteliste?

`geschlecht` ist in `data-model.md` als einfaches Attribut gelistet, nicht als
"Statusfeld" markiert. Die generelle Übersetzungsregel ("Statusfelder verwenden
eine feste Werteliste") wurde daher hier bewusst *nicht* angewendet.

**Umgesetzt als:** `text`, nullable, ohne Check-Constraint.
**Frage:** Soll es doch eine feste, kurze Werteliste geben (z. B. für Reporting),
oder ist Freitext/optional hier gewollt?

## Q-FUTURE-ROLES — Instructor/Team Lead, AfCJ trainer, Manager

`role_assignment.rolle` erlaubt im Prototyp nur `learner`/`afcj_admin`
(data-model.md: "Im Prototyp nur zwei Rollen-Werte"). Die RLS-Policies in
`0009_rls_policies.sql` setzen deshalb nur die Learner- und AfCJ-admin-Spalten der
Zugriffsmatrix um; die Instructor/Trainer/Manager-Spalten sind dokumentiert, aber
im Prototyp nicht erreichbar (keine Person hat diese Rolle).

**Kein Blocker jetzt**, aber zur MVP-Planung: neue `rolle`-Werte brauchen jeweils
eigene Policies (z. B. Instructor: read/write Cohort statt Own/All) — die
Cohort-Berechnung müsste dann über zugewiesene Kohorten des Instructors laufen,
nicht über Enrolment.

## Q-CAPTURE-PENDING-UI — "pending" existiert nicht als eigener Status

`design-specifications.md` (Abschnitt 2.3) spricht im UI von Verifizierungs-
Status "pending"/"verified"/"rejected". Im Schema gibt es kein `pending`:
`field_capture.status` startet als `submitted` und wird erst durch eine
`verification`-Zeile (via Trigger) zu `verified`/`rejected`. "Pending" ist also
implizit "`field_capture.status = 'submitted'` und noch keine `verification`
vorhanden", nicht ein eigener Datenbankwert.

**Nichts geändert am Schema** (kein `pending`-Wert ergänzt, um nicht über die
Attributliste in `data-model.md` hinauszugehen).
**Frage:** Reicht diese Ableitung fürs Frontend (Anzeige "pending" wenn
`status = 'submitted'`), oder soll `field_capture.status` doch einen expliziten
`pending`-Wert bekommen, der `submitted` ersetzt/ergänzt?

## Reminder aus data-model.md selbst (nicht neu, aber hier verlinkt)

- **Löschprotokoll DSGVO vs. AZAV** (4d): bewusst *nicht* in diesen Migrationen
  umgesetzt — laut Entscheidung braucht das Rechts-/Datenschutzberatung vor dem
  zweiten Kohorten-Durchgang bzw. MVP-Launch, nicht als stille Schema-Annahme.
- **`content_competency_mapping`-Pflicht** ("mindestens ein competency_step pro
  Lektion"): nicht als DB-Constraint erzwungen (Henne-Ei-Problem beim Anlegen
  einer neuen Lektion). Muss beim Content-Editor/Import geprüft werden, nicht in
  der Datenbank.
