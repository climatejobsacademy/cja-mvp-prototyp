# ER-Diagramm — Qualifizierungsplattform Prototyp

> Generiert aus `data-model.md` + `access-matrix.md` (Instruktion 4e). Enthält jede
> mit "Prototyp: Ja" markierte Entität. `target_group` und `guidance_conversation`
> sind Later/Build-next und erscheinen bewusst nicht. `competency_evidence` ist
> keine Tabelle, sondern eine berechnete View (siehe Fußnote).
>
> Aktualisiert 2026-09-11 für die Team-Entscheidungen dieses Datums (neue
> `status`-Felder, `lesson_resource`, `field_job_type_frage`,
> `field_capture_antwort`, `field_job.ergebnis`/`problem_beschreibung`,
> `field_capture.phase`) — siehe `docs/open-questions.md`.

```mermaid
erDiagram
    organisation {
        uuid id PK
        text name
        text typ
        text status
    }
    person {
        uuid id PK "= auth.users.id"
        text email
        text name
        text username
        date geburtsdatum
        text geschlecht
        text vorerfahrung
        text sprache
    }
    org_membership {
        uuid id PK
        uuid person_id FK
        uuid organisation_id FK
        date aktiv_seit
    }
    role_assignment {
        uuid id PK
        uuid person_id FK
        uuid organisation_id FK
        text rolle
        date aktiv_seit
    }

    programme {
        uuid id PK
        text name
        text kuerzel
        text beschreibung
        text status "published/unpublished, seit 2026-09-11"
    }
    module {
        uuid id PK
        uuid programme_id FK
        text name
        int reihenfolge
        text status "published/unpublished, seit 2026-09-11"
    }
    course {
        uuid id PK
        uuid module_id FK "xor programme_id"
        uuid programme_id FK "xor module_id"
        text name
        text typ
        int reihenfolge
        text status "published/unpublished, seit 2026-09-11"
    }
    lesson {
        uuid id PK
        uuid course_id FK
        text name
        text content_type
        jsonb inhalt "nur noch scorm, repository siehe lesson_resource"
        int reihenfolge
        text status "published/unpublished, seit 2026-09-11"
    }
    lesson_resource {
        uuid id PK
        uuid lesson_id FK
        int reihenfolge
        text typ "datei/link"
        uuid file_asset_id FK "gesetzt bei typ=datei"
        text external_url "gesetzt bei typ=link"
    }
    competency {
        uuid id PK
        text name
        text kompetenzbereich
        text quelle
    }
    competency_step {
        uuid id PK
        uuid competency_id FK
        text name
        text typ
        text nachweistyp
    }
    content_competency_mapping {
        uuid id PK
        uuid lesson_id FK
        uuid competency_step_id FK
    }

    cohort {
        uuid id PK
        uuid programme_id FK
        text name
        date start_datum
        date end_datum
    }
    enrolment {
        uuid id PK
        uuid organisation_id FK
        uuid learner_id FK
        uuid cohort_id FK
        uuid instructor_id FK "leer im Prototyp"
        text status
    }
    schedule_entry {
        uuid id PK
        uuid organisation_id FK
        date datum
        text art
        int reihenfolge
        uuid cohort_id FK "xor enrolment_id"
        uuid enrolment_id FK "xor cohort_id"
        uuid course_id FK "genau 1 von 4 referenz-FKs"
        uuid lesson_id FK
        uuid live_session_id FK
        uuid field_job_id FK
    }
    live_session {
        uuid id PK
        uuid lesson_id FK "xor course_id"
        uuid course_id FK "xor lesson_id"
        date datum
        time start
        time ende
        text join_link
        uuid trainer_id FK "leer im Prototyp"
    }
    field_job_type {
        uuid id PK
        text titel
        uuid bild_oder_icon FK
        text beschreibung
        text kategorie "Freitext, keine Taxonomie"
        text vorbereitung_text
        uuid vorbereitung_content_id FK
        text nachbereitung_text
        uuid nachbereitung_content_id FK
        text status "published/unpublished, seit 2026-09-11"
    }
    field_job_type_frage {
        uuid id PK
        uuid field_job_type_id FK
        text phase "start/abschluss"
        int reihenfolge
        text frage_text
        text_array antwortoptionen "3-5 feste Optionen"
    }
    field_job {
        uuid id PK
        uuid organisation_id FK
        date datum
        text standort
        uuid field_job_type_id FK
        uuid learner_id FK
        uuid instructor_id FK "leer im Prototyp"
        text status "vom Trigger abgeleitet, seit 2026-09-11 kein Learner-Write mehr"
        timestamptz durchgefuehrt_bestaetigt_am "Learner-Write"
        text ergebnis "erledigt/problem, Learner-Write, seit 2026-09-11"
        text problem_beschreibung "nur wenn ergebnis=problem, Learner-Write, seit 2026-09-11"
    }

    unit_progress {
        uuid id PK
        uuid organisation_id FK
        uuid learner_id FK
        uuid lesson_id FK
        text status
        timestamptz abgeschlossen_am
    }
    attendance {
        uuid id PK
        uuid organisation_id FK
        uuid learner_id FK
        uuid live_session_id FK
        text status
        uuid bestaetigt_von FK
    }
    field_capture {
        uuid id PK
        uuid organisation_id FK
        uuid learner_id FK
        uuid field_job_id FK
        text phase "start/abschluss, seit 2026-09-11"
        text text "frei, optional/Later"
        jsonb media "schema-bereit, inaktiv"
        text status
        timestamptz eingereicht_am
    }
    field_capture_antwort {
        uuid id PK
        uuid organisation_id FK
        uuid field_capture_id FK
        uuid field_job_type_frage_id FK
        text gewaehlte_option
    }
    field_capture_step_mapping {
        uuid id PK
        uuid organisation_id FK
        uuid field_capture_id FK
        uuid competency_step_id FK
    }
    verification {
        uuid id PK
        uuid organisation_id FK
        uuid field_capture_id FK
        uuid verifiziert_von FK
        text entscheidung
        timestamptz verifiziert_am
        text kommentar
    }

    file_asset {
        uuid id PK
        uuid organisation_id FK "nullable: null = AfCJ-weit"
        text dateiname
        text dateityp
        text storage_pfad
        uuid hochgeladen_von FK
        timestamptz hochgeladen_am
    }
    knowledge_source {
        uuid id PK
        uuid file_asset_id FK
        text titel
        text kategorie
        text status
        uuid freigegeben_von FK
    }

    organisation ||--o{ org_membership : ""
    person ||--o{ org_membership : ""
    organisation ||--o{ role_assignment : ""
    person ||--o{ role_assignment : ""

    programme ||--o{ module : ""
    programme ||--o{ course : "(wenn kein Modul)"
    module ||--o{ course : ""
    course ||--o{ lesson : ""
    lesson ||--o{ lesson_resource : ""
    file_asset ||--o{ lesson_resource : "bei typ=datei"
    competency ||--o{ competency_step : ""
    lesson ||--o{ content_competency_mapping : ""
    competency_step ||--o{ content_competency_mapping : ""

    programme ||--o{ cohort : ""
    cohort ||--o{ enrolment : ""
    person ||--o{ enrolment : "als Learner"
    cohort ||--o{ schedule_entry : "kohortenweit"
    enrolment ||--o{ schedule_entry : "Praxistag"
    course ||--o{ live_session : "(wenn keine Lektion)"
    lesson ||--o{ live_session : ""
    course ||--o{ schedule_entry : "referenz"
    lesson ||--o{ schedule_entry : "referenz"
    live_session ||--o{ schedule_entry : "referenz"
    field_job ||--o{ schedule_entry : "referenz"

    field_job_type ||--o{ field_job : ""
    person ||--o{ field_job : "als Learner"
    file_asset ||--o{ field_job_type : "bild_oder_icon"
    lesson ||--o{ field_job_type : "vorbereitung/nachbereitung"
    field_job_type ||--o{ field_job_type_frage : ""

    person ||--o{ unit_progress : ""
    lesson ||--o{ unit_progress : ""
    person ||--o{ attendance : ""
    live_session ||--o{ attendance : ""

    person ||--o{ field_capture : ""
    field_job ||--o{ field_capture : ""
    field_capture ||--o{ field_capture_antwort : ""
    field_job_type_frage ||--o{ field_capture_antwort : ""
    field_capture ||--o{ field_capture_step_mapping : ""
    competency_step ||--o{ field_capture_step_mapping : ""
    field_capture ||--o{ verification : ""

    file_asset ||--o{ knowledge_source : ""
```

## Fußnote: `competency_evidence` (nicht im Diagramm)

`competency_evidence` ist absichtlich keine Tabelle (SR-01, Entscheidung
2026-09-04: "computed only"), daher taucht sie oben nicht als Entität auf. Sie ist
eine SQL-View (`supabase/migrations/0006_progress_and_evidence.sql`), berechnet als:

- `unit_progress` (status = abgeschlossen) **JOIN** `content_competency_mapping` → `quelltyp = lesson_completion`
- `verification` (entscheidung = verified) **JOIN** `field_capture` **JOIN** `field_capture_step_mapping` → `quelltyp = field_verification`

## Nicht abgebildet (bewusst, siehe data-model.md)

- `target_group` — Later, nicht Prototyp.
- `guidance_conversation` — Build next, nicht Prototyp.
