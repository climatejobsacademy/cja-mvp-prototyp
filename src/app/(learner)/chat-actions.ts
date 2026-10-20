"use server";

import { istKanal, nachrichtPruefen } from "@/lib/kohorten-chat";
import { requireCurrentLearner } from "@/lib/queries/session";
import { createClient } from "@/lib/supabase/server";

// Kohorten-Chat (SR-83): Schreiben, Löschen, Melden (Lesestand setzt
// /chat/stand beim Abholen eines offenen Kanals). Die
// Kohorte kommt aus der Session, nie aus dem Browser; die Berechtigung prüft
// die Datenbank (RLS, fn_chat_*). Kurze deutsche Meldungen ohne
// Datenbank-Fehlertext; es wird nichts geloggt (CLAUDE.md Regel 9).

type Ergebnis = { ok: true } | { ok: false; fehler: string };

function meldung(code: string | undefined, standard: string): string {
  if (code === "42501") return "Dafür fehlt dir gerade die Berechtigung.";
  if (code === "23514") return "Die Nachricht passt nicht (leer oder zu lang).";
  if (code === "P0002") return "Die Nachricht gibt es nicht mehr.";
  return standard;
}

export async function nachrichtSenden(kanal: string, eingabe: string, id?: string): Promise<Ergebnis> {
  const learner = await requireCurrentLearner();
  if (!istKanal(kanal)) return { ok: false, fehler: "Diesen Kanal gibt es nicht." };

  const pruefung = nachrichtPruefen(eingabe);
  if (!pruefung.ok) {
    return { ok: false, fehler: pruefung.fehler === "leer" ? "Bitte schreib zuerst etwas." : "Die Nachricht ist länger als 1000 Zeichen." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("chat_nachricht")
    .insert({ ...(id ? { id } : {}), cohort_id: learner.cohortId, kanal, text: pruefung.text });
  if (error) return { ok: false, fehler: meldung(error.code, "Die Nachricht konnte nicht gesendet werden.") };
  return { ok: true };
}

/** Soft-Delete über fn_chat_nachricht_loeschen; eigene Nachrichten, Moderation alle. */
export async function nachrichtLoeschen(nachrichtId: string): Promise<Ergebnis> {
  await requireCurrentLearner();
  const supabase = await createClient();
  const { error } = await supabase.rpc("fn_chat_nachricht_loeschen", { p_nachricht_id: nachrichtId });
  if (error) return { ok: false, fehler: meldung(error.code, "Die Nachricht konnte nicht gelöscht werden.") };
  return { ok: true };
}

export async function nachrichtMelden(nachrichtId: string): Promise<Ergebnis> {
  await requireCurrentLearner();
  const supabase = await createClient();
  const { error } = await supabase.rpc("fn_chat_nachricht_melden", { p_nachricht_id: nachrichtId });
  if (error) return { ok: false, fehler: meldung(error.code, "Die Meldung konnte nicht gesendet werden.") };
  return { ok: true };
}
