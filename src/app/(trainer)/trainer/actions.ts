"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentTrainer } from "@/lib/queries/trainer-bereich";
import { createClient } from "@/lib/supabase/server";
import { anwesenheitAktion, type AnwesenheitStatus } from "@/lib/trainer-tag";

export type SpeichernErgebnis = { ok: true } | { ok: false; meldung: string };

/**
 * Anwesenheit bestätigen (SR-81). Legt immer eine neue attendance-Zeile an:
 * erste Bestätigung oder Storno-Eintrag auf die aktuelle Zeile (E4, kein
 * Update). Welche Lernenden und Termine erlaubt sind, prüft die Policy
 * attendance_trainer_insert (0032); hier nur die organisation_id aus der
 * Einschreibung, die zum Termin gehört.
 */
export async function anwesenheitSpeichern(
  liveSessionId: string,
  learnerId: string,
  status: AnwesenheitStatus
): Promise<SpeichernErgebnis> {
  const trainer = await requireCurrentTrainer();
  const supabase = await createClient();

  // Aktueller Stand frisch lesen (nicht dem Client vertrauen).
  const { data: aktuell } = await supabase
    .from("attendance_aktuell")
    .select("id, status")
    .eq("live_session_id", liveSessionId)
    .eq("learner_id", learnerId)
    .maybeSingle();
  const aktion = anwesenheitAktion(aktuell ? { id: aktuell.id, status: aktuell.status as AnwesenheitStatus } : null, status);
  if (aktion.art === "unveraendert") return { ok: true };

  // Einschreibung der Person, deren Kohorte bzw. Einschreibung den Termin im Plan hat.
  const [{ data: eintraege }, { data: einschreibungen }] = await Promise.all([
    supabase.from("schedule_entry").select("cohort_id, enrolment_id").eq("live_session_id", liveSessionId),
    supabase.from("enrolment").select("id, cohort_id, organisation_id").eq("learner_id", learnerId),
  ]);
  const passend = (einschreibungen ?? []).find((e) =>
    (eintraege ?? []).some((z) => z.cohort_id === e.cohort_id || z.enrolment_id === e.id)
  );
  if (!passend) return { ok: false, meldung: "Diese Person gehört nicht zu diesem Termin." };

  const { error } = await supabase.from("attendance").insert({
    organisation_id: passend.organisation_id,
    learner_id: learnerId,
    live_session_id: liveSessionId,
    status,
    bestaetigt_von: trainer.personId,
    korrigiert_id: aktion.art === "storno" ? aktion.korrigiertId : null,
  });
  if (error) {
    // 23505: jemand hat parallel bestätigt -- Seite neu laden zeigt den Stand.
    return {
      ok: false,
      meldung:
        error.code === "23505"
          ? "Wurde gerade schon bestätigt. Bitte Seite neu laden."
          : "Speichern hat nicht geklappt. Bitte noch einmal versuchen.",
    };
  }

  revalidatePath("/trainer");
  return { ok: true };
}
