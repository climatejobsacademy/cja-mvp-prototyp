import { createClient } from "@/lib/supabase/server";
import type { CompetencyStepTyp } from "@/lib/database.types";

export type StepStatus = "abgeschlossen" | "in Prüfung" | "abgelehnt" | "offen";

/**
 * Fortschritt je Teilschritt: wie viele der zugeordneten Lektionen (theoretisch)
 * bzw. Praxisaufgaben (praktisch) schon abgeschlossen sind (SR-62). Bestimmt
 * seit SR-63 auch den Status: abgeschlossen erst bei allen (AND). null, wenn
 * nichts zugeordnet ist.
 */
export type StepFortschritt = {
  abgeschlossen: number;
  gesamt: number;
  einheit: "Lektionen" | "Praxisaufgaben";
};

export type CompetencyStepView = {
  id: string;
  name: string;
  typ: CompetencyStepTyp;
  status: StepStatus;
  fortschritt: StepFortschritt | null;
};

export type CompetencyView = {
  id: string;
  name: string;
  kompetenzbereich: string;
  teilschritteErfuellt: number;
  teilschritteGesamt: number;
  erfuellt: boolean;
  fortschrittProzent: number;
  curriculumReihenfolge: number;
  steps: CompetencyStepView[];
};

/**
 * Kompetenz-Fortschritt für das Dashboard (design-specifications.md 2.3).
 *
 * "Curriculum-Reihenfolge" ist im Schema keine Eigenschaft von `competency`
 * selbst — angenähert über die kleinste lesson.reihenfolge, an der ein
 * theoretischer Teilschritt der Kompetenz hängt (content_competency_mapping);
 * Kompetenzen ganz ohne Mapping (nur praktische Teilschritte) fallen ans Ende.
 */
