import { createClient } from "@/lib/supabase/server";
import type { ContentType, UnitProgressStatus } from "@/lib/database.types";

export type FeldEintrag = {
  kind: "feld";
  scheduleEntryId: string;
  fieldJobId: string;
  titel: string;
  beschreibung: string | null;
  bildOderIcon: string | null;
  status: "geplant" | "durchgeführt";
};

export type TheorieEintrag = {
  kind: "theorie";
  scheduleEntryId: string;
  art: "live" | "asynchron";
  titel: string;
  contentType: ContentType | "kurs";
  unitProgressStatus: UnitProgressStatus | null;
  liveSession: {
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
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from("schedule_entry")
    .select("id, art, reihenfolge, cohort_id, enrolment_id, course_id, lesson_id, live_session_id, field_job_id")
    .eq("organisation_id", organisationId)
    .eq("datum", datum)
    .or(`cohort_id.eq.${cohortId},enrolment_id.eq.${enrolmentId}`)
    .order("reihenfolge", { ascending: true });

  const rows = entries ?? [];

  const feldEntries = rows.filter((r) => r.art === "feld" && r.field_job_id);
  const theorieEntries = rows.filter((r) => r.art !== "feld");

  const feld: FeldEintrag[] = [];
  if (feldEntries.length > 0) {
    const fieldJobIds = feldEntries.map((r) => r.field_job_id!) as string[];
    const { data: fieldJobs } = await supabase
      .from("field_job")
      .select("id, status, field_job_type_id")
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
          kind: "feld",
          scheduleEntryId: entry.id,
          fieldJobId: job.id,
          titel: type.titel,
          beschreibung: type.beschreibung,
          bildOderIcon: type.bild_oder_icon,
          status: job.status,
        });
      }
    }
  }

  const theorie: TheorieEintrag[] = [];
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

    let progressByLesson = new Map<string, UnitProgressStatus>();
    if (lessonIds.length > 0) {
      const { data: progress } = await supabase
        .from("unit_progress")
        .select("lesson_id, status")
        .eq("learner_id", learnerId)
        .in("lesson_id", lessonIds);
      progressByLesson = new Map((progress ?? []).map((p) => [p.lesson_id, p.status]));
    }

    for (const entry of theorieEntries) {
      if (entry.live_session_id) {
        const session = liveSessions?.find((s) => s.id === entry.live_session_id);
        if (!session) continue;
        const lesson = session.lesson_id ? lessons?.find((l) => l.id === session.lesson_id) : null;
        const course = session.course_id ? courses?.find((c) => c.id === session.course_id) : null;
        theorie.push({
          kind: "theorie",
          scheduleEntryId: entry.id,
          art: "live",
          titel: lesson?.name ?? course?.name ?? "Live-Termin",
          contentType: "live",
          unitProgressStatus: lesson ? progressByLesson.get(lesson.id) ?? "offen" : null,
          liveSession: {
            datum: session.datum,
            start: session.start,
            ende: session.ende,
            joinLink: session.join_link,
          },
        });
      } else if (entry.lesson_id) {
        const lesson = lessons?.find((l) => l.id === entry.lesson_id);
        if (!lesson) continue;
        theorie.push({
          kind: "theorie",
          scheduleEntryId: entry.id,
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
          kind: "theorie",
          scheduleEntryId: entry.id,
          art: "asynchron",
          titel: course.name,
          contentType: "kurs",
          unitProgressStatus: null,
          liveSession: null,
        });
      }
    }
  }

  return { datum, istPraxistag: feld.length > 0, feld, theorie };
}

export type WochenTag = {
  datum: string;
  art: "feld" | "theorie" | "frei";
  offeneEintraege: number;
  abgeschlosseneEintraege: number;
};

/** Wochenübersicht (Mo–So der Woche von `anyDateInWeek`) mit Typ-Kennzeichnung
 * und einem einfachen Abschluss-Indikator je Tag (design-specifications.md 2.2). */
export async function getWochenUebersicht(
  organisationId: string,
  cohortId: string,
  enrolmentId: string,
  learnerId: string,
  anyDateInWeek: string
): Promise<WochenTag[]> {
  const supabase = await createClient();

  const start = startOfWeek(anyDateInWeek);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  const { data: entries } = await supabase
    .from("schedule_entry")
    .select("datum, art, lesson_id")
    .eq("organisation_id", organisationId)
    .gte("datum", days[0])
    .lte("datum", days[6])
    .or(`cohort_id.eq.${cohortId},enrolment_id.eq.${enrolmentId}`);

  const rows = entries ?? [];
  const lessonIds = [...new Set(rows.map((r) => r.lesson_id).filter(Boolean))] as string[];

  let progressByLesson = new Map<string, UnitProgressStatus>();
  if (lessonIds.length > 0) {
    const { data: progress } = await supabase
      .from("unit_progress")
      .select("lesson_id, status")
      .eq("learner_id", learnerId)
      .in("lesson_id", lessonIds);
    progressByLesson = new Map((progress ?? []).map((p) => [p.lesson_id, p.status]));
  }

  return days.map((datum) => {
    const dayRows = rows.filter((r) => r.datum === datum);
    const hatFeld = dayRows.some((r) => r.art === "feld");
    const art: WochenTag["art"] = dayRows.length === 0 ? "frei" : hatFeld ? "feld" : "theorie";
    const withLesson = dayRows.filter((r) => r.lesson_id) as { lesson_id: string }[];
    const abgeschlossen = withLesson.filter(
      (r) => progressByLesson.get(r.lesson_id) === "abgeschlossen"
    ).length;
    return {
      datum,
      art,
      offeneEintraege: dayRows.length - abgeschlossen,
      abgeschlosseneEintraege: abgeschlossen,
    };
  });
}

