/**
 * Handgeschriebene Typen für das Schema aus `supabase/migrations/`.
 *
 * Es gibt (noch) kein deploytes Supabase-Projekt, gegen das
 * `supabase gen types typescript` laufen könnte (siehe README) — diese Datei
 * ist deshalb von Hand aus den Migrationsdateien abgeleitet, nicht generiert.
 * Sobald ein Projekt existiert: `supabase gen types typescript --project-id
 * <id> > src/lib/database.types.ts` und diesen Kommentar entfernen.
 *
 * `Relationships: []` auf jeder Tabelle/View ist kein Inhalt, sondern von
 * @supabase/postgrest-js verlangte Typ-Struktur (GenericTable) — echte FKs
 * würden hier eingetragen, werden aber (noch) nirgends embedded-select
 * genutzt, siehe queries/*.ts (bewusst mehrere einfache Queries statt
 * verschachteltem Select, um von dieser Metadaten-Pflege unabhängig zu sein).
 *
 * Jede Tabelle bekommt einen benannten Row-Typ statt eines Inline-Objekt-Typs,
 * damit Update (= Partial<Row>) nicht zirkulär auf sich selbst über den noch
 * nicht fertig definierten `Database`-Typ verweisen muss. Jeder Row-Typ ist in
 * `Flatten<...>` gewickelt: @supabase/postgrest-js löst Spaltennamen im
 * select()-String über verschachtelte konditionale Typen auf, die bei einer
 * rohen Intersection ("Timestamps & {...}") nicht zuverlässig terminieren und
 * leise zu `never` kollabieren — Flatten erzwingt einen echten flachen
 * Objekttyp und behebt das (empirisch geprüft, siehe PR-Beschreibung/Commit).
 *
 * Nur Tabellen/Views, die die App tatsächlich anspricht, sind komplett
 * ausmodelliert; alle Tabellen aus dem Schema sind trotzdem enthalten, damit
 * der Typ ehrlich das ganze Schema abbildet.
 */

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ---- Wiederkehrende Statuswerte (Übersetzungsregeln: feste Werteliste) ----
export type OrganisationTyp = "afcj" | "employer";
export type OrganisationStatus = "aktiv" | "trial" | "pausiert";
export type Sprache = "DE" | "UK";
export type Rolle = "learner" | "afcj_admin";
export type CourseTyp = "synchron" | "asynchron";
export type ContentType = "scorm" | "live" | "repository";
export type CompetencyQuelle = "TQ-ARP" | "EFKffT" | "EFK-EE";
export type CompetencyStepTyp = "theoretisch" | "praktisch";
export type EnrolmentStatus = "aktiv" | "abgeschlossen" | "abgebrochen";
export type ScheduleArt = "live" | "asynchron" | "feld";
export type FieldJobStatus = "geplant" | "durchgeführt";
export type FieldJobErgebnis = "erledigt" | "problem";
export type FieldCapturePhase = "start" | "abschluss";
export type UnitProgressStatus = "offen" | "in Bearbeitung" | "abgeschlossen";
export type AttendanceStatus = "anwesend" | "abwesend" | "entschuldigt";
export type FieldCaptureStatus = "submitted" | "verified" | "rejected";
export type VerificationEntscheidung = "verified" | "rejected";
export type KnowledgeSourceStatus = "entwurf" | "freigegeben";
export type CompetencyEvidenceQuelltyp = "lesson_completion" | "field_verification";

interface Timestamps {
  created_at: string;
  updated_at: string;
}

// Erzwingt eine flache Objekt-Form statt einer Intersection (siehe Kommentar
// oben) — alle Row-Typen unten sind Flatten<...>.
type Flatten<T> = { [K in keyof T]: T[K] };

// Generisches Gerüst für eine Tabelle: garantiert das von postgrest-js
// verlangte Relationships-Feld an einer Stelle.
type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type View<Row> = {
  Row: Row;
  Relationships: [];
};

// ---- Benannte Row-Typen (eine Quelle der Wahrheit je Tabelle) ----

type OrganisationRow = Flatten<
  Timestamps & {
    id: string;
    name: string;
    typ: OrganisationTyp;
    status: OrganisationStatus;
  }
>;

