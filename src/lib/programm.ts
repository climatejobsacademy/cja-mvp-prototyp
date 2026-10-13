// Modul-Ebene für Home, Programm und Kompetenzen (Migration 0028, SR-14,
// SR-73): reine Logik ohne Datenbank und ohne Uhr -- Zeitraum-Texte und
// Modul-Status. Getestet in src/lib/programm.test.ts.
//
// Zeiträume kommen aus dem Stundenplan der Kohorte (fn_modul_zeitraum),
// nicht aus einer festen Gliederung ab Kohortenstart (Entscheidung
// 2026-10-13). Ein Modul ohne Termine hat keinen Zeitraum und gilt als
// "noch nicht geplant".

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

export type ModulStatus = "abgeschlossen" | "aktuell" | "kommend";

/** Zeitraum eines Moduls im eigenen Stundenplan; beide null = noch nicht geplant. */
export type ModulZeitraum = { von: string | null; bis: string | null };

/**
 * Status je Modul (Eingabe in Programm-Reihenfolge):
 * - aktuell ist das erste geplante Modul, das noch nicht vorbei ist ("Hier
 *   bist du", auch in einer Pause davor);
 * - geplante Module davor sind abgeschlossen, alle danach kommend;
 * - ungeplante Module (ohne Termine) sind nie abgeschlossen oder aktuell,
 *   sondern kommend -- die Seite zeigt "noch nicht geplant".
 * Sind alle geplanten Module vorbei, gibt es kein aktuelles.
 */
export function modulStatus(module: ModulZeitraum[], heute: string): ModulStatus[] {
  const aktuell = aktuellerModulIndex(module, heute);
  return module.map((m, i) => {
    if (i === aktuell) return "aktuell";
    if (!m.bis) return "kommend";
    return aktuell === -1 || i < aktuell ? "abgeschlossen" : "kommend";
  });
}

/** Index des aktuellen Moduls, -1 = keins (nichts geplant oder alles vorbei). */
export function aktuellerModulIndex(module: ModulZeitraum[], heute: string): number {
  return module.findIndex((m) => m.bis !== null && m.bis >= heute);
}

/**
 * Kompetenzseite, Modul-Reiter (Brief 2.2): welches Modul gewählt ist --
 * das aus der Adresse; kommt man nur mit ?kompetenz=… (Link von Home), das
 * aktuelle Modul, wenn die Kompetenz dazugehört, sonst das erste Modul mit
 * ihr; sonst das aktuelle bzw. erste Modul. null ohne Module.
 */
export function waehleModul<T extends { id: string; kompetenzIds: Set<string> }>(
  module: T[],
  aktuellId: string | null,
  modulParam: string | undefined,
  kompetenzParam: string | undefined
): T | null {
  const aktuell = module.find((m) => m.id === aktuellId);
  const ausAdresse = module.find((m) => m.id === modulParam);
  if (ausAdresse) return ausAdresse;
  if (kompetenzParam) {
    if (aktuell?.kompetenzIds.has(kompetenzParam)) return aktuell;
    const mitKompetenz = module.find((m) => m.kompetenzIds.has(kompetenzParam));
    if (mitKompetenz) return mitKompetenz;
  }
  return aktuell ?? module[0] ?? null;
}