export type ProgrammPhase = {
  id: string;
  name: string;
  reihenfolge: number;
  typ: "module" | "kurs" | "praxis";
  // Anker-Fragment für /content#<contentAnchor> (siehe schedule-tabs.tsx).
  contentAnchor: string;
  // Nur bei typ="module" gesetzt (SR-59): zwei unabhängige Icons an der
  // Modul-Phase statt einer eigenen Praxis-Phase -- Theorie-Icon, wenn das
  // Modul mindestens einen Kurs hat, Praxis-Icon, wenn es mindestens einen
  // field_job_type hat (SR-58). Ein rein praktisches oder rein
  // theoretisches Modul zeigt entsprechend nur eins der beiden.
  hatTheorie?: boolean;
  hatPraxis?: boolean;
};

export type ProgrammUebersicht = {
  programmeName: string;
  startDatum: string;
  endDatum: string | null;
  phasen: ProgrammPhase[];
};

/** Programm-Überblick: Start-/Enddatum + grobe Phasen als Zeitleiste, rein
 * orientierend, nicht interaktiv (design-specifications.md 2.2). */
export async function getProgrammUebersicht(
  cohortId: string,
  programmeId: string,
  programmeName: string
): Promise<ProgrammUebersicht> {
  const supabase = await createClient();

  const { data: cohort } = await supabase
    .from("cohort")
    .select("start_datum, end_datum")
    .eq("id", cohortId)
    .single();

  const { data: modules } = await supabase
    .from("module")
    .select("id, name, reihenfolge")
    .eq("programme_id", programmeId)
    .order("reihenfolge", { ascending: true });

  let phasen: ProgrammPhase[];

  if ((modules ?? []).length > 0) {
    // Module vorhanden -> Kurse UND Field-Job-Typen eines Moduls tauchen
    // nicht einzeln (und auch nicht als eigene gebündelte Praxis-Phase) im
    // Programm-Überblick auf, sondern nur als zwei unabhängige Icons an der
    // jeweiligen Modul-Phase (SR-59): Theorie-Icon, wenn das Modul
    // mindestens einen Kurs hat, Praxis-Icon, wenn es mindestens einen
    // field_job_type hat (SR-58).
    const moduleIds = (modules ?? []).map((m) => m.id);
    const [{ data: coursesViaModule }, { data: fieldJobTypesViaModule }] = await Promise.all([
      supabase.from("course").select("id, module_id").in("module_id", moduleIds),
      supabase.from("field_job_type").select("id, module_id").in("module_id", moduleIds),
    ]);
    const modulesMitKursen = new Set((coursesViaModule ?? []).map((c) => c.module_id));
    const modulesMitPraxis = new Set((fieldJobTypesViaModule ?? []).map((ft) => ft.module_id));

    phasen = (modules ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      reihenfolge: m.reihenfolge,
      typ: "module" as const,
      contentAnchor: `modul-${m.id}`,
      hatTheorie: modulesMitKursen.has(m.id),
      hatPraxis: modulesMitPraxis.has(m.id),
    }));
  } else {
    // Kein Modul vorhanden -> Kurse hängen direkt am Programm (Entscheidung
    // 2026-09-09, data-model.md Group 2) und dienen dann als Phasen.
    const { data: courses } = await supabase
      .from("course")
      .select("id, name, reihenfolge")
      .eq("programme_id", programmeId)
      .order("reihenfolge", { ascending: true });
    phasen = (courses ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      reihenfolge: c.reihenfolge,
      typ: "kurs" as const,
      contentAnchor: `kurs-${c.id}`,
    }));

    // Field-Job-Typen ohne Modul hängen direkt am Programm (SR-58) und
    // erscheinen -- anders als im Modul-Fall -- einzeln als eigene
    // Praxis-Phasen, analog zu den einzeln aufgeführten Kursen hier.
    const { data: fieldJobTypesViaProgramme } = await supabase
      .from("field_job_type")
      .select("id, titel, reihenfolge")
      .eq("programme_id", programmeId)
      .order("reihenfolge", { ascending: true });
    phasen.push(
      ...(fieldJobTypesViaProgramme ?? []).map((ft) => ({
        id: ft.id,
        name: ft.titel,
        reihenfolge: ft.reihenfolge,
        typ: "praxis" as const,
        contentAnchor: `praxis-${ft.id}`,
      }))
    );
  }

  return {
    programmeName,
    startDatum: cohort?.start_datum ?? "",
    endDatum: cohort?.end_datum ?? null,
    phasen,
  };
}

function startOfWeek(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay(); // 0 = Sonntag
  const diff = day === 0 ? -6 : 1 - day; // Woche beginnt Montag
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
