// Zustandslogik für den Praxisflow-Demo, ohne React und ohne Browser-Import,
// damit node:test sie mit einem Fake-Speicher prüfen kann. Nichts hiervon
// spricht mit der Datenbank.

// Werte (Codewort, Skala, Kriterien, Präfix) kommen als Parameter aus
// praxisflow-daten.ts; hier nur Typ-Importe, die node:test entfernt.
import type { PhaseId } from "./praxisflow-daten";

export type Eintrag = { id: string; text: string };

export type DemoZustand = {
  phase: PhaseId;
  werkzeuge: Eintrag[];
  materialien: Eintrag[];
  schritte: Eintrag[];
  /** IDs der abgehakten Arbeitsschritte (Durchführen). */
  erledigt: string[];
  /** Punkte je Kriterium-ID. */
  selbst: Record<string, number>;
  fremd: Record<string, number>;
  /** Fremdeinschätzung per Codewort freigeschaltet. */
  fremdFreigegeben: boolean;
  bewertungAbgeschlossen: boolean;
};

/** v2: Struktur mit drei Listen und Selbst-/Fremdeinschätzung (v1 wird ignoriert). */
export function speicherSchluessel(praefix: string): string {
  return `${praefix}zustand-v2`;
}

/** Planen startet leer. */
export function startZustand(): DemoZustand {
  return {
    phase: "analyse",
    werkzeuge: [],
    materialien: [],
    schritte: [],
    erledigt: [],
    selbst: {},
    fremd: {},
    fremdFreigegeben: false,
    bewertungAbgeschlossen: false,
  };
}

// ---------- Listen (Planen) ----------

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

/** Gate vor Entscheiden: mindestens ein Arbeitsschritt. */
export function planBereit(schritte: Eintrag[]): boolean {
  return schritte.length > 0;
}

// ---------- Durchführen ----------

export function erledigtUmschalten(erledigt: string[], id: string): string[] {
  return erledigt.includes(id) ? erledigt.filter((e) => e !== id) : [...erledigt, id];
}

/** Haken nur für Schritte, die es im Plan noch gibt. */
export function erledigtBereinigen(erledigt: string[], schritte: Eintrag[]): string[] {
  const ids = new Set(schritte.map((s) => s.id));
  return erledigt.filter((e) => ids.has(e));
}

/** Gate 2 erst aktiv, wenn jeder geplante Schritt abgehakt ist. */
export function alleErledigt(schritte: Eintrag[], erledigt: string[]): boolean {
  return schritte.length > 0 && schritte.every((s) => erledigt.includes(s.id));
}

// ---------- Codewort und Bewertung ----------

/** Vergleich ohne Groß-/Kleinschreibung und Leerraum außen. Nur Demo, clientseitig. */
export function codewortKorrekt(eingabe: string, codewort: string): boolean {
  const e = eingabe.trim().toLocaleLowerCase("de");
  return e.length > 0 && e === codewort.trim().toLocaleLowerCase("de");
}

/** Für jedes Kriterium ein Wert aus der Skala. */
export function einschaetzungVollstaendig(
  kriterien: { id: string }[],
  werte: Record<string, number>,
  skala: readonly number[]
): boolean {
  return kriterien.every((k) => skala.includes(werte[k.id]));
}

/** Freigabe der Fremdeinschätzung erst nach vollständiger Selbsteinschätzung. */
export function fremdFreigabeMoeglich(
  kriterien: { id: string }[],
  selbst: Record<string, number>,
  skala: readonly number[]
): boolean {
  return einschaetzungVollstaendig(kriterien, selbst, skala);
}

/** Abschluss: Selbst- und Fremdeinschätzung vollständig, Fremd freigeschaltet. */
export function bewertungAbschliessbar(
  zustand: Pick<DemoZustand, "selbst" | "fremd" | "fremdFreigegeben">,
  kriterien: { id: string }[],
  skala: readonly number[]
): boolean {
  return (
    zustand.fremdFreigegeben &&
    einschaetzungVollstaendig(kriterien, zustand.selbst, skala) &&
    einschaetzungVollstaendig(kriterien, zustand.fremd, skala)
  );
}

// ---------- Speichern im Browser ----------

type SpeicherLike = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

const PHASE_IDS: PhaseId[] = ["analyse", "planen", "entscheiden", "durchfuehren", "kontrolle", "bewerten"];

function istListe(x: unknown): x is Eintrag[] {
  return (
    Array.isArray(x) &&
    x.every((e) => e && typeof e === "object" && typeof (e as Eintrag).id === "string" && typeof (e as Eintrag).text === "string")
  );
}

function istPunkte(x: unknown): x is Record<string, number> {
  return !!x && typeof x === "object" && !Array.isArray(x) && Object.values(x).every((v) => typeof v === "number");
}

function istZustand(x: unknown): x is DemoZustand {
  if (!x || typeof x !== "object") return false;
  const z = x as Record<string, unknown>;
  return (
    typeof z.phase === "string" &&
    PHASE_IDS.includes(z.phase as PhaseId) &&
    istListe(z.werkzeuge) &&
    istListe(z.materialien) &&
    istListe(z.schritte) &&
    Array.isArray(z.erledigt) &&
    z.erledigt.every((e) => typeof e === "string") &&
    istPunkte(z.selbst) &&
    istPunkte(z.fremd) &&
    typeof z.fremdFreigegeben === "boolean" &&
    typeof z.bewertungAbgeschlossen === "boolean"
  );
}

/** Gespeicherter Stand oder Startzustand; nie ein Fehler, auch ohne Speicher. */
export function zustandLaden(speicher: SpeicherLike | null, praefix: string): DemoZustand {
  try {
    const roh = speicher?.getItem(speicherSchluessel(praefix));
    if (!roh) return startZustand();
    const z: unknown = JSON.parse(roh);
    if (!istZustand(z)) return startZustand();
    return { ...z, erledigt: erledigtBereinigen(z.erledigt, z.schritte) };
  } catch {
    return startZustand();
  }
}

export function zustandSpeichern(speicher: SpeicherLike | null, praefix: string, zustand: DemoZustand): void {
  try {
    speicher?.setItem(speicherSchluessel(praefix), JSON.stringify(zustand));
  } catch {
    // Speicher gesperrt oder voll: das Demo läuft ohne Speichern weiter.
  }
}

/** Löscht nur Schlüssel mit dem Präfix dieses Demos (auch alte Versionen). */
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
