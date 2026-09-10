# Datenmodell — Qualifizierungsplattform Elektrofachkraft Erneuerbare Energien (Prototyp)

> Quelle: Notion-Playbook "MVP April 2027: Product Development Playbook", Schritt 4b/4d. Stand 2026-09-09, von Vera final abgenommen (Malte konnte vor Prototyp-Start kein detailliertes Review mehr leisten, Kapazitätsgründe).
>
> Diese Datei ist zusammen mit `access-matrix.md` die Grundlage, aus der Claude Code Schema und Zugriffsregeln ableitet. Siehe die Instruktion am Ende dieser Datei.

## Kontext: relevante Subsysteme (4a, Kurzfassung)

- **App (Web + Field-PWA):** eine Next.js/TypeScript-Codebase für alle Rollen. Learner-Day-View und Field-Workflow laufen als PWA-Route im selben Code.
- **Backend / Admin interface:** Next.js, gleiche Auth wie Learner-App, eigenes Rollen-Gate. AfCJ admin deckt im Prototyp auch Instructor-, Trainer- und Manager-Aufgaben ab.
- **Data, login and media:** Supabase, EU-Region. Row Level Security (RLS) implementiert die Zugriffsmatrix aus `access-matrix.md` direkt in der Datenbank. Media-Storage ist schema-bereit, aber im Prototyp inaktiv.
- **Verified knowledge base:** Server-seitige LLM-Funktionen, pgvector. Kuratieren von Wissensquellen ist Build now, aktive Live-Fachfragen sind Build next.
- **External services:** E-Mail (z. B. Resend), Video-Call-Link für Live-Sessions, AZAV-Nachweis-Export.

## Übersetzungsregeln für die KI

Diese Regeln gelten für jede Entität unten, ohne dass sie pro Tabelle wiederholt werden:

- Jede Entität bekommt `id`, `created_at`, `updated_at`.
- Jede Employer-eigene Entität trägt die `organisation_id` des Betriebs — darauf hängen die Zugriffsregeln in `access-matrix.md`.
- Statusfelder verwenden eine feste Werteliste, nie Freitext.
- Ein Fakt lebt in genau einer Entität und wird andernorts per ID referenziert (Normalisierung).
- Als "Later" markierte Entitäten werden nicht gebaut, aber nichts darf so entworfen werden, dass sie später schwer nachzurüsten wären.
- Baue nichts über das hier Gelistete hinaus. Fehlt aus deiner Sicht etwas: als offene Frage zurückmelden, nicht einfach ergänzen.

## Group 1 — Tenancy and people

*Wer existiert und wem gehört er — die Basis für alle Zugriffsregeln.*

| Entity | Was es ist | Attribute | Owner | Prototyp? | Bezug |
|---|---|---|---|---|---|
| `organisation` | Ein Betrieb oder AfCJ selbst, als Mandant | name, typ (AfCJ / Employer), status (aktiv / trial / pausiert) | — (Tenancy-Anker) | Ja — im Prototyp genau zwei Zeilen: AfCJ, Energiehelden, beide status=aktiv | — |
| `person` | Eine individuelle Nutzer:in mit Login-Profil | email, name, username, geburtsdatum, geschlecht, vorerfahrung (Freitext), sprache (DE/UK) | Person | Ja | — |
| `org_membership` | "Diese Person gehört zu dieser Organisation" (reine Zugehörigkeit, keine Rolle) | person, organisation, aktiv_seit | Employer (bzw. AfCJ) | Ja | person, organisation |
| `role_assignment` | "Diese Person hat diese Rolle innerhalb dieser Organisation" | person, organisation, rolle (Learner / AfCJ admin), aktiv_seit | Employer (bzw. AfCJ) | Ja | person, organisation |

