import { createClient } from "@/lib/supabase/server";

export type PraxistagAuftrag = {
  fieldJobId: string;
  titel: string;
  phase: string;
  ergebnis: string | null;
  /** Labortag (SR-94): ohne Praxisflow */
  labor: boolean;
};

/**
 * Eigene Praxisaufträge eines Tages in fester Reihenfolge (SR-13, SR-64):
 * Reihenfolge des Stundenplan-Eintrags (schedule_entry.reihenfolge), bei
 * Gleichstand Anlagezeitpunkt. Sichtbar ist nur, was RLS der Person zeigt.
 */
export async function getPraxistag(learnerId: string, datum: string): Promise<PraxistagAuftrag[]> {
  const supabase = await createClient();
  const { data: jobs, error } = await supabase
    .from("field_job")
    .select("id, phase, praxisflow, created_at, field_job_type:field_job_type_id (titel, ablauf)")
    .eq("learner_id", learnerId)
    .eq("datum", datum);
  if (error) throw new Error("Praxistag konnte nicht geladen werden");
  if (!jobs?.length) return [];

  const { data: eintraege } = await supabase
    .from("schedule_entry")
    .select("field_job_id, reihenfolge")
    .in("field_job_id", jobs.map((j) => j.id));
  const position = new Map((eintraege ?? []).map((e) => [e.field_job_id, e.reihenfolge]));

  return [...jobs]
    .sort(
      (a, b) =>
        (position.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (position.get(b.id) ?? Number.MAX_SAFE_INTEGER) ||
        a.created_at.localeCompare(b.created_at)
    )
    .map((j) => {
      const t = Array.isArray(j.field_job_type) ? j.field_job_type[0] : j.field_job_type;
      return {
        fieldJobId: j.id,
        titel: t?.titel ?? "Praxisauftrag",
        phase: j.phase,
        ergebnis: j.praxisflow?.ergebnis ?? null,
        labor: t?.ablauf === "labor",
      };
    });
}

/** Nächster offener Praxisauftrag nach der festen Reihenfolge (ohne Labortage), außer dem aktuellen. */
export function naechsterOffener(auftraege: PraxistagAuftrag[], aktuell: string): PraxistagAuftrag | null {
  return auftraege.find((a) => a.fieldJobId !== aktuell && !a.labor && a.phase !== "abgeschlossen") ?? null;
}
