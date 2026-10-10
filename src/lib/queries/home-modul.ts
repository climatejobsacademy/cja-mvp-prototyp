import type { NachholLektion } from "@/lib/home-tag";
import { createClient } from "@/lib/supabase/server";

// Home v6 (docs/design_handoff_home_v6, Brief 2.4 + 6, SR folgt):
// "aktuelles Modul" und die Kompetenzen dieses Moduls. Beides steht so nicht
// im Schema -- es wird abgeleitet (siehe Analyse vom 2026-10-09).

export type AktuellesModul = {
  id: string;
  name: string;
  /** Position im Programm, 1-basiert (nach module.reihenfolge). */
  nummer: number;
};

/**
 * Das Modul der heutigen bzw. nächsten geplanten Lektion (Brief 6,
 * Demo-Fallback, weil es kein Feld "aktuelles Modul" gibt). Betrachtet
 * Stundenplan-Einträge ab `abDatum`; Praxistage zählen über den Modul-Bezug
 * ihres Field-Job-Typs mit. null, wenn sich kein Modul ableiten lässt.
 *
 * Gebündelt in vier Abfrage-Runden (statt je Eintrag nacheinander), damit
 * Home schnell lädt: Einträge + Module → Live-Termine + Field Jobs →
 * Lektionen + Field-Job-Typen → Kurse.
 */
export async function getAktuellesModul(
  organisationId: string,
  cohortId: string,
  enrolmentId: string,
  programmeId: string,
  abDatum: string
): Promise<AktuellesModul | null> {
  const supabase = await createClient();

  const [{ data: entries }, { data: modules }] = await Promise.all([
    supabase
      .from("schedule_entry")
      .select("course_id, lesson_id, live_session_id, field_job_id")
      .eq("organisation_id", organisationId)
      .gte("datum", abDatum)
      .or(`cohort_id.eq.${cohortId},enrolment_id.eq.${enrolmentId}`)
      .order("datum", { ascending: true })
      .order("reihenfolge", { ascending: true })
      .limit(20),
    supabase.from("module").select("id, name, reihenfolge").eq("programme_id", programmeId).order("reihenfolge", { ascending: true }),
  ]);
  const eintraege = entries ?? [];
  if (eintraege.length === 0) return null;

  const ids = (werte: (string | null)[]) => [...new Set(werte.filter((w): w is string => !!w))];

  const liveIds = ids(eintraege.map((e) => e.live_session_id));
  const jobIds = ids(eintraege.map((e) => e.field_job_id));
  const [{ data: liveSessions }, { data: jobs }] = await Promise.all([
    liveIds.length
      ? supabase.from("live_session").select("id, lesson_id, course_id").in("id", liveIds)
      : Promise.resolve({ data: [] as { id: string; lesson_id: string | null; course_id: string | null }[] }),
    jobIds.length
      ? supabase.from("field_job").select("id, field_job_type_id").in("id", jobIds)
      : Promise.resolve({ data: [] as { id: string; field_job_type_id: string }[] }),
  ]);
  const liveById = new Map((liveSessions ?? []).map((l) => [l.id, l]));
  const jobById = new Map((jobs ?? []).map((j) => [j.id, j]));

  // Je Eintrag: direkter Kurs oder Lektion (ggf. über den Live-Termin).
  const bezug = eintraege.map((e) => {
    const live = e.live_session_id ? liveById.get(e.live_session_id) : undefined;
    return {
      courseId: live ? live.course_id : e.course_id,
      lessonId: live ? live.lesson_id : e.lesson_id,
      jobTypeId: e.field_job_id ? (jobById.get(e.field_job_id)?.field_job_type_id ?? null) : null,
    };
  });

  const lessonIds = ids(bezug.map((b) => (b.courseId ? null : b.lessonId)));
  const typeIds = ids(bezug.map((b) => b.jobTypeId));
  const [{ data: lessons }, { data: jobTypes }] = await Promise.all([
    lessonIds.length
      ? supabase.from("lesson").select("id, course_id").in("id", lessonIds)
      : Promise.resolve({ data: [] as { id: string; course_id: string }[] }),
    typeIds.length
      ? supabase.from("field_job_type").select("id, module_id").in("id", typeIds)
      : Promise.resolve({ data: [] as { id: string; module_id: string | null }[] }),
  ]);
  const kursVonLektion = new Map((lessons ?? []).map((l) => [l.id, l.course_id]));
  const modulVonJobTyp = new Map((jobTypes ?? []).map((t) => [t.id, t.module_id]));

  const kursIds = bezug.map((b) => b.courseId ?? (b.lessonId ? (kursVonLektion.get(b.lessonId) ?? null) : null));
  const alleKursIds = ids(kursIds);
  const { data: courses } = alleKursIds.length
    ? await supabase.from("course").select("id, module_id").in("id", alleKursIds)
    : { data: [] as { id: string; module_id: string | null }[] };
  const modulVonKurs = new Map((courses ?? []).map((c) => [c.id, c.module_id]));

  // Erster Eintrag in Stundenplan-Reihenfolge, der zu einem Modul führt.
  for (let i = 0; i < bezug.length; i++) {
    const moduleId = bezug[i].jobTypeId
      ? (modulVonJobTyp.get(bezug[i].jobTypeId!) ?? null)
      : kursIds[i]
        ? (modulVonKurs.get(kursIds[i]!) ?? null)
        : null;
    if (!moduleId) continue;
    const index = (modules ?? []).findIndex((m) => m.id === moduleId);
    // Modul eines anderen Programms: nicht anzeigen statt raten.
    if (index === -1) return null;
    return { id: moduleId, name: modules![index].name, nummer: index + 1 };
  }
  return null;
}

