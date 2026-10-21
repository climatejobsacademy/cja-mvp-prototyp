import { heuteInBerlin } from "@/lib/date";
import { lektionTitel } from "@/lib/lektion-titel";
import { eigenerLiveTermin, type Plan } from "@/lib/live-termin";
import { createClient } from "@/lib/supabase/server";
import { scormPaketSignieren, type ScormPaket } from "@/lib/queries/scorm-paket";
import type { ContentType, UnitProgressStatus } from "@/lib/database.types";

export type LessonListItem = {
  id: string;
  /** Titel ohne Klammer, wenn thema gesetzt ist (SR-13, 0029) */
  name: string;
  thema: string | null;
  contentType: ContentType;
  status: UnitProgressStatus;
};

export type CourseListItem = {
  id: string;
  name: string;
  lessons: LessonListItem[];
  fortschrittProzent: number;
  abgeschlossen: boolean;
};

export type FieldJobTypeListItem = {
  id: string;
  titel: string;
  beschreibung: string | null;
  vorbereitungText: string | null;
  /** Praxistag des Learners zu dieser Aufgabe (nächster offener, sonst letzter) -- null, wenn keiner existiert. */
  fieldJobId: string | null;
};

export type ModuleGroup = {
  id: string | null; // null = Kurse hängen direkt am Programm, kein Modul
  name: string | null;
  /** Modul der Woche (module.modul_id, 0028); null ohne Zuordnung bzw. ohne Woche */
  modulId: string | null;
  /** theorie/praxis und online/praesenz/betrieb (0028), null wenn nicht gepflegt */
  wochentyp: "theorie" | "praxis" | null;
  lage: "online" | "praesenz" | "betrieb" | null;
  courses: CourseListItem[];
  praxisTypen: FieldJobTypeListItem[];
};

/**
 * Content Library (design-specifications.md 2.4): Liste aller Kurse/Lektionen
 * des Programms, gruppiert nach Kurs (Modul falls vorhanden). Abgeschlossene
 * und laufende Kurse bleiben beide sichtbar (Entscheidung 2026-09-09) — hier
 * gibt es also keine Filterung, nur die Statusberechnung für die Anzeige.
 */