export async function getKompetenzFortschritt(learnerId: string): Promise<CompetencyView[]> {
  const supabase = await createClient();

  const { data: competencies } = await supabase
    .from("competency")
    .select("id, name, kompetenzbereich");
  const { data: steps } = await supabase
    .from("competency_step")
    .select("id, name, typ");
  // N:M seit SR-69 (0019): ein Teilschritt kann an mehreren Kompetenzen
  // hängen und zählt dann in jeder davon mit.
  const { data: competencySteps } = await supabase
    .from("competency_competency_step")
    .select("competency_id, competency_step_id");

  if (!competencies || !steps || !competencySteps) return [];

  const stepById = new Map(steps.map((s) => [s.id, s]));
  const stepIdsByCompetency = new Map<string, string[]>();
  for (const cs of competencySteps) {
    const list = stepIdsByCompetency.get(cs.competency_id) ?? [];
    list.push(cs.competency_step_id);
    stepIdsByCompetency.set(cs.competency_id, list);
  }

  const stepIds = steps.map((s) => s.id);

  // SR-72 (0021): Erfüllungsstand je Kompetenz mit AND-Logik aus der DB. Die
  // View liefert erst eine Zeile, wenn mindestens ein Teilschritt erfüllt ist.
  const { data: fulfilment } = await supabase
    .from("competency_fulfilment")
    .select("competency_id, teilschritte_gesamt, teilschritte_erfuellt, erfuellt")
    .eq("learner_id", learnerId);
  const fulfilmentByCompetency = new Map((fulfilment ?? []).map((f) => [f.competency_id, f]));

  const [{ data: mappings }, { data: praxisMappings }, { data: completedLessons }] =
    await Promise.all([
      stepIds.length
        ? supabase
            .from("content_competency_mapping")
            .select("competency_step_id, lesson_id")
            .in("competency_step_id", stepIds)
        : Promise.resolve({ data: [] as { competency_step_id: string; lesson_id: string }[] }),
      stepIds.length
        ? supabase
            .from("field_job_type_competency_mapping")
            .select("competency_step_id, field_job_type_id")
            .in("competency_step_id", stepIds)
        : Promise.resolve({ data: [] as { competency_step_id: string; field_job_type_id: string }[] }),
      supabase
        .from("unit_progress")
        .select("lesson_id")
        .eq("learner_id", learnerId)
        .eq("status", "abgeschlossen"),
    ]);

  // Verifizierungs-Zwischenstände (pending/abgelehnt) — nur relevant, wenn
  // administrativ bereits field_capture_step_mapping-Zeilen angelegt wurden
  // (die Learner-App legt sie nicht an, siehe praxistag/actions.ts).
  const { data: myCaptures } = await supabase
    .from("field_capture")
    .select("id, status, field_job_id")
    .eq("learner_id", learnerId);
  const captureStatusById = new Map((myCaptures ?? []).map((c) => [c.id, c.status]));
  const captureIds = (myCaptures ?? []).map((c) => c.id);

  const { data: captureStepMappings } = captureIds.length
    ? await supabase
        .from("field_capture_step_mapping")
        .select("competency_step_id, field_capture_id")
        .in("field_capture_id", captureIds)
    : { data: [] as { competency_step_id: string; field_capture_id: string }[] };

  const statusesByStep = new Map<string, ("submitted" | "verified" | "rejected")[]>();
  for (const m of captureStepMappings ?? []) {
    const status = captureStatusById.get(m.field_capture_id);
    if (!status) continue;
    const list = statusesByStep.get(m.competency_step_id) ?? [];
    list.push(status);
    statusesByStep.set(m.competency_step_id, list);
  }

  // lesson.reihenfolge je Lektion, um Kompetenzen curriculumsnah zu sortieren.
  const lessonIds = [...new Set((mappings ?? []).map((m) => m.lesson_id))];
  const { data: lessons } = lessonIds.length
    ? await supabase.from("lesson").select("id, reihenfolge").in("id", lessonIds)
    : { data: [] as { id: string; reihenfolge: number }[] };
  const lessonOrderById = new Map((lessons ?? []).map((l) => [l.id, l.reihenfolge]));

  const minOrderByStep = new Map<string, number>();
  for (const m of mappings ?? []) {
    const order = lessonOrderById.get(m.lesson_id) ?? Number.MAX_SAFE_INTEGER;
    const current = minOrderByStep.get(m.competency_step_id);
    if (current === undefined || order < current) minOrderByStep.set(m.competency_step_id, order);
  }

  function stepStatus(stepId: string, fortschritt: StepFortschritt | null): StepStatus {
    // SR-63: abgeschlossen erst, wenn ALLE zugeordneten Lektionen bzw.
    // Field-Job-Typen erfüllt sind -- gleiche Regel wie competency_fulfilment
    // (0022). Teilschritte ohne Zuordnung bleiben offen.
    if (fortschritt && fortschritt.gesamt > 0 && fortschritt.abgeschlossen === fortschritt.gesamt) {
      return "abgeschlossen";
    }
    const statuses = statusesByStep.get(stepId) ?? [];
    if (statuses.includes("submitted")) return "in Prüfung";
    if (statuses.length > 0 && statuses.every((s) => s === "rejected")) return "abgelehnt";
    return "offen";
  }

  // Teilschritt-Fortschritt (SR-62, seit SR-63 auch Status): abgeschlossene Lektion =
  // unit_progress.status 'abgeschlossen'; abgeschlossene Praxisaufgabe =
  // mindestens eine verifizierte Selbstauskunft (field_capture.status
  // 'verified') zu einem field_job dieses Typs -- nicht schon 'durchgeführt'.
  const completedLessonIds = new Set((completedLessons ?? []).map((u) => u.lesson_id));
  const verifiedJobIds = new Set(
    (myCaptures ?? []).filter((c) => c.status === "verified").map((c) => c.field_job_id)
  );
  const { data: myJobs } = verifiedJobIds.size
    ? await supabase.from("field_job").select("id, field_job_type_id").eq("learner_id", learnerId)
    : { data: [] as { id: string; field_job_type_id: string }[] };
  const verifiedJobTypeIds = new Set(
    (myJobs ?? []).filter((j) => verifiedJobIds.has(j.id)).map((j) => j.field_job_type_id)
  );

  const lessonIdsByStep = new Map<string, Set<string>>();
  for (const m of mappings ?? []) {
    const set = lessonIdsByStep.get(m.competency_step_id) ?? new Set<string>();
    set.add(m.lesson_id);
    lessonIdsByStep.set(m.competency_step_id, set);
  }
  const jobTypeIdsByStep = new Map<string, Set<string>>();
  for (const m of praxisMappings ?? []) {
    const set = jobTypeIdsByStep.get(m.competency_step_id) ?? new Set<string>();
    set.add(m.field_job_type_id);
    jobTypeIdsByStep.set(m.competency_step_id, set);
  }

  function stepFortschritt(stepId: string, typ: CompetencyStepTyp): StepFortschritt | null {
    // SR-71: theoretische Teilschritte hängen nur an Lektionen, praktische nur
    // an Field-Job-Typen.
    const ids = typ === "theoretisch" ? lessonIdsByStep.get(stepId) : jobTypeIdsByStep.get(stepId);
    if (!ids || ids.size === 0) return null;
    const done = typ === "theoretisch" ? completedLessonIds : verifiedJobTypeIds;
    return {
      abgeschlossen: [...ids].filter((id) => done.has(id)).length,
      gesamt: ids.size,
      einheit: typ === "theoretisch" ? "Lektionen" : "Praxisaufgaben",
    };
  }

  const result: CompetencyView[] = competencies.map((c) => {
    const mySteps = (stepIdsByCompetency.get(c.id) ?? [])
      .map((id) => stepById.get(id))
      .filter((s) => s !== undefined);
    const stepViews: CompetencyStepView[] = mySteps.map((s) => {
      const fortschritt = stepFortschritt(s.id, s.typ);
      return { id: s.id, name: s.name, typ: s.typ, status: stepStatus(s.id, fortschritt), fortschritt };
    });
    // Keine Zeile in competency_fulfilment = noch kein Teilschritt erfüllt.
    const f = fulfilmentByCompetency.get(c.id);
    const gesamt = f?.teilschritte_gesamt ?? stepViews.length;
    const erfuelltAnzahl = f?.teilschritte_erfuellt ?? 0;
    const order = Math.min(
      ...mySteps.map((s) => minOrderByStep.get(s.id) ?? Number.MAX_SAFE_INTEGER),
      Number.MAX_SAFE_INTEGER
    );
    return {
      id: c.id,
      name: c.name,
      kompetenzbereich: c.kompetenzbereich,
      teilschritteErfuellt: erfuelltAnzahl,
      teilschritteGesamt: gesamt,
      erfuellt: f?.erfuellt ?? false,
      fortschrittProzent: gesamt > 0 ? Math.round((erfuelltAnzahl / gesamt) * 100) : 0,
      curriculumReihenfolge: order,
      steps: stepViews,
    };
  });

  return result.sort((a, b) => a.curriculumReihenfolge - b.curriculumReihenfolge);
}

