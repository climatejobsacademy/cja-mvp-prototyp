// Glossar der Woche (SR-101): aus den Wortkarten der veröffentlichten
// Fachsprache-Einheiten einer Stundenplan-Woche eine alphabetische Liste, jedes
// Wort einmal. Reine Funktionen ohne Datenbank, getestet in src/lib/glossar.test.ts.

export type GlossarQuelle = { wort: string; erklaerung: string; beispiel: string };
export type GlossarEintrag = GlossarQuelle;

const ARTIKEL = /^(der|die|das)\s+/i;
const SORTIERUNG = new Intl.Collator("de", { sensitivity: "base", numeric: true });

/** Sortierschlüssel: ohne bestimmten Artikel, damit „die Diode“ unter D steht. */
export function sortierWort(wort: string): string {
  return wort.trim().replace(ARTIKEL, "");
}

/** Gleich, wenn das Wort ohne Groß-/Kleinschreibung und Leerraum gleich ist (der erste Eintrag gewinnt). */
function schluessel(wort: string): string {
  return wort.trim().replace(/\s+/g, " ").toLocaleLowerCase("de");
}

/** Alphabetisch nach Wort ohne Artikel, jedes Wort einmal, leere Wörter fallen weg. */
export function glossarAus(karten: GlossarQuelle[]): GlossarEintrag[] {
  const gesehen = new Set<string>();
  const ergebnis: GlossarEintrag[] = [];
  for (const k of karten) {
    const s = schluessel(k.wort);
    if (s === "" || gesehen.has(s)) continue;
    gesehen.add(s);
    ergebnis.push({ wort: k.wort.trim(), erklaerung: k.erklaerung.trim(), beispiel: k.beispiel.trim() });
  }
  return ergebnis.sort((a, b) => SORTIERUNG.compare(sortierWort(a.wort), sortierWort(b.wort)) || SORTIERUNG.compare(a.wort, b.wort));
}

const DATUM = /^\d{4}-\d{2}-\d{2}$/;

/** Link auf die Druckseite der Woche, in der `datum` liegt (Montag wird auf der Seite berechnet). */
export function glossarHref(datum: string): string {
  return `/fachsprache/glossar?woche=${DATUM.test(datum) ? datum : ""}`;
}

/** Gültiges Datum aus dem Parameter, sonst null. */
export function wocheParam(wert: string | string[] | undefined): string | null {
  return typeof wert === "string" && DATUM.test(wert) && !Number.isNaN(Date.parse(`${wert}T00:00:00Z`)) ? wert : null;
}