export async function getContentLibrary(
  programmeId: string,
  learnerId: string
): Promise<ModuleGroup[]> {
  const supabase = await createClient();

  const [{ data: modules }, { data: coursesViaProgramme }, { data: fieldJobTypesViaProgramme }] = await Promise.all([
    supabase
      .from("module")
      .select("id, name, reihenfolge, modul_id, wochentyp, lage")
      .eq("programme_id", programmeId)
      .order("reihenfolge", { ascending: true }),
    supabase
      .from("course")
      .select("id, name, reihenfolge, module_id")
      .eq("programme_id", programmeId)
      .order("reihenfolge", { ascending: true }),
    supabase
      .from("field_job_type")
      .select("id, titel, beschreibung, vorbereitung_text, reihenfolge, module_id")
      .eq("programme_id", programmeId)
      .order("reihenfolge", { ascending: true }),
  ]);

  const moduleIds = (modules ?? []).map((m) => m.id);
  // Ladezeit (Anna 2026-10-21): beide Abfragen über die Wochen gleichzeitig.
  type KursZeile = { id: string; name: string; reihenfolge: number; module_id: string | null };
  type AuftragZeile = {
    id: string;
    titel: string;
    beschreibung: string | null;
    vorbereitung_text: string | null;
    reihenfolge: number;
    module_id: string | null;
  };
  const [{ data: coursesViaModule }, { data: fieldJobTypesViaModule }] = moduleIds.length
    ? await Promise.all([
        supabase
          .from("course")
          .select("id, name, reihenfolge, module_id")
          .in("module_id", moduleIds)
          .order("reihenfolge", { ascending: true }),
        supabase
          .from("field_job_type")
          .select("id, titel, beschreibung, vorbereitung_text, reihenfolge, module_id")
          .in("module_id", moduleIds)
          .order("reihenfolge", { ascending: true }),
      ])
    : [{ data: [] as KursZeile[] }, { data: [] as AuftragZeile[] }];

  const allCourses = [...(coursesViaProgramme ?? []), ...(coursesViaModule ?? [])];
  const allFieldJobTypes = [...(fieldJobTypesViaProgramme ?? []), ...(fieldJobTypesViaModule ?? [])];
  const courseIds = allCourses.map((c) => c.id);

  const { data: lessons } = courseIds.length
    ? await supabase
        .from("lesson")
        .select("id, course_id, name, thema, content_type, reihenfolge")
        .in("course_id", courseIds)
        .order("reihenfolge", { ascending: true })
    : {
        data: [] as {
          id: string;
          course_id: string;
          name: string;
          thema: string | null;
          content_type: ContentType;
          reihenfolge: number;
        }[],
      };

  const lessonIds = (lessons ?? []).map((l) => l.id);
  const { data: progress } = lessonIds.length
    ? await supabase
        .from("unit_progress")
        .select("lesson_id, status")
        .eq("learner_id", learnerId)
        .in("lesson_id", lessonIds)
    : { data: [] as { lesson_id: string; status: UnitProgressStatus }[] };

  const statusByLesson = new Map((progress ?? []).map((p) => [p.lesson_id, p.status]));

  function buildCourse(course: { id: string; name: string }): CourseListItem {
    const courseLessons = (lessons ?? [])
      .filter((l) => l.course_id === course.id)
      .map((l) => ({
        id: l.id,
        name: lektionTitel(l.name, l.thema).titel,
        thema: lektionTitel(l.name, l.thema).thema,
        contentType: l.content_type,
        status: statusByLesson.get(l.id) ?? "offen",
      }));
    const done = courseLessons.filter((l) => l.status === "abgeschlossen").length;
    return {
      id: course.id,
      name: course.name,
      lessons: courseLessons,
      fortschrittProzent: courseLessons.length > 0 ? Math.round((done / courseLessons.length) * 100) : 0,
      abgeschlossen: courseLessons.length > 0 && done === courseLessons.length,
    };
  }

  // Praxistage des Learners je Aufgabe, damit die Praxisaufgaben im Reiter
  // Programm direkt in den Praxis-Flow führen: bevorzugt der nächste noch
  // geplante Einsatz ab heute, sonst der früheste geplante, sonst der letzte.
  const heute = heuteInBerlin();
  const typeIds = allFieldJobTypes.map((ft) => ft.id);
  const { data: meineEinsaetze } = typeIds.length
    ? await supabase
        .from("field_job")
        .select("id, datum, status, field_job_type_id")
        .eq("learner_id", learnerId)
        .in("field_job_type_id", typeIds)
        .order("datum", { ascending: true })
    : { data: [] as { id: string; datum: string; status: string; field_job_type_id: string }[] };

  function einsatzFuer(typeId: string): string | null {
    const eigene = (meineEinsaetze ?? []).filter((j) => j.field_job_type_id === typeId);
    const offen = eigene.filter((j) => j.status === "geplant");
    const naechster = offen.find((j) => j.datum >= heute) ?? offen[0] ?? eigene[eigene.length - 1];
    return naechster?.id ?? null;
  }

  function buildPraxisTyp(fieldJobType: {
    id: string;
    titel: string;
    beschreibung: string | null;
    vorbereitung_text: string | null;
  }): FieldJobTypeListItem {
    return {
      id: fieldJobType.id,
      titel: fieldJobType.titel,
      beschreibung: fieldJobType.beschreibung,
      vorbereitungText: fieldJobType.vorbereitung_text,
      fieldJobId: einsatzFuer(fieldJobType.id),
    };
  }

  const groups: ModuleGroup[] = (modules ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    modulId: m.modul_id,
    wochentyp: m.wochentyp,
    lage: m.lage,
    courses: allCourses.filter((c) => c.module_id === m.id).map(buildCourse),
    praxisTypen: allFieldJobTypes.filter((ft) => ft.module_id === m.id).map(buildPraxisTyp),
  }));

  const ungruppierteKurse = allCourses.filter((c) => !c.module_id).map(buildCourse);
  const ungruppiertePraxisTypen = allFieldJobTypes.filter((ft) => !ft.module_id).map(buildPraxisTyp);
  if (ungruppierteKurse.length > 0 || ungruppiertePraxisTypen.length > 0) {
    groups.push({
      id: null,
      name: null,
      modulId: null,
      wochentyp: null,
      lage: null,
      courses: ungruppierteKurse,
      praxisTypen: ungruppiertePraxisTypen,
    });
  }

  return groups;
}

/** Verknüpfte Lektion (0029, live_lektion_id), nur wenn für Learner lesbar. */
export type VerknuepfteLektion = { id: string; titel: string };

export type LessonDetail = {
  id: string;
  /** Titel ohne Klammer, wenn thema gesetzt ist (SR-13, 0029) */
  name: string;
  thema: string | null;
  contentType: ContentType;
  chatAktiv: boolean;
  status: UnitProgressStatus;
  /** Gespeicherter Stand in der Selbstlern-Lektion (0056), ungeprüft; Prüfung: src/lib/lernstand.ts */
  lernStand: unknown;
  liveSession: {
    datum: string;
    start: string;
    ende: string;
    joinLink: string | null;
    /** live_session.trainer_id (SR-78), sonst null */
    trainerId: string | null;
  } | null;
  scorm: ScormPaket | null;
  /** Live-Lektion: die zugehörige Selbstlern-Lektion ("Wissen festigen") */
  festigen: VerknuepfteLektion | null;
  /** Selbstlern-Lektion: die zugehörige Live-Lektion */
  liveLektion: VerknuepfteLektion | null;
  /** Modul der Lektion (Kurs → Woche → modul, 0028), klein über dem Titel; null ohne Zuordnung */
  modul: { ueberzeile: string; name: string } | null;
};