type PersonRow = Flatten<
  Timestamps & {
    id: string;
    email: string;
    name: string;
    username: string;
    geburtsdatum: string | null;
    geschlecht: string | null;
    vorerfahrung: string | null;
    sprache: Sprache;
  }
>;

type OrgMembershipRow = Flatten<
  Timestamps & {
    id: string;
    person_id: string;
    organisation_id: string;
    aktiv_seit: string;
  }
>;

type RoleAssignmentRow = Flatten<
  Timestamps & {
    id: string;
    person_id: string;
    organisation_id: string;
    rolle: Rolle;
    aktiv_seit: string;
  }
>;

type FileAssetRow = Flatten<
  Timestamps & {
    id: string;
    organisation_id: string | null;
    dateiname: string;
    dateityp: string;
    storage_pfad: string;
    hochgeladen_von: string | null;
    hochgeladen_am: string;
  }
>;

type ScormPackageRow = Flatten<
  Timestamps & {
    id: string;
    lesson_id: string;
    file_asset_id: string;
    entry_point_pfad: string;
    manifest_titel: string | null;
  }
>;

type ProgrammeRow = Flatten<
  Timestamps & {
    id: string;
    name: string;
    kuerzel: string;
    beschreibung: string | null;
  }
>;

type ModuleRow = Flatten<
  Timestamps & {
    id: string;
    programme_id: string;
    name: string;
    reihenfolge: number;
  }
>;

type CourseRow = Flatten<
  Timestamps & {
    id: string;
    module_id: string | null;
    programme_id: string | null;
    name: string;
    typ: CourseTyp;
    reihenfolge: number;
  }
>;

type LessonRow = Flatten<
  Timestamps & {
    id: string;
    course_id: string;
    name: string;
    content_type: ContentType;
    inhalt: Json | null;
    reihenfolge: number;
  }
>;

type CompetencyRow = Flatten<
  Timestamps & {
    id: string;
    name: string;
    kompetenzbereich: string;
    quelle: CompetencyQuelle;
  }
>;

type CompetencyStepRow = Flatten<
  Timestamps & {
    id: string;
    competency_id: string;
    name: string;
    typ: CompetencyStepTyp;
    nachweistyp: "binär";
  }
>;

type ContentCompetencyMappingRow = Flatten<
  Timestamps & {
    id: string;
    lesson_id: string;
    competency_step_id: string;
  }
>;

type CohortRow = Flatten<
  Timestamps & {
    id: string;
    programme_id: string;
    name: string;
    start_datum: string;
    end_datum: string | null;
  }
>;

type EnrolmentRow = Flatten<
  Timestamps & {
    id: string;
    organisation_id: string;
    learner_id: string;
    cohort_id: string;
    instructor_id: string | null;
    status: EnrolmentStatus;
  }
>;

type LiveSessionRow = Flatten<
  Timestamps & {
    id: string;
    lesson_id: string | null;
    course_id: string | null;
    datum: string;
    start: string;
    ende: string;
    join_link: string | null;
    trainer_id: string | null;
  }
>;

type FieldJobTypeRow = Flatten<
  Timestamps & {
    id: string;
    titel: string;
    bild_oder_icon: string | null;
    beschreibung: string | null;
    kategorie: string | null;
    vorbereitung_text: string | null;
    vorbereitung_content_id: string | null;
    nachbereitung_text: string | null;
    nachbereitung_content_id: string | null;
  }
>;

type FieldJobTypeFrageRow = Flatten<
  Timestamps & {
    id: string;
    field_job_type_id: string;
    // Gleicher Wertebereich wie field_capture.phase (siehe dort) — bewusst
    // derselbe Typ, kein eigener Alias für dieselbe Domäne.
    phase: FieldCapturePhase;
    reihenfolge: number;
    frage_text: string;
    antwortoptionen: string[];
  }
>;

type FieldJobRow = Flatten<
  Timestamps & {
    id: string;
    organisation_id: string;
    datum: string;
    standort: string | null;
    field_job_type_id: string;
    learner_id: string;
    instructor_id: string | null;
    status: FieldJobStatus;
    durchgefuehrt_bestaetigt_am: string | null;
    // Entschieden 2026-09-11 (0011_field_job_praxistag_erfassung.sql): Learner
    // bestätigt "erledigt" oder meldet ein "problem" mit Freitext.
    ergebnis: FieldJobErgebnis | null;
    problem_beschreibung: string | null;
  }
