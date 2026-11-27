// Vokabelklick (SR-24): Fachwörter der Fachsprache-Einheiten eines Moduls im
// Text einer nativen Selbstlern-Lektion finden und markieren. Reine Funktionen
// ohne Datenbank und ohne React, getestet in src/lib/vokabeln.test.ts.
//
// - Gesucht wird das Wort ohne bestimmten Artikel („die Diode“ → „Diode“) und
//   jede hinterlegte Form (Spalte „Formen“), ohne Groß-/Kleinschreibung und nur
//   als ganzes Wort (keine Treffer mitten in einem längeren Wort).
// - Längere Begriffe gehen vor kürzeren („PE-Leiter“ vor „Leiter“).
// - Je Schritt wird jedes Fachwort nur beim ersten Vorkommen markiert; die
//   Menge `gesehen` gehört dem Aufrufer (ein Schritt = eine Menge).
// - Texte mit Formeln (KaTeX) werden nicht markiert, damit nichts zerbricht.

export type Vokabel = {
  /** stabile Kennung (z. B. Einheit + Nr), für Schlüssel und „schon markiert“ */
  id: string;
  wort: string;
  erklaerung: string;
  beispiel: string;
  bildUrl: string | null;
  bildAlt: string | null;
  formen: string[];
};

export type Abschnitt = { text: string } | { text: string; vokabelId: string };

export type Suche = { muster: RegExp | null; jeBegriff: Map<string, string> };

const ARTIKEL = /^(der|die|das)\s+/i;
const FORMEL = /\$\$|\\\(|\\\[/;

function klein(s: string): string {
  return s.toLocaleLowerCase("de");
}

function regexText(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
}

/** Begriffe, unter denen ein Wort im Text steht: Wort ohne Artikel und alle Formen. */
export function begriffe(v: Pick<Vokabel, "wort" | "formen">): string[] {
  const alle = [v.wort.trim().replace(ARTIKEL, ""), ...v.formen.map((f) => f.trim().replace(ARTIKEL, ""))];
  return [...new Set(alle.filter((b) => b.length >= 2))];
}

/**
 * Suchmuster für alle Vokabeln. Kommt derselbe Begriff bei mehreren Vokabeln
 * vor, gilt die erste. Ohne Begriffe ist das Muster null.
 */
export function sucheAus(vokabeln: Vokabel[]): Suche {
  const jeBegriff = new Map<string, string>();
  for (const v of vokabeln) for (const b of begriffe(v)) if (!jeBegriff.has(klein(b))) jeBegriff.set(klein(b), v.id);
  const sortiert = [...jeBegriff.keys()].sort((a, b) => b.length - a.length);
  if (sortiert.length === 0) return { muster: null, jeBegriff };
  const muster = new RegExp(`(?<![\\p{L}\\p{N}])(${sortiert.map(regexText).join("|")})(?![\\p{L}\\p{N}])`, "giu");
  return { muster, jeBegriff };
}

/**
 * Text in Abschnitte teilen: Fachwörter, die in diesem Schritt noch nicht
 * markiert sind, werden eigene Abschnitte mit `vokabelId`; `gesehen` wird
 * dabei ergänzt. Texte mit Formeln bleiben unverändert.
 */
export function markieren(text: string, suche: Suche, gesehen: Set<string>): Abschnitt[] {
  if (!suche.muster || text === "" || FORMEL.test(text)) return [{ text }];
  const abschnitte: Abschnitt[] = [];
  let rest = 0;
  for (const treffer of text.matchAll(suche.muster)) {
    const id = suche.jeBegriff.get(klein(treffer[0]).replace(/\s+/g, " "));
    if (!id || gesehen.has(id)) continue;
    gesehen.add(id);
    const start = treffer.index ?? 0;
    if (start > rest) abschnitte.push({ text: text.slice(rest, start) });
    abschnitte.push({ text: treffer[0], vokabelId: id });
    rest = start + treffer[0].length;
  }
  if (abschnitte.length === 0) return [{ text }];
  if (rest < text.length) abschnitte.push({ text: text.slice(rest) });
  return abschnitte;
}

/** Knoten eines Lektionstexts (wie TextKnoten in src/lib/lernkurs.ts). */
type Knoten<T extends string> = string | { tag: T; kinder: Knoten<T>[] };

/** Markierter Textbaum: Textstellen sind in Abschnitte geteilt. */
export type MarkKnoten<T extends string> = { abschnitte: Abschnitt[] } | { tag: T; kinder: MarkKnoten<T>[] };

/** Ganzen Textbaum in Lesereihenfolge markieren; `gesehen` gilt für den Schritt. */
export function knotenMarkieren<T extends string>(knoten: Knoten<T>[], suche: Suche, gesehen: Set<string>): MarkKnoten<T>[] {
  return knoten.map((k) =>
    typeof k === "string" ? { abschnitte: markieren(k, suche, gesehen) } : { tag: k.tag, kinder: knotenMarkieren(k.kinder, suche, gesehen) }
  );
}
