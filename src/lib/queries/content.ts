import { createClient } from "@/lib/supabase/server";
import type { ContentType, UnitProgressStatus } from "@/lib/database.types";

export type LessonListItem = {
  id: string;
  name: string;
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
};

export type ModuleGroup = {
  id: string | null; // null = Kurse hängen direkt am Programm, kein Modul
  name: string | null;
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
      .select("id, name, reihenfolge")
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
  const { data: coursesViaModule } = moduleIds.length
    ? await supabase
        .from("course")
        .select("id, name, reihenfolge, module_id")
        .in("module_id", moduleIds)
        .order("reihenfolge", { ascending: true })
    : { data: [] as { id: string; name: string; reihenfolge: number; module_id: string | null }[] };

  const { data: fieldJobTypesViaModule } = moduleIds.length
    ? await supabase
        .from("field_job_type")
        .select("id, titel, beschreibung, vorbereitung_text, reihenfolge, module_id")
        .in("module_id", moduleIds)
        .order("reihenfolge", { ascending: true })
    : {
        data: [] as {
          id: string;
          titel: string;
          beschreibung: string | null;
          vorbereitung_text: string | null;
          reihenfolge: number;
          module_id: string | null;
        }[],
      };

  const allCourses = [...(coursesViaProgramme ?? []), ...(coursesViaModule ?? [])];
  const allFieldJobTypes = [...(fieldJobTypesViaProgramme ?? []), ...(fieldJobTypesViaModule ?? [])];
  const courseIds = allCourses.map((c) => c.id);

  const { data: lessons } = courseIds.length
    ? await supabase
        .from("lesson")
        .select("id, course_id, name, content_type, reihenfolge")
        .in("course_id", courseIds)
        .order("reihenfolge", { ascending: true })
    : { data: [] as { id: string; course_id: string; name: string; content_type: ContentType; reihenfolge: number }[] };

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
        name: l.name,
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
    };
  }

  const groups: ModuleGroup[] = (modules ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    courses: allCourses.filter((c) => c.module_id === m.id).map(buildCourse),
    praxisTypen: allFieldJobTypes.filter((ft) => ft.module_id === m.id).map(buildPraxisTyp),
  }));

  const ungruppierteKurse = allCourses.filter((c) => !c.module_id).map(buildCourse);
  const ungruppiertePraxisTypen = allFieldJobTypes.filter((ft) => !ft.module_id).map(buildPraxisTyp);
  if (ungruppierteKurse.length > 0 || ungruppiertePraxisTypen.length > 0) {
    groups.push({ id: null, name: null, courses: ungruppierteKurse, praxisTypen: ungruppiertePraxisTypen });
  }

  return groups;
}

export type LessonDetail = {
  id: string;
  name: string;
  contentType: ContentType;
  inhalt: unknown;
  status: UnitProgressStatus;
  liveSession: { datum: string; start: string; ende: string; joinLink: string | null } | null;
  scorm: { entryPointPfad: string; zipSignedUrl: string } | null;
};

export async function getLessonDetail(
  lessonId: string,
  learnerId: string
): Promise<LessonDetail | null> {
  const supabase = await createClient();

  const { data: lesson } = await supabase
    .from("lesson")
    .select("id, name, content_type, inhalt")
    .eq("id", lessonId)
    .single();
  if (!lesson) return null;

  const { data: progress } = await supabase
    .from("unit_progress")
    .select("status")
    .eq("learner_id", learnerId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  let liveSession: LessonDetail["liveSession"] = null;
  if (lesson.content_type === "live") {
    const { data: session } = await supabase
      .from("live_session")
      .select("datum, start, ende, join_link")
      .eq("lesson_id", lessonId)
      .order("datum", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (session) {
      liveSession = {
        datum: session.datum,
        start: session.start,
        ende: session.ende,
        joinLink: session.join_link,
      };
    }
  }

  // SCORM (SR-50/51/52, Architektur-Entscheidung 2026-09-16): Entry-Point und
  // eine kurzlebige signierte URL fuers Zip laden. RLS greift zweifach --
  // scorm_package ueber die published-lesson-Policy, storage.objects ueber
  // scorm_packages_read_published (0017) -- kein Service-Role-Key noetig.
  let scorm: LessonDetail["scorm"] = null;
  if (lesson.content_type === "scorm") {
    const { data: scormPackage } = await supabase
      .from("scorm_package")
      .select("entry_point_pfad, file_asset_id")
      .eq("lesson_id", lessonId)
      .maybeSingle();

    if (scormPackage) {
      const { data: fileAsset } = await supabase
        .from("file_asset")
        .select("storage_pfad")
        .eq("id", scormPackage.file_asset_id)
        .maybeSingle();

      if (fileAsset) {
        const { data: signed } = await supabase.storage
          .from("scorm-packages")
          .createSignedUrl(fileAsset.storage_pfad, 3600);

        if (signed?.signedUrl) {
          scorm = {
            entryPointPfad: scormPackage.entry_point_pfad,
            zipSignedUrl: signed.signedUrl,
          };
        }
      }
    }
  }

  return {
    id: lesson.id,
    name: lesson.name,
    contentType: lesson.content_type,
    inhalt: lesson.inhalt,
    status: progress?.status ?? "offen",
    liveSession,
    scorm,
  };
}
