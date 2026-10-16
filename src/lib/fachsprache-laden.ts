// Fachsprache-Einheit laden (Stufe 2, Migration 0051, SR-84): die Regeln der
// Seite /fachsprache/[einheitId] und die Vorbereitung der Einstiege als
// Funktionen ohne Next und ohne Supabase-Import. Die Datenquelle kommt von
// außen (src/lib/queries/fachsprache.ts mit dem Client der angemeldeten
// Person, RLS, kein Service-Role); so lassen sich Gates und Bildlinks mit
// `node --test` prüfen (docs/decisions.md 2026-10-16, O6). Getestet in
// src/lib/fachsprache-laden.test.ts.
//
// Nur Lesen. Kein Lernstand, kein Ergebnis, keine competency_evidence
// (Regel 6), keine Schreibzugriffe, kein Tracking.

// @ts-expect-error TS5097: .ts-Endung für node:test nötig (wie die Tests)
import { bildDateien, bildPfad, einheitAnzeige, parseInhalt, type EinheitStatus } from "./fachsprache.ts";

/** Gültigkeit der signierten Bildlinks in Sekunden (kurzlebig, Seite lädt sie bei jedem Aufruf neu). */
export const BILD_GUELTIGKEIT_SEKUNDEN = 600;

/** Zeile aus fachsprache_einheit, so wie die RLS sie der Person liefert. */
export type EinheitZeile = {
  id: string;
  lesson_id: string;
  titel: string;
  dauer_minuten: number | null;
  inhalt: unknown;
  status: string;
};

/** Datenquelle der Seite; die Umsetzung mit dem Supabase-Client steht in queries/fachsprache.ts. */
export interface EinheitQuelle {
  /** Eine Einheit; die RLS liefert Lernenden nur veröffentlichte, AfCJ admin auch Entwürfe. */
  einheit(id: string): Promise<EinheitZeile | null>;
  istAfcjAdmin(): Promise<boolean>;
  /** Signierte Links zu Pfaden im Bucket fachsprache-bilder; Pfade ohne Link fehlen in der Map. */
  signierteLinks(pfade: string[], gueltigSekunden: number): Promise<Map<string, string>>;
}

export type SeitenBild = { url: string; alt: string };

export type SeitenWortkarte = { wort: string; erklaerung: string; beispiel: string; bild: SeitenBild | null };

export type SeitenFrage = {
  frage: string;
  antworten: string[];
  richtig: number;
  erklaerung: string;
  bild: SeitenBild | null;
};

/** Alles, was die Oberfläche braucht; nur einfache Werte (geht als Props an eine Client-Komponente). */
export type SeitenEinheit = {
  id: string;
  titel: string;
  dauerMinuten: number | null;
  /** AfCJ admin sieht einen Entwurf: Banner zeigen */
  entwurf: boolean;
  wortkarten: SeitenWortkarte[];
  quiz: SeitenFrage[];
  saetze: string[];
  /** Bilder, für die kein signierter Link entstand (Datei fehlt im Bucket oder ist nicht lesbar); die Karte zeigt dann kein Bild */
  bilderOhneLink: number;
};

export type SeitenErgebnis = { art: "nicht_gefunden" } | { art: "ok"; einheit: SeitenEinheit };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function istEinheitId(wert: string): boolean {
  return UUID.test(wert);
}

function alsStatus(wert: string): EinheitStatus | null {
  return wert === "entwurf" || wert === "veroeffentlicht" ? wert : null;
}

/**
 * Lädt die Einheit für die Seite. "nicht_gefunden" (die Seite antwortet 404)
 * bei: Schalter aus (dann wird nicht einmal gefragt), ungültiger Id, keine
 * lesbare Zeile (RLS: nicht veröffentlicht, Lektion nicht lesbar, gibt es
 * nicht), Entwurf ohne AfCJ admin, ungültigem Inhalt.
 */
