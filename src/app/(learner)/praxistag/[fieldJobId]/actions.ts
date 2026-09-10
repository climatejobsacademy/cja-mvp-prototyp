"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentLearner } from "@/lib/queries/session";
import { REFLEXIONS_FRAGEN } from "@/lib/praxistag-shared";
import { createClient } from "@/lib/supabase/server";

/**
 * Bestätigung nach Einsatz: ein Klick "Erledigt", kein Formular (Entscheidung
 * 2026-09-09, design-specifications.md 2.1). Siehe docs/open-questions.md,
 * Q-FIELD-JOB-LEARNER-CONFIRM zur RLS-Policy, die das für Learner überhaupt
 * erlaubt.
 */
export async function confirmFieldJob(fieldJobId: string) {
  const learner = await requireCurrentLearner();
  const supabase = await createClient();

  const { error } = await supabase
    .from("field_job")
    .update({
      status: "durchgeführt",
      durchgefuehrt_bestaetigt_am: new Date().toISOString(),
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
    text,
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath(`/praxistag/${fieldJobId}`);
  return { ok: true as const };
}
