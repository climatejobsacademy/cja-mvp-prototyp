// Live-Lektion (SR-15, SR-21): Termin und Einwahl-Link aus dem Plan der
// eigenen Kohorte bzw. Einschreibung statt des frühesten Termins der Lektion.
// Ohne Datenbankzugriff, damit node:test die Auswahl prüfen kann.

export type Plan = { cohortId: string; enrolmentId: string };

type Termin = { id: string; datum: string; start: string };
type PlanEintrag = { live_session_id: string | null; cohort_id: string | null; enrolment_id: string | null };

/**
 * Frühester Termin der Lektion, der im Plan der Person steht (schedule_entry
 * der aktiven Kohorte oder der eigenen Einschreibung). Steht keiner im Plan:
 * null -- dann zeigt die Lektion keinen Termin statt den einer anderen Kohorte.
 */
export function eigenerLiveTermin<T extends Termin>(termine: T[], eintraege: PlanEintrag[], plan: Plan): T | null {
  const eigene = new Set(
    eintraege
      .filter((e) => e.cohort_id === plan.cohortId || e.enrolment_id === plan.enrolmentId)
      .map((e) => e.live_session_id)
  );
  return (
    termine
      .filter((t) => eigene.has(t.id))
      .sort((a, b) => `${a.datum}${a.start}`.localeCompare(`${b.datum}${b.start}`))[0] ?? null
  );
}