/**
 * Kompetenzen, deren Teilschritte an Inhalten dieses Moduls hängen:
 * Lektionen der Modul-Kurse (content_competency_mapping) und Field-Job-Typen
 * des Moduls (field_job_type_competency_mapping), jeweils über
 * competency_competency_step zur Kompetenz.
 */
export async function getModulKompetenzIds(moduleId: string): Promise<Set<string>> {
  const supabase = await createClient();

  const [{ data: courses }, { data: jobTypes }] = await Promise.all([
    supabase.from("course").select("id").eq("module_id", moduleId),
    supabase.from("field_job_type").select("id").eq("module_id", moduleId),
  ]);
  const courseIds = (courses ?? []).map((c) => c.id);
  const jobTypeIds = (jobTypes ?? []).map((t) => t.id);

  const { data: lessons } = courseIds.length
    ? await supabase.from("lesson").select("id").in("course_id", courseIds)
    : { data: [] as { id: string }[] };
  const lessonIds = (lessons ?? []).map((l) => l.id);

  const [{ data: theorie }, { data: praxis }] = await Promise.all([
    lessonIds.length
      ? supabase.from("content_competency_mapping").select("competency_step_id").in("lesson_id", lessonIds)
      : Promise.resolve({ data: [] as { competency_step_id: string }[] }),
    jobTypeIds.length
      ? supabase
          .from("field_job_type_competency_mapping")
          .select("competency_step_id")
          .in("field_job_type_id", jobTypeIds)
      : Promise.resolve({ data: [] as { competency_step_id: string }[] }),
  ]);
  const stepIds = [...new Set([...(theorie ?? []), ...(praxis ?? [])].map((m) => m.competency_step_id))];
  if (stepIds.length === 0) return new Set();

  const { data: links } = await supabase
    .from("competency_competency_step")
    .select("competency_id")
    .in("competency_step_id", stepIds);
  return new Set((links ?? []).map((l) => l.competency_id));
}

export type HeutigeKompetenzen = {
  /** lessonId → Kompetenz-Ids, die diese Lektion stärkt */
  proLektion: Map<string, string[]>;
  /** fieldJobId → Kompetenz-Ids, die dieser Praxistag stärkt */
  proFieldJob: Map<string, string[]>;
};

/**
 * Brief 2.3/2.4: welche Kompetenzen die heutigen Aktivitäten stärken -- für
 * die "Stärkt"-Zeile und den Glow. Lektionen über content_competency_mapping,
 * Praxistage über den Field-Job-Typ (field_job_type_competency_mapping),
 * jeweils über competency_competency_step zur Kompetenz. Fehlt die
 * Zuordnung, bleibt die Liste leer und die Seite blendet beides aus.
 */
export async function getHeutigeKompetenzen(lessonIds: string[], fieldJobIds: string[]): Promise<HeutigeKompetenzen> {
  const supabase = await createClient();
  const leer = { proLektion: new Map(), proFieldJob: new Map() };
  if (lessonIds.length === 0 && fieldJobIds.length === 0) return leer;

  const { data: jobs } = fieldJobIds.length
    ? await supabase.from("field_job").select("id, field_job_type_id").in("id", fieldJobIds)
    : { data: [] as { id: string; field_job_type_id: string }[] };
  const jobTypeIds = [...new Set((jobs ?? []).map((j) => j.field_job_type_id))];

  const [{ data: theorie }, { data: praxis }] = await Promise.all([
    lessonIds.length
      ? supabase.from("content_competency_mapping").select("lesson_id, competency_step_id").in("lesson_id", lessonIds)
      : Promise.resolve({ data: [] as { lesson_id: string; competency_step_id: string }[] }),
    jobTypeIds.length
      ? supabase
          .from("field_job_type_competency_mapping")
          .select("field_job_type_id, competency_step_id")
          .in("field_job_type_id", jobTypeIds)
      : Promise.resolve({ data: [] as { field_job_type_id: string; competency_step_id: string }[] }),
  ]);
  const stepIds = [...new Set([...(theorie ?? []), ...(praxis ?? [])].map((m) => m.competency_step_id))];
  if (stepIds.length === 0) return leer;

  const { data: links } = await supabase
    .from("competency_competency_step")
    .select("competency_id, competency_step_id")
    .in("competency_step_id", stepIds);
  const kompetenzenJeStep = new Map<string, string[]>();
  for (const l of links ?? []) {
    kompetenzenJeStep.set(l.competency_step_id, [...(kompetenzenJeStep.get(l.competency_step_id) ?? []), l.competency_id]);
  }

  const sammeln = (paare: { key: string; stepId: string }[]) => {
    const map = new Map<string, Set<string>>();
    for (const { key, stepId } of paare) {
      const set = map.get(key) ?? new Set<string>();
      for (const k of kompetenzenJeStep.get(stepId) ?? []) set.add(k);
      map.set(key, set);
    }
    return new Map([...map].map(([key, set]) => [key, [...set]]));
  };

  const proJobTyp = sammeln((praxis ?? []).map((m) => ({ key: m.field_job_type_id, stepId: m.competency_step_id })));
  return {
    proLektion: sammeln((theorie ?? []).map((m) => ({ key: m.lesson_id, stepId: m.competency_step_id }))),
    proFieldJob: new Map((jobs ?? []).map((j) => [j.id, proJobTyp.get(j.field_job_type_id) ?? []])),
  };
}

