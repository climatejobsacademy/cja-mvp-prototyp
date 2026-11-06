// Listen in Planen (Werkzeuge, Materialien, Arbeitsschritte) und die
// Aufteilung getippter oder diktierter Texte. Reine Funktionen, aus dem
// Prototyp auf `demo` übernommen (SR-64).

export type Eintrag = { id: string; text: string };

export function eintragHinzufuegen(liste: Eintrag[], text: string, neueId: string): Eintrag[] {
  const t = text.trim();
  if (!t) return liste;
  return [...liste, { id: neueId, text: t }];
}

export function eintragBearbeiten(liste: Eintrag[], id: string, text: string): Eintrag[] {
  const t = text.trim();
  if (!t) return liste;
  return liste.map((e) => (e.id === id ? { ...e, text: t } : e));
}

export function eintragLoeschen(liste: Eintrag[], id: string): Eintrag[] {
  return liste.filter((e) => e.id !== id);
}

export function eintragVerschieben(liste: Eintrag[], id: string, richtung: "hoch" | "runter"): Eintrag[] {
  const i = liste.findIndex((e) => e.id === id);
  const j = richtung === "hoch" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= liste.length) return liste;
  const neu = [...liste];
  [neu[i], neu[j]] = [neu[j], neu[i]];
  return neu;
}

/** Getippter Text → Texte für Listeneinträge: eine Zeile je Eintrag, leere Zeilen entfallen. */
export function zeilenZuTexten(text: string): string[] {
  return text
    .split(/\r?\n|\r/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Erkannter Diktat-Text → Texte für Listeneinträge: ein Satz je Eintrag
 * (getrennt nach . ! ? oder Zeilenumbruch), leere Teile entfallen, ein Punkt
 * am Satzende auch. Eine allein stehende Zahl ("1. Kabel abisolieren")
 * bleibt beim folgenden Satz.
 */
export function diktatZuTexten(text: string): string[] {
  const teile = text
    .split(/(?<=[.!?])\s+|[\r\n]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  const saetze: string[] = [];
  for (const t of teile) {
    const vorher = saetze[saetze.length - 1];
    if (vorher !== undefined && /^\d+\.$/.test(vorher)) saetze[saetze.length - 1] = `${vorher} ${t}`;
    else saetze.push(t);
  }
  return saetze.map((s) => s.replace(/\.+$/, "").trim()).filter((s) => s.length > 0);
}

/** Hängt diktierte Texte unten an die Liste an, je Text ein Eintrag (wie getippt). */
export function eintraegeAnhaengen(liste: Eintrag[], texte: string[], neueId: () => string): Eintrag[] {
  return texte.filter((t) => t.trim()).reduce((l, t) => eintragHinzufuegen(l, t, neueId()), liste);
}
