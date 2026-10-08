// Hilfsfunktionen für den Fragen-Thread pro Lektion (lektion_beitrag,
// Migration 0024; SR-74). Ohne Server-Import, damit sie in
// Server- und Client-Komponenten sowie in node:test nutzbar sind.

export const MAX_ZEICHEN = 1000;

/** Höchstens so viele Beiträge je Thread laden. */
export const THREAD_LIMIT = 300;

/**
 * Zeichen so zählen wie Postgres `char_length` in einer UTF8-Datenbank:
 * Unicode-Codepoints. `text.length` (UTF-16) zählt Smileys doppelt, eine
 * Zählung nach sichtbaren Zeichen (Grapheme) zu wenig: 👨‍👩‍👧 sind für
 * Postgres 5 Zeichen, 🇩🇪 und 👍🏽 je 2.
 */
export function zeichenAnzahl(text: string): number {
  return Array.from(text).length;
}

/** NFC (ä als ein Zeichen statt a + Trema) und ohne Leerraum am Rand. */
export function beitragNormalisieren(text: string): string {
  return text.normalize("NFC").trim();
}

export type BeitragPruefung =
  | { ok: true; text: string }
  | { ok: false; fehler: "leer" | "zu_lang" };

/** Prüft einen Beitrag so, wie die Datenbank ihn annimmt (1 bis 1000 Zeichen). */
export function beitragPruefen(eingabe: string): BeitragPruefung {
  const text = beitragNormalisieren(eingabe);
  const anzahl = zeichenAnzahl(text);
  if (anzahl === 0) return { ok: false, fehler: "leer" };
  if (anzahl > MAX_ZEICHEN) return { ok: false, fehler: "zu_lang" };
  return { ok: true, text };
}

export type ThreadBeitrag = {
  id: string;
  created_at: string;
  parent_id: string | null;
  person_id: string | null;
  autor_anzeigename: string | null;
  text: string | null;
  geloescht_am: string | null;
};

export type ThreadEintrag = ThreadBeitrag & { antworten: ThreadBeitrag[] };

/**
 * Gruppiert Beiträge in Fragen mit eingerückten Antworten, beide Ebenen
 * chronologisch (älteste zuerst). Antworten, deren Frage nicht mitgeladen
 * wurde (Limit), erscheinen als eigene Einträge, damit nichts verschwindet.
 */
export function beitraegeGruppieren(beitraege: ThreadBeitrag[]): ThreadEintrag[] {
  const sortiert = [...beitraege].sort(
    (a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)
  );
  const fragen = new Map<string, ThreadEintrag>();
  for (const b of sortiert) {
    if (b.parent_id === null) fragen.set(b.id, { ...b, antworten: [] });
  }
  const ergebnis: ThreadEintrag[] = [];
  for (const b of sortiert) {
    if (b.parent_id === null) {
      ergebnis.push(fragen.get(b.id)!);
    } else {
      const frage = fragen.get(b.parent_id);
      if (frage) frage.antworten.push(b);
      else ergebnis.push({ ...b, antworten: [] });
    }
  }
  return ergebnis;
}
