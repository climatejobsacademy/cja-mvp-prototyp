import { lektionTitel } from "@/lib/lektion-titel";
import { createClient } from "@/lib/supabase/server";

import { erledigteLektionIds } from "./lektionen-erledigt";

// Kompetenzseite v1 (SR-61, SR-62, SR-63, SR-73): "Hier lernst du das" und
// "heute dran". Nur lesend. Ohne die Modul-Ebene von demo (Modul-Reiter folgen
// mit Datenlücke Nr. 1).

export type Lernaktivitaet = {
  art: "live" | "selbst" | "praxis";
  /** Lektion bzw. Field-Job-Typ */
  id: string;
  /** Lektion: Titel ohne Klammer, wenn thema gesetzt ist (SR-13, 0029) */
  titel: string;
  /** Lektion: lesson.thema, sonst null */
  thema: string | null;
  /** Geplanter Tag "JJJJ-MM-TT" der lernenden Person (Kohorte/Einschreibung), sonst null */
  datum: string | null;
  /** Live-Termin: Startzeit "HH:MM:SS" */
  start: string | null;
  /** Lektion abgeschlossen bzw. Praxistag durchgeführt */
  erledigt: boolean;
  /** Praxis: eigener Praxistag dieses Typs (Link auf /praxistag/[id]), sonst null */
  fieldJobId: string | null;
  /** Teilschritte, auf die die Aktivität einzahlt (Selbstlernen: die der zugehörigen Live-Lektion) */
  stepIds: string[];
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
    supabase.from("content_competency_mapping").select("lesson_id, competency_step_id").in("competency_step_id", stepIds),
    supabase
      .from("field_job_type_competency_mapping")
      .select("field_job_type_id, competency_step_id")
      .in("competency_step_id", stepIds),
  ]);
  const stepsJe = (paare: { key: string; step: string }[]) => {
    const map = new Map<string, string[]>();
    for (const { key, step } of paare) map.set(key, [...(map.get(key) ?? []), step]);
    return map;
  };
  const stepsJeLektion = stepsJe((theorie ?? []).map((m) => ({ key: m.lesson_id, step: m.competency_step_id })));
  const stepsJeTyp = stepsJe((praxis ?? []).map((m) => ({ key: m.field_job_type_id, step: m.competency_step_id })));
  const lessonIds = [...new Set((theorie ?? []).map((m) => m.lesson_id))];
  const typIds = [...new Set((praxis ?? []).map((m) => m.field_job_type_id))];

  const leer = Promise.resolve({ data: [] as never[] });
  const [{ data: lessons }, { data: liveSessions }, { data: asyncPlan }, erledigteLektionen, { data: typen }, { data: jobs }] =
    await Promise.all([
      lessonIds.length ? supabase.from("lesson").select("id, name, thema, content_type").in("id", lessonIds) : leer,
      lessonIds.length
        ? supabase.from("live_session").select("id, lesson_id, datum, start").in("lesson_id", lessonIds)
        : leer,
      lessonIds.length
        ? supabase
            .from("schedule_entry")
            .select("lesson_id, datum")
            .in("lesson_id", lessonIds)
            .or(meinPlan)
        : leer,
      // abgeschlossen oder (Live) bestätigte Anwesenheit -- wie competency_fulfilment (0052)
      erledigteLektionIds(supabase, ctx.learnerId, lessonIds),
      typIds.length ? supabase.from("field_job_type").select("id, titel").in("id", typIds) : leer,
      typIds.length
        ? supabase
            .from("field_job")
            .select("id, field_job_type_id, datum, status")
            .eq("learner_id", ctx.learnerId)
            .in("field_job_type_id", typIds)
        : leer,
    ]);

  // Live-Termine nur, wenn sie im eigenen Stundenplan stehen. Gleichzeitig
  // die Selbstlern-Lektionen, die zu den Live-Lektionen gehören (Wissen
  // festigen, live_lektion_id 0029) -- sie zahlen auf dieselben Teilschritte
  // ein (Anna 2026-10-27: je Kompetenzschritt die Links zu Live, Selbstlernen,
  // Praxis).
  const liveIds = (liveSessions ?? []).map((s) => s.id);
  const liveLektionIds = (lessons ?? []).filter((l) => l.content_type === "live").map((l) => l.id);
  const [{ data: livePlan }, { data: festigen }] = await Promise.all([
    liveIds.length
      ? supabase.from("schedule_entry").select("live_session_id").in("live_session_id", liveIds).or(meinPlan)
      : Promise.resolve({ data: [] as { live_session_id: string | null }[] }),
    liveLektionIds.length
      ? supabase.from("lesson").select("id, name, thema, live_lektion_id").in("live_lektion_id", liveLektionIds)
      : Promise.resolve({ data: [] as { id: string; name: string; thema: string | null; live_lektion_id: string | null }[] }),
  ]);
  const festigenIds = (festigen ?? []).map((f) => f.id).filter((id) => !lessonIds.includes(id));
  const [{ data: festigenPlan }, festigenErledigt] = festigenIds.length
    ? await Promise.all([
        supabase.from("schedule_entry").select("lesson_id, datum").in("lesson_id", festigenIds).or(meinPlan),
        erledigteLektionIds(supabase, ctx.learnerId, festigenIds),
      ])
    : [{ data: [] as { lesson_id: string | null; datum: string }[] }, new Set<string>()];
  const geplanteLive = new Set((livePlan ?? []).map((e) => e.live_session_id));
  const liveJeLektion = new Map<string, { datum: string; start: string }>();
  for (const s of liveSessions ?? []) {
    if (!geplanteLive.has(s.id) || !s.lesson_id) continue;
    const bisher = liveJeLektion.get(s.lesson_id);
    if (!bisher || s.datum < bisher.datum) liveJeLektion.set(s.lesson_id, { datum: s.datum, start: s.start });
  }
  const datumJeLektion = new Map<string, string>();
  for (const e of [...(asyncPlan ?? []), ...(festigenPlan ?? [])]) {
    if (!e.lesson_id) continue;
    const bisher = datumJeLektion.get(e.lesson_id);
    if (!bisher || e.datum < bisher) datumJeLektion.set(e.lesson_id, e.datum);
  }

  const ergebnis: Lernaktivitaet[] = (lessons ?? []).map((l) => {
    const live = liveJeLektion.get(l.id);
    return {
      art: l.content_type === "live" || live ? "live" : "selbst",
      id: l.id,
      titel: lektionTitel(l.name, l.thema).titel,
      thema: lektionTitel(l.name, l.thema).thema,
      datum: live?.datum ?? datumJeLektion.get(l.id) ?? null,
      start: live?.start ?? null,
      erledigt: erledigteLektionen.has(l.id),
      fieldJobId: null,
      stepIds: stepsJeLektion.get(l.id) ?? [],
    };
  });
  for (const f of festigen ?? []) {
    if (!festigenIds.includes(f.id)) continue;
    const titel = lektionTitel(f.name, f.thema);
    ergebnis.push({
      art: "selbst",
      id: f.id,
      titel: titel.titel,
      thema: titel.thema,
      datum: datumJeLektion.get(f.id) ?? null,
      start: null,
      erledigt: festigenErledigt.has(f.id),
      fieldJobId: null,
      stepIds: f.live_lektion_id ? (stepsJeLektion.get(f.live_lektion_id) ?? []) : [],
    });
  }
  for (const t of typen ?? []) {
    // Der eigene Praxistag dieses Typs: der nächste offene, sonst der letzte.
    const eigene = (jobs ?? []).filter((j) => j.field_job_type_id === t.id).sort((a, b) => a.datum.localeCompare(b.datum));
    const job = eigene.find((j) => j.status !== "durchgeführt") ?? eigene.at(-1);
    ergebnis.push({
      art: "praxis",
      id: t.id,
      titel: t.titel,
      thema: null,
      datum: job?.datum ?? null,
      start: null,
      erledigt: job?.status === "durchgeführt",
      fieldJobId: job?.id ?? null,
      stepIds: stepsJeTyp.get(t.id) ?? [],
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
