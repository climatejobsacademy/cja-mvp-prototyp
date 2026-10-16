import { NextResponse, type NextRequest } from "next/server";

import { istKanal } from "@/lib/kohorten-chat";
import { getChatStand } from "@/lib/queries/kohorten-chat";
import { requireCurrentTrainer } from "@/lib/queries/trainer-bereich";
import { createClient } from "@/lib/supabase/server";

// Stand des Kohorten-Chats für Trainer:innen (SR-83, PR 3): wie /chat/stand,
// aber die Kohorte kommt aus ?kohorte= -- die Datenbank prüft, ob die Person
// sie moderiert (fn_chat_moderiert: Termin in der Kohorte, kohorte_moderation,
// AfCJ admin). Bewusst kein Logging von Inhalten oder Namen (Regel 9).

const KEIN_CACHE = { "Cache-Control": "no-store" };
const UUID = /^[0-9a-f-]{36}$/i;

export async function GET(request: NextRequest) {
  const trainer = await requireCurrentTrainer();
  const kohorte = request.nextUrl.searchParams.get("kohorte") ?? "";
  if (!UUID.test(kohorte)) return NextResponse.json({ fehler: "Kohorte fehlt" }, { status: 400, headers: KEIN_CACHE });

  const supabase = await createClient();
  const { data: moderiert } = await supabase.rpc("fn_chat_moderiert", { p_cohort_id: kohorte });
  if (moderiert !== true) return NextResponse.json({ fehler: "Chat nicht verfügbar" }, { status: 404, headers: KEIN_CACHE });

  const wert = request.nextUrl.searchParams.get("kanal");
  const kanal = istKanal(wert) ? wert : null;
  if (kanal && request.nextUrl.searchParams.get("gelesen") === "1") {
    await supabase.rpc("fn_chat_gelesen_setzen", { p_cohort_id: kohorte, p_kanal: kanal });
  }
  const stand = await getChatStand({ personId: trainer.personId, cohortId: kohorte }, kanal);
  if (!stand) return NextResponse.json({ fehler: "Chat nicht verfügbar" }, { status: 404, headers: KEIN_CACHE });
  return NextResponse.json(stand, { headers: KEIN_CACHE });
}
