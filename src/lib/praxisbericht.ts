// Praxisberichte prüfen (SR-82, Paket G3, Entscheidungen E2-E4 vom
// 2026-10-13): was beim Freigeben oder Zurückgeben gespeichert wird und wie
// ein Bericht in Listen erscheint. Reine Logik ohne Datenbank und ohne Uhr;
// getestet in src/lib/praxisbericht.test.ts.

export type Entscheidung = "verified" | "rejected";

/** Aktuelle Entscheidung aus verification_aktuell (ohne Storno), null = noch offen. */
export type AktuellePruefung = { id: string; entscheidung: Entscheidung } | null;

export type PruefAktion =
  | { art: "neu" }
  | { art: "storno"; korrigiertId: string }
  | { art: "unveraendert" }
  | { art: "fehler"; meldung: string };

/** Mindestlänge des Kommentars bei einer Rückgabe (Pflicht nur in App und Server, keine Migration). */
export const KOMMENTAR_MIN = 3;

/**
 * Was Speichern auslöst: noch nicht geprüft -> neue verification; andere
 * Entscheidung als die aktuelle -> Storno-Eintrag (E4); gleiche Entscheidung
 * -> nichts. Zurückgeben nur mit Kommentar.
 */
export function pruefAktion(aktuell: AktuellePruefung, gewaehlt: Entscheidung, kommentar: string | null): PruefAktion {
  if (gewaehlt === "rejected" && (kommentar ?? "").trim().length < KOMMENTAR_MIN) {
    return { art: "fehler", meldung: "Bitte kurz schreiben, was noch fehlt." };
  }
  if (!aktuell) return { art: "neu" };
  if (aktuell.entscheidung === gewaehlt) return { art: "unveraendert" };
  return { art: "storno", korrigiertId: aktuell.id };
}

export type BerichtStand = "offen" | "freigegeben" | "zurueckgegeben";

export function berichtStand(aktuell: AktuellePruefung): BerichtStand {
  if (!aktuell) return "offen";
  return aktuell.entscheidung === "verified" ? "freigegeben" : "zurueckgegeben";
}

export const STAND_TEXT: Record<BerichtStand, string> = {
  offen: "offen",
  freigegeben: "freigegeben",
  zurueckgegeben: "zurückgegeben",
};

/** Liste: offene zuerst (älteste Einreichung oben), danach geprüfte (neueste oben). */
export function sortiereBerichte<T extends { stand: BerichtStand; eingereichtAm: string; geprueftAm: string | null }>(
  berichte: T[]
): T[] {
  const offen = berichte.filter((b) => b.stand === "offen").sort((a, b) => a.eingereichtAm.localeCompare(b.eingereichtAm));
  const geprueft = berichte
    .filter((b) => b.stand !== "offen")
    .sort((a, b) => (b.geprueftAm ?? "").localeCompare(a.geprueftAm ?? ""));
  return [...offen, ...geprueft];
}
