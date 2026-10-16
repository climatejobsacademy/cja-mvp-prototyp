import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Erledigte Lektionen einer Person (SR-63, ergänzt 2026-10-16, Migration 0051):
 * abgeschlossen (unit_progress) oder -- bei Live-Lektionen -- bestätigte
 * Anwesenheit an einem Termin der Lektion (aktueller Wert ohne spätere
 * Korrektur, attendance_aktuell). Gleiche Regel wie competency_fulfilment.
 */
export async function erledigteLektionIds(supabase: Client, learnerId: string, lessonIds?: string[]): Promise<Set<string>> {
  if (lessonIds && lessonIds.length === 0) return new Set();

  let fortschritt = supabase.from("unit_progress").select("lesson_id").eq("learner_id", learnerId).eq("status", "abgeschlossen");
  if (lessonIds) fortschritt = fortschritt.in("lesson_id", lessonIds);

  const [{ data: abgeschlossen }, { data: anwesend }] = await Promise.all([
    fortschritt,
    supabase.from("attendance_aktuell").select("live_session_id").eq("learner_id", learnerId).eq("status", "anwesend"),
  ]);

  const erledigt = new Set((abgeschlossen ?? []).map((u) => u.lesson_id));
  const sessionIds = [...new Set((anwesend ?? []).map((a) => a.live_session_id))];
  if (sessionIds.length > 0) {
    const { data: termine } = await supabase.from("live_session").select("lesson_id").in("id", sessionIds);
    for (const t of termine ?? []) {
      if (t.lesson_id && (!lessonIds || lessonIds.includes(t.lesson_id))) erledigt.add(t.lesson_id);
    }
  }
  return erledigt;
}
