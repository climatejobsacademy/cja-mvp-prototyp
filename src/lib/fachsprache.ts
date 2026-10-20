// Fachsprache-Einheit (Stufe 2, Migration 0051, SR-84): reine Hilfen ohne
// Datenbank und ohne Uhr, getestet in src/lib/fachsprache.test.ts.
//
// - parseInhalt: prüft fachsprache_einheit.inhalt noch einmal im Code, mit
//   denselben Regeln wie fn_fachsprache_inhalt_gueltig (0051). Die Seite zeigt
//   nur, was hier durchkommt.
// - einheitenJeTag: Lektion des Tages ist die Live-Lektion mit Termin an
//   diesem Tag (Entscheidung 2026-10-16, O2); Home und Stundenplan zeigen nur
//   veröffentlichte Einheiten.
// - einheitAnzeige: Entwürfe nur für AfCJ admin über die direkte URL, mit
//   Banner (O3).
// Kein Lernstand, kein Ergebnis, keine competency_evidence (Regel 6).

export type Bild = { datei: string; alt: string };

export type Wortkarte = { wort: string; erklaerung: string; beispiel: string; bild: Bild | null };

export type QuizFrage = {
  frage: string;
  antworten: string[];
  /** 0-basierter Index der richtigen Antwort */
  richtig: number;
  erklaerung: string;
  bild: Bild | null;
};

export type FachspracheInhalt = { wortkarten: Wortkarte[]; quiz: QuizFrage[]; saetze: string[] };

export type EinheitStatus = "entwurf" | "veroeffentlicht";

/** Text des Banners auf der Seite, wenn AfCJ admin einen Entwurf öffnet. */
export const ENTWURF_BANNER = "Entwurf, für Lernende nicht sichtbar";

const BILD_DATEI = /^[a-z0-9][a-z0-9._-]{0,99}\.(png|jpe?g|webp)$/i;

