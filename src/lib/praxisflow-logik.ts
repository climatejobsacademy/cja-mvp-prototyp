// Zustandslogik für den Praxisflow-Demo, ohne React und ohne Browser-Import,
// damit node:test sie mit einem Fake-Speicher prüfen kann. Nichts hiervon
// spricht mit der Datenbank.

// Werte (Startschritte, Codewort, Skala, Präfix) kommen als Parameter aus
// praxisflow-daten.ts; hier nur Typ-Importe, die node:test entfernt.
import type { DemoSchritt, PhaseId } from "./praxisflow-daten";

export type Schritt = DemoSchritt;

export type DemoZustand = {
  phase: PhaseId;
  schritte: Schritt[];
  /** IDs der abgehakten Schritte (Durchführen). */
  erledigt: string[];
  /** Punkte je Schritt-ID (Bewerten). */
  noten: Record<string, number>;
  bewertungAbgeschlossen: boolean;
};

export function speicherSchluessel(praefix: string): string {
  return `${praefix}zustand-v1`;
}

export function startZustand(startSchritte: Schritt[]): DemoZustand {
  return {
    phase: "analyse",
    schritte: startSchritte.map((s) => ({ ...s })),
    erledigt: [],
    noten: {},
    bewertungAbgeschlossen: false,
  };
}

// ---------- Schritte (Planen) ----------

export function schrittHinzufuegen(schritte: Schritt[], text: string, neueId: string): Schritt[] {
  const t = text.trim();
  if (!t) return schritte;
  return [...schritte, { id: neueId, text: t, kontrollierbar: false }];
}

export function schrittBearbeiten(schritte: Schritt[], id: string, text: string): Schritt[] {
  const t = text.trim();
  if (!t) return schritte;
  return schritte.map((s) => (s.id === id ? { ...s, text: t } : s));
}

export function schrittLoeschen(schritte: Schritt[], id: string): Schritt[] {
  return schritte.filter((s) => s.id !== id);
}

export function schrittVerschieben(schritte: Schritt[], id: string, richtung: "hoch" | "runter"): Schritt[] {
  const i = schritte.findIndex((s) => s.id === id);
  const j = richtung === "hoch" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= schritte.length) return schritte;
  const neu = [...schritte];
  [neu[i], neu[j]] = [neu[j], neu[i]];
  return neu;
}

export function kontrollierbarUmschalten(schritte: Schritt[], id: string): Schritt[] {
  return schritte.map((s) => (s.id === id ? { ...s, kontrollierbar: !s.kontrollierbar } : s));
}

export function planVollstaendig(schritte: Schritt[]): boolean {
  return schritte.length > 0 && schritte.every((s) => s.text.trim().length > 0);
}

// ---------- Durchführen ----------

export function erledigtUmschalten(erledigt: string[], id: string): string[] {
  return erledigt.includes(id) ? erledigt.filter((e) => e !== id) : [...erledigt, id];
}

/** Haken nur für Schritte, die es im Plan noch gibt. */
export function erledigtBereinigen(erledigt: string[], schritte: Schritt[]): string[] {
  const ids = new Set(schritte.map((s) => s.id));
  return erledigt.filter((e) => ids.has(e));
}

export function alleErledigt(schritte: Schritt[], erledigt: string[]): boolean {
  return schritte.length > 0 && schritte.every((s) => erledigt.includes(s.id));
}

// ---------- Codewort und Bewertung ----------

/** Vergleich ohne Groß-/Kleinschreibung und Leerraum außen. Nur Demo, clientseitig. */
export function codewortKorrekt(eingabe: string, codewort: string): boolean {
  const e = eingabe.trim().toLocaleLowerCase("de");
  return e.length > 0 && e === codewort.trim().toLocaleLowerCase("de");
}

export function kontrollierbareSchritte(schritte: Schritt[]): Schritt[] {
  return schritte.filter((s) => s.kontrollierbar);
}

export function bewertungVollstaendig(
  schritte: Schritt[],
  noten: Record<string, number>,
  skala: readonly number[]
): boolean {
  return kontrollierbareSchritte(schritte).every((s) => skala.includes(noten[s.id]));
}

// ---------- Speichern im Browser ----------

type SpeicherLike = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

function istZustand(x: unknown): x is DemoZustand {
  if (!x || typeof x !== "object") return false;
  const z = x as Record<string, unknown>;
  return (
    typeof z.phase === "string" &&
    Array.isArray(z.schritte) &&
    z.schritte.every(
      (s) =>
        s &&
        typeof s === "object" &&
        typeof (s as Schritt).id === "string" &&
        typeof (s as Schritt).text === "string" &&
        typeof (s as Schritt).kontrollierbar === "boolean"
    ) &&
    Array.isArray(z.erledigt) &&
    typeof z.noten === "object" &&
    z.noten !== null &&
    typeof z.bewertungAbgeschlossen === "boolean"
  );
}

const PHASE_IDS: PhaseId[] = ["analyse", "planen", "entscheiden", "durchfuehren", "kontrolle", "bewerten"];

/** Gespeicherter Stand oder Startzustand; nie ein Fehler, auch ohne Speicher. */
export function zustandLaden(speicher: SpeicherLike | null, praefix: string, startSchritte: Schritt[]): DemoZustand {
  try {
    const roh = speicher?.getItem(speicherSchluessel(praefix));
    if (!roh) return startZustand(startSchritte);
    const z: unknown = JSON.parse(roh);
    if (!istZustand(z) || !PHASE_IDS.includes(z.phase)) return startZustand(startSchritte);
    return { ...z, erledigt: erledigtBereinigen(z.erledigt, z.schritte) };
  } catch {
    return startZustand(startSchritte);
  }
}

export function zustandSpeichern(speicher: SpeicherLike | null, praefix: string, zustand: DemoZustand): void {
  try {
    speicher?.setItem(speicherSchluessel(praefix), JSON.stringify(zustand));
  } catch {
    // Speicher gesperrt oder voll: das Demo läuft ohne Speichern weiter.
  }
}

/** Löscht nur Schlüssel mit dem Präfix dieses Demos. */
export function demoZuruecksetzen(speicher: SpeicherLike | null, praefix: string): void {
  try {
    if (!speicher) return;
    const schluessel: string[] = [];
    for (let i = 0; i < speicher.length; i++) {
      const k = speicher.key(i);
      if (k?.startsWith(praefix)) schluessel.push(k);
    }
    for (const k of schluessel) speicher.removeItem(k);
  } catch {
    // siehe zustandSpeichern
  }
}