export async function ladeEinheitSeite(
  optionen: { schalterAn: boolean; einheitId: string },
  quelle: EinheitQuelle
): Promise<SeitenErgebnis> {
  const nichts: SeitenErgebnis = { art: "nicht_gefunden" };
  if (!optionen.schalterAn) return nichts;
  if (!istEinheitId(optionen.einheitId)) return nichts;

  const zeile = await quelle.einheit(optionen.einheitId);
  if (!zeile) return nichts;

  const status = alsStatus(zeile.status);
  if (!status) return nichts;
  // Nach dem Entwurf wird nur gefragt, wenn es einer ist; die RLS hat Lernenden
  // einen Entwurf ohnehin nicht geliefert, das hier ist die zweite Sicherung.
  const admin = status === "entwurf" ? await quelle.istAfcjAdmin() : false;
  const anzeige = einheitAnzeige(status, admin);
  if (!anzeige) return nichts;

  const inhalt = parseInhalt(zeile.inhalt);
  if (!inhalt) return nichts;

  const dateien = bildDateien(inhalt);
  const links =
    dateien.length > 0
      ? await quelle.signierteLinks(
          dateien.map((d) => bildPfad(zeile.lesson_id, d)),
          BILD_GUELTIGKEIT_SEKUNDEN
        )
      : new Map<string, string>();

  let ohneLink = 0;
  const bildMitLink = (bild: { datei: string; alt: string } | null): SeitenBild | null => {
    if (!bild) return null;
    const url = links.get(bildPfad(zeile.lesson_id, bild.datei));
    if (!url) {
      ohneLink += 1;
      return null;
    }
    return { url, alt: bild.alt };
  };

  const einheit: SeitenEinheit = {
    id: zeile.id,
    titel: zeile.titel,
    dauerMinuten: zeile.dauer_minuten,
    entwurf: anzeige.entwurf,
    wortkarten: inhalt.wortkarten.map((k) => ({ wort: k.wort, erklaerung: k.erklaerung, beispiel: k.beispiel, bild: bildMitLink(k.bild) })),
    quiz: inhalt.quiz.map((f) => ({
      frage: f.frage,
      antworten: f.antworten,
      richtig: f.richtig,
      erklaerung: f.erklaerung,
      bild: bildMitLink(f.bild),
    })),
    saetze: inhalt.saetze,
    bilderOhneLink: 0,
  };
  einheit.bilderOhneLink = ohneLink;
  return { art: "ok", einheit };
}

/**
 * Ziel von "Zurück" auf der Seite je Herkunft (?von=): aus dem Stundenplan zum
 * selben Tag, sonst nach Home. Nur feste Ziele, nie ein Wert aus der URL als Pfad.
 */
export function zurueckZiel(von?: string, datum?: string): { href: string; label: string } {
  if (von === "stundenplan") {
    const tag = datum && /^\d{4}-\d{2}-\d{2}$/.test(datum) ? `?datum=${datum}` : "";
    return { href: `/schedule${tag}`, label: "Zurück zum Stundenplan" };
  }
  return { href: "/home", label: "Zurück zu Home" };
}

// ---------- Einstiege (Etappe 2): veröffentlichte Einheit zu einer Lektion ----------

/** Wohin der Link der Einstiege führt; `von` bestimmt das Ziel von "Zurück" auf der Seite. */
export function einheitHref(einheitId: string, von?: "stundenplan" | "home"): string {
  return von === "stundenplan" ? `/fachsprache/${einheitId}?von=stundenplan` : `/fachsprache/${einheitId}`;
}

export type EinheitLink = { einheitId: string; lessonId: string; titel: string; href: string };

/** Datenquelle der Einstiege: Einheiten zu Lektionen (die RLS entscheidet, was lesbar ist). */
export interface EinheitenListeQuelle {
  fuerLektionen(lessonIds: string[]): Promise<{ id: string; lesson_id: string; titel: string; status: string }[]>;
}

/**
 * Zu jeder Lektion die veröffentlichte Einheit samt Link. Leer, wenn der
 * Schalter aus ist (dann wird nicht gefragt) oder es keine Lektionen gibt.
 * Entwürfe kommen nie hinein, auch wenn die RLS sie einer AfCJ-admin-Person
 * liefern würde: Home und Stundenplan zeigen nur Veröffentlichtes (O3).
 */
export async function einheitenFuerLektionen(
  optionen: { schalterAn: boolean; lessonIds: string[]; von?: "stundenplan" | "home" },
  quelle: EinheitenListeQuelle
): Promise<Map<string, EinheitLink>> {
  const ergebnis = new Map<string, EinheitLink>();
  const ids = [...new Set(optionen.lessonIds)];
  if (!optionen.schalterAn || ids.length === 0) return ergebnis;
  for (const z of await quelle.fuerLektionen(ids)) {
    if (z.status !== "veroeffentlicht" || !ids.includes(z.lesson_id) || ergebnis.has(z.lesson_id)) continue;
    ergebnis.set(z.lesson_id, { einheitId: z.id, lessonId: z.lesson_id, titel: z.titel, href: einheitHref(z.id, optionen.von) });
  }
  return ergebnis;
}

/** Die veröffentlichte Einheit einer Lektion samt Link, sonst null. */
export async function einheitFuerLektion(
  optionen: { schalterAn: boolean; lessonId: string; von?: "stundenplan" | "home" },
  quelle: EinheitenListeQuelle
): Promise<EinheitLink | null> {
  const karte = await einheitenFuerLektionen({ schalterAn: optionen.schalterAn, lessonIds: [optionen.lessonId], von: optionen.von }, quelle);
  return karte.get(optionen.lessonId) ?? null;
}
