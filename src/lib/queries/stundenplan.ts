import { createClient } from "@/lib/supabase/server";

import { getAgendaZeitraum, type TagesAgenda } from "./schedule";

// Stundenplan v2 (docs/design_handoff_stundenplan_v2, SR folgt): Daten für
// Woche, Tag und Monat. Nutzt die Tagesagenda von Home (gebündelt über den
// ganzen Zeitraum) und ergänzt die bestätigte Anwesenheit (attendance,
// Lesen der eigenen Zeilen per RLS attendance_learner_select). Nur lesend.

export type Plantag = TagesAgenda & {
  /** live_session.id → Anwesenheit bestätigt "anwesend" */
  anwesend: Set<string>;
};

type Ctx = { organisationId: string; cohortId: string; enrolmentId: string; learnerId: string };

/** Alle Tage von `von` bis `bis` (einschließlich). */
export async function getStundenplan(ctx: Ctx, von: string, bis: string): Promise<Plantag[]> {
  const agenden = await getAgendaZeitraum(ctx.organisationId, ctx.cohortId, ctx.enrolmentId, ctx.learnerId, von, bis);
  const liveIds = agenden.flatMap((a) => a.theorie.flatMap((e) => (e.liveSession ? [e.liveSession.id] : [])));

  const supabase = await createClient();
  const { data: anwesenheit } = liveIds.length
    ? await supabase
        .from("attendance")
        .select("live_session_id, status")
        .eq("learner_id", ctx.learnerId)
        .in("live_session_id", liveIds)
    : { data: [] as { live_session_id: string; status: string }[] };
  // Entscheidung Anna 2026-10-10: Häkchen bei Live nur, wenn die Anwesenheit
  // als "anwesend" bestätigt ist -- nicht schon, weil der Termin vorbei ist.
  const anwesend = new Set((anwesenheit ?? []).filter((a) => a.status === "anwesend").map((a) => a.live_session_id));

  return agenden.map((a) => ({ ...a, anwesend }));
}

/**
 * Start der eigenen Kohorte (cohort.start_datum, Lesen per RLS
 * cohort_learner_select) -- für "Woche x": Woche 1 ist die Startwoche der
 * Kohorte (Änderungsliste Anna 2026-10-10, Punkt 6).
 */
export async function getKohortenStart(cohortId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("cohort").select("start_datum").eq("id", cohortId).maybeSingle();
  return data?.start_datum ?? null;
}
