// Home, Zustand "freier Tag" (docs/design_handoff_home_v6/claude-code-aenderungen-home-freier-tag.md;
// SR-79): Rückblick auf die laufende Woche und welcher Text gilt. Gezählt
// werden die geplanten Einheiten von Montag bis gestern: Live-Termine
// besucht = Anwesenheit bestätigt (attendance), Lektionen abgeschlossen =
// unit_progress "abgeschlossen". Reine Logik ohne Datenbank und ohne Uhr;
// getestet in src/lib/home-frei.test.ts.
// Grundsatz: loben, was gut lief -- nie zeigen, was fehlt.

import type { Plantag } from "@/lib/queries/stundenplan";

// @ts-expect-error TS5097: .ts-Endung für node:test nötig (wie die Tests)
import { montagDerWoche, plusTage, wochentagLang } from "./date.ts";

/** Ab diesem Anteil erledigter Einheiten: "Starke Woche" (Zustand 1). */
export const SCHWELLE_STARK = 0.9;
/** Ab diesem Anteil: "Gute Woche" (Zustand 2); darunter Zustand 3 ohne Zahlen. */
export const SCHWELLE_GUT = 0.5;

export type WochenTag = { datum: string; kurz: string; geschafft: boolean };

export type Wochenrueckblick = {
  /** Mo–Fr mit geplanten Live-Terminen oder Selbstlern-Einheiten (Tage ohne Plan fehlen bewusst) */
  tage: WochenTag[];
  liveGesamt: number;
  liveErledigt: number;
  einheitenGesamt: number;
  einheitenErledigt: number;
};

const KURZ = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

/** Abgeschlossene Lektionen (Selbstlernen) im Rückblick. */
export const lektionenAbgeschlossen = (r: Wochenrueckblick) => r.einheitenErledigt - r.liveErledigt;

/**
 * Laufende Woche bis gestern (SR-79, Entscheidung 2026-10-13): Live-Termine
 * (erledigt = Anwesenheit bestätigt, wie im Stundenplan) und
 * Selbstlern-Einheiten (erledigt = Lektion abgeschlossen). null = in dieser
 * Woche war vor heute nichts geplant (z. B. ein freier Montag).
 */
export function wochenrueckblick(plan: Plantag[], heute: string): Wochenrueckblick | null {
  const montag = montagDerWoche(heute);
  const tage: WochenTag[] = [];
  const summe = { liveGesamt: 0, liveErledigt: 0, einheitenGesamt: 0, einheitenErledigt: 0 };
  for (let i = 0; i < 5; i++) {
    const datum = plusTage(montag, i);
    if (datum >= heute) break;
    const tag = plan.find((t) => t.datum === datum);
    if (!tag) continue;
    const einheiten = tag.theorie.flatMap((e) => {
      if (e.art === "live" && e.liveSession) return [{ live: true, erledigt: tag.anwesend.has(e.liveSession.id) }];
      if (e.art === "asynchron" && e.lessonId) return [{ live: false, erledigt: e.unitProgressStatus === "abgeschlossen" }];
      return [];
    });
    if (einheiten.length === 0) continue;
    summe.einheitenGesamt += einheiten.length;
    summe.einheitenErledigt += einheiten.filter((e) => e.erledigt).length;
    summe.liveGesamt += einheiten.filter((e) => e.live).length;
    summe.liveErledigt += einheiten.filter((e) => e.live && e.erledigt).length;
    const wochentag = new Date(`${datum}T00:00:00Z`).getUTCDay();
    tage.push({ datum, kurz: KURZ[wochentag], geschafft: einheiten.every((e) => e.erledigt) });
  }
  return tage.length > 0 ? { tage, ...summe } : null;
}

/**
 * Zählzeile der Karte (SR-79): nur, was geschafft ist -- "3 Lektionen
 * abgeschlossen · 2 Live-Termine besucht". null ohne Aktivität (dann bleibt
 * der neutrale Text allein).
 */
export function zaehlText(r: Wochenrueckblick | null): string | null {
  if (!r) return null;
  const lektionen = lektionenAbgeschlossen(r);
  const teile = [
    lektionen > 0 ? `${lektionen} ${lektionen === 1 ? "Lektion" : "Lektionen"} abgeschlossen` : null,
    r.liveErledigt > 0 ? `${r.liveErledigt} ${r.liveErledigt === 1 ? "Live-Termin" : "Live-Termine"} besucht` : null,
  ].filter(Boolean);
  return teile.length > 0 ? `Diese Woche: ${teile.join(" · ")}` : null;
}

export type FreiText = { zustand: 1 | 2 | 3 | 4; headline: string; unterzeile: string; wochenreihe: boolean };

/**
 * Text-Regeln (Abschnitt 4 der Änderungsliste), Schwellen wie im
 * Demo-Design: ab 90 % "Starke Woche", ab 50 % "Gute Woche", darunter und
 * ohne Aktivität neutral ohne Zahlen (Zustand 3). `naechsterTag` = Datum des
 * nächsten Termins; `programmGestartet` = Kohorte hat vor heute begonnen
 * (ohne Daten, aber schon gestartet: Zustand 3 statt "startet dein Programm").
 */
export function freiText(
  rueckblick: Wochenrueckblick | null,
  vorname: string,
  heute: string,
  naechsterTag: string | null,
  programmGestartet: boolean
): FreiText {
  const heuteName = wochentagLang(heute);
  const naechsterName = naechsterTag ? wochentagLang(naechsterTag) : null;

  if (!rueckblick && !programmGestartet) {
    return {
      zustand: 4,
      headline: "Schön, dass du dabei bist.",
      unterzeile: `Genieß deinen ${heuteName}${naechsterName ? ` – am ${naechsterName} startet dein Programm.` : "."}`,
      wochenreihe: false,
    };
  }

  const anteil = rueckblick ? rueckblick.einheitenErledigt / rueckblick.einheitenGesamt : 0;
  if (rueckblick && anteil >= SCHWELLE_STARK) {
    const { liveGesamt, liveErledigt } = rueckblick;
    const lob =
      liveGesamt > 0 && liveErledigt === liveGesamt
        ? liveGesamt === 1
          ? "Deinen Live-Termin geschafft."
          : `Alle ${liveGesamt} Live-Termine geschafft.`
        : "Fast alles geschafft.";
    return { zustand: 1, headline: `Starke Woche, ${vorname}.`, unterzeile: `${lob} Genieß deinen ${heuteName}.`, wochenreihe: true };
  }
  if (rueckblick && anteil >= SCHWELLE_GUT) {
    const geschafft = rueckblick.tage.filter((t) => t.geschafft).length;
    return {
      zustand: 2,
      headline: `Gute Woche, ${vorname}.`,
      unterzeile: `${geschafft} von ${rueckblick.tage.length} Tagen geschafft. Den Rest holst du ganz entspannt nach – aber erst nach dem ${heuteName}.`,
      wochenreihe: true,
    };
  }
  return {
    zustand: 3,
    headline: naechsterName ? `${naechsterName} geht’s weiter.` : "Bald geht’s weiter.",
    unterzeile: `Genieß deinen ${heuteName}. Die offenen Einheiten warten auf dich, wenn du so weit bist.`,
    wochenreihe: false,
  };
}
