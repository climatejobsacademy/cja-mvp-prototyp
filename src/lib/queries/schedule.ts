import { plusTage } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";
import type { ContentType, UnitProgressStatus } from "@/lib/database.types";

export type FeldEintrag = {
  kind: "feld";
  scheduleEntryId: string;
  fieldJobId: string;
  titel: string;
  beschreibung: string | null;
  bildOderIcon: string | null;
  /** Freitext-Ort des Field Jobs (z. B. Betrieb); im Prototyp oft leer. */
  standort: string | null;
  status: "geplant" | "durchgeführt";
};

export type TheorieEintrag = {
  kind: "theorie";
  scheduleEntryId: string;
  lessonId: string | null;
  art: "live" | "asynchron";
  titel: string;
  contentType: ContentType | "kurs";
  unitProgressStatus: UnitProgressStatus | null;
  liveSession: {
    /** live_session.id (Stundenplan: bestätigte Anwesenheit) */
    id: string;
    datum: string;
    start: string;
    ende: string;
    joinLink: string | null;
  } | null;
};

export type TagesAgenda = {
  datum: string;
  istPraxistag: boolean;
  feld: FeldEintrag[];
  theorie: TheorieEintrag[];
};

/**
 * Lädt die Tagesagenda für ein Datum: getrennt nach Praxistag-Einträgen (art
 * = feld, führen in den Praxistag-Flow) und Theorietag-Einträgen (art = live
 * / asynchron, chronologisch, mit Format-Icon + Status je docs/
 * design-specifications.md Abschnitt 2.2).
 */
export async function getTagesAgenda(
  organisationId: string,
  cohortId: string,
  enrolmentId: string,
  learnerId: string,
  datum: string
): Promise<TagesAgenda> {
  const [tag] = await getAgendaZeitraum(organisationId, cohortId, enrolmentId, learnerId, datum, datum);
  return tag;
}

/**
 * Wie getTagesAgenda, aber für jeden Tag von `von` bis `bis` (einschließlich)
 * in einem Durchgang -- gebündelte Abfragen statt einer Runde je Tag
 * (Stundenplan v2: Woche und Monat).
 */
