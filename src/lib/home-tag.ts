// Home v6 (docs/design_handoff_home_v6, Brief Abschnitt 3, SR folgt):
// welcher Tageszustand A-F gilt. Reine Funktion ohne Datenbank und ohne
// Uhr, damit sie mit beliebigem "jetzt" testbar ist (src/lib/home-tag.test.ts).
// "jetzt" kommt aus jetztInBerlin() bzw. dem Test-Parameter ?now.

export type LiveAktivitaet = {
  id: string;
  titel: string;
  /** "HH:MM:SS", Berliner Ortszeit */
  start: string;
  ende: string;
  joinLink: string | null;
  lessonId: string | null;
};

export type FlexAktivitaet = {
  id: string;
  titel: string;
  lessonId: string;
  erledigt: boolean;
};

export type PraxisAktivitaet = {
  id: string;
  fieldJobId: string;
  titel: string;
  standort: string | null;
  durchgefuehrt: boolean;
};

export type TagesAktivitaeten = {
  /** "JJJJ-MM-TT" */
  datum: string;
  live: LiveAktivitaet[];
  flex: FlexAktivitaet[];
  praxis: PraxisAktivitaet[];
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
  /** E – Praxistag */
  | { zustand: "E"; praxis: PraxisAktivitaet; danach: FlexAktivitaet | null }
  /** F – heute nichts geplant */
  | { zustand: "F" };

/**
 * Regeln (Brief 3):
 * - Ein offener Praxistag hat Vorrang (E), er ist der Einstieg in den Praxis-Workflow.
 * - Solange eine Live-Session läuft (B) oder bevorsteht (A), ist sie die
 *   Hauptaktion -- nie eine offene Selbstlernlektion.
 * - Danach wird die offene Selbstlernlektion zum Fokus (C).
 * - Gab es heute etwas und ist alles erledigt: D. Gab es nichts: F.
 * Eine Live-Session gilt allein über die Uhrzeit als erledigt (ende <= jetzt).
 */
export function getDayState(jetzt: string, tag: TagesAktivitaeten): Tageszustand {
  const zeit = (hhmmss: string) => `${tag.datum}T${hhmmss}`;
  const live = [...tag.live].sort((a, b) => a.start.localeCompare(b.start));
  const ersteOffeneFlex = tag.flex.find((f) => !f.erledigt) ?? null;

  const praxisOffen = tag.praxis.find((p) => !p.durchgefuehrt);
  if (praxisOffen) return { zustand: "E", praxis: praxisOffen, danach: ersteOffeneFlex };

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
  return { zustand: "F" };
}

const NOW_FORMAT = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Test-Parameter ?now=2026-10-09T13:05 (Brief 8.2) in "JJJJ-MM-TTTHH:MM:SS".
 * Ungültige Werte ergeben null, dann gilt die echte Berliner Zeit.
 */
export function parseNowParameter(wert: string | undefined): string | null {
  const m = wert ? NOW_FORMAT.exec(wert) : null;
  if (!m) return null;
  const [, datum, h, min, s = "00"] = m;
  if (Number(h) > 23 || Number(min) > 59 || Number(s) > 59) return null;
  return `${datum}T${h}:${min}:${s}`;
}
