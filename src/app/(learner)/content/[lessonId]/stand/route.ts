import { NextResponse, type NextRequest } from "next/server";

import type { Json } from "@/lib/database.types";
import { SCHON_VORHANDEN } from "@/lib/lektion-begonnen";
import { requireCurrentLearner } from "@/lib/queries/session";
import { createClient } from "@/lib/supabase/server";

const KEIN_CACHE = { "Cache-Control": "no-store" };
const MAX_BYTES = 16_384;

/**
 * Stand in einer Selbstlern-Lektion speichern (SR-85, Migration 0056): nach
 * jedem Schritt aus der nativen Ansicht. Schreibt nur unit_progress.stand der
 * eigenen Zeile (RLS unit_progress_learner_*, 0009); der Status bleibt, wie er
 * ist -- fehlt die Zeile noch, wird sie mit "in Bearbeitung" angelegt. Die Form
 * prüft die Ansicht beim Laden (src/lib/lernstand.ts); hier nur Größe und
 * Objekt. Bewusst kein Logging (CLAUDE.md Regel 9).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const roh = await request.text();
  if (roh.length > MAX_BYTES) return NextResponse.json({ ok: false }, { status: 413, headers: KEIN_CACHE });
  let stand: unknown;
  try {
    stand = JSON.parse(roh);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400, headers: KEIN_CACHE });
  }
  if (!stand || typeof stand !== "object" || Array.isArray(stand)) {
    return NextResponse.json({ ok: false }, { status: 400, headers: KEIN_CACHE });
  }

  const learner = await requireCurrentLearner();
  const supabase = await createClient();

  // Nur veröffentlichte, lesbare Selbstlern-Lektionen (RLS lesson_read_published).
  const { data: lesson } = await supabase.from("lesson").select("content_type").eq("id", lessonId).maybeSingle();
  if (!lesson || lesson.content_type === "live") {
    return NextResponse.json({ ok: false }, { status: 404, headers: KEIN_CACHE });
  }

  const werte = stand as Json;
  const { data: geaendert, error } = await supabase
    .from("unit_progress")
    .update({ stand: werte })
    .eq("learner_id", learner.personId)
    .eq("lesson_id", lessonId)
    .select("id");
  if (error) return NextResponse.json({ ok: false }, { status: 500, headers: KEIN_CACHE });

  if (!geaendert || geaendert.length === 0) {
    const { error: neu } = await supabase.from("unit_progress").insert({
      organisation_id: learner.organisationId,
      learner_id: learner.personId,
      lesson_id: lessonId,
      status: "in Bearbeitung",
      stand: werte,
    });
    if (neu && neu.code !== SCHON_VORHANDEN) return NextResponse.json({ ok: false }, { status: 500, headers: KEIN_CACHE });
  }
  return NextResponse.json({ ok: true }, { headers: KEIN_CACHE });
}
