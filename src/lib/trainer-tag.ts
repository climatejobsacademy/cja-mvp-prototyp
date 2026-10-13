// Bereich für Trainer:innen (SR-81, Paket G2, Entscheidungen E1-E4 vom
// 2026-10-13): Rollen-Gate, Tageswahl, Zustand eines Termins und was beim
// Speichern einer Anwesenheit passiert. Reine Logik ohne Datenbank und ohne
// Uhr; getestet in src/lib/trainer-tag.test.ts.

export type Zugang = { erlaubt: true } | { erlaubt: false; ziel: string };

/**
 * /trainer nur für Personen mit Rolle trainer und ohne aktive Einschreibung.
 * Lernende (auch mit zusätzlicher Rolle trainer) bleiben in ihrem Bereich.
 */
export function trainerZugang(p: { istTrainer: boolean; hatAktiveEinschreibung: boolean }): Zugang {
  if (p.hatAktiveEinschreibung) return { erlaubt: false, ziel: "/home" };
  if (!p.istTrainer) return { erlaubt: false, ziel: "/login?error=keine-einschreibung" };
  return { erlaubt: true };
}

/** Ziel für eine angemeldete Person ohne aktive Einschreibung (Lernenden-Bereich). */
export function zielOhneEinschreibung(istTrainer: boolean): string {
  return istTrainer ? "/trainer" : "/login?error=keine-einschreibung";
}

/** "?datum=2026-11-03" -> "2026-11-03"; ungültig oder leer -> heute. */
export function datumAusParameter(wert: string | undefined, heute: string): string {
  if (!wert || !/^\d{4}-\d{2}-\d{2}$/.test(wert)) return heute;
  const d = new Date(`${wert}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== wert ? heute : wert;
}

export type TerminZustand = "vorbei" | "jetzt" | "spaeter";

/**
 * Zustand eines Termins am Tag `datum` relativ zu `jetzt` ("JJJJ-MM-TTTHH:MM:SS",
 * Berliner Zeit). Ohne Uhrzeit (ganztägiger Praxistag) zählt der ganze Tag.
 */
export function terminZustand(jetzt: string, datum: string, start: string | null, ende: string | null): TerminZustand {
  const von = `${datum}T${start ?? "00:00:00"}`;
  const bis = `${datum}T${ende ?? "23:59:59"}`;
  if (jetzt >= bis) return "vorbei";
  if (jetzt >= von) return "jetzt";
  return "spaeter";
}

export type AnwesenheitStatus = "anwesend" | "nicht anwesend";

/** Aktuelle Zeile aus attendance_aktuell (ohne Storno), null = noch nicht bestätigt. */
export type AktuelleAnwesenheit = { id: string; status: AnwesenheitStatus } | null;

export type AnwesenheitAktion =
  | { art: "neu" }
  | { art: "storno"; korrigiertId: string }
  | { art: "unveraendert" };

/**
 * Was Speichern auslöst (E4): noch nichts bestätigt -> neue Zeile; anderer
 * Status als bestätigt -> Storno-Eintrag auf die aktuelle Zeile (die App fragt
 * vorher nach); gleicher Status -> nichts.
 */
export function anwesenheitAktion(aktuell: AktuelleAnwesenheit, gewaehlt: AnwesenheitStatus): AnwesenheitAktion {
  if (!aktuell) return { art: "neu" };
  if (aktuell.status === gewaehlt) return { art: "unveraendert" };
  return { art: "storno", korrigiertId: aktuell.id };
}

/** "3 von 5 bestätigt" -- Zählung für die Kopfzeile eines Termins. */
export function bestaetigtZaehlen(stand: AktuelleAnwesenheit[]): { bestaetigt: number; gesamt: number } {
  return { bestaetigt: stand.filter(Boolean).length, gesamt: stand.length };
}
