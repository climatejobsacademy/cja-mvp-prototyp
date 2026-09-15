"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentLearner } from "@/lib/queries/session";
import { REFLEXIONS_FRAGEN } from "@/lib/praxistag-shared";
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
 * Reflexion/Nachbereitung: vorgegebene Auswahl-Fragen, kein Freitext
 * (design-specifications.md 2.1). Die Antworten sind reiner Frontend-Content
 * (siehe REFLEXIONS_FRAGEN) und werden als lesbarer Text in field_capture.text
 * abgelegt — die Selbstauskunft selbst ist das Schema-Feld, das dafür
 * vorgesehen ist.
 *
 * Legt bewusst keine field_capture_step_mapping an: welche competency_steps
 * eine Selbstauskunft belegt, wird laut data-model.md erst beim tatsächlichen
 * Praxis-Ereignis verknüpft — im Prototyp administrativ (Admin-Oberfläche ist
 * zurückgestellt, design-specifications.md Abschnitt 3), nicht durch die
 * Learner-App.
 */
export async function submitReflection(
  fieldJobId: string,
  organisationId: string,
  answers: string[]
) {
  const learner = await requireCurrentLearner();
  const supabase = await createClient();

  const text = REFLEXIONS_FRAGEN.map((f, i) => `${f.frage}\n→ ${answers[i] ?? "–"}`).join("\n\n");

  const { error } = await supabase.from("field_capture").insert({
    organisation_id: organisationId,
    learner_id: learner.personId,
    field_job_id: fieldJobId,
    phase: "abschluss",
    text,
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath(`/praxistag/${fieldJobId}`);
  return { ok: true as const };
}
