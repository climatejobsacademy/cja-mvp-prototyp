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

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ---- Wiederkehrende Statuswerte (Übersetzungsregeln: feste Werteliste) ----
export type OrganisationTyp = "afcj" | "employer";
export type OrganisationStatus = "aktiv" | "trial" | "pausiert";
export type Sprache = "DE" | "UK";
export type Rolle = "learner" | "afcj_admin" | "trainer"; // trainer seit 0030 (SR-78)
export type CourseTyp = "synchron" | "asynchron";
export type ContentType = "scorm" | "live" | "repository";
export type LessonResourceTyp = "datei" | "link";
export type CompetencyQuelle = "TQ-ARP" | "EFKffT" | "EFK-EE";
// Woche (Tabelle module, seit 0028)
export type Wochentyp = "theorie" | "praxis";
export type WochenLage = "online" | "praesenz" | "betrieb";
export type CompetencyStepTyp = "theoretisch" | "praktisch";
export type EnrolmentStatus = "aktiv" | "abgeschlossen" | "abgebrochen";
export type ScheduleArt = "live" | "asynchron" | "feld";
export type FieldJobStatus = "geplant" | "durchgeführt";
// 0058 (SR-64): Praxisflow.
export type FieldJobTypeAblauf = "einfach" | "gefuehrt" | "labor";
export type PraxisPhase =
  | "informieren"
  | "planen"
  | "entscheiden"
  | "ausfuehren"
  | "kontrollieren"
  | "bewerten"
  | "abgeschlossen";
export type PraxisEintrag = { id: string; text: string };
// 0059 (SR-88): Art einer hochgeladenen Datei im Praxisflow.
export type PraxisDateiArt = "auftrag" | "hilfe" | "plan" | "protokoll";
// Inhalt von field_job.praxisflow; geschrieben nur über fn_praxis_* (0058).
export type PraxisFortschritt = {
  werkzeuge?: PraxisEintrag[];
  materialien?: PraxisEintrag[];
  schritte?: PraxisEintrag[];
  erledigt?: { id: string; am: string }[];
  plan_bestaetigt_am?: string;
  plan_freigegeben_am?: string;
  verlauf?: { zeit: string; ereignis: string }[];
  // 0060 (SR-65): abgehakte Prüfpunkte und Freigaben der Trainer:in.
  kontrolle?: { id: string; am: string }[];
  zuschalten_freigegeben_am?: string;
  bewertung_freigegeben_am?: string;
  /** Rückblick in Bewerten bestätigt (SR-64, 0073) */
  rueckblick_am?: string;
  // 0061 (SR-89, SR-03, SR-90): Einschätzungen (Punkte je Kriterium) und Abschluss.
  einschaetzung?: Partial<Record<PraxisRolle, Record<string, number>>>;
  // 0065 (SR-64, Variante B): Deutung der Messwerte je Prüfpunkt in Kontrollieren.
  deutungen?: { id: string; text: string; am: string }[];
  // 0063 (SR-89, SR-64): abgelegte Durchläufe nach einem K.-o.
  durchlaeufe?: { nr: number; ergebnis: "ko"; einschaetzung?: Partial<Record<PraxisRolle, Record<string, number>>>; naechstes_mal?: string | null; am: string }[];
  naechstes_mal?: string | null;
  abgeschlossen_am?: string;
  ergebnis?: PraxisErgebnis;
};
export type PraxisRolle = "selbst" | "peer" | "trainer";
export type PraxisErgebnis = "angerechnet" | "ko" | "ohne_trainer";
export type PraxisGate = "plan" | "zuschalten" | "bewertung";
export type FieldJobErgebnis = "erledigt" | "problem";
export type FieldCapturePhase = "start" | "abschluss";
export type UnitProgressStatus = "offen" | "in Bearbeitung" | "abgeschlossen";
export type AttendanceStatus = "anwesend" | "nicht anwesend"; // seit 0011
export type FieldCaptureStatus = "submitted" | "verified" | "rejected";
export type VerificationEntscheidung = "verified" | "rejected";
export type KnowledgeSourceStatus = "entwurf" | "freigegeben";
export type CompetencyEvidenceQuelltyp = "lesson_completion" | "field_verification";
export type FachspracheEinheitStatus = "entwurf" | "veroeffentlicht"; // seit 0051; Prüfspalten seit 0053 entfernt

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
    logo_pfad: string | null; // 0025, SR-76
  }
