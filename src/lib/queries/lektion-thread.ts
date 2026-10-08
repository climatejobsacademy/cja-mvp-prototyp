import { createClient } from "@/lib/supabase/server";
import { THREAD_LIMIT, beitraegeGruppieren, type ThreadBeitrag, type ThreadEintrag } from "@/lib/lektion-thread";

export type LektionThread = {
  cohortId: string;
  personId: string;
  kannSchreiben: boolean;
  istModeration: boolean;
  eintraege: ThreadEintrag[];
  mehrAlsLimit: boolean;
};

// Explizite Spaltenliste: der Spalten-Grant (0024) erlaubt kein select *.
const SPALTEN = "id, created_at, parent_id, person_id, autor_anzeigename, text, geloescht_am";

/**
 * Thread einer Lektion für die angemeldete Person (SR folgt (Fragen-Thread)).
 * Liefert null, wenn chat_aktiv aus ist oder die Person nicht lesen darf --
 * dann zeigt die Seite gar nichts an.
 *
 * Kohorte: Kandidaten sind die eigenen Einschreibungen mit Status aktiv oder
 * abgeschlossen. Zuerst die Kohorte des aktuellen Kontexts
 * (requireCurrentLearner, älteste aktive Einschreibung), danach aktive vor
 * abgeschlossenen, jeweils älteste zuerst. Gewählt wird die erste, für die
 * fn_kann_beitraege_lesen (dieselbe Funktion wie die Policy) true liefert.
 * Passen mehrere, wird nur dieser eine Thread angezeigt.
 */
export async function getLektionThread(
  lessonId: string,
  chatAktiv: boolean,
  learner: { personId: string; cohortId: string }
): Promise<LektionThread | null> {
  if (!chatAktiv) return null;

  const supabase = await createClient();

  const { data: einschreibungen } = await supabase
    .from("enrolment")
    .select("cohort_id, status, created_at")
    .eq("learner_id", learner.personId)
    .in("status", ["aktiv", "abgeschlossen"])
    .order("created_at", { ascending: true });

  const kandidaten = [...(einschreibungen ?? [])]
    .sort((a, b) => {
      const kontext = Number(b.cohort_id === learner.cohortId) - Number(a.cohort_id === learner.cohortId);
      if (kontext !== 0) return kontext;
      const status = Number(b.status === "aktiv") - Number(a.status === "aktiv");
      if (status !== 0) return status;
      return a.created_at.localeCompare(b.created_at);
    })
    .map((e) => e.cohort_id);

  let cohortId: string | null = null;
  for (const kandidat of new Set(kandidaten)) {
    const { data: darfLesen } = await supabase.rpc("fn_kann_beitraege_lesen", {
      p_lesson_id: lessonId,
      p_cohort_id: kandidat,
    });
    if (darfLesen === true) {
      cohortId = kandidat;
      break;
    }
  }
  if (!cohortId) return null;

  const [{ data: kannSchreiben }, { data: moderation }, { data: beitraege }] = await Promise.all([
    supabase.rpc("fn_kann_beitrag_schreiben", { p_lesson_id: lessonId, p_cohort_id: cohortId }),
    supabase
      .from("kohorte_moderation")
      .select("id")
      .eq("cohort_id", cohortId)
      .eq("person_id", learner.personId)
      .maybeSingle(),
    // Die neuesten THREAD_LIMIT + 1 laden: so ist erkennbar, ob es mehr gibt;
    // angezeigt werden danach die neuesten THREAD_LIMIT, chronologisch.
    supabase
      .from("lektion_beitrag")
      .select(SPALTEN)
      .eq("lesson_id", lessonId)
      .eq("cohort_id", cohortId)
      .order("created_at", { ascending: false })
      .limit(THREAD_LIMIT + 1),
  ]);

  const liste = (beitraege ?? []) as ThreadBeitrag[];
  const mehrAlsLimit = liste.length > THREAD_LIMIT;

  return {
    cohortId,
    personId: learner.personId,
    kannSchreiben: kannSchreiben === true,
    istModeration: Boolean(moderation),
    eintraege: beitraegeGruppieren(liste.slice(0, THREAD_LIMIT)),
    mehrAlsLimit,
  };
}
