// Stand in einer Selbstlern-Lektion (SR-85, Wunsch Anna 2026-10-20): wo die
// Person aufgehört hat. Liegt sofort auf dem Gerät (localStorage) und wird
// zusätzlich in unit_progress.stand gespeichert (Migration 0056), damit es
// auf jedem Gerät weitergeht. Beim Öffnen gilt der neuere Stand. Kein
// Nachweis: Kompetenzen zählen nur über "abgeschlossen" (Regel 6).
//
// Ohne Server- und Browser-Import, damit node:test die Regeln prüfen kann.

export type LernStand = {
  kap: number;
  schritt: number;
  /** Indizes abgeschlossener Kapitel */
  geschafft: number[];
  /** IDs richtig beantworteter Fragen */
  geloest: string[];
  /** Zeitpunkt der Änderung, Berlin "JJJJ-MM-TTTHH:MM:SS" (lexikografisch vergleichbar) */
  zeit: string;
};

/** Aufbau des Kurses, soweit der Stand ihn braucht: Schritte je Kapitel. */
export type KursForm = number[];

const ZEIT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
const MAX_IDS = 500;

/**
 * Prüft einen gespeicherten Stand gegen den Kurs. Unbekanntes, Kaputtes oder
 * nicht mehr Passendes (Kurs geändert) ergibt null -- dann beginnt die Lektion
 * vorn. Steht der Stand am Ende eines abgeschlossenen Kapitels, geht es mit
 * dem nächsten Kapitel weiter.
 */
export function standPruefen(roh: unknown, kurs: KursForm): LernStand | null {
  if (!roh || typeof roh !== "object" || Array.isArray(roh)) return null;
  const s = roh as Record<string, unknown>;
  const kap = s.kap;
  const schritt = s.schritt;
  if (!Number.isInteger(kap) || !Number.isInteger(schritt) || typeof s.zeit !== "string" || !ZEIT.test(s.zeit)) return null;
  if (!Array.isArray(s.geschafft) || !Array.isArray(s.geloest)) return null;
  const k = kap as number;
  const sch = schritt as number;
  if (k < 0 || k >= kurs.length || sch < 0 || sch >= kurs[k]) return null;
  const geschafft = s.geschafft.filter((i): i is number => Number.isInteger(i) && (i as number) >= 0 && (i as number) < kurs.length);
  const geloest = s.geloest.filter((i): i is string => typeof i === "string" && i.length <= 200).slice(0, MAX_IDS);
  const stand: LernStand = { kap: k, schritt: sch, geschafft: [...new Set(geschafft)], geloest: [...new Set(geloest)], zeit: s.zeit };
  // Kapitel fertig, aber nicht das letzte: beim nächsten Kapitel weitermachen.
  if (stand.geschafft.includes(k) && k < kurs.length - 1 && sch === kurs[k] - 1) return { ...stand, kap: k + 1, schritt: 0 };
  return stand;
}

/** Der neuere von zwei Ständen (null zählt als älter). */
export function neuererStand(a: LernStand | null, b: LernStand | null): LernStand | null {
  if (!a) return b;
  if (!b) return a;
  return b.zeit > a.zeit ? b : a;
}

/** Schlüssel im localStorage; nur die Lektion, keine Personendaten. */
export function standSchluessel(lessonId: string): string {
  return `cja-lernstand:${lessonId}`;
}