>;

type ScheduleEntryRow = Flatten<
  Timestamps & {
    id: string;
    organisation_id: string;
    datum: string;
    art: ScheduleArt;
    reihenfolge: number;
    cohort_id: string | null;
    enrolment_id: string | null;
    course_id: string | null;
    lesson_id: string | null;
    live_session_id: string | null;
    field_job_id: string | null;
  }
>;

type UnitProgressRow = Flatten<
  Timestamps & {
    id: string;
    organisation_id: string;
    learner_id: string;
    lesson_id: string;
    status: UnitProgressStatus;
    abgeschlossen_am: string | null;
  }
>;

type AttendanceRow = Flatten<
  Timestamps & {
    id: string;
    organisation_id: string;
    learner_id: string;
    live_session_id: string;
    status: AttendanceStatus;
    bestaetigt_von: string | null;
  }
>;

type FieldCaptureRow = Flatten<
  Timestamps & {
    id: string;
    organisation_id: string;
    learner_id: string;
    field_job_id: string;
    // Entschieden 2026-09-11 (0011_field_job_praxistag_erfassung.sql): kein
    // Default, jede Einreichung muss die Phase explizit angeben.
    phase: FieldCapturePhase;
    text: string | null;
    media: Json | null;
    status: FieldCaptureStatus;
    eingereicht_am: string;
  }
>;

type FieldCaptureAntwortRow = Flatten<
  Timestamps & {
    id: string;
    organisation_id: string;
    field_capture_id: string;
    field_job_type_frage_id: string;
    gewaehlte_option: string;
  }
>;

type FieldCaptureStepMappingRow = Flatten<
  Timestamps & {
    id: string;
    organisation_id: string;
    field_capture_id: string;
    competency_step_id: string;
  }
>;

type VerificationRow = Flatten<
  Timestamps & {
    id: string;
    organisation_id: string;
    field_capture_id: string;
    verifiziert_von: string;
    entscheidung: VerificationEntscheidung;
    verifiziert_am: string;
    kommentar: string | null;
  }
>;

type KnowledgeSourceRow = Flatten<
  Timestamps & {
    id: string;
    file_asset_id: string;
    titel: string;
    kategorie: string | null;
    status: KnowledgeSourceStatus;
    freigegeben_von: string | null;
  }
>;

type CompetencyEvidenceRow = Flatten<{
  learner_id: string;
  competency_step_id: string;
  quelltyp: CompetencyEvidenceQuelltyp;
  quelle_id: string;
  organisation_id: string;
  erstellt_am: string;
}>;

