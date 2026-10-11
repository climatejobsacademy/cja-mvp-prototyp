// Live-Lektion aus Sicht der eigenen Kohorte (Anna 2026-10-11, SR folgt):
// Termin und Einwahl-Link der eigenen Kohorte statt des frühesten Termins
// der Lektion, dazu die Selbstlern-Lektion "Wissen festigen" desselben Tages.

import { createClient } from "@/lib/supabase/server";
import { gleicherTitel } from "@/lib/stundenplan";
import type { CurrentLearner } from "@/lib/queries/session";

export type LiveKontext = {
  termin: { datum: string; start: string; ende: string; joinLink: string | null };
  /** Selbstlern-Lektion mit gleichem Titel am selben Tag, sonst null */
  festigenLessonId: string | null;
};

/**
 * Termin der Live-Lektion im Plan der Person (Kohorte oder eigene
 * Einschreibung). Null, wenn die Lektion dort nicht als Live-Termin steht --
 * dann bleibt die Seite beim Termin aus getLessonDetail.
 */
export async function getLiveKontext(
  lessonId: string,
  lessonName: string,
  learner: Pick<CurrentLearner, "cohortId" | "enrolmentId">
): Promise<LiveKontext | null> {
  const supabase = await createClient();
  const imPlan = `cohort_id.eq.${learner.cohortId},enrolment_id.eq.${learner.enrolmentId}`;

  const { data: sessions } = await supabase
    .from("live_session")
    .select("id, datum, start, ende, join_link")
    .eq("lesson_id", lessonId);
  if (!sessions || sessions.length === 0) return null;

  const { data: eintraege } = await supabase
    .from("schedule_entry")
    .select("live_session_id")
    .eq("art", "live")
    .in(
      "live_session_id",
      sessions.map((s) => s.id)
    )
    .or(imPlan);
  const eigene = new Set((eintraege ?? []).map((e) => e.live_session_id));
  const session = sessions
    .filter((s) => eigene.has(s.id))
    .sort((a, b) => `${a.datum}${a.start}`.localeCompare(`${b.datum}${b.start}`))[0];
  if (!session) return null;

  const { data: selbstlernen } = await supabase
    .from("schedule_entry")
    .select("lesson_id")
    .eq("art", "asynchron")
    .eq("datum", session.datum)
    .not("lesson_id", "is", null)
    .or(imPlan);
  const ids = (selbstlernen ?? []).map((e) => e.lesson_id).filter((id): id is string => !!id);

  let festigenLessonId: string | null = null;
  if (ids.length > 0) {
    const { data: lektionen } = await supabase.from("lesson").select("id, name").in("id", ids);
    festigenLessonId = (lektionen ?? []).find((l) => gleicherTitel(l.name, lessonName))?.id ?? null;
  }

  return {
    termin: { datum: session.datum, start: session.start, ende: session.ende, joinLink: session.join_link },
    festigenLessonId,
  };
}