**Entscheidungen (2026-09-04):** `org_membership` und `role_assignment` sind bewusst getrennt statt einer kombinierten "membership"-Entität — damit später admin-konfigurierbare Rollen (SR-44, Later) nur `role_assignment` ersetzen müssen, nicht die Organisationszugehörigkeit, und damit RLS-Policies Zugehörigkeit und Berechtigung sauber getrennt prüfen können. Im Prototyp nur zwei Rollen-Werte (Learner, AfCJ admin) — Instructor/Trainer/Manager existieren noch nicht als eigene Personen. Sprache und Vorerfahrung sind bewusst schon mitgeführt (Struktur mitbauen, SR-12 / UN-46), auch wenn der Prototyp einsprachig läuft. `status` an `organisation` ist ebenfalls Struktur mitbauen (2026-09-07) — vendor-operated-SaaS-Implikation, im Prototyp konstant "aktiv".

## Group 2 — Qualification structure

*Das Curriculum, einmal definiert, gemeinsam genutzt von allen Betrieben.*

| Entity | Was es ist | Attribute | Owner | Prototyp? | Bezug |
|---|---|---|---|---|---|
| `programme` | Ein Qualifikationsprogramm (TQ-EGT, EFK-EE, EFKffT) | name, kürzel, beschreibung | AfCJ | Ja — im Prototyp nur EFK-EE befüllt, Struktur für alle drei | — |
| `module` | Ein Abschnitt eines Programms | name, reihenfolge | AfCJ | Ja | programme (optional, siehe unten) |
| `course` | Ein Kurs | name, typ (synchron / asynchron), reihenfolge | AfCJ | Ja | module ODER programme (genau eines von beiden, nie beide/keins) |
| `lesson` | Die kleinste Content-Einheit innerhalb eines Kurses | name, content_type (scorm / live / repository), inhalt (je nach content_type: SCORM-Paket-Referenz, leer bei live, Datei-/Link-Referenzen bei repository), reihenfolge | AfCJ | Ja | course; file_asset (bei scorm/repository); live_session referenziert die Lektion umgekehrt (bei live) |
| `competency` | Eine Kompetenz aus der Kompetenzmatrix | name, kompetenzbereich, quelle (TQ-ARP / EFKffT / EFK-EE) | AfCJ | Ja | — |
| `competency_step` | Ein Teilschritt, kleinster Nachweisbaustein einer Kompetenz | name, typ (theoretisch / praktisch), nachweistyp (aktuell nur binär) | AfCJ | Ja | competency |
| `content_competency_mapping` | N:M: welche Lektion zahlt auf welchen *theoretischen* Teilschritt ein | lesson_id, competency_step_id | AfCJ | Ja | competency_step, lesson |
| `target_group` | Eine regelbasierte Gruppe, die bestimmt, wer welchen Content sieht | name, regeln (Person-Attribute, Organisation, Programmzugehörigkeit) | AfCJ | **Nein — Later** | person-Attribute, organisation, programme |

**Entscheidungen:**
- (2026-09-04) Vier Curriculum-Stufen (Programm → Modul → Kurs → Lektion, SR-5), getrennt von der Kompetenz-Hierarchie (Kompetenz → Teilschritt). Mapping hängt bewusst auf Lektions-Ebene, nicht Kurs-Ebene — das ist als USP verstanden. Teilschritte: theoretisch über `content_competency_mapping` (mit Lektionen), praktisch über `field_capture_step_mapping` (Group 4, mit Selbstauskünften — dort verortet, weil die Verknüpfung erst beim tatsächlichen Praxis-Ereignis entsteht). `target_group` ist Later.
- (2026-09-09) **Modul-Ebene ist optional:** `course` hat zwei nullable Felder, `module_id` und `programme_id` — genau eines von beiden ist gesetzt, nie beide, nie keins. Ist ein Modul vorhanden, hängt der Kurs daran; sonst direkt am Programm. Vermeidet künstliche Modul-Container bei schlanken Programmen, kostet im Schema nichts zusätzlich.
- (2026-09-09) **Lektion-Formate:** `lesson.content_type` ∈ {scorm, live, repository}. Bei `live` liegen Datum/Join-Link bewusst **nicht** an der Lektion, sondern ausschließlich an der `live_session`-Instanz aus Group 3 — das Curriculum bleibt so über mehrere Kohorten-Termine wiederverwendbar. Regel für die KI: mindestens ein `competency_step` pro Lektion über `content_competency_mapping` (Pflicht, nicht nur Empfehlung).
- (2026-09-09) SCORM-Pakete: keine Größenbeschränkung im Schema (Bestandscontent liegt real bei 50–300 MB); grundsätzlich auf Lektionsebene gepackt (ein Paket = eine Lektion), damit das Lektions-Mapping granular bleibt. Ausnahme ist kein Sonderfall: ein Kurs mit nur einer Lektion nutzt einfach ein Paket für diese eine Lektion.