/**
 * Brief 3, Zustände E ("Noch offen von {Wochentag}") und F ("ggf.
 * Weiterlernen"): die zuletzt geplante Selbstlern-Lektion vor `vorDatum`,
 * die noch nicht abgeschlossen ist. Schaut höchstens 30 Einträge zurück.
 */
export async function getNachholLektion(
  organisationId: string,
  cohortId: string,
  enrolmentId: string,
  learnerId: string,
  vorDatum: string
): Promise<NachholLektion | null> {
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from("schedule_entry")
    .select("datum, lesson_id")
    .eq("organisation_id", organisationId)
    .eq("art", "asynchron")
    .not("lesson_id", "is", null)
    .lt("datum", vorDatum)
    .or(`cohort_id.eq.${cohortId},enrolment_id.eq.${enrolmentId}`)
    .order("datum", { ascending: false })
    .order("reihenfolge", { ascending: false })
    .limit(30);
  const eintraege = (entries ?? []).filter((e): e is { datum: string; lesson_id: string } => !!e.lesson_id);
  if (eintraege.length === 0) return null;

  const lessonIds = [...new Set(eintraege.map((e) => e.lesson_id))];
  const [{ data: erledigt }, { data: lessons }] = await Promise.all([
    supabase
      .from("unit_progress")
      .select("lesson_id")
      .eq("learner_id", learnerId)
      .eq("status", "abgeschlossen")
      .in("lesson_id", lessonIds),
    supabase.from("lesson").select("id, name").in("id", lessonIds),
  ]);
  const erledigtIds = new Set((erledigt ?? []).map((u) => u.lesson_id));
  const offen = eintraege.find((e) => !erledigtIds.has(e.lesson_id));
  const lesson = offen && (lessons ?? []).find((l) => l.id === offen.lesson_id);
  return offen && lesson ? { lessonId: lesson.id, titel: lesson.name, datum: offen.datum } : null;
}

/**
 * Home v13: "Zuletzt dran", wenn heute keine Kompetenz gestärkt wird --
 * die Kompetenzen der zuletzt abgeschlossenen Lektionen, neueste zuerst.
 * Nur lesend; "bearbeitet" heißt hier "Lektion abgeschlossen", weil der
 * Stand "begonnen" nicht gespeichert wird.
 */
export async function getZuletztKompetenzIds(learnerId: string): Promise<string[]> {
  const supabase = await createClient();

  const { data: progress } = await supabase
    .from("unit_progress")
    .select("lesson_id, abgeschlossen_am")
    .eq("learner_id", learnerId)
    .eq("status", "abgeschlossen")
    .not("abgeschlossen_am", "is", null)
    .order("abgeschlossen_am", { ascending: false })
    .limit(5);
  const lessonIds = (progress ?? []).map((p) => p.lesson_id);
  if (lessonIds.length === 0) return [];

  const { data: mappings } = await supabase
    .from("content_competency_mapping")
    .select("lesson_id, competency_step_id")
    .in("lesson_id", lessonIds);
  const stepIds = [...new Set((mappings ?? []).map((m) => m.competency_step_id))];
  if (stepIds.length === 0) return [];

  const { data: links } = await supabase
    .from("competency_competency_step")
    .select("competency_id, competency_step_id")
    .in("competency_step_id", stepIds);

  const ergebnis: string[] = [];
  for (const lessonId of lessonIds) {
    for (const m of (mappings ?? []).filter((x) => x.lesson_id === lessonId)) {
      for (const l of (links ?? []).filter((x) => x.competency_step_id === m.competency_step_id)) {
        if (!ergebnis.includes(l.competency_id)) ergebnis.push(l.competency_id);
      }
    }
  }
  return ergebnis;
}
