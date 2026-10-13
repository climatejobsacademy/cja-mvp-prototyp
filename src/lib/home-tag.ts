// Home (docs/design_handoff_home_v6, Brief Abschnitt 3; SR-73): welcher
// Tageszustand A-F gilt. Reine Funktion ohne Datenbank und ohne Uhr, damit
// sie mit beliebigem "jetzt" testbar ist (src/lib/home-tag.test.ts).
// "jetzt" kommt aus jetztInBerlin() bzw. dem Test-Parameter ?now
// (parseNowParameter in src/lib/stundenplan.ts, nie auf Production).

export type LiveAktivitaet = {
  id: string;
  /** Lektionstitel ohne Klammer (lektionTitel, 0029) */
  titel: string;
  /** Thema der Lektion (lesson.thema), sonst null */
  thema: string | null;
  /** "HH:MM:SS", Berliner Ortszeit */
  start: string;
  ende: string;
  joinLink: string | null;
  lessonId: string | null;
  /** live_session.trainer_id (SR-78), sonst null */
  trainerId: string | null;
};

export type FlexAktivitaet = {
  id: string;
  titel: string;
  thema: string | null;
  lessonId: string;
  erledigt: boolean;
  /** Status "in Bearbeitung" (beim ersten Öffnen gesetzt, 0029/Nr. 9): "Weiterlernen" statt "Starten" */
  begonnen: boolean;
  /** Gehört zu einer Live-Lektion (lesson.live_lektion_id, 0029/Nr. 8): "Wissen festigen" */
  festigt: boolean;
};

export type PraxisAktivitaet = {
  id: string;
  fieldJobId: string;
  titel: string;
  standort: string | null;
  /** Uhrzeit des Praxistags (field_job.start/ende, 0026); beide null = ganztägig */
  start: string | null;
  ende: string | null;
  durchgefuehrt: boolean;
  /** field_job.instructor_id (SR-78), sonst null */
  trainerId: string | null;
};

/** Offene Selbstlern-Lektion von einem früheren Tag (getNachholLektion). */
export type NachholLektion = {
  lessonId: string;
  titel: string;
  begonnen: boolean;
  /** Geplanter Tag "JJJJ-MM-TT" */
  datum: string;
};

export type TagesAktivitaeten = {
  /** "JJJJ-MM-TT" */
  datum: string;
  live: LiveAktivitaet[];
  flex: FlexAktivitaet[];
  praxis: PraxisAktivitaet[];
  /** Zuletzt geplante, noch offene Selbstlern-Lektion vor heute */
  nachholen?: NachholLektion | null;
};

export type ErledigtEintrag =
  | { typ: "live"; titel: string; start: string; lessonId: string | null }
  | { typ: "flex"; titel: string; lessonId: string }
  | { typ: "praxis"; titel: string };

export type Tageszustand =
  /** A – Live-Session steht heute noch bevor */
  | { zustand: "A"; live: LiveAktivitaet; danach: FlexAktivitaet | null }
  /** B – Live-Session läuft gerade */
  | { zustand: "B"; live: LiveAktivitaet; danach: FlexAktivitaet | null }
  /** C – kein Live-Termin mehr, Selbstlernen offen */
  | { zustand: "C"; fokus: FlexAktivitaet; erledigt: ErledigtEintrag[] }
  /** D – alles von heute erledigt */
  | { zustand: "D"; erledigt: ErledigtEintrag[] }
  /** E – Praxistag; `nachholen` nur, wenn heute nichts Flexibles offen ist */
  | { zustand: "E"; praxis: PraxisAktivitaet; danach: FlexAktivitaet | null; nachholen: NachholLektion | null }
  /** F – heute nichts geplant; ggf. offene Lektion von früher zum Weiterlernen */
  | { zustand: "F"; nachholen: NachholLektion | null };

/**
 * Regeln (Brief 3):
 * - Ein offener Praxistag hat Vorrang (E), er ist der Einstieg in den Praxis-Workflow.
 * - Solange eine Live-Session läuft (B) oder bevorsteht (A), ist sie die
 *   Hauptaktion -- nie eine offene Selbstlernlektion.
 * - Danach wird die offene Selbstlernlektion zum Fokus (C).
 * - Gab es heute etwas und ist alles erledigt: D. Gab es nichts: F.
 * - Offenes von früheren Tagen erscheint nur in E (als zweite Karte, wenn
 *   heute nichts Flexibles offen ist) und F -- nie in A/B, und nicht in D,
 *   damit "Alles erledigt" ein Erfolgsmoment bleibt.
 * Eine Live-Session gilt allein über die Uhrzeit als erledigt (ende <= jetzt).
 */
export function getDayState(jetzt: string, tag: TagesAktivitaeten): Tageszustand {
  const zeit = (hhmmss: string) => `${tag.datum}T${hhmmss}`;
  const live = [...tag.live].sort((a, b) => a.start.localeCompare(b.start));
  const ersteOffeneFlex = tag.flex.find((f) => !f.erledigt) ?? null;

  const praxisOffen = tag.praxis.find((p) => !p.durchgefuehrt);
  const nachholen = tag.nachholen ?? null;
  if (praxisOffen) {
    return { zustand: "E", praxis: praxisOffen, danach: ersteOffeneFlex, nachholen: ersteOffeneFlex ? null : nachholen };
  }

  const laufend = live.find((l) => zeit(l.start) <= jetzt && jetzt < zeit(l.ende));
  if (laufend) return { zustand: "B", live: laufend, danach: ersteOffeneFlex };

  const kommend = live.find((l) => zeit(l.start) > jetzt);
  if (kommend) return { zustand: "A", live: kommend, danach: ersteOffeneFlex };

  const erledigt: ErledigtEintrag[] = [
    ...live.map((l) => ({ typ: "live" as const, titel: l.titel, start: l.start, lessonId: l.lessonId })),
    ...tag.flex.filter((f) => f.erledigt).map((f) => ({ typ: "flex" as const, titel: f.titel, lessonId: f.lessonId })),
    ...tag.praxis.map((p) => ({ typ: "praxis" as const, titel: p.titel })),
  ];

  if (ersteOffeneFlex) return { zustand: "C", fokus: ersteOffeneFlex, erledigt };
  if (erledigt.length > 0) return { zustand: "D", erledigt };
  return { zustand: "F", nachholen };
}