## Group 3 — Delivery

*Ein Programm, das tatsächlich für reale Menschen in Echtzeit läuft.*

| Entity | Was es ist | Attribute | Owner | Prototyp? | Bezug |
|---|---|---|---|---|---|
| `cohort` | Ein geplanter Durchlauf eines Programms | programme_id, name/kürzel, start_datum, end_datum | AfCJ | Ja | programme |
| `enrolment` | Learner × Cohort, mit zugewiesenem Instructor | learner_id, cohort_id, instructor_id (Prototyp: leer, AfCJ admin deckt ab), status | Employer | Ja | person, cohort |
| `schedule_entry` | Ein datiertes Element im Plan — kohortenweit (Live-Sessions, gemeinsame asynchrone Deadlines) oder pro Learner (Praxistage) | datum, art (live / asynchron / feld), cohort_id (bei kohortenweiten Einträgen), enrolment_id (bei Praxistagen), reihenfolge, referenz (course_id / lesson_id / live_session_id / field_job_id, je nach art) | Employer | Ja | cohort ODER enrolment; course, lesson, live_session oder field_job |
| `live_session` | Konkreter Termin eines synchronen Formats | datum, start, ende, join_link, trainer_id (Prototyp: leer), lesson_id/course_id | AfCJ | Ja | course, lesson |
| `field_job_type` | Referenz: eine konkrete Übungs-/Praxisaufgabe (im Prototyp: Werkstatt-Tätigkeit statt echtem Kundeneinsatz), die Learner in einem Praxis-Slot auswählen können | titel, bild_oder_icon (Referenz auf file_asset, optional), beschreibung, kategorie (freier Text, optional, keine feste Taxonomie), vorbereitung_text (Fragen/Instruktion/Theory Refresh, im Prototyp manuell erstellt), vorbereitung_content_id (optional, Lektion-Link statt/zusätzlich zu Text), nachbereitung_text (Reflexions-/Wiederholungsitems, im Prototyp manuell erstellt), nachbereitung_content_id (optional, Lektion-Link) | AfCJ | Ja | file_asset; lesson (optional, über vorbereitung_content_id/nachbereitung_content_id) |
| `field_job` | Der konkrete Einsatz/die konkrete Übung an einem Tag für einen Learner | datum, standort (optional, im Prototyp meist Werkstatt), field_job_type_id, learner_id, instructor_id, status (geplant / durchgeführt), durchgeführt_bestätigt_am (Zeitstempel der Nutzer-Bestätigung "Einsatz absolviert", getrennt von der späteren field_capture-Einreichung) | Employer | Ja | field_job_type, person |

**Entscheidungen (2026-09-09):** Modelliert aus der detaillierten Praxistag-User-Journey (Vera). Mehrere Aufgaben an einem Praxistag = mehrere `schedule_entry`-Einträge mit `art=feld` am selben Tag, je einer mit eigenem `field_job` — keine eigene "Liste"-Entität nötig. Tagesplan ist Cohort-wide mit per-learner Praxistagen: `schedule_entry` trägt entweder `cohort_id` (kohortenweite Termine) oder `enrolment_id` (Praxistage). `field_capture` (Group 4) erhält zusätzlich `field_job_id`, um Selbstauskünfte an den konkreten Einsatz zu binden. Namen (`field_job_type`/`field_job`) bewusst beibehalten, obwohl es im Prototyp nur Werkstatt-Übungen sind — an den Namen hängen bereits Rollentabelle, SRs und Zugriffsmatrix.

## Group 4 — Progress and evidence

*Was ein Learner getan hat und was das belegt.*

