// Lektionstitel und Thema (SR-13, Datenlücke Nr. 4, Entscheidung 2026-10-13).
// Seit 0029 steht das Thema in lesson.thema. Bis das Datenskript
// scripts/sql/lektion_klammer_entfernen.sql gelaufen ist, enthält lesson.name
// die Klammer noch -- dann zeigt die App den Titel ohne die erste Klammer.
// Gleiche Regel wie im Backfill von 0029 und im Datenskript.

export type LektionTitel = { titel: string; thema: string | null };

const ERSTE_KLAMMER = /\s*\(([^()]+)\)\s*/;

export function lektionTitel(name: string, thema: string | null | undefined): LektionTitel {
  const roh = name.trim();
  const t = thema?.trim() || null;
  if (!t) return { titel: roh, thema: null };
  const ohne = roh.replace(ERSTE_KLAMMER, " ").replace(/\s+/g, " ").trim();
  return { titel: ohne || roh, thema: t };
}
