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
  /** Einschätzung durch eine:n Mitlernende:n (Punkte je Kriterium-ID). */
  peer: Record<string, number>;
  /** Fremdeinschätzung per Codewort freigeschaltet. */
  fremdFreigegeben: boolean;
  bewertungAbgeschlossen: boolean;
  /** Unterschritt in Planen: 0 Werkzeuge, 1 Materialien, 2 Arbeitsschritte. */
  planenSchritt: number;
  /** Kontrollieren: abgehakte Prüfungen ohne Spannung (IDs). */
  geprueftSpannungsfrei: string[];
  /** Kontrollieren: Inbetriebnahme per Codewort freigegeben. */
  inbetriebnahmeFreigegeben: boolean;
  /** Kontrollieren: abgehakte Prüfungen unter Spannung (IDs). */
  geprueftUnterSpannung: string[];
  /** Dateinamen (nur im Browser gemerkt, nichts wird hochgeladen). */
  auftragDateien: string[];
  /** Informieren: selbst hochgeladene Hilfsunterlagen, z. B. Handbuch (Malte 2026-10-28). */
  hilfeDateien: string[];
  planDateien: string[];
  protokollDateien: string[];
  /** Verlauf für die Auftragsakte: wann was passiert ist (Berliner Zeit, "JJJJ-MM-TTTHH:MM:SS"). */
  verlauf: { zeit: string; text: string }[];
};

/**
 * v7: Kontrollieren in drei Teilen, Uploads, Peer-Einschätzung, Verlauf (2026-10-20). Ältere Stände
 * werden nicht gelesen, das Demo startet dann neu; "Demo zurücksetzen" löscht
 * auch sie.
 */
export function speicherSchluessel(praefix: string): string {
  return `${praefix}zustand-v7`;
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
    peer: {},
    fremdFreigegeben: false,
    bewertungAbgeschlossen: false,
    planenSchritt: 0,
    geprueftSpannungsfrei: [],
    inbetriebnahmeFreigegeben: false,
    geprueftUnterSpannung: [],
    auftragDateien: [],
    hilfeDateien: [],
    planDateien: [],
    protokollDateien: [],
    verlauf: [],
  };
}

/** Eintrag im Verlauf der Auftragsakte anhängen. */
export function mitVerlauf(z: DemoZustand, zeit: string, text: string): DemoZustand {
  return { ...z, verlauf: [...z.verlauf, { zeit, text }] };
}

/** Abgabe nach der Frist? Beide als Berliner "JJJJ-MM-TTTHH:MM:SS". */
export function nachFrist(abgabe: string | undefined, frist: string): boolean {
  return !!abgabe && abgabe > frist;
}

/** Prüfung an- oder abhaken (Kontrollieren). */
export function pruefungUmschalten(liste: string[], id: string): string[] {
  return liste.includes(id) ? liste.filter((x) => x !== id) : [...liste, id];
}

