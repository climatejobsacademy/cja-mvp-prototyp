"use server";

import { revalidatePath } from "next/cache";

import { beitragPruefen } from "@/lib/lektion-thread";
import { requireCurrentLearner } from "@/lib/queries/session";
import { createClient } from "@/lib/supabase/server";

type Ergebnis = { ok: true } | { ok: false; fehler: string };

// Kurze deutsche Meldungen; bewusst ohne Datenbank-Fehlertext, damit weder
// Beitragsinhalte noch Namen in der Oberfläche oder in Logs landen
// (CLAUDE.md Regel 9). Es wird nichts geloggt.
function meldung(code: string | undefined, standard: string): string {
  if (code === "42501") return "Dafür fehlt dir gerade die Berechtigung.";
  if (code === "23514") return "Der Beitrag passt nicht (leer, zu lang oder Antwort nicht möglich).";
  if (code === "P0002") return "Den Beitrag gibt es nicht mehr.";
  return standard;
}

/**
 * Neuer Beitrag oder Antwort im Fragen-Thread (SR-74).
 * Insert nur mit den erlaubten Spalten; person_id, organisation_id und
 * Anzeigename setzt der Trigger, die Berechtigung prüft RLS.
 */
export async function beitragSchreiben(
  lessonId: string,
  cohortId: string,
  parentId: string | null,
  eingabe: string
): Promise<Ergebnis> {
  await requireCurrentLearner();

  const pruefung = beitragPruefen(eingabe);
  if (!pruefung.ok) {
    return {
      ok: false,
      fehler: pruefung.fehler === "leer" ? "Bitte schreib zuerst etwas." : "Der Beitrag ist länger als 1000 Zeichen.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("lektion_beitrag").insert({
    lesson_id: lessonId,
    cohort_id: cohortId,
    parent_id: parentId,
    text: pruefung.text,
  });

  if (error) return { ok: false, fehler: meldung(error.code, "Der Beitrag konnte nicht gespeichert werden.") };

  revalidatePath(`/content/${lessonId}`);
  return { ok: true };
}

/** Löschen über fn_beitrag_loeschen (Soft-Delete); das Backend entscheidet. */
export async function beitragLoeschen(lessonId: string, beitragId: string): Promise<Ergebnis> {
  await requireCurrentLearner();

  const supabase = await createClient();
  const { error } = await supabase.rpc("fn_beitrag_loeschen", { p_beitrag_id: beitragId });

  if (error) return { ok: false, fehler: meldung(error.code, "Der Beitrag konnte nicht gelöscht werden.") };

  revalidatePath(`/content/${lessonId}`);
  return { ok: true };
}
