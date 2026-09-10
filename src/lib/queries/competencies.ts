import { createClient } from "@/lib/supabase/server";
import type { CompetencyStepTyp } from "@/lib/database.types";

export type StepStatus = "abgeschlossen" | "in Prüfung" | "abgelehnt" | "offen";

export type CompetencyStepView = {
  id: string;
  name: string;
  typ: CompetencyStepTyp;
  status: StepStatus;
};

export type CompetencyView = {
  id: string;
  name: string;
  kompetenzbereich: string;
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
    .select("id, competency_id, name, typ");

  if (!competencies || !steps) return [];

  const stepIds = steps.map((s) => s.id);

  const [{ data: evidence }, { data: mappings }] = await Promise.all([
    supabase
      .from("competency_evidence")
      .select("competency_step_id")
      .eq("learner_id", learnerId),
    stepIds.length
      ? supabase
          .from("content_competency_mapping")
          .select("competency_step_id, lesson_id")
          .in("competency_step_id", stepIds)
      : Promise.resolve({ data: [] as { competency_step_id: string; lesson_id: string }[] }),
  ]);

  const doneStepIds = new Set((evidence ?? []).map((e) => e.competency_step_id));

  // Verifizierungs-Zwischenstände (pending/abgelehnt) — nur relevant, wenn
  // administrativ bereits field_capture_step_mapping-Zeilen angelegt wurden
  // (die Learner-App legt sie nicht an, siehe praxistag/actions.ts).
  const { data: myCaptures } = await supabase
    .from("field_capture")
    .select("id, status")
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

  function stepStatus(stepId: string): StepStatus {
    if (doneStepIds.has(stepId)) return "abgeschlossen";
    const statuses = statusesByStep.get(stepId) ?? [];
    if (statuses.includes("submitted")) return "in Prüfung";
    if (statuses.length > 0 && statuses.every((s) => s === "rejected")) return "abgelehnt";
    return "offen";
  }

  const result: CompetencyView[] = competencies.map((c) => {
    const mySteps = steps.filter((s) => s.competency_id === c.id);
    const stepViews: CompetencyStepView[] = mySteps.map((s) => ({
      id: s.id,
      name: s.name,
      typ: s.typ,
      status: stepStatus(s.id),
    }));
    const done = stepViews.filter((s) => s.status === "abgeschlossen").length;
    const order = Math.min(
      ...mySteps.map((s) => minOrderByStep.get(s.id) ?? Number.MAX_SAFE_INTEGER),
      Number.MAX_SAFE_INTEGER
    );
    return {
      id: c.id,
      name: c.name,
      kompetenzbereich: c.kompetenzbereich,
      fortschrittProzent: stepViews.length > 0 ? Math.round((done / stepViews.length) * 100) : 0,
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