/** Alle IDs der Prüfliste abgehakt? */
export function allesGeprueft(liste: { id: string }[], erledigt: string[]): boolean {
  return liste.every((p) => erledigt.includes(p.id));
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

// Planen als geführte Abfolge: Unterschritt 0 bis anzahl-1 (Werkzeuge,
// Materialien, Arbeitsschritte). Die Listen bleiben beim Zurückgehen erhalten,
// hier wechselt nur die Position.

type PlanenPosition = Pick<DemoZustand, "phase" | "planenSchritt">;

/** Weiter ist in den ersten Unterschritten immer möglich, im letzten erst mit einem Arbeitsschritt. */
export function planenWeiterMoeglich(planenSchritt: number, schritte: Eintrag[], anzahl: number): boolean {
  return planenSchritt < anzahl - 1 || planBereit(schritte);
}

/** Nächster Unterschritt; nach dem letzten weiter zu Entscheiden. Gesperrt: keine Änderung. */
export function planenWeiter(z: PlanenPosition & Pick<DemoZustand, "schritte">, anzahl: number): PlanenPosition {
  if (!planenWeiterMoeglich(z.planenSchritt, z.schritte, anzahl)) return { phase: z.phase, planenSchritt: z.planenSchritt };
  if (z.planenSchritt < anzahl - 1) return { phase: "planen", planenSchritt: z.planenSchritt + 1 };
  return { phase: "entscheiden", planenSchritt: z.planenSchritt };
}

/** Vorheriger Unterschritt; vor dem ersten zurück zu Analyse. */
export function planenZurueck(z: PlanenPosition): PlanenPosition {
  if (z.planenSchritt > 0) return { phase: "planen", planenSchritt: z.planenSchritt - 1 };
  return { phase: "analyse", planenSchritt: 0 };
}

// ---------- Eingabe und Diktat (Planen) ----------

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

// ---------- Durchführen ----------

// Regel: Schritte nur streng nacheinander. Abgehakt ist immer ein lückenloser
// Anfang des Plans (Schritt 1 bis k). Abhakbar ist nur Schritt k+1,
// zurücknehmbar nur Schritt k.

export type SchrittStatus = "abhakbar" | "zuruecknehmbar" | "erledigt" | "gesperrt";

/**
 * Lückenloser Anfang: Haken gelten nur bis zur ersten Lücke, in der
 * Reihenfolge des Plans. Entfernt auch Haken gelöschter Schritte (z. B. nach
 * Änderungen in Planen oder einem gespeicherten Stand mit Lücke).
 */
export function erledigtBereinigen(erledigt: string[], schritte: Eintrag[]): string[] {
  const gesetzt = new Set(erledigt);
  const ergebnis: string[] = [];
  for (const s of schritte) {
    if (!gesetzt.has(s.id)) break;
    ergebnis.push(s.id);
  }
  return ergebnis;
}

export function schrittStatus(schritte: Eintrag[], erledigt: string[], id: string): SchrittStatus {
  const k = erledigtBereinigen(erledigt, schritte).length;
  const i = schritte.findIndex((s) => s.id === id);
  if (i < 0) return "gesperrt";
  if (i < k - 1) return "erledigt";
  if (i === k - 1) return "zuruecknehmbar";
  if (i === k) return "abhakbar";
  return "gesperrt";
}

/** Hakt den nächsten Schritt ab oder nimmt den letzten zurück; sonst keine Änderung. */
export function schrittUmschalten(schritte: Eintrag[], erledigt: string[], id: string): string[] {
  const bereinigt = erledigtBereinigen(erledigt, schritte);
  const status = schrittStatus(schritte, bereinigt, id);
  if (status === "abhakbar") return [...bereinigt, id];
  if (status === "zuruecknehmbar") return bereinigt.slice(0, -1);
  return bereinigt;
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

// ---------- Bewertungsbogen mit Skala je Kriterium ----------

/** Jedes Kriterium hat einen Wert aus seiner eigenen Skala. */
export function bogenVollstaendig(kriterien: { id: string; skala: readonly number[] }[], werte: Record<string, number>): boolean {
  return kriterien.every((k) => k.skala.includes(werte[k.id]));
}

/** Nacharbeit nötig: die Trainer:in hat bei einem K.-o.-Kriterium 0 Punkte gegeben. */
export function nacharbeitNoetig(kriterien: { id: string; ko?: boolean }[], fremd: Record<string, number>): boolean {
  return kriterien.some((k) => k.ko && fremd[k.id] === 0);
}

/** Zurück zur Nacharbeit: Ausführen erneut, Kontrolle und Bewertung von vorn; Plan, Haken und Dateien bleiben. */
export function zurNacharbeit(z: DemoZustand): DemoZustand {
  return {
    ...z,
    phase: "durchfuehren",
    geprueftSpannungsfrei: [],
    inbetriebnahmeFreigegeben: false,
    geprueftUnterSpannung: [],
    selbst: {},
    peer: {},
    fremd: {},
    fremdFreigegeben: false,
    bewertungAbgeschlossen: false,
  };
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

function istTexte(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((e) => typeof e === "string");
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
    istPunkte(z.peer) &&
    typeof z.fremdFreigegeben === "boolean" &&
    typeof z.bewertungAbgeschlossen === "boolean" &&
    Number.isInteger(z.planenSchritt) &&
    (z.planenSchritt as number) >= 0 &&
    (z.planenSchritt as number) <= 2 &&
    Array.isArray(z.geprueftSpannungsfrei) &&
    z.geprueftSpannungsfrei.every((e) => typeof e === "string") &&
    typeof z.inbetriebnahmeFreigegeben === "boolean" &&
    Array.isArray(z.geprueftUnterSpannung) &&
    z.geprueftUnterSpannung.every((e) => typeof e === "string") &&
    istTexte(z.auftragDateien) &&
    (z.hilfeDateien === undefined || istTexte(z.hilfeDateien)) &&
    istTexte(z.planDateien) &&
    istTexte(z.protokollDateien) &&
    Array.isArray(z.verlauf) &&
    z.verlauf.every((e) => e && typeof e === "object" && typeof (e as { zeit: unknown }).zeit === "string" && typeof (e as { text: unknown }).text === "string")
  );
}

/** Gespeicherter Stand oder Startzustand; nie ein Fehler, auch ohne Speicher. */
export function zustandLaden(speicher: SpeicherLike | null, praefix: string): DemoZustand {
  try {
    const roh = speicher?.getItem(speicherSchluessel(praefix));
    if (!roh) return startZustand();
    const z: unknown = JSON.parse(roh);
    if (!istZustand(z)) return startZustand();
    // hilfeDateien kam am 2026-10-28 dazu; ältere Stände ohne das Feld bleiben gültig.
    return { ...z, hilfeDateien: z.hilfeDateien ?? [], erledigt: erledigtBereinigen(z.erledigt, z.schritte) };
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