| Entity | Was es ist | Attribute | Owner | Prototyp? | Bezug |
|---|---|---|---|---|---|
| `unit_progress` | Fortschritt einer Person in einer Lektion | learner_id, lesson_id, status (offen / in Bearbeitung / abgeschlossen), abgeschlossen_am | Employer | Ja | person, lesson |
| `attendance` | Bestätigte Teilnahme an einer Live-Session | learner_id, live_session_id, status, bestätigt_von | Employer | Ja | person, live_session |
| `field_capture` | Eine Selbstauskunft zu einem oder mehreren praktischen Teilschritten | learner_id, field_job_id, text, status (submitted / verified / rejected), eingereicht_am, Media-Felder (schema-bereit, inaktiv) | Employer | Ja | person, field_job |
| `field_capture_step_mapping` | N:M: welche Teilschritte deckt diese Selbstauskunft ab | field_capture_id, competency_step_id | Employer | Ja | field_capture, competency_step |
| `verification` | Admin-Entscheidung über eine Selbstauskunft | field_capture_id, verifiziert_von, entscheidung (verified / rejected), verifiziert_am, kommentar | Employer | Ja | field_capture, person |
| `competency_evidence` | "Diese Person hat diesen Teilschritt erfüllt, belegt durch diese Quelle" — vereinheitlicht theoretische und praktische Nachweise | learner_id, competency_step_id, quelltyp (lesson_completion / field_verification), quelle_id, erstellt_am | Employer | Ja | person, competency_step |

**Entscheidung (2026-09-04):** `competency_evidence` ist der Knotenpunkt — ein abgeschlossenes `unit_progress` und eine bestätigte `verification` erzeugen je einen Eintrag hier; das Kompetenzprofil wird **ausschließlich** aus `competency_evidence` berechnet, nie direkt aus `unit_progress` oder `verification`, und ist eine berechnete View, kein editierbares Feld (SR-01: kein manuelles Bearbeiten des Kompetenzstatus möglich).

## Group 5 — Knowledge and guidance

*Worauf die Feld-Guidance zugreifen darf, und was gesagt wurde.*

| Entity | Was es ist | Attribute | Owner | Prototyp? | Bezug |
|---|---|---|---|---|---|
| `file_asset` | Eine hochgeladene Datei, referenzierbar von anderen Entitäten (Bilder, Dokumente etc.) | dateiname, dateityp, storage_pfad, hochgeladen_von, hochgeladen_am | AfCJ oder Employer (je nach referenzierender Entität) | Ja | — |
| `knowledge_source` | Eine als Wissensquelle markierte Repository-Datei (Norm, SOP, Herstellerdokument) | file_asset_id, titel, kategorie, status (entwurf / freigegeben), freigegeben_von | AfCJ | Ja (Repository + Kuratieren) / Build next (aktive LLM-Suche) | file_asset |

**Entscheidung (2026-09-04):** `file_asset` ist die generische Datei-Ablage (schon für Lektionsbilder etc. genutzt); `knowledge_source` ein spezialisierter Verweis mit Kurations-Metadaten für spätere LLM-Nutzung.

**Kandidat, noch nicht Prototyp:** `guidance conversation` (der Dialog während eines Einsatzes, mit zitierten Quellen je Antwort) — Build next, sobald Live-Fachfragen aktiv genutzt werden. Die KI darf dafür eine technische Helper-Entität für durchsuchbare Textfragmente ergänzen; das braucht kein Vorab-Okay.

## 4d — Getroffene Entscheidungen (verbindlich für die Umsetzung)

