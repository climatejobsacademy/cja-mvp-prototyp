// Einstiege der Fachsprache-Einheit auf Home und im Stundenplan (Etappe 2, SR-84):
// aus den Terminen eines Tages und den veröffentlichten Einheiten zu deren
// Lektionen die Einträge je Tag. Reine Funktionen ohne Next und ohne Datenbank,
// getestet in src/lib/fachsprache-einstiege.test.ts.
//
// "Tagesaktuelle Lektion" ist die Lektion eines Live-Termins des Tages: wie die
// Liste "live" auf Home (aktivitaeten) und getTagesAgenda nur Termine mit
// Live-Sitzung und Lektion (Entscheidung 2026-10-16, O2); Tage nur mit
// Selbstlernen bekommen keinen Einstieg. Nur Lesen: kein Lernstand, kein
// Ergebnis, keine competency_evidence (Regel 6).

// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { einheitenJeTag, liveLektionIds, type EinheitKurz, type TerminLektion } from "./fachsprache.ts";
// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { einheitHref, type EinheitLink } from "./fachsprache-laden.ts";

/** Theorie-Eintrag eines Tages, so viel braucht der Einstieg davon (passt zu TheorieEintrag aus queries/schedule). */
export type EinstiegTheorie = {
  art: "live" | "asynchron";
  lessonId: string | null;
  liveSession: { start: string } | null;
};

export type TagMitTerminen = { datum: string; theorie: EinstiegTheorie[] };

export type EinstiegEintrag = { einheitId: string; lessonId: string; titel: string; href: string };

/** Live-Termine mit Lektion; alles andere (Selbstlernen, Termin ohne Live-Sitzung) zählt nicht. */
export function termineAus(tage: TagMitTerminen[]): TerminLektion[] {
  return tage.flatMap((t) =>
    t.theorie.flatMap((e): TerminLektion[] =>
      e.art === "live" && e.liveSession ? [{ datum: t.datum, start: e.liveSession.start, lessonId: e.lessonId, art: "live" }] : []
    )
  );
}

/** Lektionen, zu denen nach Einheiten gefragt wird. */
export function lektionIdsFuerEinstiege(tage: TagMitTerminen[]): string[] {
  return liveLektionIds(termineAus(tage));
}

/**
 * Einträge je Tag (Datum "YYYY-MM-DD"). `links` sind die veröffentlichten
 * Einheiten je Lektion (queries/fachsprache.ts); mehrere Live-Lektionen mit
 * Einheit an einem Tag ergeben mehrere Einträge in der Reihenfolge der
 * Startzeit, dieselbe Einheit je Tag nur einmal. Tage ohne Einheit fehlen.
 */
export function einstiegeJeTag(
  tage: TagMitTerminen[],
  links: Map<string, EinheitLink>,
  von?: "stundenplan" | "home"
): Map<string, EinstiegEintrag[]> {
  const ergebnis = new Map<string, EinstiegEintrag[]>();
  if (links.size === 0) return ergebnis;
  const einheiten: EinheitKurz[] = [...links.values()].map((l) => ({
    id: l.einheitId,
    lessonId: l.lessonId,
    titel: l.titel,
    status: "veroeffentlicht",
  }));
  for (const [datum, liste] of einheitenJeTag(termineAus(tage), einheiten)) {
    ergebnis.set(
      datum,
      liste.map((e) => ({ einheitId: e.einheitId, lessonId: e.lessonId, titel: e.titel, href: einheitHref(e.einheitId, von, datum) }))
    );
  }
  return ergebnis;
}
