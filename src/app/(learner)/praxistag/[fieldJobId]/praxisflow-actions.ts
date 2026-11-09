"use server";

import { revalidatePath } from "next/cache";

import type { PraxisErgebnis, PraxisPhase } from "@/lib/database.types";
import type { AktionErgebnis } from "@/lib/praxisflow-shared";
import { requireCurrentLearner } from "@/lib/queries/session";
import { createClient } from "@/lib/supabase/server";

// Server-Aktionen des geführten Praxisflows. Jede ruft genau eine Funktion
// fn_praxis_* auf (SR-08: ein atomarer Aufruf); Reihenfolge, Eigentum und
// Codewort prüft die Datenbank (0058–0061). Fehlermeldungen der Datenbank
// sind für Lernende geschrieben und werden durchgereicht, ohne Logging.

type Fehler = { code?: string; message: string } | null;

function meldung(error: NonNullable<Fehler>): string {
  if (error.code === "55P03") return "Zu viele falsche Versuche. Bitte AfCJ melden, damit die Sperre aufgehoben wird.";
  if (error.code === "P0002" && /Codewort/.test(error.message)) return "Für deine Gruppe ist noch kein Codewort eingerichtet. Bitte AfCJ melden.";
  if (["23514", "42501", "P0002", "23505", "22023"].includes(error.code ?? "")) return error.message;
  return "Das hat nicht geklappt. Bitte versuch es noch einmal.";
}

async function aufrufen<T>(fieldJobId: string, aufruf: (s: Awaited<ReturnType<typeof createClient>>) => PromiseLike<{ data: T | null; error: Fehler }>): Promise<AktionErgebnis<T>> {
  await requireCurrentLearner();
  const supabase = await createClient();
  const { data, error } = await aufruf(supabase);
  if (error) return { ok: false, fehler: meldung(error) };
  revalidatePath(`/praxistag/${fieldJobId}`);
  return { ok: true, wert: data as T };
}

export async function planSpeichern(fieldJobId: string, werkzeuge: string[], materialien: string[], schritte: string[]) {
  return aufrufen(fieldJobId, (s) =>
    s.rpc("fn_praxis_plan_speichern", { p_job: fieldJobId, p_werkzeuge: werkzeuge, p_materialien: materialien, p_schritte: schritte })
  );
}

export async function phaseWeiter(fieldJobId: string, von: PraxisPhase) {
  return aufrufen<PraxisPhase>(fieldJobId, (s) => s.rpc("fn_praxis_weiter", { p_job: fieldJobId, p_von: von }));
}

export async function zurueckZumPlan(fieldJobId: string) {
  return aufrufen<PraxisPhase>(fieldJobId, (s) => s.rpc("fn_praxis_zurueck_zum_plan", { p_job: fieldJobId }));
}

export async function schrittAbhaken(fieldJobId: string, schrittId: string) {
  return aufrufen(fieldJobId, (s) => s.rpc("fn_praxis_schritt_abhaken", { p_job: fieldJobId, p_schritt: schrittId }));
}

export async function kontrolleAbhaken(fieldJobId: string, punktId: string) {
  return aufrufen(fieldJobId, (s) => s.rpc("fn_praxis_kontrolle_abhaken", { p_job: fieldJobId, p_punkt: punktId }));
}

/** Plan-Freigabe der Trainer:in in Entscheiden (SR-65); ok mit wert false = Codewort falsch. */
export async function planFreigeben(fieldJobId: string, codewort: string) {
  return aufrufen<boolean>(fieldJobId, (s) => s.rpc("fn_praxis_gate", { p_job: fieldJobId, p_gate: "plan", p_codewort: codewort }));
}

/** Freigabe zum Zuschalten; ok mit wert false = Codewort falsch. */
export async function zuschaltenFreigeben(fieldJobId: string, codewort: string) {
  return aufrufen<boolean>(fieldJobId, (s) => s.rpc("fn_praxis_gate", { p_job: fieldJobId, p_gate: "zuschalten", p_codewort: codewort }));
}

export async function einschaetzen(fieldJobId: string, rolle: "selbst" | "peer", werte: Record<string, number>) {
  return aufrufen(fieldJobId, (s) => s.rpc("fn_praxis_einschaetzen", { p_job: fieldJobId, p_rolle: rolle, p_werte: werte }));
}

/** Trainer-Einschätzung nur mit Codewort im selben Aufruf; ok mit wert false = Codewort falsch. */
export async function trainerEinschaetzen(fieldJobId: string, werte: Record<string, number>, codewort: string) {
  return aufrufen<boolean>(fieldJobId, (s) =>
    s.rpc("fn_praxis_trainer_einschaetzen", { p_job: fieldJobId, p_werte: werte, p_codewort: codewort })
  );
}

export async function abschliessen(fieldJobId: string, naechstesMal: string) {
  return aufrufen<PraxisErgebnis>(fieldJobId, (s) =>
    s.rpc("fn_praxis_abschliessen", { p_job: fieldJobId, p_naechstes_mal: naechstesMal.trim() || null })
  );
}

/** Nach Upload oder Löschen im Browser: Seite neu laden lassen. */
export async function dateienGeaendert(fieldJobId: string) {
  await requireCurrentLearner();
  revalidatePath(`/praxistag/${fieldJobId}`);
}
