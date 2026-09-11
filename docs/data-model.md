# Data Model — AfCJ MVP-Prototyp

Quelle: [MVP April 2027 — Product Development Playbook](https://app.notion.com/p/climatejobsacademy/MVP-April-2027-Product-Development-Playbook-3ce48915565b810db222c7e70679063b) (Notion), Schritt 4a/4b/4d, ergänzt um Team-Entscheidungen vom 2026-09-11 zu den offenen Fragen aus dem ersten Build-Task (siehe `open-questions.md`). Stand: 2026-09-11.

Dieses Dokument ist zusammen mit `/docs/access-matrix.md` die verbindliche Grundlage für Datenbank-Migrationen und RLS-Policies. Nichts über das hier Gelistete hinaus bauen; fehlt etwas, ist das eine Rückfrage, keine Annahme.

## Subsystems (Kontext aus Schritt 4a)

Ein Subsystem ist keine fachliche Kategorie, sondern eine technische Verantwortungs-Einheit: welcher Teil der Codebase/Infrastruktur übernimmt welche Aufgabe.

| Subsystem | Responsibility | Stage | Technology |
|---|---|---|---|
| App (Web + Field-PWA, eine Codebase, alle Rollen) | Alle Screens aller Rollen; Learner Day View; Field-Workflow als PWA-Route; Export/Reporting-Screens | Build now | Next.js, TypeScript |
| Backend / Admin interface | Betriebe, Kohorten, Live-Sessions, Wissensquellen, Verifizierung anlegen und verwalten. AfCJ trainer existiert im Prototyp nicht als eigene Rolle — alle Trainer-, Instructor- und Manager-Aufgaben laufen über AfCJ admin und diese Backend-UI. | Build now (Kernfunktionen) | Next.js, gleiche Auth wie Learner-App, eigenes Rollen-Gate |
| Data, login and media | Datenbank mit Access Policies, Magic-Link-Login; Media-Storage schema-bereit, nicht aktiv | Build now (Media: Later) | Supabase, EU-Region |
| Verified knowledge base | Wissensquellen (Normen, SOPs, Herstellerdokumente) kuratieren und freigeben; Live-Fachfragen während Sessions beantworten, ausschließlich aus freigegebenen Quellen mit Quellenangabe | Build now (Kuratieren) / Build next (Live-Antworten) | Server-seitige LLM-Funktionen, pgvector |
| External services | E-Mail-Benachrichtigungen; Video-Call-Link für Live-Sessions; AZAV-Nachweis-Export | Build now | z. B. Resend; Zoom/Teams |
| *(Vormerkung, nicht bauen)* | Offene API für Betriebssoftware (STREIT/HERO) | Later | — |

Future-proofing, nicht bauen: `field_capture` (Group 4) wird von Anfang an für Foto/Video/Narration-Attribute angelegt, auch wenn der Prototyp nur einen Text-Selbstbericht schreibt (Later, falls sich mediale Nachweise als sinnvoll erweisen). Schreiboperationen klein und in sich abgeschlossen halten, damit eine Offline-Queue später ohne Redesign andocken kann — für Prototyp/MVP nicht nötig, betrifft ausschließlich die Praxistag-Erfassung, nicht SCORM-Lektionen.

## Entities

Jede Entity wird eine Tabelle in der Datenbank. **Owner** entscheidet, welchem Employer die Daten gehören — Basis für Tenant-Isolation. **Prototype?** markiert, was jetzt gebaut wird; alles andere bleibt gelistet, aber unbebaut ("later"), ohne das Design zu erschweren.

### Group 1 — Tenancy and people
*(wer existiert und wozu gehört wer — Basis aller Zugriffsregeln)*

| Entity | What it is | Attributes | Owner | Prototype? | Refers to |
|---|---|---|---|---|---|
| organisation | Ein Betrieb oder AfCJ selbst, als Mandant | name, typ (AfCJ / Employer), status (aktiv / trial / pausiert) | — (ist selbst der Tenancy-Anker) | Ja — im Prototyp genau zwei Zeilen: AfCJ, Energiehelden, beide status=aktiv | — |
| person | Eine individuelle Nutzer:in mit Login-Profil | email, name, username, geburtsdatum, geschlecht (feste Auswahl: männlich / weiblich / divers / keine Angabe), vorerfahrung (Freitext), sprache (DE/UK) | Person | Ja | — |
| org_membership | "Diese Person gehört zu dieser Organisation" (reine Zugehörigkeit, keine Rolle) | person, organisation, aktiv seit | Employer (bzw. AfCJ) | Ja | person, organisation |
| role_assignment | "Diese Person hat diese Rolle innerhalb dieser Organisation" | person, organisation, rolle (Learner / AfCJ admin), aktiv seit | Employer (bzw. AfCJ) | Ja | person, organisation |

Entschieden 2026-09-04: `org_membership` und `role_assignment` bewusst getrennt statt einer kombinierten "membership"-Entität — damit später admin-konfigurierbare Rollen (SR-44, Later) nur `role_assignment` ersetzen müssen, nicht die Organisationszugehörigkeit; und damit RLS-Policies Zugehörigkeit und Berechtigung sauber getrennt prüfen können. Nur zwei Rollen-Werte im Prototyp (Learner, AfCJ admin) — Instructor/Trainer/Manager existieren noch nicht als eigene Personen. Sprache und Vorerfahrung sind bewusst schon mitgeführt (Struktur mitbauen, SR-12/UN-46), auch wenn Prototyp einsprachig ist. `status` an `organisation` ebenfalls Struktur mitbauen (2026-09-07) — im Prototyp konstant "aktiv".

### Group 2 — Qualification structure
*(das Curriculum, einmal definiert, geteilt von allen Employers)*

| Entity | What it is | Attributes | Owner | Prototype? | Refers to |
|---|---|---|---|---|---|
| programme | Ein Qualifikationsprogramm (TQ-EGT, EFK-EE, EFKffT) | name, kürzel, beschreibung, status (published / unpublished) | AfCJ | Ja — im Prototyp nur EFK-EE befüllt, Struktur für alle drei | — |
| module | Ein Abschnitt eines Programms | name, reihenfolge, status (published / unpublished) | AfCJ | Ja | programme |
| course | Ein Kurs innerhalb eines Moduls | name, typ (synchron / asynchron), reihenfolge, status (published / unpublished) | AfCJ | Ja | module |
| lesson | Die kleinste Content-Einheit innerhalb eines Kurses | name, content_type (scorm / live / repository), inhalt (SCORM-Paket-Referenz bei scorm, leer bei live — bei repository siehe `lesson_resource` unten), reihenfolge, status (published / unpublished) | AfCJ | Ja | course; live_session referenziert die Lektion umgekehrt (live) |
| lesson_resource | Ein einzelner Datei- oder Link-Verweis an einer Repository-Lektion. Eine Lektion hat mindestens einen, oft mehrere, gemischt-typige Verweise (z. B. Datenblatt + Herstellervideo) | lesson_id, reihenfolge, typ (datei / link), file_asset_id (gesetzt bei typ=datei), external_url (gesetzt bei typ=link) | AfCJ | Ja | lesson; file_asset (bei typ=datei) |
| competency | Eine Kompetenz aus der Kompetenzmatrix | name, kompetenzbereich, quelle (TQ-ARP / EFKffT / EFK-EE) | AfCJ | Ja | — |
| competency_step | Ein Teilschritt, kleinster Nachweisbaustein einer Kompetenz | name, typ (theoretisch / praktisch), nachweistyp (aktuell nur binär) | AfCJ | Ja | competency |
| content_competency_mapping | N:M: welche Lektion zahlt auf welchen *theoretischen* Teilschritt ein | lesson_id, competency_step_id | AfCJ | Ja | competency_step, lesson |
| target_group | Regelbasierte Gruppe, die bestimmt, wer welchen Content sieht | name, regeln (Kombination aus Person-Attributen, Organisation, Programmzugehörigkeit) | AfCJ | Nein — Later | person-Attribute, organisation, programme |

Entschieden 2026-09-04: vier Curriculum-Stufen (Programm → Modul → Kurs → Lektion, SR-5), getrennt von der Kompetenz-Hierarchie (Kompetenz → Teilschritt). Mapping hängt bewusst auf Lektions-Ebene, nicht Kurs-Ebene (USP, mehr Pflegeaufwand in Kauf genommen). Teilschritte gibt es in zwei Arten: theoretisch (`content_competency_mapping`) und praktisch (`field_capture_step_mapping`, Group 4 — bewusst dort, weil die Verknüpfung erst beim Praxis-Ereignis entsteht). `target_group` ist Later. Ergänzung 2026-09-09: Modul-Ebene optional (nullable `module_id`/`programme_id` an `course`, genau eines gesetzt). Ergänzung 2026-09-09: `lesson` bekommt `content_type` (scorm/live/repository) — Datum/Join-Link liegen bei live ausschließlich an `live_session`, nicht an `lesson`. Regel für die KI: mindestens ein `competency_step` pro Lektion über `content_competency_mapping`.

Entschieden 2026-09-11: `programme`, `module`, `course`, `lesson` und `field_job_type` (Group 3) bekommen alle ein binäres `status`-Feld (published/unpublished) — Lernende sehen nur published. Kompetenzen (`competency`, `competency_step`) bekommen bewusst **kein** eigenes Status-Feld — sie werden ausschließlich über `content_competency_mapping` sichtbar/relevant (linked/unlinked), ein eigener Veröffentlichungsstatus wäre redundant. Entschieden 2026-09-11: Repository-Lektionen können mehrere, gemischt-typige Verweise haben (nicht nur einen) — deshalb eigene Entity `lesson_resource` statt eines einzelnen `inhalt`-Attributs, normalisiert statt als Liste in einer Spalte (siehe Translation Rules).

### Group 3 — Delivery
*(ein Programm, real durchgeführt für reale Personen in Echtzeit)*

| Entity | What it is | Attributes | Owner | Prototype? | Refers to |
|---|---|---|---|---|---|
| cohort | Ein geplanter Durchlauf eines Programms | programme_id, name/kürzel, start_datum, end_datum | AfCJ | Ja | programme |
| enrolment | Learner × Cohort, mit zugewiesenem Instructor | learner_id, cohort_id, instructor_id (Prototyp: leer), status (aktiv / abgeschlossen / abgebrochen) | Employer | Ja | person, cohort |
| schedule_entry | Ein datiertes Element im Plan — kohortenweit (Live-Sessions, asynchrone Deadlines) oder pro Learner (Praxistage) | datum, art (live/asynchron/feld), cohort_id (kohortenweit) oder enrolment_id (Praxistage), reihenfolge, referenz (course_id/lesson_id/live_session_id/field_job_id, je nach art) | Employer | Ja | cohort oder enrolment; course, lesson, live_session oder field_job |
| live_session | Konkreter Termin eines synchronen Formats | datum, start, ende, join_link, trainer_id (Prototyp: leer), lesson_id/course_id | AfCJ | Ja | course, lesson |
| field_job_type | Referenz: eine konkrete Übungs-/Praxisaufgabe (Prototyp: Werkstatt-Tätigkeit statt echtem Kundeneinsatz) | titel, bild_oder_icon (file_asset, optional), beschreibung, kategorie (frei, optional), vorbereitung_text/-content_id, nachbereitung_text/-content_id, status (published / unpublished) | AfCJ | Ja | file_asset; lesson (optional) |
| field_job_type_frage | Eine vordefinierte Single-Choice-Frage zu einem Field Job Type, für die Phase Start oder Abschluss. Von AfCJ admin angelegt, nicht von Lernenden | field_job_type_id, phase (start / abschluss), reihenfolge, frage_text, antwortoptionen (3–5 feste Optionen) | AfCJ | Ja | field_job_type |
| field_job | Der konkrete Einsatz/die Übung an einem Tag für einen Learner | datum, standort (optional), field_job_type_id, learner_id, instructor_id, status (geplant/durchgeführt), durchgeführt_bestätigt_am, ergebnis (erledigt / problem), problem_beschreibung (Freitext, nur gesetzt wenn ergebnis=problem) | Employer | Ja | field_job_type, person |

Finalisiert 2026-09-09 (Vera) auf Basis der Praxistag-User-Journey — Malte kann vor Prototyp-Start kein detailliertes Review mehr leisten, daher gilt Group 3 als abgenommen. Mehrere Aufgaben an einem Praxistag = mehrere `schedule_entry`-Einträge mit `art=feld` am selben Tag, je einer mit eigenem `field_job`. Tagesplan-Frage (4d, 2026-09-09): Cohort-wide mit per-learner Praxistagen — `schedule_entry` trägt entsprechend `cohort_id` oder `enrolment_id`. `field_capture` (Group 4) erhält zusätzlich `field_job_id`.

Entschieden 2026-09-11 (Praxistag-Erfassung, ergänzt aus der Miro-Journey): Lernende durchlaufen pro Einsatz fünf Schritte — Tätigkeit wählen, Start-Content (inkl. Start-Fragen), Instruktion/Motivation (reines Weiterklicken, kein Datenschreiben), Abschluss-Content (inkl. Abschluss-Fragen), Verifizierungs-Hinweis. Dazwischen, vor den Abschluss-Fragen, bestätigt die Lernende explizit "erledigt" oder meldet "Problem" mit Freitext — deshalb `ergebnis`/`problem_beschreibung` an `field_job`, statt nur des bisherigen `durchgeführt_bestätigt_am`. Zugriff dafür bewusst eng: Learner darf an `field_job` ausschließlich `durchgeführt_bestätigt_am`, `ergebnis` und `problem_beschreibung` selbst schreiben, sonst nichts (siehe `access-matrix.md`). Die Start-/Abschluss-Fragen selbst sind Single-Choice mit 3–5 Antwortoptionen (`field_job_type_frage`), von AfCJ admin je Field Job Type und Phase angelegt; die Antworten der Lernenden landen in `field_capture`/`field_capture_antwort` (Group 4), nicht an `field_job`.

### Group 4 — Progress and evidence
*(was ein Learner getan hat und was es belegt)*

| Entity | What it is | Attributes | Owner | Prototype? | Refers to |
|---|---|---|---|---|---|
| unit_progress | Fortschritt einer Person in einer Lektion | learner_id, lesson_id, status (offen/in Bearbeitung/abgeschlossen), abgeschlossen_am | Employer | Ja | person, lesson |
| attendance | Bestätigte Teilnahme an einer Live-Session | learner_id, live_session_id, status (anwesend / nicht anwesend), bestätigt_von | Employer | Ja | person, live_session |
| field_capture | Eine Selbstauskunft zu einem oder mehreren praktischen Teilschritten, für die Phase Start oder Abschluss eines Field Jobs — bis zu zwei Zeilen pro Field Job (eine je Phase) | learner_id, field_job_id, phase (start / abschluss), text (frei, optional/Later), status (submitted/verified/rejected), eingereicht_am, Media-Felder (schema-bereit, inaktiv) | Employer | Ja | person, field_job |
| field_capture_antwort | Eine einzelne Single-Choice-Antwort der Lernenden auf eine `field_job_type_frage`, Teil einer `field_capture` | field_capture_id, field_job_type_frage_id, gewählte_option | Employer | Ja | field_capture, field_job_type_frage |
| field_capture_step_mapping | N:M: welche Teilschritte deckt diese Selbstauskunft ab | field_capture_id, competency_step_id | Employer | Ja | field_capture, competency_step |
| verification | Admin-Entscheidung über eine Selbstauskunft | field_capture_id, verifiziert_von, entscheidung (verified/rejected), verifiziert_am, kommentar | Employer | Ja | field_capture, person |
| competency_evidence | "Diese Person hat diesen Teilschritt erfüllt, belegt durch diese Quelle" — vereinheitlicht theoretische und praktische Nachweise | learner_id, competency_step_id, quelltyp (lesson_completion/field_verification), quelle_id, erstellt_am | Employer | Ja | person, competency_step |

Entschieden 2026-09-04: `competency_evidence` ist der Knotenpunkt — ein abgeschlossenes `unit_progress` und eine bestätigte `verification` erzeugen je einen Eintrag hier; das Kompetenzprofil wird **ausschließlich** aus `competency_evidence` berechnet (siehe Open Decisions), nie direkt aus `unit_progress` oder `verification`. `field_capture_step_mapping` ist bewusst in dieser Gruppe, nicht in Group 2 — die Verknüpfung entsteht beim Ereignis, nicht beim Curriculum-Design.

Entschieden 2026-09-11: `field_capture` bekommt `phase` (start/abschluss) — pro Field Job entstehen jetzt bis zu zwei Selbstauskünfte statt einer. Die eigentlichen Antworten sind für den Prototyp Single-Choice (3–5 vorgegebene Optionen je Frage, siehe `field_job_type_frage` in Group 3), gespeichert je Frage als eigene Zeile in `field_capture_antwort` statt als Freitext — `field_capture.text` bleibt für Later (z. B. falls doch Freitext-Zusatz gebraucht wird). Foto/Video/Sprachnachricht bleiben wie bisher geplant als inaktive Media-Felder an `field_capture` selbst, phasenunabhängig.

### Group 5 — Knowledge and guidance
*(worauf die Feld-Unterstützung zugreifen darf, und was gesagt wurde)*

| Entity | What it is | Attributes | Owner | Prototype? | Refers to |
|---|---|---|---|---|---|
| file_asset | Eine hochgeladene Datei, referenzierbar von anderen Entities (Bilder, Dokumente etc.) | dateiname, dateityp, storage_pfad, hochgeladen_von, hochgeladen_am | AfCJ oder Employer (je nach referenzierender Entity) | Ja | — |
| knowledge_source | Eine als Wissensquelle markierte Repository-Datei (Norm, SOP, Herstellerdokument), später LLM-durchsuchbar | file_asset_id, titel, kategorie, status (entwurf/freigegeben), freigegeben_von | AfCJ | Ja (Repository + Kuratieren) / Build next (aktive LLM-Suche) | file_asset |

Entschieden 2026-09-04: `file_asset` ist die generische Datei-Ablage (Build now) — `knowledge_source` ist ein spezialisierter Verweis darauf mit Kurations-Metadaten (ursprünglich vermischt, jetzt getrennt).

Candidate, noch nicht Prototype: `guidance conversation` (der Dialog während eines Field Jobs, inkl. zitierter Quellen pro Antwort) — Build next, sobald Live-Fachfragen aktiv genutzt werden. Die KI ergänzt bei Bedarf eine technische Hilfs-Entität für durchsuchbare Textfragmente.

## Translation rules (verbindlich für die KI)

- Every entity gets an id, created-at and updated-at
- Every Employer-owned entity carries the employer's organisation id — this is what the access rules in `access-matrix.md` hang on
- Status fields use a fixed list of values, never free text
- A fact lives in exactly one entity and is referenced elsewhere by id ("normalised")
- Entities marked *later* are not built, but nothing may be designed in a way that makes them hard to add

## Open decisions (Schritt 4d)

| Decision | Options | Why it matters | Our decision |
|---|---|---|---|
| May a manager see field-capture media (photos/video of the learner working)? | Full access / status+outcome only / none | Adoption: field view must not read as surveillance. DSGVO purpose limitation. | Nein, nur Status + Ergebnis für die reine Manager-Rolle. Volle Sicht nur über Instructor/Team-Lead-Rollenzuweisung, die tatsächlich verifiziert — Zugriff hängt an der Rolle (`role_assignment`), nicht an der Person. Entschieden 2026-09-04. |
| Who verifies field captures? | Instructor / separate role / AfCJ | Definiert Verantwortung für Nachweise | AfCJ admin (Prototyp), ab MVP VEFK/Fachkraft als Instructor/Team Lead. Prototyp testet bewusst den Verifizierungsaufwand selbst (kleine Kohorte, kurze Formate). Entschieden 2026-09-04. |
| Is the day plan per cohort or per learner? | Cohort-wide / per learner / cohort-wide with per-learner field days | Bestimmt, wohin Schedule-Einträge gehören (Group 3) | Cohort-wide mit per-learner Praxistagen — entschieden 2026-09-09. |
| Can one person belong to two organisations? | Yes / no | Kostet nichts im Modell, teuer später nachzurüsten | Ja — entschieden 2026-09-04. Implikation: wahrscheinlich zusätzlich Content-/Target-Group-Scoping nötig (noch nicht modelliert). |
| Is the competency profile computed from evidence only? | Computed only / computed with admin override | Vertrauenswürdigkeit gegenüber formaler Qualifikation | Computed only — bereits durch SR-01 festgelegt ("ein manuelles Bearbeiten des Kompetenzstatus ist nicht möglich"). |
| Login method | Magic link / password / employer SSO | Einfachheit vs. Employer-IT-Anforderungen | Händische Account-Anlage durch Admin (Prototyp), automatisierter Magic-Link-Versand ab Build next — entschieden 2026-09-04. |
| Wie ist die Praxisphase gestaltet: begleitet mit Live-Erfassung, oder nachgelagerte Selbstauskunft? | Begleitet / nachgelagert / Hybrid | Entscheidet, ob Kamera-Live-Zugriff und Offline-Fähigkeit gebraucht werden — und ob PWA reicht oder eine native App nötig wird | Nachgelagerte Selbstauskunft, bestätigt (Prototyp) — entschieden 2026-09-07. Format ggf. über Freitext hinaus (strukturierte Items). MVP/V1-Gestaltung bleibt offen. |
