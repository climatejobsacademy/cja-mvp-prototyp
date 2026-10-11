// Programmseite v8 (docs/design_handoff_programm_v8, SR folgt): reine Logik
// ohne Datenbank und ohne Uhr -- Zeitraum-Texte, Gliederung, Modul-Status.
// Getestet in src/lib/programm.test.ts.

// @ts-expect-error TS5097: .ts-Endung für node:test nötig (wie die Tests)
import { montagDerWoche, plusTage } from "./date.ts";

/** "2026-09-28" → "28.09.2026" */
export function datumPunkt(datum: string): string {
  const [j, m, t] = datum.split("-");
  return `${t}.${m}.${j}`;
}

/** "28.09. – 23.10.2026", über Jahresgrenzen "14.12.2026 – 08.01.2027", ein Tag "28.09.2026". */
export function zeitraumPunkt(von: string, bis: string): string {
  if (von === bis) return datumPunkt(von);
  if (von.slice(0, 4) !== bis.slice(0, 4)) return `${datumPunkt(von)} – ${datumPunkt(bis)}`;
  return `${datumPunkt(von).slice(0, 6)} – ${datumPunkt(bis)}`;
}

/**
 * VORLÄUFIG, nur Demo (Entscheidung Anna 2026-10-11): In der Datenbank
 * steht unter "module" je eine Woche (z. B. "Woche 1 – Theorie (online),
 * 28.09.–02.10.2026"); die Ebene "Modul" (ca. 4 Wochen) darüber fehlt.
 * Bis Vera sie im Schema anlegt, kommt die Gliederung aus Annas Stundenplan
 * "EFK_EE_IHK_2026_2027" (Zeilen 19-178). Seit 2026-10-11 in Wochen ab
 * Kohortenstart statt mit festen Daten -- so passt sie für jede Kohorte,
 * auch für die Demo-Kohorte mit Start 31.08.2026 (Umsetzungsplan in Notion).
 * Wochen werden über ihr Datum zugeordnet. Vor dev ersetzen -- siehe Notion
 * "Demo (→dev): To-dos".
 */
export type GliederungsModul = { nummer: number; ueberzeile: string; name: string; von: string; bis: string };

/** Woche 1 = Woche des Kohortenstarts; letzter Tag 4 = Freitag, 5 = Samstag (Praxis-Samstage). */
type Vorlage = { nummer: number; ueberzeile: string; name: string; ersteWoche: number; letzteWoche: number; letzterTag: 4 | 5 };

const EFK_EE: Vorlage[] = [
  { nummer: 1, ueberzeile: "Modul 1", name: "Grundlagen Elektrotechnik", ersteWoche: 1, letzteWoche: 5, letzterTag: 4 },
  { nummer: 2, ueberzeile: "Modul 2", name: "Gebäudeinstallation", ersteWoche: 6, letzteWoche: 9, letzterTag: 5 },
  { nummer: 3, ueberzeile: "Modul 3", name: "Grundlagen IT-Systemtechnik", ersteWoche: 10, letzteWoche: 12, letzterTag: 5 },
  // Wochen 13-14: Weihnachtspause
  { nummer: 4, ueberzeile: "Modul 4", name: "Schaltschrankbau", ersteWoche: 15, letzteWoche: 18, letzterTag: 5 },
  { nummer: 5, ueberzeile: "Modul 5", name: "Grundlagen Erneuerbaren Energien", ersteWoche: 19, letzteWoche: 20, letzterTag: 4 },
  { nummer: 6, ueberzeile: "Abschluss", name: "Prüfungsvorbereitung", ersteWoche: 21, letzteWoche: 21, letzterTag: 4 },
];

/**
 * Gliederung für ein Programm (über den Namen erkannt) mit Zeiträumen ab
 * dem Start der Kohorte; null = keine Gliederung oder kein Start bekannt,
 * dann gelten die Module der Datenbank.
 */
export function gliederungFuer(programmName: string, kohortenStart: string | null): GliederungsModul[] | null {
  if (!kohortenStart || !/erneuerbare energien/i.test(programmName)) return null;
  const montag = montagDerWoche(kohortenStart);
  return EFK_EE.map(({ ersteWoche, letzteWoche, letzterTag, ...m }) => ({
    ...m,
    von: plusTage(montag, (ersteWoche - 1) * 7),
    bis: plusTage(montag, (letzteWoche - 1) * 7 + letzterTag),
  }));
}

/** "Woche …, 28.09.–02.10.2026" → "2026-10-02" (letztes Datum im Namen), sonst null. */
export function letztesDatumImNamen(name: string): string | null {
  const treffer = [...name.matchAll(/(\d{1,2})\.(\d{1,2})\.(\d{4})/g)].pop();
  return treffer ? `${treffer[3]}-${treffer[2].padStart(2, "0")}-${treffer[1].padStart(2, "0")}` : null;
}

/** Modul (Nummer), in dessen Zeitraum `datum` liegt; null = keins. */
export function modulFuerDatum(gliederung: GliederungsModul[], datum: string | null): number | null {
  if (!datum) return null;
  return gliederung.find((m) => m.von <= datum && datum <= m.bis)?.nummer ?? null;
}

export type ModulStatus = "abgeschlossen" | "aktuell" | "kommend";

/**
 * Nach Datum: vorbei = abgeschlossen; das erste Modul, das noch nicht
 * vorbei ist, ist das aktuelle ("Hier bist du", auch in einer Pause davor);
 * danach kommend.
 */
export function modulStatus(module: { von: string; bis: string }[], heute: string): ModulStatus[] {
  const aktuell = module.findIndex((m) => m.bis >= heute);
  return module.map((_, i) => (aktuell === -1 || i < aktuell ? "abgeschlossen" : i === aktuell ? "aktuell" : "kommend"));
}
