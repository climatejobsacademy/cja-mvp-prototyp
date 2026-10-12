// Kompetenzseite v1 (docs/design_handoff_kompetenzen_v1, Brief 2.4, SR
// folgt): Meta-Zeile je Lernaktivität in "Hier lernst du das", z. B.
// "heute, 13:00", "offen", "Montag" -- die Art zeigt das Symbol davor.
// Reine Funktion, `heute` kommt aus heuteInBerlin() (src/lib/date.ts).

// @ts-expect-error TS5097: .ts-Endung für node:test nötig (wie die Tests)
import { tagRelativ } from "./date.ts";

export type AktivitaetFuerMeta = {
  art: "live" | "selbst" | "praxis";
  /** "JJJJ-MM-TT" oder null, wenn nicht im eigenen Plan */
  datum: string | null;
  /** "HH:MM:SS" bei Live-Terminen */
  start: string | null;
  erledigt: boolean;
};

/** Art als Text -- nur noch für Screenreader, sichtbar zeigt sie das Symbol. */
export const AKTIVITAET_ART: Record<AktivitaetFuerMeta["art"], string> = {
  live: "Live-Unterricht",
  selbst: "Selbstlernen",
  praxis: "Praxis",
};

/**
 * Wann bzw. welcher Stand, ohne die Art (Entscheidung Anna 2026-10-12: das
 * Symbol zeigt sie schon). Leer, wenn es nichts zu sagen gibt.
 */
export function aktivitaetMeta(a: AktivitaetFuerMeta, heute: string): string {
  if (a.erledigt) return a.art === "praxis" ? "durchgeführt" : "erledigt";
  if (!a.datum) return a.art === "selbst" ? "offen" : "";
  if (a.datum < heute) return a.art === "selbst" ? "offen" : "vorbei";
  const zeit = a.start ? `, ${a.start.slice(0, 5)}` : "";
  if (a.art === "selbst" && a.datum === heute) return "heute, flexibel";
  return `${tagRelativ(a.datum, heute)}${zeit}`;
}
