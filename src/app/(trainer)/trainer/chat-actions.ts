"use server";

import { istKanal, nachrichtPruefen } from "@/lib/kohorten-chat";
import { requireCurrentTrainer } from "@/lib/queries/trainer-bereich";
import { createClient } from "@/lib/supabase/server";

// Kohorten-Chat für Trainer:innen (SR-83, PR 3): Schreiben in beiden Kanälen,
// Löschen aller Nachrichten der Kohorte, Meldungen erledigen. Die Kohorte kommt
// vom Browser; ob die Person dort schreiben oder moderieren darf, entscheidet
// die Datenbank (RLS, fn_chat_*). Es wird nichts geloggt (Regel 9).

type Ergebnis = { ok: true } | { ok: false; fehler: string };

function meldung(code: string | undefined, standard: string): string {
  if (code === "42501") return "Dafür fehlt dir gerade die Berechtigung.";
  if (code === "23514") return "Die Nachricht passt nicht (leer oder zu lang).";
  if (code === "P0002") return "Die Nachricht gibt es nicht mehr.";
  return standard;
}

export async function nachrichtSendenTrainer(kohorteId: string, kanal: string, eingabe: string): Promise<Ergebnis> {
  await requireCurrentTrainer();
  if (!istKanal(kanal)) return { ok: false, fehler: "Diesen Kanal gibt es nicht." };

  const pruefung = nachrichtPruefen(eingabe);
  if (!pruefung.ok) {
    return { ok: false, fehler: pruefung.fehler === "leer" ? "Bitte schreib zuerst etwas." : "Die Nachricht ist länger als 1000 Zeichen." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("chat_nachricht").insert({ cohort_id: kohorteId, kanal, text: pruefung.text });
  if (error) return { ok: false, fehler: meldung(error.code, "Die Nachricht konnte nicht gesendet werden.") };
  return { ok: true };
}

export async function nachrichtLoeschenTrainer(nachrichtId: string): Promise<Ergebnis> {
  await requireCurrentTrainer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("fn_chat_nachricht_loeschen", { p_nachricht_id: nachrichtId });
  if (error) return { ok: false, fehler: meldung(error.code, "Die Nachricht konnte nicht gelöscht werden.") };
  return { ok: true };
}

/** Alle offenen Meldungen zu einer Nachricht als erledigt markieren (Nachricht bleibt stehen). */
export async function meldungenErledigt(meldungIds: string[]): Promise<Ergebnis> {
  await requireCurrentTrainer();
  const supabase = await createClient();
  for (const id of meldungIds) {
    const { error } = await supabase.rpc("fn_chat_meldung_erledigt", { p_meldung_id: id });
    if (error) return { ok: false, fehler: meldung(error.code, "Die Meldung konnte nicht erledigt werden.") };
  }
  return { ok: true };
}
