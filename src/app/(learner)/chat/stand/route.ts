import { NextResponse, type NextRequest } from "next/server";

import { istKanal } from "@/lib/kohorten-chat";
import { getChatStand } from "@/lib/queries/kohorten-chat";
import { requireCurrentLearner } from "@/lib/queries/session";
import { createClient } from "@/lib/supabase/server";

// Stand des Kohorten-Chats für die angemeldete Person (SR-83): Kanäle mit
// Ungelesen-Zähler und, mit ?kanal=, die Nachrichten des Kanals. Mit
// &gelesen=1 (Kanal ist offen) wird vorher der Lesestand gesetzt, damit
// gelesene Nachrichten nicht als ungelesen zählen. Wird vom Chat-Fenster
// regelmäßig abgefragt (alle 30 Sekunden bei offenem Chat).
// Bewusst kein Logging von Inhalten oder Namen (CLAUDE.md Regel 9).

const KEIN_CACHE = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const learner = await requireCurrentLearner();
  const wert = request.nextUrl.searchParams.get("kanal");
  const kanal = istKanal(wert) ? wert : null;
  if (kanal && request.nextUrl.searchParams.get("gelesen") === "1") {
    const supabase = await createClient();
    // Fehler (z. B. Chat gerade aus) ändern nichts am Abruf; getChatStand prüft selbst.
    await supabase.rpc("fn_chat_gelesen_setzen", { p_cohort_id: learner.cohortId, p_kanal: kanal });
  }
  const stand = await getChatStand(learner, kanal);
  if (!stand) return NextResponse.json({ fehler: "Chat nicht verfügbar" }, { status: 404, headers: KEIN_CACHE });
  return NextResponse.json(stand, { headers: KEIN_CACHE });
}