export type CurriculumFortschritt = {
  gesamtLektionen: number;
  abgeschlosseneLektionen: number;
  prozent: number;
};

/** Curriculum-Fortschritt: % abgeschlossene Lektionen im Programm der Person. */
export async function getCurriculumFortschritt(
  learnerId: string,
  programmeId: string
): Promise<CurriculumFortschritt> {
  const supabase = await createClient();

  const { data: modules } = await supabase.from("module").select("id").eq("programme_id", programmeId);
  const { data: coursesViaProgramme } = await supabase
    .from("course")
    .select("id")
    .eq("programme_id", programmeId);
  const moduleIds = (modules ?? []).map((m) => m.id);
  const { data: coursesViaModule } = moduleIds.length
    ? await supabase.from("course").select("id").in("module_id", moduleIds)
    : { data: [] as { id: string }[] };

  const courseIds = [...new Set([...(coursesViaProgramme ?? []), ...(coursesViaModule ?? [])].map((c) => c.id))];

  if (courseIds.length === 0) {
    return { gesamtLektionen: 0, abgeschlosseneLektionen: 0, prozent: 0 };
  }

  const { data: lessons } = await supabase.from("lesson").select("id").in("course_id", courseIds);
  const lessonIds = (lessons ?? []).map((l) => l.id);

  if (lessonIds.length === 0) {
    return { gesamtLektionen: 0, abgeschlosseneLektionen: 0, prozent: 0 };
  }

  const { data: progress } = await supabase
    .from("unit_progress")
    .select("lesson_id, status")
    .eq("learner_id", learnerId)
    .in("lesson_id", lessonIds);

  const abgeschlossen = (progress ?? []).filter((p) => p.status === "abgeschlossen").length;

  return {
    gesamtLektionen: lessonIds.length,
    abgeschlosseneLektionen: abgeschlossen,
    prozent: Math.round((abgeschlossen / lessonIds.length) * 100),
  };
}