export async function getAgendaZeitraum(
  organisationId: string,
  cohortId: string,
  enrolmentId: string,
  learnerId: string,
  von: string,
  bis: string
): Promise<TagesAgenda[]> {
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from("schedule_entry")
    .select("id, datum, art, reihenfolge, cohort_id, enrolment_id, course_id, lesson_id, live_session_id, field_job_id")
    .eq("organisation_id", organisationId)
    .gte("datum", von)
    .lte("datum", bis)
    .or(`cohort_id.eq.${cohortId},enrolment_id.eq.${enrolmentId}`)
    .order("datum", { ascending: true })
    .order("reihenfolge", { ascending: true });

  const rows = entries ?? [];

  const feldEntries = rows.filter((r) => r.art === "feld" && r.field_job_id);
  const theorieEntries = rows.filter((r) => r.art !== "feld");

  const feld: (FeldEintrag & { datum: string })[] = [];
  if (feldEntries.length > 0) {
    const fieldJobIds = feldEntries.map((r) => r.field_job_id!) as string[];
    const { data: fieldJobs } = await supabase
      .from("field_job")
      .select("id, status, standort, field_job_type_id")
      .in("id", fieldJobIds);

    const typeIds = [...new Set((fieldJobs ?? []).map((j) => j.field_job_type_id))];
    const { data: fieldJobTypes } = await supabase
      .from("field_job_type")
      .select("id, titel, beschreibung, bild_oder_icon")
      .in("id", typeIds.length > 0 ? typeIds : ["00000000-0000-0000-0000-000000000000"]);

    for (const entry of feldEntries) {
      const job = fieldJobs?.find((j) => j.id === entry.field_job_id);
      const type = fieldJobTypes?.find((t) => t.id === job?.field_job_type_id);
      if (job && type) {
        feld.push({
          datum: entry.datum,
          kind: "feld",
          scheduleEntryId: entry.id,
          fieldJobId: job.id,
          titel: type.titel,
          beschreibung: type.beschreibung,
          bildOderIcon: type.bild_oder_icon,
          standort: job.standort,
          status: job.status,
        });
      }
    }
  }

  const theorie: (TheorieEintrag & { datum: string })[] = [];
  if (theorieEntries.length > 0) {
    const lessonIds = [...new Set(theorieEntries.map((r) => r.lesson_id).filter(Boolean))] as string[];
    const courseIds = [...new Set(theorieEntries.map((r) => r.course_id).filter(Boolean))] as string[];
    const liveSessionIds = [...new Set(theorieEntries.map((r) => r.live_session_id).filter(Boolean))] as string[];

    const [{ data: lessons }, { data: courses }, { data: liveSessions }] = await Promise.all([
      lessonIds.length
        ? supabase.from("lesson").select("id, name, content_type").in("id", lessonIds)
        : Promise.resolve({ data: [] as { id: string; name: string; content_type: ContentType }[] }),
      courseIds.length
        ? supabase.from("course").select("id, name").in("id", courseIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      liveSessionIds.length
        ? supabase
            .from("live_session")
            .select("id, lesson_id, course_id, datum, start, ende, join_link")
            .in("id", liveSessionIds)
        : Promise.resolve({ data: [] as { id: string; lesson_id: string | null; course_id: string | null; datum: string; start: string; ende: string; join_link: string | null }[] }),
    ]);

    // Live-Sessions können eigene lesson_id haben, die nicht auf dem
    // schedule_entry steht. Diese Lessons nachladen, falls noch nicht dabei.
    const liveSessionLessonIds = (liveSessions ?? [])
      .map((s) => s.lesson_id)
      .filter((id): id is string => !!id && !lessonIds.includes(id));
    let allLessons = [...(lessons ?? [])];
    if (liveSessionLessonIds.length > 0) {
      const { data: extraLessons } = await supabase
        .from("lesson")
        .select("id, name, content_type")
        .in("id", liveSessionLessonIds);
      allLessons = [...allLessons, ...(extraLessons ?? [])];
    }

    let progressByLesson = new Map<string, UnitProgressStatus>();
    const allLessonIdsForProgress = [...lessonIds, ...liveSessionLessonIds];
    if (allLessonIdsForProgress.length > 0) {
      const { data: progress } = await supabase
        .from("unit_progress")
        .select("lesson_id, status")
        .eq("learner_id", learnerId)
        .in("lesson_id", allLessonIdsForProgress);
      progressByLesson = new Map((progress ?? []).map((p) => [p.lesson_id, p.status]));
    }

    for (const entry of theorieEntries) {
      if (entry.live_session_id) {
        const session = liveSessions?.find((s) => s.id === entry.live_session_id);
        if (!session) continue;
        const lesson = session.lesson_id ? allLessons.find((l) => l.id === session.lesson_id) : null;
        const course = session.course_id ? courses?.find((c) => c.id === session.course_id) : null;
        theorie.push({
          datum: entry.datum,
          kind: "theorie",
          scheduleEntryId: entry.id,
          lessonId: lesson?.id ?? null,
          art: "live",
          titel: lesson?.name ?? course?.name ?? "Live-Termin",
          contentType: "live",
          unitProgressStatus: lesson ? progressByLesson.get(lesson.id) ?? "offen" : null,
          liveSession: {
            id: session.id,
            datum: session.datum,
            start: session.start,
            ende: session.ende,
            joinLink: session.join_link,
          },
        });
      } else if (entry.lesson_id) {
        const lesson = allLessons.find((l) => l.id === entry.lesson_id);
        if (!lesson) continue;
        theorie.push({
          datum: entry.datum,
          kind: "theorie",
          scheduleEntryId: entry.id,
          lessonId: lesson.id,
          art: "asynchron",
          titel: lesson.name,
          contentType: lesson.content_type,
          unitProgressStatus: progressByLesson.get(lesson.id) ?? "offen",
          liveSession: null,
        });
      } else if (entry.course_id) {
        const course = courses?.find((c) => c.id === entry.course_id);
        if (!course) continue;
        theorie.push({
          datum: entry.datum,
          kind: "theorie",
          scheduleEntryId: entry.id,
          lessonId: null,
          art: "asynchron",
          titel: course.name,
          contentType: "kurs",
          unitProgressStatus: null,
          liveSession: null,
        });
      }
    }
  }

  const ohneDatum = <T extends { datum: string }>(eintrag: T): Omit<T, "datum"> => {
    const kopie: Partial<T> = { ...eintrag };
    delete kopie.datum;
    return kopie as Omit<T, "datum">;
  };
  const tage: TagesAgenda[] = [];
  for (let d = von; d <= bis; d = plusTage(d, 1)) {
    const tagFeld = feld.filter((e) => e.datum === d).map(ohneDatum);
    tage.push({
      datum: d,
      istPraxistag: tagFeld.length > 0,
      feld: tagFeld,
      theorie: theorie.filter((e) => e.datum === d).map(ohneDatum),
    });
  }
  return tage;
}

export type NaechsterTermin = {
  datum: string;
  art: "live" | "asynchron" | "feld";
  /** Startzeit HH:MM:SS, nur bei Live-Terminen vorhanden. */
  start: string | null;
};

/**
 * Nächster Stundenplan-Eintrag nach `nachDatum` (Home, Leer-Variante
 * "Heute"). Uhrzeit nur, wenn der Eintrag eine Live-Session ist -- andere
 * Einträge haben kein Zeitfeld.
 */
export async function getNaechsterTermin(
  organisationId: string,
  cohortId: string,
  enrolmentId: string,
  nachDatum: string
): Promise<NaechsterTermin | null> {
  const supabase = await createClient();

  const { data: entry } = await supabase
    .from("schedule_entry")
    .select("datum, art, live_session_id")
    .eq("organisation_id", organisationId)
    .gt("datum", nachDatum)
    .or(`cohort_id.eq.${cohortId},enrolment_id.eq.${enrolmentId}`)
    .order("datum", { ascending: true })
    .order("reihenfolge", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!entry) return null;

  let start: string | null = null;
  if (entry.live_session_id) {
    const { data: session } = await supabase
      .from("live_session")
      .select("start")
      .eq("id", entry.live_session_id)
      .maybeSingle();
    start = session?.start ?? null;
  }

  return { datum: entry.datum, art: entry.art, start };
}