export type Database = {
  public: {
    Tables: {
      organisation: Table<
        OrganisationRow,
        Flatten<Partial<Timestamps> & { id?: string; name: string; typ: OrganisationTyp; status?: OrganisationStatus }>,
        Partial<OrganisationRow>
      >;
      person: Table<
        PersonRow,
        Flatten<
          Partial<Timestamps> & {
            id: string; // = auth.users.id, kein Default in der DB
            email: string;
            name: string;
            username: string;
            geburtsdatum?: string | null;
            geschlecht?: string | null;
            vorerfahrung?: string | null;
            sprache?: Sprache;
          }
        >,
        Partial<PersonRow>
      >;
      org_membership: Table<
        OrgMembershipRow,
        Flatten<Partial<Timestamps> & { id?: string; person_id: string; organisation_id: string; aktiv_seit?: string }>,
        Partial<OrgMembershipRow>
      >;
      role_assignment: Table<
        RoleAssignmentRow,
        Flatten<
          Partial<Timestamps> & {
            id?: string;
            person_id: string;
            organisation_id: string;
            rolle: Rolle;
            aktiv_seit?: string;
          }
        >,
        Partial<RoleAssignmentRow>
      >;
      file_asset: Table<
        FileAssetRow,
        Flatten<
          Partial<Timestamps> & {
            id?: string;
            organisation_id?: string | null;
            dateiname: string;
            dateityp: string;
            storage_pfad: string;
            hochgeladen_von?: string | null;
            hochgeladen_am?: string;
          }
        >,
        Partial<FileAssetRow>
      >;
      scorm_package: Table<
        ScormPackageRow,
        Flatten<
          Partial<Timestamps> & {
            id?: string;
            lesson_id: string;
            file_asset_id: string;
            entry_point_pfad: string;
            manifest_titel?: string | null;
          }
        >,
        Partial<ScormPackageRow>
      >;
      programme: Table<
        ProgrammeRow,
        Flatten<Partial<Timestamps> & { id?: string; name: string; kuerzel: string; beschreibung?: string | null }>,
        Partial<ProgrammeRow>
      >;
      module: Table<
        ModuleRow,
        Flatten<Partial<Timestamps> & { id?: string; programme_id: string; name: string; reihenfolge: number }>,
        Partial<ModuleRow>
      >;
      course: Table<
        CourseRow,
        Flatten<
          Partial<Timestamps> & {
            id?: string;
            module_id?: string | null;
            programme_id?: string | null;
            name: string;
            typ: CourseTyp;
            reihenfolge: number;
          }
        >,
        Partial<CourseRow>
      >;
      lesson: Table<
        LessonRow,
        Flatten<
          Partial<Timestamps> & {
            id?: string;
            course_id: string;
            name: string;
            content_type: ContentType;
            inhalt?: Json | null;
            reihenfolge: number;
          }
        >,
        Partial<LessonRow>
      >;
      competency: Table<
        CompetencyRow,
        Flatten<Partial<Timestamps> & { id?: string; name: string; kompetenzbereich: string; quelle: CompetencyQuelle }>,
        Partial<CompetencyRow>
      >;
      competency_step: Table<
        CompetencyStepRow,
        Flatten<
          Partial<Timestamps> & {
            id?: string;
            competency_id: string;
            name: string;
            typ: CompetencyStepTyp;
            nachweistyp?: "binär";
          }
        >,
        Partial<CompetencyStepRow>
      >;
      content_competency_mapping: Table<
        ContentCompetencyMappingRow,
        Flatten<Partial<Timestamps> & { id?: string; lesson_id: string; competency_step_id: string }>,
        Partial<ContentCompetencyMappingRow>
      >;
      cohort: Table<
        CohortRow,
        Flatten<
          Partial<Timestamps> & {
            id?: string;
            programme_id: string;
            name: string;
            start_datum: string;
            end_datum?: string | null;
          }
        >,
        Partial<CohortRow>
      >;
      enrolment: Table<
        EnrolmentRow,
        Flatten<
          Partial<Timestamps> & {
            id?: string;
            organisation_id: string;
            learner_id: string;
            cohort_id: string;
            instructor_id?: string | null;
            status?: EnrolmentStatus;
          }
        >,
        Partial<EnrolmentRow>
      >;
      live_session: Table<
        LiveSessionRow,
        Flatten<
          Partial<Timestamps> & {
            id?: string;
            lesson_id?: string | null;
            course_id?: string | null;
            datum: string;
            start: string;
            ende: string;
            join_link?: string | null;
            trainer_id?: string | null;
          }
        >,
        Partial<LiveSessionRow>
      >;
      field_job_type: Table<
        FieldJobTypeRow,
        Flatten<
          Partial<Timestamps> & {
            id?: string;
            titel: string;
            bild_oder_icon?: string | null;
            beschreibung?: string | null;
            kategorie?: string | null;
            vorbereitung_text?: string | null;
            vorbereitung_content_id?: string | null;
            nachbereitung_text?: string | null;
            nachbereitung_content_id?: string | null;
          }
        >,
        Partial<FieldJobTypeRow>
      >;
      field_job_type_frage: Table<
        FieldJobTypeFrageRow,
        Flatten<
          Partial<Timestamps> & {
            id?: string;
            field_job_type_id: string;
            phase: FieldCapturePhase;
            reihenfolge: number;
            frage_text: string;
            antwortoptionen: string[];
          }
        >,
        Partial<FieldJobTypeFrageRow>
      >;
      field_job: Table<
        FieldJobRow,
        Flatten<
          Partial<Timestamps> & {
            id?: string;
            organisation_id: string;
            datum: string;
            standort?: string | null;
            field_job_type_id: string;
            learner_id: string;
            instructor_id?: string | null;
            status?: FieldJobStatus;
            durchgefuehrt_bestaetigt_am?: string | null;
          }
        >,
        // Deckt sich mit dem Spalten-Grant in 0012_rls_updates_2026-09-11.sql:
        // Learner dürfen nur diese drei Spalten schreiben. `status` bewusst
        // nicht im Update-Typ — wird seit fn_derive_field_job_status (0011)
        // per Trigger aus durchgefuehrt_bestaetigt_am abgeleitet, nicht mehr
        // direkt vom Client gesetzt.
        {
          durchgefuehrt_bestaetigt_am?: string | null;
          ergebnis?: FieldJobErgebnis | null;
          problem_beschreibung?: string | null;
        }
      >;
      schedule_entry: Table<
        ScheduleEntryRow,
        Flatten<
          Partial<Timestamps> & {
            id?: string;
            organisation_id: string;
            datum: string;
            art: ScheduleArt;
            reihenfolge: number;
            cohort_id?: string | null;
            enrolment_id?: string | null;
            course_id?: string | null;
            lesson_id?: string | null;
            live_session_id?: string | null;
            field_job_id?: string | null;
          }
        >,
        Partial<ScheduleEntryRow>
      >;
      unit_progress: Table<
        UnitProgressRow,
        Flatten<
          Partial<Timestamps> & {
            id?: string;
            organisation_id: string;
            learner_id: string;
            lesson_id: string;
            status?: UnitProgressStatus;
            abgeschlossen_am?: string | null;
          }
        >,
        Partial<UnitProgressRow>
      >;
      attendance: Table<
        AttendanceRow,
        Flatten<
          Partial<Timestamps> & {
            id?: string;
            organisation_id: string;
            learner_id: string;
            live_session_id: string;
            status?: AttendanceStatus;
            bestaetigt_von?: string | null;
          }
        >,
        Partial<AttendanceRow>
      >;
      field_capture: Table<
        FieldCaptureRow,
        // Deckt sich mit dem Spalten-Grant in 0009_rls_policies.sql: Learner
        // dürfen `status` weder einfügen noch ändern (Trigger leitet ihn aus
        // `verification` ab) — hier deshalb bewusst nicht im Insert-Typ.
        {
          id?: string;
          organisation_id: string;
          learner_id: string;
          field_job_id: string;
          phase: FieldCapturePhase;
          text?: string | null;
          media?: Json | null;
          eingereicht_am?: string;
        },
        { text?: string | null; media?: Json | null }
      >;
      field_capture_antwort: Table<
        FieldCaptureAntwortRow,
        Flatten<
          Partial<Timestamps> & {
            id?: string;
            organisation_id: string;
            field_capture_id: string;
            field_job_type_frage_id: string;
            gewaehlte_option: string;
          }
        >,
        Partial<FieldCaptureAntwortRow>
      >;
      field_capture_step_mapping: Table<
        FieldCaptureStepMappingRow,
        Flatten<
          Partial<Timestamps> & {
            id?: string;
            organisation_id: string;
            field_capture_id: string;
            competency_step_id: string;
          }
        >,
        Partial<FieldCaptureStepMappingRow>
      >;
      verification: Table<
        VerificationRow,
        Flatten<
          Partial<Timestamps> & {
            id?: string;
            organisation_id: string;
            field_capture_id: string;
            verifiziert_von: string;
            entscheidung: VerificationEntscheidung;
            verifiziert_am?: string;
            kommentar?: string | null;
          }
        >,
        Partial<VerificationRow>
      >;
      knowledge_source: Table<
        KnowledgeSourceRow,
        Flatten<
          Partial<Timestamps> & {
            id?: string;
            file_asset_id: string;
            titel: string;
            kategorie?: string | null;
            status?: KnowledgeSourceStatus;
            freigegeben_von?: string | null;
          }
        >,
        Partial<KnowledgeSourceRow>
      >;
    };
    Views: {
      // Berechnete View, kein Write (siehe 0006_progress_and_evidence.sql) —
      // absichtlich kein Insert/Update-Typ.
      competency_evidence: View<CompetencyEvidenceRow>;
    };
    Functions: Record<string, never>;
  };
};
