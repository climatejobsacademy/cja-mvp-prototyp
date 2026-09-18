"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentLearner } from "@/lib/queries/session";
import { createClient } from "@/lib/supabase/server";

/**
 * Bestätigung nach Einsatz: Learner bestätigt "erledigt" (ein Klick) oder
 * meldet ein "problem" mit Freitext-Beschreibung (Entscheidung 2026-09-11,
 * data-model.md/access-matrix.md — löst die ursprüngliche
 * Ein-Klick-Entscheidung vom 2026-09-09 ab). `status` wird hier bewusst NICHT
 * mehr geschrieben: der Trigger fn_derive_field_job_status
 * (0011_field_job_praxistag_erfassung.sql) leitet ihn aus
 * durchgefuehrt_bestaetigt_am ab, weil der Learner-Spaltengrant seit
 * 0012_rls_updates_2026-09-11.sql nur noch durchgefuehrt_bestaetigt_am,
 * ergebnis und problem_beschreibung umfasst (siehe docs/open-questions.md,
 * Q-FIELD-JOB-LEARNER-CONFIRM).
 */
export async function confirmFieldJob(
  fieldJobId: string,
  ergebnis: "erledigt" | "problem",
  problemBeschreibung?: string
) {
  const learner = await requireCurrentLearner();
  const supabase = await createClient();

  const beschreibung = problemBeschreibung?.trim() || null;
  if (ergebnis === "problem" && !beschreibung) {
    return { ok: false as const, error: "Bitte kurz beschreiben, worum es geht." };
  }

  const { error } = await supabase
    .from("field_job")
    .update({
      durchgefuehrt_bestaetigt_am: new Date().toISOString(),
      ergebnis,
      problem_beschreibung: ergebnis === "problem" ? beschreibung : null,
    })
    .eq("id", fieldJobId)
    .eq("learner_id", learner.personId);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath(`/praxistag/${fieldJobId}`);
  return { ok: true as const };
}

/**
 * Reflexion/Nachbereitung: Fragen kommen jetzt dynamisch aus
 * field_job_type_frage (phase='abschluss', siehe queries/praxistag.ts), nicht
 * mehr aus der früheren statischen REFLEXIONS_FRAGEN-Konstante. Jede Antwort
 * landet als eigene field_capture_antwort-Zeile statt als ein serialisierter
 * Text in field_capture.text (das Feld bleibt hier deshalb null).
 *
 * WICHTIG — keine echte Transaktion über die beiden Inserts hinweg:
 * Supabase-js/PostgREST kann pro Request nur einen einzelnen Insert atomar
 * ausführen, kein Multi-Table-BEGIN/COMMIT vom Client aus. Schlägt der zweite
 * Insert (field_capture_antwort) fehl, nachdem der erste (field_capture)
 * bereits erfolgreich war, bleibt eine "leere" field_capture-Zeile
 * (phase=abschluss, ohne Antworten) stehen. Ein Aufräum-Versuch von hier aus
 * ist bewusst NICHT eingebaut: der Learner hat laut 0009_rls_policies.sql
 * kein delete-Recht auf field_capture ("Kein delete" dort im Kommentar) — ein
 * .delete() würde also ohnehin an RLS/Grant scheitern. Für echte Atomarität
 * bräuchte es eine security-definer DB-Funktion/RPC, die beide Inserts
 * serverseitig in einer Transaktion ausführt — für den Prototyp (noch) nicht
 * gebaut.
 *
 * Legt weiterhin bewusst keine field_capture_step_mapping selbst an: Seit
 * 0018_field_job_type_competency_mapping.sql (SR-02) übernimmt das der
 * DB-Trigger derive_field_capture_step_mapping automatisch beim Insert der
 * field_capture, abgeleitet aus field_job → field_job_type →
 * field_job_type_competency_mapping — die App muss dafür nichts mehr tun.
 * Voraussetzung bleibt, dass field_job_type_competency_mapping selbst
 * administrativ befüllt ist (Admin-Oberfläche ist zurückgestellt,
 * design-specifications.md Abschnitt 3); ohne das bleibt die Ableitung leer.
 */
export async function submitReflection(
  fieldJobId: string,
  organisationId: string,
  antworten: { fragId: string; gewaehlteOption: string }[]
) {
  const learner = await requireCurrentLearner();
  const supabase = await createClient();

  const { data: capture, error: captureError } = await supabase
    .from("field_capture")
    .insert({
      organisation_id: organisationId,
      learner_id: learner.personId,
      field_job_id: fieldJobId,
      phase: "abschluss",
      text: null,
    })
    .select("id")
    .single();

  if (captureError || !capture) {
    return {
      ok: false as const,
      error: captureError?.message ?? "Selbstauskunft konnte nicht angelegt werden.",
    };
  }

  if (antworten.length > 0) {
    const { error: antwortenError } = await supabase.from("field_capture_antwort").insert(
      antworten.map((a) => ({
        organisation_id: organisationId,
        field_capture_id: capture.id,
        field_job_type_frage_id: a.fragId,
        gewaehlte_option: a.gewaehlteOption,
      }))
    );

    if (antwortenError) {
      return { ok: false as const, error: antwortenError.message };
    }
  }

  revalidatePath(`/praxistag/${fieldJobId}`);
  return { ok: true as const };
}