| Entscheidung | Optionen | Warum relevant | Unsere Entscheidung |
|---|---|---|---|
| Darf ein Manager Field-Capture-Medien (Fotos/Video) sehen? | Voller Zugriff / nur Status+Ergebnis / gar nicht | Adoption: Feldsicht darf nicht wie Überwachung wirken; DSGVO-Zweckbindung | Nein, nur Status + Ergebnis für die reine Manager-Rolle. Volle Sicht nur über eine Instructor/Team-Lead-Rollenzuweisung, die tatsächlich verifiziert. Zugriff hängt an der Rolle (`role_assignment`), nicht an der Person. |
| Wer verifiziert Field Captures? | Instructor / eigene Reviewer-Rolle / AfCJ | Verantwortung für den Nachweis | AfCJ admin im Prototyp (Instructor existiert noch nicht als eigene Rolle), ab MVP Instructor/Team Lead. Reviewer wird pro `verification` gespeichert. |
| Tagesplan pro Kohorte oder pro Learner? | Cohort-wide / per learner / cohort-wide mit per-learner Praxistagen | Entscheidet, wo `schedule_entry` andockt (Group 3) | Cohort-wide mit per-learner Praxistagen |
| Kann eine Person zu zwei Organisationen gehören? | Ja / Nein | Kostet im Modell nichts, ist später teuer nachzurüsten | Ja im Modell, im UI zunächst ignoriert. Implikation: Content-/Target-Group-Scoping wird später vermutlich nötig (noch nicht modelliert). |
| Wird das Kompetenzprofil nur aus Nachweisen berechnet? | Computed only / mit Admin-Override | Vertrauenswürdigkeit der Nachweise | Computed only (SR-01) |
| Login-Methode | Magic Link / Passwort / Employer-SSO | Einfachheit vs. IT-Anforderungen der Betriebe | Prototyp: händische Account-Anlage durch Admin. Magic-Link-Mechanismus strukturell gebaut (SR-16), automatisierter Versand erst ab Build next. |
| Praxisphase: begleitet mit Live-Erfassung oder nachgelagerte Selbstauskunft? | Begleitet / nachgelagert / hybrid | Entscheidet über Kamera-Live-Zugriff und Offline-Bedarf, damit über PWA vs. native App | Nachgelagerte Selbstauskunft (UN-10), bestätigt für den Prototyp. Format ggf. strukturierte Items statt/zusätzlich zu Freitext (Later). MVP/V1-Gestaltung bleibt offen. |
| Löschprotokoll DSGVO vs. AZAV | Sofort entscheiden / erstmal alles behalten | Pilotstart 28.09. mit echten Lerner:innendaten | Für den ersten Kohorten-Durchgang wird zunächst alles behalten. Vor Start der zweiten Kohorte bzw. vor MVP-Launch zwingend zu klären: Löschprotokoll, das AZAV-Aufbewahrungspflicht mit DSGVO-Speicherbegrenzung vereinbart — mit Rechts-/Datenschutzberatung, nicht intern entschieden. |

## Noch offen (nicht Teil dieser Übergabe)

- Wie der Praxisteil im Schema Modul/Kurs/Lektion abgebildet wird (oder ob er diesen Ebenen entspricht) — bewusst getrennt von der Frontend-Darstellung, eigene Runde nötig.
- Anlagentyp/Hersteller-Taxonomie: aus der Betrachtung gestrichen (gehörte zur nicht mehr verfolgten "Job Matching"-Erzählung, betraf nur ein Build-next-Feature ohne Prototyp-Rolle).

## Instruktion für Claude Code (aus 4e)

> Read `/docs/data-model.md` and `/docs/access-matrix.md`. Produce (1) an ER diagram in Mermaid, (2) migration files creating every entity marked "Prototype: Ja" with the listed attributes, and (3) RLS policies implementing the access matrix exactly. Do not add entities, roles or access beyond what's listed; if you believe something is missing, list it as a question instead of building it. Apply the translation rules in this document.

## Review-Checkliste vor dem Merge (aus 4e)

- [ ] Jede mit "Prototyp: Ja" markierte Entität erscheint im Diagramm; nichts erscheint, das nicht gelistet ist (oder die KI hat es begründet)
- [ ] Jede Employer-eigene Entität trägt die `organisation_id`
- [ ] Für jede Zelle der Zugriffsmatrix kann die KI auf die umsetzende Policy zeigen — stichprobenartig fünf Zellen prüfen, davon eine mit "—"
- [ ] Das Kompetenzprofil ist eine berechnete View, keine Tabelle
- [ ] Offene Fragen der KI sind beantwortet, und wo sie etwas geändert haben, sind 4b/4c/4d entsprechend aktualisiert
- [ ] RLS-Tests existieren mindestens für: Employer-Isolation, Learner-Zugriff nur auf eigene Captures