function istObjekt(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

/** Nicht-leerer Text (nach Trimmen), sonst null. Der Text bleibt wie gespeichert. */
function text(x: unknown): string | null {
  return typeof x === "string" && x.trim() !== "" ? x : null;
}

/**
 * Bild eines Eintrags: ohne `bild` auch kein `bild_alt`; mit Bild nur ein
 * Dateiname (PNG/JPG/WebP, keine Pfadanteile) und ein Alternativtext.
 * undefined = ungültig.
 */
function bildAus(eintrag: Record<string, unknown>): Bild | null | undefined {
  const bild = eintrag.bild;
  const alt = eintrag.bild_alt;
  if (bild === undefined || bild === null) {
    return alt === undefined || alt === null ? null : undefined;
  }
  if (typeof bild !== "string" || !BILD_DATEI.test(bild) || bild.includes("..")) return undefined;
  const altText = text(alt);
  if (altText === null) return undefined;
  return { datei: bild, alt: altText };
}

function wortkarteAus(x: unknown): Wortkarte | null {
  if (!istObjekt(x)) return null;
  const wort = text(x.wort);
  const erklaerung = text(x.erklaerung);
  const beispiel = text(x.beispiel);
  const bild = bildAus(x);
  if (wort === null || erklaerung === null || beispiel === null || bild === undefined) return null;
  return { wort, erklaerung, beispiel, bild };
}

function quizFrageAus(x: unknown): QuizFrage | null {
  if (!istObjekt(x)) return null;
  const frage = text(x.frage);
  const erklaerung = text(x.erklaerung);
  const bild = bildAus(x);
  if (frage === null || erklaerung === null || bild === undefined) return null;
  if (!Array.isArray(x.antworten) || x.antworten.length < 2 || x.antworten.length > 4) return null;
  const antworten = x.antworten.map(text);
  if (antworten.some((a) => a === null)) return null;
  const getrimmt = new Set(antworten.map((a) => a!.trim()));
  if (getrimmt.size !== antworten.length) return null;
  const richtig = x.richtig;
  if (typeof richtig !== "number" || !Number.isInteger(richtig) || richtig < 0 || richtig >= antworten.length) {
    return null;
  }
  return { frage, antworten: antworten as string[], richtig, erklaerung, bild };
}

/**
 * Inhalt einer Einheit aus der Datenbank (jsonb) prüfen und in feste Typen
 * bringen. Ungültig → null (die Seite zeigt dann "nicht gefunden").
 * Regeln wie fn_fachsprache_inhalt_gueltig: mindestens eine Wortkarte und
 * eine Quizfrage, je Frage 2–4 verschiedene Antworten und genau ein gültiger
 * Index; `saetze` darf leer sein.
 */
export function parseInhalt(roh: unknown): FachspracheInhalt | null {
  if (!istObjekt(roh)) return null;
  const { wortkarten, quiz, saetze } = roh;
  if (!Array.isArray(wortkarten) || wortkarten.length === 0) return null;
  if (!Array.isArray(quiz) || quiz.length === 0) return null;
  if (!Array.isArray(saetze)) return null;

  const karten = wortkarten.map(wortkarteAus);
  const fragen = quiz.map(quizFrageAus);
  const saetzeText = saetze.map(text);
  if (karten.some((k) => k === null) || fragen.some((f) => f === null) || saetzeText.some((s) => s === null)) {
    return null;
  }
  return { wortkarten: karten as Wortkarte[], quiz: fragen as QuizFrage[], saetze: saetzeText as string[] };
}

/** Pfad im Bucket fachsprache-bilder: "<lesson_id>/<dateiname>" (0051). */
export function bildPfad(lessonId: string, datei: string): string {
  return `${lessonId}/${datei}`;
}

/** Alle Bilddateien eines Inhalts, ohne Doppelte, in Reihenfolge des Auftretens. */
export function bildDateien(inhalt: FachspracheInhalt): string[] {
  const dateien = [...inhalt.wortkarten, ...inhalt.quiz].flatMap((e) => (e.bild ? [e.bild.datei] : []));
  return [...new Set(dateien)];
}

// ---------- Lektion des Tages ----------

/** Termin aus dem Plan: Datum, Startzeit und die Lektion des Termins. */
export type TerminLektion = {
  datum: string;
  /** "HH:MM", für die Reihenfolge mehrerer Termine an einem Tag */
  start: string | null;
  lessonId: string | null;
  art: "live" | "asynchron" | "feld";
};

export type EinheitKurz = { id: string; lessonId: string; titel: string; status: EinheitStatus };

export type EinheitDesTages = { einheitId: string; lessonId: string; titel: string };

/**
 * Einheiten je Tag (Datum "YYYY-MM-DD"): nur Live-Termine zählen (O2), die
 * Einheit muss veröffentlicht sein. Mehrere Live-Termine an einem Tag: in der
 * Reihenfolge der Startzeit; dieselbe Einheit erscheint je Tag nur einmal.
 * Tage ohne passende Einheit fehlen in der Map.
 */
export function einheitenJeTag(termine: TerminLektion[], einheiten: EinheitKurz[]): Map<string, EinheitDesTages[]> {
  const jeLektion = new Map(einheiten.filter((e) => e.status === "veroeffentlicht").map((e) => [e.lessonId, e]));
  const sortiert = termine
    .filter((t) => t.art === "live" && t.lessonId !== null)
    .slice()
    .sort((a, b) => a.datum.localeCompare(b.datum) || (a.start ?? "99:99").localeCompare(b.start ?? "99:99"));

  const ergebnis = new Map<string, EinheitDesTages[]>();
  for (const t of sortiert) {
    const e = jeLektion.get(t.lessonId!);
    if (!e) continue;
    const liste = ergebnis.get(t.datum) ?? [];
    if (liste.some((x) => x.einheitId === e.id)) continue;
    liste.push({ einheitId: e.id, lessonId: e.lessonId, titel: e.titel });
    ergebnis.set(t.datum, liste);
  }
  return ergebnis;
}

/** Einheiten eines Tages (siehe einheitenJeTag), leer ohne passende Einheit. */
export function einheitenDesTages(datum: string, termine: TerminLektion[], einheiten: EinheitKurz[]): EinheitDesTages[] {
  return einheitenJeTag(termine, einheiten).get(datum) ?? [];
}

/** Lektionen, deren Einheiten für die Einstiege zu laden sind: Live-Termine mit Lektion. */
export function liveLektionIds(termine: TerminLektion[]): string[] {
  return [...new Set(termine.filter((t) => t.art === "live" && t.lessonId !== null).map((t) => t.lessonId!))];
}

// ---------- Anzeige auf der Seite ----------

/**
 * Darf die Seite die Einheit zeigen, und mit Entwurf-Banner? Die RLS aus 0051
 * liefert Lernenden ohnehin nur veröffentlichte Einheiten; diese Regel ist
 * die zweite Sicherung im Code. null = "nicht gefunden".
 */
export function einheitAnzeige(status: EinheitStatus, istAfcjAdmin: boolean): { entwurf: boolean } | null {
  if (status === "veroeffentlicht") return { entwurf: false };
  return istAfcjAdmin ? { entwurf: true } : null;
}
