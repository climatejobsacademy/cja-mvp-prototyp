import { NextResponse } from "next/server";

import { requireCurrentLearner } from "@/lib/queries/session";
import { createClient } from "@/lib/supabase/server";

const KEIN_CACHE = { "Cache-Control": "no-store" };

/**
 * Ereignisse aus dem Praxisflow melden (SR-92): Schritt geöffnet/beendet,
 * Hilfe oder Vorschau geöffnet. Prüfung von Art, Schritt-Kennung, Eigentum
 * und Anzahl in fn_praxis_ereignis_melden (0064). Läuft mit der Session der
 * Person. Bewusst kein Logging (CLAUDE.md Regel 9); ein Fehler hier stört
 * den Praxisflow nicht.
 */
export async function POST(request: Request, { params }: { params: Promise<{ fieldJobId: string }> }) {
  const { fieldJobId } = await params;
  await requireCurrentLearner();
  let ereignisse: unknown;
  try {
    ereignisse = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400, headers: KEIN_CACHE });
  }
  if (!Array.isArray(ereignisse) || ereignisse.length === 0) {
    return NextResponse.json({ ok: false }, { status: 400, headers: KEIN_CACHE });
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("fn_praxis_ereignis_melden", { p_job: fieldJobId, p_ereignisse: ereignisse });
  if (error) return NextResponse.json({ ok: false }, { status: 400, headers: KEIN_CACHE });
  return NextResponse.json({ ok: true }, { headers: KEIN_CACHE });
}
