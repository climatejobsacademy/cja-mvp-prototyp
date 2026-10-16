// Funktionsschalter je Deployment (Entscheidung 2026-10-16, docs/decisions.md).
// Nur serverseitig: ohne NEXT_PUBLIC_-Präfix kommt der Wert nicht ins
// Browser-Bundle. Ohne gesetzte Variable ist jeder Schalter aus; gesetzt wird
// er in Vercel je Umgebung (Preview/Development an, Production aus). Eine
// Änderung wirkt erst nach einem neuen Deployment. Getestet in
// src/lib/schalter.test.ts.

type Umgebung = Record<string, string | undefined>;

/**
 * Fachsprache-Einheit (Stufe 2): Seite /fachsprache/[einheitId], Chip im
 * Stundenplan, Kästchen auf Home. An nur mit FACHSPRACHE_EINHEIT=an.
 */
export function fachspracheEinheitAn(umgebung: Umgebung = process.env): boolean {
  return umgebung.FACHSPRACHE_EINHEIT?.trim().toLowerCase() === "an";
}

export const FACHSPRACHE_EINHEIT = fachspracheEinheitAn();