export async function getLessonDetail(
  lessonId: string,
  learnerId: string,
  plan: Plan
): Promise<LessonDetail | null> {
  const supabase = await createClient();

  const { data: lesson } = await supabase
    .from("lesson")
    .select("id, name, thema, content_type, chat_aktiv, live_lektion_id, course_id")
    .eq("id", lessonId)
    .single();
  if (!lesson) return null;

  // Modul über Kurs und Woche (module.modul_id, 0028) -- nicht über das
  // Datum und eine feste Gliederung. Unveröffentlichtes filtert RLS heraus.
  const { data: kurs } = await supabase.from("course").select("module_id").eq("id", lesson.course_id).maybeSingle();
  const { data: woche } = kurs?.module_id
    ? await supabase.from("module").select("modul_id").eq("id", kurs.module_id).maybeSingle()
    : { data: null };
  const { data: modul } = woche?.modul_id
    ? await supabase.from("modul").select("ueberzeile, name").eq("id", woche.modul_id).maybeSingle()
    : { data: null };

  // Selbstlernen <-> Live (SR-15, Datenlücke Nr. 8): über live_lektion_id an
  // der Selbstlern-Lektion, 1:1 -- nicht mehr über gleichen Titel am selben
  // Tag. Unveröffentlichte Lektionen filtert RLS heraus.
  const { data: verknuepft } =
    lesson.content_type === "live"
      ? await supabase.from("lesson").select("id, name, thema").eq("live_lektion_id", lesson.id).maybeSingle()
      : lesson.live_lektion_id
        ? await supabase.from("lesson").select("id, name, thema").eq("id", lesson.live_lektion_id).maybeSingle()
        : { data: null };
  const verknuepfteLektion: VerknuepfteLektion | null = verknuepft
    ? { id: verknuepft.id, titel: lektionTitel(verknuepft.name, verknuepft.thema).titel }
    : null;

  const { data: progress } = await supabase
    .from("unit_progress")
    .select("status, stand")
    .eq("learner_id", learnerId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  let liveSession: LessonDetail["liveSession"] = null;
  if (lesson.content_type === "live") {
    // SR-15, SR-21: Termin aus dem Plan der eigenen Kohorte bzw. Einschreibung,
    // nicht der früheste Termin der Lektion (Kohorten können sich eine
    // Lektion teilen). Nichts im eigenen Plan → kein Termin.
    const { data: sessions } = await supabase
      .from("live_session")
      .select("id, datum, start, ende, join_link, trainer_id")
      .eq("lesson_id", lessonId);
    const { data: eintraege } = sessions?.length
      ? await supabase
          .from("schedule_entry")
          .select("live_session_id, cohort_id, enrolment_id")
          .eq("art", "live")
          .in("live_session_id", sessions.map((s) => s.id))
          .or(`cohort_id.eq.${plan.cohortId},enrolment_id.eq.${plan.enrolmentId}`)
      : { data: [] };
    const session = eigenerLiveTermin(sessions ?? [], eintraege ?? [], plan);
    if (session) {
      liveSession = {
        datum: session.datum,
        start: session.start,
        ende: session.ende,
        joinLink: session.join_link,
        trainerId: session.trainer_id,
      };
    }
  }

  // SCORM (SR-50/51/52, Architektur-Entscheidung 2026-09-16): Entry-Point und
  // eine kurzlebige signierte URL fuers Zip laden, mit der Session der
  // Person (RLS 0016/0017, kein Service-Role-Key). Speicherpfad fuer die
  // native Ansicht (SR-85).
  const scorm: LessonDetail["scorm"] = lesson.content_type === "scorm" ? await scormPaketSignieren(lessonId) : null;

  const titel = lektionTitel(lesson.name, lesson.thema);
  return {
    id: lesson.id,
    name: titel.titel,
    thema: titel.thema,
    contentType: lesson.content_type,
    chatAktiv: lesson.chat_aktiv,
    status: progress?.status ?? "offen",
    lernStand: progress?.stand ?? null,
    liveSession,
    scorm,
    festigen: lesson.content_type === "live" ? verknuepfteLektion : null,
    liveLektion: lesson.content_type === "live" ? null : verknuepfteLektion,
    modul: modul ? { ueberzeile: modul.ueberzeile, name: modul.name } : null,
  };
}
