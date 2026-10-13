import { createClient } from "@/lib/supabase/server";

// Kompetenzseite v1 (SR-61, SR-62, SR-63, SR-73): "Hier lernst du das" und
// "heute dran". Nur lesend. Ohne die Modul-Ebene von demo (Modul-Reiter folgen
// mit Datenlücke Nr. 1).

export type Lernaktivitaet = {
  art: "live" | "selbst" | "praxis";
  /** Lektion bzw. Field-Job-Typ */
  id: string;
  titel: string;
  /** Geplanter Tag "JJJJ-MM-TT" der lernenden Person (Kohorte/Einschreibung), sonst null */
  datum: string | null;
  /** Live-Termin: Startzeit "HH:MM:SS" */
  start: string | null;
  /** Lektion abgeschlossen bzw. Praxistag durchgeführt */
  erledigt: boolean;
  /** Praxis: eigener Praxistag dieses Typs (Link auf /praxistag/[id]), sonst null */
  fieldJobId: string | null;
};

/**
 * Brief 2.4 "Hier lernst du das": Lektionen und Praxis-Typen, die auf die
 * Teilschritte einer Kompetenz einzahlen (content_competency_mapping bzw.
 * field_job_type_competency_mapping), mit Datum und Status der lernenden
 * Person. Live vs. Selbstlernen über lesson.content_type. Nur lesend.
 */
export async function getLernaktivitaeten(
  stepIds: string[],
  ctx: { organisationId: string; cohortId: string; enrolmentId: string; learnerId: string }
): Promise<Lernaktivitaet[]> {
  if (stepIds.length === 0) return [];
  const supabase = await createClient();
  const meinPlan = `cohort_id.eq.${ctx.cohortId},enrolment_id.eq.${ctx.enrolmentId}`;

  const [{ data: theorie }, { data: praxis }] = await Promise.all([
    supabase.from("content_competency_mapping").select("lesson_id").in("competency_step_id", stepIds),
    supabase.from("field_job_type_competency_mapping").select("field_job_type_id").in("competency_step_id", stepIds),
  ]);
  const lessonIds = [...new Set((theorie ?? []).map((m) => m.lesson_id))];
  const typIds = [...new Set((praxis ?? []).map((m) => m.field_job_type_id))];

  const leer = Promise.resolve({ data: [] as never[] });
  const [{ data: lessons }, { data: liveSessions }, { data: asyncPlan }, { data: progress }, { data: typen }, { data: jobs }] =
    await Promise.all([
      lessonIds.length ? supabase.from("lesson").select("id, name, content_type").in("id", lessonIds) : leer,
      lessonIds.length
        ? supabase.from("live_session").select("id, lesson_id, datum, start").in("lesson_id", lessonIds)
        : leer,
      lessonIds.length
        ? supabase
            .from("schedule_entry")
            .select("lesson_id, datum")
            .eq("organisation_id", ctx.organisationId)
            .in("lesson_id", lessonIds)
            .or(meinPlan)
        : leer,
      lessonIds.length
        ? supabase
            .from("unit_progress")
            .select("lesson_id, status")
            .eq("learner_id", ctx.learnerId)
            .in("lesson_id", lessonIds)
        : leer,
      typIds.length ? supabase.from("field_job_type").select("id, titel").in("id", typIds) : leer,
      typIds.length
        ? supabase
            .from("field_job")
            .select("id, field_job_type_id, datum, status")
            .eq("learner_id", ctx.learnerId)
            .in("field_job_type_id", typIds)
        : leer,
    ]);

  // Live-Termine nur, wenn sie im eigenen Stundenplan stehen.
  const liveIds = (liveSessions ?? []).map((s) => s.id);
  const { data: livePlan } = liveIds.length
    ? await supabase
        .from("schedule_entry")
        .select("live_session_id")
        .eq("organisation_id", ctx.organisationId)
        .in("live_session_id", liveIds)
        .or(meinPlan)
    : { data: [] as { live_session_id: string | null }[] };
  const geplanteLive = new Set((livePlan ?? []).map((e) => e.live_session_id));
  const liveJeLektion = new Map<string, { datum: string; start: string }>();
  for (const s of liveSessions ?? []) {
    if (!geplanteLive.has(s.id) || !s.lesson_id) continue;
    const bisher = liveJeLektion.get(s.lesson_id);
    if (!bisher || s.datum < bisher.datum) liveJeLektion.set(s.lesson_id, { datum: s.datum, start: s.start });
  }
  const datumJeLektion = new Map<string, string>();
  for (const e of asyncPlan ?? []) {
    if (!e.lesson_id) continue;
    const bisher = datumJeLektion.get(e.lesson_id);
    if (!bisher || e.datum < bisher) datumJeLektion.set(e.lesson_id, e.datum);
  }
  const erledigteLektionen = new Set(
    (progress ?? []).filter((p) => p.status === "abgeschlossen").map((p) => p.lesson_id)
  );

  const ergebnis: Lernaktivitaet[] = (lessons ?? []).map((l) => {
    const live = liveJeLektion.get(l.id);
    return {
      art: l.content_type === "live" || live ? "live" : "selbst",
      id: l.id,
      titel: l.name,
      datum: live?.datum ?? datumJeLektion.get(l.id) ?? null,
      start: live?.start ?? null,
      erledigt: erledigteLektionen.has(l.id),
      fieldJobId: null,
    };
  });
  for (const t of typen ?? []) {
    // Der eigene Praxistag dieses Typs: der nächste offene, sonst der letzte.
    const eigene = (jobs ?? []).filter((j) => j.field_job_type_id === t.id).sort((a, b) => a.datum.localeCompare(b.datum));
    const job = eigene.find((j) => j.status !== "durchgeführt") ?? eigene.at(-1);
    ergebnis.push({
      art: "praxis",
      id: t.id,
      titel: t.titel,
      datum: job?.datum ?? null,
      start: null,
      erledigt: job?.status === "durchgeführt",
      fieldJobId: job?.id ?? null,
    });
  }
  // Geplante zuerst, nach Datum; ungeplante danach.
  return ergebnis.sort((a, b) => (a.datum ?? "9999").localeCompare(b.datum ?? "9999"));
}

/**
 * Brief 2.4/2.6 "heute dran": Teilschritte, auf die eine heutige Lektion
 * oder ein heutiger Praxistag einzahlt -- dieselbe Zuordnung wie "Stärkt …"
 * auf Home. Nur lesend.
 */
export async function getHeuteStepIds(lessonIds: string[], fieldJobIds: string[]): Promise<Set<string>> {
  if (lessonIds.length === 0 && fieldJobIds.length === 0) return new Set();
  const supabase = await createClient();

  const { data: jobs } = fieldJobIds.length
    ? await supabase.from("field_job").select("field_job_type_id").in("id", fieldJobIds)
    : { data: [] as { field_job_type_id: string }[] };
  const typIds = [...new Set((jobs ?? []).map((j) => j.field_job_type_id))];

  const [{ data: theorie }, { data: praxis }] = await Promise.all([
    lessonIds.length
      ? supabase.from("content_competency_mapping").select("competency_step_id").in("lesson_id", lessonIds)
      : Promise.resolve({ data: [] as { competency_step_id: string }[] }),
    typIds.length
      ? supabase.from("field_job_type_competency_mapping").select("competency_step_id").in("field_job_type_id", typIds)
      : Promise.resolve({ data: [] as { competency_step_id: string }[] }),
  ]);
  return new Set([...(theorie ?? []), ...(praxis ?? [])].map((m) => m.competency_step_id));
}
