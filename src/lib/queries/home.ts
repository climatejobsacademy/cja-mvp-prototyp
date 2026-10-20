import type { NachholLektion } from "@/lib/home-tag";
import { lektionTitel } from "@/lib/lektion-titel";
import { createClient } from "@/lib/supabase/server";

// Home (docs/design_handoff_home_v6, Brief 2.4 + 3 + 6; SR-73): welche
// Kompetenzen die heutigen Aktivitäten stärken, die offene Lektion von
// früher und die zuletzt geübten Kompetenzen. Das aktuelle Modul und seine
// Kompetenzen kommen aus src/lib/queries/modul.ts (Modul-Ebene, 0028) --
// nicht mehr aus Stundenplan-Ableitungen. Nur lesend über die RLS der
// lernenden Person.

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
 * `aelteste`: stattdessen die früheste offene (freier Tag, "Wenn du magst",
 * Änderungsliste Home freier Tag: bei mehreren die älteste), höchstens 200
 * Einträge ab Programmbeginn.
 */
export async function getNachholLektion(
  organisationId: string,
  cohortId: string,
  enrolmentId: string,
  learnerId: string,
  vorDatum: string,
  aelteste = false
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
    .order("datum", { ascending: aelteste })
    .order("reihenfolge", { ascending: aelteste })
    .limit(aelteste ? 200 : 30);
  const eintraege = (entries ?? []).filter((e): e is { datum: string; lesson_id: string } => !!e.lesson_id);
  if (eintraege.length === 0) return null;

  const lessonIds = [...new Set(eintraege.map((e) => e.lesson_id))];
  const [{ data: fortschritt }, { data: lessons }] = await Promise.all([
    supabase.from("unit_progress").select("lesson_id, status").eq("learner_id", learnerId).in("lesson_id", lessonIds),
    supabase.from("lesson").select("id, name, thema").in("id", lessonIds),
  ]);
  const status = new Map((fortschritt ?? []).map((u) => [u.lesson_id, u.status]));
  const offen = eintraege.find((e) => status.get(e.lesson_id) !== "abgeschlossen");
  const lesson = offen && (lessons ?? []).find((l) => l.id === offen.lesson_id);
  return offen && lesson
    ? {
        lessonId: lesson.id,
        titel: lektionTitel(lesson.name, lesson.thema).titel,
        begonnen: status.get(lesson.id) === "in Bearbeitung",
        datum: offen.datum,
      }
    : null;
}

/**
 * Home v13: "Zuletzt dran", wenn heute keine Kompetenz gestärkt wird --
 * die Kompetenzen der zuletzt abgeschlossenen Lektionen, neueste zuerst.
 * "Bearbeitet" heißt hier "Lektion abgeschlossen": nur dafür gibt es einen
 * Zeitpunkt (unit_progress.abgeschlossen_am).
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