>;

type FachspracheEinheitRow = Flatten<
  Timestamps & {
    id: string;
    lesson_id: string;
    titel: string;
    dauer_minuten: number | null;
    inhalt: Json; // Form: src/lib/fachsprache.ts (parseInhalt), Bilder im Bucket fachsprache-bilder
    inhalt_version: number;
    status: FachspracheEinheitStatus;
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
    rufname: string; // 0029, SR-48/SR-73
    foto_pfad: string | null; // 0030, SR-77: "<person_id>/<uuid>.jpg" im Bucket profilfotos
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

// Modul-Ebene (0028): modul über den Wochen; module ist (noch) die Woche.
type ModulRow = Flatten<
  Timestamps & {
    id: string;
    programme_id: string;
    ueberzeile: string;
    name: string;
    reihenfolge: number;
  }
>;

type ModuleRow = Flatten<
  Timestamps & {
    id: string;
    programme_id: string;
    modul_id: string;
    name: string;
    reihenfolge: number;
    wochentyp: Wochentyp;
    lage: WochenLage;
  }
>;

type ModulCompetencyRow = Flatten<
  Timestamps & {
    id: string;
    modul_id: string;
    competency_id: string;
    kuerzel: string | null;
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
    chat_aktiv: boolean;
    thema: string | null; // 0029, SR-13
    live_lektion_id: string | null; // 0029, SR-15: Selbstlernen -> Live, 1:1
  }
>;

// Fragen-Thread pro Lektion (0024, SR-74). Learner dürfen
// organisation_id und updated_at nicht lesen (Spalten-Grant); Row enthält nur
// die lesbaren Spalten.
type LektionBeitragRow = {
  id: string;
  created_at: string;
  lesson_id: string;
  cohort_id: string;
  parent_id: string | null;
  person_id: string | null;
  autor_anzeigename: string | null;
  text: string | null;
  geloescht_am: string | null;
};

// Kohorten-Chat (0050, SR-83). Learner dürfen organisation_id und updated_at
// nicht lesen (Spalten-Grant); Row enthält nur die lesbaren Spalten.
export type ChatKanal = "ankuendigungen" | "treffpunkt";
type ChatNachrichtRow = {
  id: string;
  created_at: string;
  cohort_id: string;
  kanal: ChatKanal;
  person_id: string | null;
  autor_anzeigename: string | null;
  text: string | null;
  geloescht_am: string | null;
};

// Meldungen (0050): lesen nur Moderierende der Kohorte, schreiben nur über Funktionen.
type ChatMeldungRow = Flatten<
  Timestamps & {
    id: string;
    nachricht_id: string;
    person_id: string | null;
    erledigt_am: string | null;
    erledigt_von: string | null;
  }
>;

type KohorteModerationRow = Flatten<
  Timestamps & {
    id: string;
    cohort_id: string;
    person_id: string;
    created_by: string | null;
  }
>;

type ModerationsprotokollAktion = "geloescht_autor" | "geloescht_moderation";

type ModerationsprotokollRow = Flatten<
  Timestamps & {
    id: string;
    beitrag_id: string;
    person_id: string | null;
    aktion: ModerationsprotokollAktion;
  }
>;

type LessonResourceRow = Flatten<
  Timestamps & {
    id: string;
    lesson_id: string;
    reihenfolge: number;
    typ: LessonResourceTyp;
    file_asset_id: string | null;
    external_url: string | null;
    titel: string;
  }
>;

/** SR-68 (0069): Hilfsunterlagen je Praxisaufgabe, gepflegt von AfCJ. */
type FieldJobTypeResourceRow = Flatten<
  Timestamps & {
    id: string;
    field_job_type_id: string;
    reihenfolge: number;
    typ: LessonResourceTyp;
    titel: string;
    file_asset_id: string | null;
    external_url: string | null;
  }
>;

type CompetencyRow = Flatten<
  Timestamps & {
    id: string;
    name: string;
    kompetenzbereich: string;
    /**
     * @deprecated Seit 0020 (SR-70) nicht mehr als Programm-Zuordnung lesen --
     * die läuft über `competency_programme` (N:M). Spalte entfällt mit der
     * Drop-Column-Folgemigration.
     */
    quelle: CompetencyQuelle;
  }
>;

type CompetencyStepRow = Flatten<
  Timestamps & {
    id: string;
    /**
     * @deprecated Seit 0019 (SR-69) nicht mehr lesen -- Zuordnung zur
     * Kompetenz läuft über `competency_competency_step` (N:M). Spalte
     * entfällt mit der Drop-Column-Folgemigration.
     */
    competency_id: string;
    name: string;
    typ: CompetencyStepTyp;
    nachweistyp: "binär";
  }
>;

type FieldJobTypeCompetencyMappingRow = Flatten<
  Timestamps & {
    id: string;
    field_job_type_id: string;
    competency_step_id: string;
  }
>;

type ContentCompetencyMappingRow = Flatten<
  Timestamps & {
    id: string;
    lesson_id: string;
    competency_step_id: string;
  }
>;

type CompetencyProgrammeRow = Flatten<
  Timestamps & {
    id: string;
    competency_id: string;
    programme_id: string;
  }
>;

type CompetencyCompetencyStepRow = Flatten<
  Timestamps & {
    id: string;
    competency_id: string;
    competency_step_id: string;
    // 0027_competency_step_reihenfolge.sql: Position je Kompetenz, > 0,
    // eindeutig je Kompetenz (deferrable).
    reihenfolge: number;
  }
>;

type CohortRow = Flatten<
  Timestamps & {
    id: string;
    programme_id: string;
    name: string;
    start_datum: string;
    end_datum: string | null;
    // Kohorten-Chat freigeschaltet (0050, SR-83), Standard false
    chat_aktiv: boolean;
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
    // Entschieden 2026-09-16 (SR-58/0014): XOR mit programme_id, analog course.
    module_id: string | null;
    programme_id: string | null;
    // Entschieden 2026-09-16 (SR-58/0015): analog module.reihenfolge/course.reihenfolge.
    reihenfolge: number;
    // 0058 (SR-64): einfach = bisheriger Praxistag, gefuehrt = Praxisflow.
    ablauf: FieldJobTypeAblauf;
    // 0067 (SR-91): Prüfprotokoll-Variante der Aufgabe, leer = Standard-Prüfliste.
    pruefprotokoll_id: string | null;
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
    // 0026_field_job_uhrzeit.sql (SR-13): beide oder keiner, ende > start.
    start: string | null;
    ende: string | null;
    field_job_type_id: string;
    learner_id: string;
    instructor_id: string | null;
    /** SR-78 (0071): zweite begleitende Trainer:in, nur Anzeige */
    zweit_trainer_id: string | null;
    status: FieldJobStatus;
    durchgefuehrt_bestaetigt_am: string | null;
    // Entschieden 2026-09-11 (0011_field_job_praxistag_erfassung.sql): Learner
    // bestätigt "erledigt" oder meldet ein "problem" mit Freitext.
    ergebnis: FieldJobErgebnis | null;
    problem_beschreibung: string | null;
    // 0058 (SR-64): Phase und Fortschritt im Praxisflow, nur über fn_praxis_*.
    phase: PraxisPhase;
    phase_seit: string | null;
    praxisflow: PraxisFortschritt;
    // 0067 (SR-91): Prüfprotokoll-Variante, beim Anlegen vom Typ übernommen.
    pruefprotokoll_id: string | null;
  }
>;

// 0067 (SR-91): Prüfprotokoll-Varianten und ihre Punkte (AfCJ pflegt, Lernende lesen veröffentlichte).
type PruefprotokollRow = Flatten<
  Timestamps & { id: string; kennung: string; titel: string; beschreibung: string | null; status: "published" | "unpublished" }
>;
type PruefprotokollPunktRow = Flatten<
  Timestamps & {
    id: string;
    pruefprotokoll_id: string;
    kennung: string;
    nr: number;
    teil: "spannungsfrei" | "unter_spannung";
    titel: string;
    text: string | null;
    hinweis: string | null;
    punkte: string[];
  }
>;

// 0060 (SR-65): nur AfCJ admin liest; geschrieben nur über fn_praxis_*.
type PraxisCodewortRow = Flatten<
  Timestamps & { id: string; cohort_id: string; hash: string; geaendert_von: string | null }
>;
type PraxisCodewortVersuchRow = Flatten<
  Timestamps & {
    id: string;
    organisation_id: string;
    field_job_id: string;
    gate: PraxisGate;
    art: "fehlversuch" | "erfolg" | "entsperrt";
    person_id: string | null;
  }
>;

// 0059 (SR-88): nur die lernende Person selbst liest, legt an und löscht.
type FieldJobDateiRow = Flatten<
  Timestamps & {
    id: string;
    organisation_id: string;
    field_job_id: string;
    learner_id: string;
    art: PraxisDateiArt;
    storage_pfad: string;
    dateiname: string;
    mime_type: string;
    groesse: number;
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
    /** Stand in einer Selbstlern-Lektion (0056), Form: src/lib/lernstand.ts */
    stand: Json | null;
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
    /** Zeitpunkt der Bestätigung (0032, SR-07) */
    bestaetigt_am: string;
    /** Storno: korrigiert diese Zeile (0032, E4); aktueller Wert über attendance_aktuell */
    korrigiert_id: string | null;
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
    /** Storno: ersetzt diese Entscheidung (0032, E4); aktueller Wert über verification_aktuell */
    korrigiert_id: string | null;
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

type CompetencyFulfilmentRow = Flatten<{
  learner_id: string;
  competency_id: string;
  teilschritte_gesamt: number;
  teilschritte_erfuellt: number;
  erfuellt: boolean;
}>;

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
        Flatten<Partial<Timestamps> & { id?: string; name: string; typ: OrganisationTyp; status?: OrganisationStatus; logo_pfad?: string | null }>,
        Partial<OrganisationRow>
      >;
      fachsprache_einheit: Table<
        FachspracheEinheitRow,
        Flatten<
          Partial<Timestamps> & {
            id?: string;
            lesson_id: string;
            titel: string;
            dauer_minuten?: number | null;
            inhalt: Json;
            inhalt_version?: number;
            status?: FachspracheEinheitStatus;
          }
        >,
        Partial<FachspracheEinheitRow>
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
            rufname?: string; // Trigger belegt ihn aus name vor
            foto_pfad?: string | null;
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
      modul: Table<
        ModulRow,
        Flatten<
          Partial<Timestamps> & { id?: string; programme_id: string; ueberzeile: string; name: string; reihenfolge: number }
        >,
        Partial<ModulRow>
      >;
      module: Table<
        ModuleRow,
        Flatten<
          Partial<Timestamps> & {
            id?: string;
            programme_id: string;
            modul_id: string;
            name: string;
            reihenfolge: number;
            wochentyp: Wochentyp;
            lage: WochenLage;
          }
        >,
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
            chat_aktiv?: boolean;
            thema?: string | null;
            live_lektion_id?: string | null;
          }
        >,
        Partial<LessonRow>
      >;
      // Insert nur mit diesen vier Spalten (Spalten-Grant); person_id,
      // organisation_id und autor_anzeigename setzt der Trigger. Kein Update.
      lektion_beitrag: Table<
        LektionBeitragRow,
        { lesson_id: string; cohort_id: string; parent_id?: string | null; text: string },
        Record<string, never>
      >;
      kohorte_moderation: Table<
        KohorteModerationRow,
        Flatten<Partial<Timestamps> & { id?: string; cohort_id: string; person_id: string; created_by?: string | null }>,
        Partial<KohorteModerationRow>
      >;
      moderationsprotokoll: Table<ModerationsprotokollRow, Record<string, never>, Record<string, never>>;
      // Insert nur Kennung, Kohorte, Kanal, Text (Spalten-Grant, 0050); person_id,
      // organisation_id und autor_anzeigename setzt der Trigger. Kein Update.
      chat_meldung: Table<ChatMeldungRow, Record<string, never>, Record<string, never>>;
      chat_nachricht: Table<
        ChatNachrichtRow,
        { id?: string; cohort_id: string; kanal: ChatKanal; text: string },
        Record<string, never>
      >;
      lesson_resource: Table<
        LessonResourceRow,
        Flatten<
          Partial<Timestamps> & {
            id?: string;
            lesson_id: string;
            reihenfolge: number;
            typ: LessonResourceTyp;
            file_asset_id?: string | null;
            external_url?: string | null;
            titel: string;
          }
        >,
        Partial<LessonResourceRow>
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
      competency_competency_step: Table<
        CompetencyCompetencyStepRow,
        Flatten<Partial<Timestamps> & { id?: string; competency_id: string; competency_step_id: string; reihenfolge: number }>,
        Partial<CompetencyCompetencyStepRow>
      >;
      field_job_type_competency_mapping: Table<
        FieldJobTypeCompetencyMappingRow,
        Flatten<Partial<Timestamps> & { id?: string; field_job_type_id: string; competency_step_id: string }>,
        Partial<FieldJobTypeCompetencyMappingRow>
      >;
      modul_competency: Table<
        ModulCompetencyRow,
        Flatten<
          Partial<Timestamps> & {
            id?: string;
            modul_id: string;
            competency_id: string;
            kuerzel?: string | null;
            reihenfolge: number;
          }
        >,
        Partial<ModulCompetencyRow>
      >;
      competency_programme: Table<
        CompetencyProgrammeRow,
        Flatten<Partial<Timestamps> & { id?: string; competency_id: string; programme_id: string }>,
        Partial<CompetencyProgrammeRow>
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
            module_id?: string | null;
            programme_id?: string | null;
            reihenfolge: number;
            ablauf?: FieldJobTypeAblauf;
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
            start?: string | null;
            ende?: string | null;
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
      field_job_datei: Table<
        FieldJobDateiRow,
        Flatten<Partial<Timestamps> & Omit<FieldJobDateiRow, "id" | "created_at" | "updated_at"> & { id?: string }>,
        Record<string, never>
      >;
      praxis_codewort: Table<PraxisCodewortRow, Record<string, never>, Record<string, never>>;
      pruefprotokoll: Table<PruefprotokollRow, Record<string, never>, Record<string, never>>;
      pruefprotokoll_punkt: Table<PruefprotokollPunktRow, Record<string, never>, Record<string, never>>;
      field_job_type_resource: Table<FieldJobTypeResourceRow, Record<string, never>, Record<string, never>>;
      praxis_codewort_versuch: Table<PraxisCodewortVersuchRow, Record<string, never>, Record<string, never>>;
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
            stand?: Json | null;
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
            bestaetigt_am?: string;
            korrigiert_id?: string | null;
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
      // SR-72 (0021): AND-Logik je Learner und Kompetenz, ebenfalls kein Write.
      competency_fulfilment: View<CompetencyFulfilmentRow>;
      // 0032 (SR-07, E4): aktuelle Zeilen ohne Storno, RLS über die Basistabellen.
      attendance_aktuell: View<AttendanceRow>;
      verification_aktuell: View<VerificationRow>;
    };
    Functions: {
      // Soft-Delete eines Beitrags (0024): Autor:in eigene, Moderation alle der Kohorte.
      fn_beitrag_loeschen: { Args: { p_beitrag_id: string }; Returns: undefined };
      // Sichtbarkeit und Schreibrecht im Thread (0024), gleiche Regel wie die Policies.
      fn_kann_beitraege_lesen: { Args: { p_lesson_id: string; p_cohort_id: string }; Returns: boolean };
      fn_kann_beitrag_schreiben: { Args: { p_lesson_id: string; p_cohort_id: string }; Returns: boolean };
      // Zeitraum je Modul aus dem Stundenplan der Kohorte (0028), RLS der aufrufenden Person.
      fn_modul_zeitraum: { Args: { p_cohort_id: string }; Returns: { modul_id: string; von: string; bis: string }[] };
      // Trainer:innen im eigenen Plan, nur Rolle trainer (0030, SR-78).
      // 0032 (SR-81, SR-82): Lernende der Kohorten, in denen die Trainer:in einen Termin hat (E3).
      fn_trainer_teilnehmende: {
        Args: Record<string, never>;
        Returns: { person_id: string; cohort_id: string; enrolment_id: string; name: string; rufname: string }[];
      };
      fn_meine_trainer: {
        Args: Record<string, never>;
        Returns: { person_id: string; name: string; rufname: string; foto_pfad: string | null }[];
      };
      // Andere Lernende der eigenen Kohorte, gleiche Organisation, aktiv (0034, SR-30).
      fn_meine_kohorte: {
        Args: Record<string, never>;
        Returns: { person_id: string; anzeigename: string; foto_pfad: string | null }[];
      };
      // Kohorten-Chat (0050, SR-83): gleiche Regeln wie die Policies.
      fn_chat_darf_lesen: { Args: { p_cohort_id: string }; Returns: boolean };
      fn_chat_darf_schreiben: { Args: { p_cohort_id: string; p_kanal: ChatKanal }; Returns: boolean };
      fn_chat_moderiert: { Args: { p_cohort_id: string }; Returns: boolean };
      fn_chat_nachricht_loeschen: { Args: { p_nachricht_id: string }; Returns: undefined };
      fn_chat_nachricht_melden: { Args: { p_nachricht_id: string }; Returns: undefined };
      fn_chat_meldung_erledigt: { Args: { p_meldung_id: string }; Returns: undefined };
      fn_chat_gelesen_setzen: { Args: { p_cohort_id: string; p_kanal: ChatKanal }; Returns: undefined };
      fn_chat_ungelesen: { Args: { p_cohort_id: string }; Returns: { kanal: ChatKanal; anzahl: number }[] };
      // Darf die eingeloggte Person die Fotos im Ordner sehen? (0030, SR-77)
      fn_darf_foto_sehen: { Args: { p_ordner: string }; Returns: boolean };
      // Praxisflow (0058, SR-64): nur eigener Praxistag im geführten Ablauf.
      fn_praxis_plan_speichern: {
        Args: { p_job: string; p_werkzeuge: string[]; p_materialien: string[]; p_schritte: string[] };
        Returns: PraxisFortschritt;
      };
      fn_praxis_weiter: { Args: { p_job: string; p_von: PraxisPhase }; Returns: PraxisPhase };
      fn_praxis_zurueck_zum_plan: { Args: { p_job: string }; Returns: PraxisPhase };
      fn_praxis_schritt_abhaken: { Args: { p_job: string; p_schritt: string }; Returns: PraxisFortschritt };
      // 0059 (SR-88): Dateien zum Praxistag hochladen oder löschen erlaubt?
      fn_praxis_datei_offen: { Args: { p_job: string }; Returns: boolean };
      // 0060 (SR-65): Prüfpunkte abhaken, Trainer-Gate mit Codewort, Pflege durch AfCJ admin.
      fn_praxis_kontrolle_abhaken: { Args: { p_job: string; p_punkt: string }; Returns: PraxisFortschritt };
      fn_praxis_deutung_speichern: { Args: { p_job: string; p_punkt: string; p_text: string }; Returns: PraxisFortschritt };
      // 0073 (SR-64): Rückblick auf die vollständige Handlung in Bewerten.
      fn_praxis_rueckblick_speichern: { Args: { p_job: string; p_phasen: string[] }; Returns: PraxisFortschritt };
      fn_praxis_gate: { Args: { p_job: string; p_gate: "plan" | "zuschalten"; p_codewort: string }; Returns: boolean };
      fn_praxis_codewort_setzen: { Args: { p_cohort: string; p_codewort: string }; Returns: undefined };
      fn_praxis_codewort_entsperren: { Args: { p_job: string; p_gate: PraxisGate }; Returns: undefined };
      // 0061 (SR-89, SR-03): Einschätzung speichern, Abschluss mit automatischer Verifizierung.
      fn_praxis_ereignis_melden: { Args: { p_job: string; p_ereignisse: unknown }; Returns: number };
      fn_praxis_einschaetzen: {
        Args: { p_job: string; p_rolle: "selbst" | "peer"; p_werte: Record<string, number> };
        Returns: PraxisFortschritt;
      };
      // Trainer-Einschätzung nur mit Codewort im selben Aufruf; false = Codewort falsch.
      fn_praxis_trainer_einschaetzen: {
        Args: { p_job: string; p_werte: Record<string, number>; p_codewort: string };
        Returns: boolean;
      };
      fn_praxis_abschliessen: { Args: { p_job: string; p_naechstes_mal: string | null }; Returns: PraxisErgebnis };
    };
  };
};
