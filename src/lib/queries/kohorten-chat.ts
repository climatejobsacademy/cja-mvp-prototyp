import type { ChatKanal } from "@/lib/database.types";
import { KANAELE, NACHRICHTEN_LIMIT } from "@/lib/kohorten-chat";
import { createClient } from "@/lib/supabase/server";

// Kohorten-Chat (SR-83, Migration 0050). Gelesen wird mit der Session der
// Person; welche Nachrichten sie sieht und wo sie schreiben darf, entscheidet
// die Datenbank (RLS und fn_chat_darf_*). Kohorte ist immer die des aktuellen
// Kontexts (requireCurrentLearner), nie ein Wert aus dem Browser.

export type ChatNachricht = {
  id: string;
  /** created_at (ISO) */
  zeit: string;
  name: string | null;
  /** null = gelöscht */
  text: string | null;
  eigene: boolean;
  /** Nur für Moderierende: offene Meldungen zu dieser Nachricht */
  meldungIds: string[];
};

export type ChatKanalStand = {
  kanal: ChatKanal;
  titel: string;
  zusatz: string;
  darfSchreiben: boolean;
  ungelesen: number;
  letzte: { name: string | null; text: string; eigene: boolean } | null;
};

export type ChatStand = {
  /** Darf die Person alle Nachrichten der Kohorte löschen und Meldungen sehen? (fn_chat_moderiert) */
  moderation: boolean;
  kanaele: ChatKanalStand[];
  /** Nachrichten des angefragten Kanals, älteste zuerst; null ohne Kanal */
  nachrichten: ChatNachricht[] | null;
};

// Explizite Spaltenliste: der Spalten-Grant (0050) erlaubt kein select *.
const SPALTEN = "id, created_at, person_id, autor_anzeigename, text, geloescht_am";

/** Ist der Chat für die Kohorte an und darf die Person ihn lesen? */
export async function chatSichtbar(cohortId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("fn_chat_darf_lesen", { p_cohort_id: cohortId });
  return data === true;
}

export async function getChatStand(
  learner: { personId: string; cohortId: string },
  kanal: ChatKanal | null
): Promise<ChatStand | null> {
  const supabase = await createClient();
  const { cohortId, personId } = learner;

  const { data: darfLesen } = await supabase.rpc("fn_chat_darf_lesen", { p_cohort_id: cohortId });
  if (darfLesen !== true) return null;

  const letzteVon = (k: ChatKanal) =>
    supabase
      .from("chat_nachricht")
      .select(SPALTEN)
      .eq("cohort_id", cohortId)
      .eq("kanal", k)
      .is("geloescht_am", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  const [moderiert, ungelesen, schreibrechte, letzte, liste] = await Promise.all([
    supabase.rpc("fn_chat_moderiert", { p_cohort_id: cohortId }),
    supabase.rpc("fn_chat_ungelesen", { p_cohort_id: cohortId }),
    Promise.all(KANAELE.map((k) => supabase.rpc("fn_chat_darf_schreiben", { p_cohort_id: cohortId, p_kanal: k.kanal }))),
    Promise.all(KANAELE.map((k) => letzteVon(k.kanal))),
    kanal
      ? supabase
          .from("chat_nachricht")
          .select(SPALTEN)
          .eq("cohort_id", cohortId)
          .eq("kanal", kanal)
          .order("created_at", { ascending: false })
          .limit(NACHRICHTEN_LIMIT)
      : Promise.resolve(null),
  ]);

  const ungelesenJeKanal = new Map((ungelesen.data ?? []).map((u) => [u.kanal, u.anzahl]));
  const moderation = moderiert.data === true;

  // Offene Meldungen nur für Moderierende (RLS lässt Lernende ohnehin keine lesen).
  const meldungenJeNachricht = new Map<string, string[]>();
  const nachrichtIds = (liste?.data ?? []).map((n) => n.id);
  if (moderation && nachrichtIds.length > 0) {
    const { data: meldungen } = await supabase
      .from("chat_meldung")
      .select("id, nachricht_id")
      .is("erledigt_am", null)
      .in("nachricht_id", nachrichtIds);
    for (const m of meldungen ?? []) meldungenJeNachricht.set(m.nachricht_id, [...(meldungenJeNachricht.get(m.nachricht_id) ?? []), m.id]);
  }

  return {
    moderation,
    kanaele: KANAELE.map((k, i) => {
      const l = letzte[i].data;
      return {
        kanal: k.kanal,
        titel: k.titel,
        zusatz: k.zusatz,
        darfSchreiben: schreibrechte[i].data === true,
        ungelesen: ungelesenJeKanal.get(k.kanal) ?? 0,
        letzte: l && l.text ? { name: l.autor_anzeigename, text: l.text, eigene: l.person_id === personId } : null,
      };
    }),
    nachrichten: liste
      ? [...(liste.data ?? [])].reverse().map((n) => ({
          id: n.id,
          zeit: n.created_at,
          name: n.autor_anzeigename,
          text: n.geloescht_am ? null : n.text,
          eigene: n.person_id !== null && n.person_id === personId,
          meldungIds: meldungenJeNachricht.get(n.id) ?? [],
        }))
      : null,
  };
}

/**
 * Kohorten, deren Chat die angemeldete Trainer:in moderiert (Termin in der
 * Kohorte, kohorte_moderation oder AfCJ admin) und die freigeschaltet sind.
 */
export async function chatKohortenFuerTrainer(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data: kohorten } = await supabase.from("cohort").select("id, name, chat_aktiv").eq("chat_aktiv", true).order("name");
  const geprueft = await Promise.all(
    (kohorten ?? []).map(async (k) => {
      const { data } = await supabase.rpc("fn_chat_moderiert", { p_cohort_id: k.id });
      return data === true ? { id: k.id, name: k.name } : null;
    })
  );
  return geprueft.filter((k): k is { id: string; name: string } => k !== null);
}
