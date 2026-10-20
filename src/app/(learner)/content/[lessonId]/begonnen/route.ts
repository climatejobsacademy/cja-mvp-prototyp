import { NextResponse } from "next/server";

import { SCHON_VORHANDEN } from "@/lib/lektion-begonnen";
import { requireCurrentLearner } from "@/lib/queries/session";
import { createClient } from "@/lib/supabase/server";

const KEIN_CACHE = { "Cache-Control": "no-store" };

/**
 * Stand "begonnen" (SR-73, Datenlücke Nr. 9): legt beim ersten Öffnen einer
 * Selbstlern-Lektion unit_progress mit "in Bearbeitung" an. Nur Insert, nie
 * Update -- ein vorhandener Eintrag (auch "abgeschlossen") bleibt, wie er ist.
 * Läuft mit der Session der Person; RLS unit_progress_learner_write (0009)
 * erlaubt nur eigene Zeilen. Bewusst kein Logging (CLAUDE.md Regel 9).
 *
 * Eigener Route Handler statt Schreiben beim Rendern: ein Prefetch der
 * Lektionsseite soll nichts als begonnen markieren.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const learner = await requireCurrentLearner();
  const supabase = await createClient();

  // Nur veröffentlichte, lesbare Selbstlern-Lektionen (RLS lesson_read_published).
  const { data: lesson } = await supabase.from("lesson").select("content_type").eq("id", lessonId).maybeSingle();
  if (!lesson || lesson.content_type === "live") {
    return NextResponse.json({ neu: false }, { status: 404, headers: KEIN_CACHE });
  }

  const { error } = await supabase.from("unit_progress").insert({
    organisation_id: learner.organisationId,
    learner_id: learner.personId,
    lesson_id: lessonId,
    status: "in Bearbeitung",
  });

  if (error) {
    if (error.code === SCHON_VORHANDEN) return NextResponse.json({ neu: false }, { headers: KEIN_CACHE });
    return NextResponse.json({ neu: false }, { status: 500, headers: KEIN_CACHE });
  }
  return NextResponse.json({ neu: true }, { headers: KEIN_CACHE });
}
