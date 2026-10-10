// Kompetenzseite v1 (docs/design_handoff_kompetenzen_v1, Brief 2.4, SR
// folgt): Meta-Zeile je Lernaktivität in "Hier lernst du das", z. B.
// "Live-Unterricht · heute, 13:00", "Selbstlernen · offen", "Praxis · Montag".
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

const ART: Record<AktivitaetFuerMeta["art"], string> = {
  live: "Live-Unterricht",
  selbst: "Selbstlernen",
  praxis: "Praxis",
};

export function aktivitaetMeta(a: AktivitaetFuerMeta, heute: string): string {
  const art = ART[a.art];
  if (a.erledigt) return `${art} · ${a.art === "praxis" ? "durchgeführt" : "erledigt"}`;
  if (!a.datum) return a.art === "selbst" ? `${art} · offen` : art;
  if (a.datum < heute) return a.art === "selbst" ? `${art} · offen` : `${art} · vorbei`;
  const zeit = a.start ? `, ${a.start.slice(0, 5)}` : "";
  if (a.art === "selbst" && a.datum === heute) return `${art} · heute, flexibel`;
  return `${art} · ${tagRelativ(a.datum, heute)}${zeit}`;
}
