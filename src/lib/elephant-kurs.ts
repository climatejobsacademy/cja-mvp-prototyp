// Native Selbstlern-Lektion aus einem Elephant-SCORM-Paket (VORLÄUFIG, nur
// Demo, Anna 2026-10-15; SR folgt). Elephant legt den Kursinhalt lesbar ins
// Paket (assets/assets/scorm_test_data/: course.json, lesson_overviews.json,
// LP_<lesson_id>.json je Elephant-Lektion), Medien unter assets/images, tts,
// videos, documents. Diese Datei liest nur -- ohne Server-Import, damit sie in
// node:test nutzbar ist:
//   1. Zip-Verzeichnis aus Byte-Stücken (das Paket wird nie ganz geladen),
//   2. Kursinhalt -> eigene Bausteine (Seite, Lernkarte, Multiple Choice,
//      Wischen, Hotspot, Video, Bildauswahl),
//   3. Elephant-HTML -> sicherer Knotenbaum (nur Text und wenige Tags).
// Das Format ist Elephants internes Format, nicht offiziell dokumentiert.

import { inflateSync } from "fflate";

// ---------------------------------------------------------------------------
// 1. Zip lesen (ohne ZIP64 -- Elephant-Pakete liegen weit unter 4 GB)

export type ZipEintrag = { name: string; methode: number; komprimiert: number; groesse: number; offset: number };

/** Liest Bytes [start, start + laenge) aus dem Paket. */
export type BereichLeser = (start: number, laenge: number) => Promise<Uint8Array>;

const u16 = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const u32 = (b: Uint8Array, i: number) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;

/** Sucht im Ende des Pakets den "End of central directory"-Satz. */
export function verzeichnisLage(ende: Uint8Array): { offset: number; groesse: number } {
  for (let i = ende.length - 22; i >= 0; i--) {
    if (u32(ende, i) === 0x06054b50) return { groesse: u32(ende, i + 12), offset: u32(ende, i + 16) };
  }
  throw new Error("Kein Zip-Verzeichnis gefunden");
}

export function verzeichnisLesen(b: Uint8Array): ZipEintrag[] {
  const eintraege: ZipEintrag[] = [];
  const text = new TextDecoder();
  let i = 0;
  while (i + 46 <= b.length && u32(b, i) === 0x02014b50) {
    const n = u16(b, i + 28);
    const e = u16(b, i + 30);
    const k = u16(b, i + 32);
    eintraege.push({
      methode: u16(b, i + 10),
      komprimiert: u32(b, i + 20),
      groesse: u32(b, i + 24),
      offset: u32(b, i + 42),
      name: text.decode(b.subarray(i + 46, i + 46 + n)),
    });
    i += 46 + n + e + k;
  }
  return eintraege;
}

/** Liest und entpackt eine Datei aus dem Paket (lokaler Kopf + Daten). */
export async function eintragLesen(lies: BereichLeser, e: ZipEintrag): Promise<Uint8Array> {
  // Der lokale Kopf kann ein anderes Extra-Feld haben als das Verzeichnis --
  // großzügig mitlesen, bei Bedarf nachladen.
  const reserve = 30 + e.name.length + 512;
  let stueck = await lies(e.offset, reserve + e.komprimiert);
  if (u32(stueck, 0) !== 0x04034b50) throw new Error(`Kein lokaler Kopf: ${e.name}`);
  const start = 30 + u16(stueck, 26) + u16(stueck, 28);
  if (start + e.komprimiert > stueck.length) stueck = await lies(e.offset, start + e.komprimiert);
  const daten = stueck.subarray(start, start + e.komprimiert);
  if (e.methode === 0) return daten;
  if (e.methode === 8) return inflateSync(daten, { out: new Uint8Array(e.groesse) });
  throw new Error(`Packverfahren ${e.methode} nicht unterstützt: ${e.name}`);
}

// ---------------------------------------------------------------------------
// 2. Kursinhalt

export const KURS_ORDNER = "assets/assets/scorm_test_data/";
const MEDIEN = /^(images|tts|videos|documents)\//;

/** Zip-Pfad eines Mediums aus dem Kursinhalt ("images/x.jpg" -> "assets/images/x.jpg"). */
export function medienPfad(pfad: unknown): string | null {
  if (typeof pfad !== "string" || !MEDIEN.test(pfad) || pfad.includes("..")) return null;
  return `assets/${pfad}`;
}

/** Nur diese Pfade gibt die Plattform aus dem Paket heraus. */
export function istErlaubtesMedium(zipPfad: string): boolean {
  return zipPfad.startsWith("assets/") && medienPfad(zipPfad.slice("assets/".length)) === zipPfad;
}

export function istElephantPaket(namen: Iterable<string>): boolean {
  for (const n of namen) if (n === `${KURS_ORDNER}course.json`) return true;
  return false;
}

export type HtmlKnoten = string | { tag: HtmlTag; kinder: HtmlKnoten[] };
export type HtmlTag = "h1" | "h2" | "h3" | "p" | "strong" | "em" | "u" | "ul" | "ol" | "li" | "br";

export type Baustein =
  | { art: "seite"; id: string; html: HtmlKnoten[]; audio: string | null }
  | { art: "karte"; id: string; titel: string | null; html: HtmlKnoten[]; bild: string | null; audio: string | null }
  | { art: "auswahl"; id: string; frage: string; bild: string | null; optionen: { text: string; richtig: boolean }[]; erklaerung: HtmlKnoten[] }
  | { art: "wischen"; id: string; aussage: string; bild: string | null; stimmt: boolean; erklaerung: HtmlKnoten[] }
  | { art: "hotspot"; id: string; titel: string | null; bild: string; punkte: { x: number; y: number; html: HtmlKnoten[] }[] }
  | { art: "video"; id: string; video: string; vorschau: string | null }
  | { art: "bildwahl"; id: string; frage: string; optionen: { bild: string; richtig: boolean }[]; erklaerung: HtmlKnoten[] };

export type Kapitel = { id: string; titel: string; bausteine: Baustein[] };
export type ElephantKurs = { titel: string; beschreibung: string; kapitel: Kapitel[]; uebersprungen: string[] };

type Obj = Record<string, unknown>;
const obj = (x: unknown): Obj => (x && typeof x === "object" && !Array.isArray(x) ? (x as Obj) : {});
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
const str = (x: unknown): string => (typeof x === "string" ? x : "");

/** Text in der Hauptsprache des Kurses (Elephant: localizations.<sprache>). */
function lokal(x: unknown): Obj {
  const l = obj(obj(x).localizations);
  const meta = obj(l.metadata);
  const sprache = str(meta.masterLanguageCode) || "de_DE";
  return obj(l[sprache] ?? l.de_DE ?? Object.values(l).find((v) => v && typeof v === "object" && v !== l.metadata));
}

const sortiert = <T>(liste: T[], schluessel: (t: T) => number) => [...liste].sort((a, b) => schluessel(a) - schluessel(b));

function baustein(modul: Obj, id: string): Baustein[] | null {
  const d = obj(modul.data);
  const l = lokal(d);
  switch (modul.module_type) {
    case "page":
      return [{ art: "seite", id, html: htmlLesen(str(l.markupContent)), audio: medienPfad(l.audioFilePath) }];
    case "flashcards":
      return sortiert(arr(d.cards).map(obj), (k) => Number(k.sortIndex) || 0).map((k, i) => {
        const kl = lokal(k);
        return {
          art: "karte",
          id: `${id}-${i}`,
          titel: k.type === "title" ? str(kl.title) || null : null,
          html: k.type === "title" ? [] : htmlLesen(str(kl.markupContent)),
          bild: medienPfad(kl.imageFilePath),
          audio: medienPfad(kl.audioFilePath),
        };
      });
    case "multipleChoice":
      return [
        {
          art: "auswahl",
          id,
          frage: str(l.questionText),
          bild: medienPfad(l.imageFilePath),
          optionen: arr(d.options).map((o) => ({ text: str(lokal(o).text), richtig: obj(o).isCorrectOption === true })),
          erklaerung: htmlLesen(str(l.markupExplanation)),
        },
      ];
    case "swipe":
      return [
        {
          art: "wischen",
          id,
          aussage: str(l.questionText),
          bild: medienPfad(l.imageFilePath),
          stimmt: d.correctSwipeChoice === true,
          erklaerung: htmlLesen(str(l.markupExplanation)),
        },
      ];
    case "hotspot": {
      const bild = medienPfad(l.imageFilePath);
      if (!bild) return null;
      return [
        {
          art: "hotspot",
          id,
          titel: str(l.title) || null,
          bild,
          punkte: arr(d.hotspots).map((h) => ({
            x: Math.min(1, Math.max(0, Number(obj(h).xOffset) || 0)),
            y: Math.min(1, Math.max(0, Number(obj(h).yOffset) || 0)),
            html: htmlLesen(str(lokal(h).markupContent)),
          })),
        },
      ];
    }
    case "video": {
      const video = medienPfad(l.assetName ?? d.assetName);
      return video ? [{ art: "video", id, video, vorschau: medienPfad(l.thumbnailFilePath) }] : null;
    }
    case "imagePicker":
      return [
        {
          art: "bildwahl",
          id,
          frage: str(l.questionText),
          optionen: arr(d.imageOptions)
            .map((o) => ({ bild: medienPfad(lokal(o).imageFilePath) ?? "", richtig: obj(o).isCorrectOption === true }))
            .filter((o) => o.bild),
          erklaerung: htmlLesen(str(l.markupExplanation)),
        },
      ];
    default:
      return null;
  }
}

/**
 * Baut den Kurs aus course.json, lesson_overviews.json und den LP-Dateien.
 * Unbekannte Bausteinarten werden übersprungen und in `uebersprungen` gezählt.
 */
export function kursAufbauen(kurs: unknown, lektionen: unknown, lpDateien: unknown[]): ElephantKurs {
  const k = lokal(obj(kurs).data);
  const alleModule = lpDateien.flatMap((x) => arr(Array.isArray(x) ? x : [x])).map(obj);
  const uebersprungen: string[] = [];
  const kapitel = sortiert(arr(lektionen).map(obj), (l) => Number(l.sort_index) || 0)
    .map((lektion): Kapitel => {
      const lektionId = str(lektion.lesson_id);
      const bausteine = sortiert(
        alleModule.filter((m) => m.lesson_id === lektionId && m.is_published !== false),
        (m) => Number(m.sort_index) || 0
      ).flatMap((m) => {
        const b = baustein(m, str(m.module_id));
        if (!b) uebersprungen.push(str(m.module_type));
        return b ?? [];
      });
      return { id: lektionId, titel: str(lokal(lektion.data).name).trim(), bausteine };
    })
    .filter((kap) => kap.bausteine.length > 0);
  return begruessungKuerzen({ titel: str(k.name) || str(obj(kurs).course_name), beschreibung: str(k.description), kapitel, uebersprungen });
}

const BEGRUESSUNG = /^\s*willkommen/i;

function ersteUeberschrift(html: HtmlKnoten[]): string | null {
  const erste = html[0];
  return erste && typeof erste !== "string" && /^h[1-3]$/.test(erste.tag) ? htmlText(erste.kinder) : null;
}

/**
 * Doppelte Begrüßung am Kursanfang weglassen (Anna 2026-10-15, VORLÄUFIG,
 * nur Demo): Die Lektion hat schon einen Titel. Im ersten Schritt fällt die
 * Überschrift "Willkommen ..." weg (der Text, z. B. "Hey du ...", bleibt);
 * die nächsten zwei Schritte fallen ganz weg, wenn sie mit "Willkommen ..."
 * beginnen (z. B. Titelkarte "Willkommen zum Kurs").
 */
export function begruessungKuerzen(kurs: ElephantKurs): ElephantKurs {
  const [erstes, ...rest] = kurs.kapitel;
  if (!erstes) return kurs;
  const bausteine = erstes.bausteine.flatMap((b, i): Baustein[] => {
    if (i > 2 || (b.art !== "seite" && b.art !== "karte")) return [b];
    const titel = b.art === "karte" && b.titel ? b.titel : ersteUeberschrift(b.html);
    if (!titel || !BEGRUESSUNG.test(titel)) return [b];
    if (i > 0) return [];
    if (b.art === "karte" && b.titel) return [];
    const html = b.html.slice(1);
    return html.length > 0 ? [{ ...b, html }] : [];
  });
  return { ...kurs, kapitel: bausteine.length ? [{ ...erstes, bausteine }, ...rest] : rest };
}

/** Bilder eines Bausteins (zum Vorladen). */
export function bausteinBilder(b: Baustein): string[] {
  if (b.art === "karte" || b.art === "auswahl" || b.art === "wischen") return b.bild ? [b.bild] : [];
  if (b.art === "hotspot") return [b.bild];
  if (b.art === "video") return b.vorschau ? [b.vorschau] : [];
  if (b.art === "bildwahl") return b.optionen.map((o) => o.bild);
  return [];
}

/** Alle Medien, die der Kurs braucht (für die Prüfung beim Ausliefern). */
export function kursMedien(kurs: ElephantKurs): Set<string> {
  const s = new Set<string>();
  const dazu = (p: string | null) => p && s.add(p);
  for (const kap of kurs.kapitel)
    for (const b of kap.bausteine) {
      if (b.art === "seite") dazu(b.audio);
      if (b.art === "karte") {
        dazu(b.bild);
        dazu(b.audio);
      }
      if (b.art === "auswahl" || b.art === "wischen") dazu(b.bild);
      if (b.art === "hotspot") dazu(b.bild);
      if (b.art === "video") {
        dazu(b.video);
        dazu(b.vorschau);
      }
      if (b.art === "bildwahl") b.optionen.forEach((o) => dazu(o.bild));
    }
  return s;
}

// ---------------------------------------------------------------------------
// 3. HTML -> sichere Knoten (nur Text und erlaubte Tags, keine Attribute)

const ERLAUBT = new Set<string>(["h1", "h2", "h3", "p", "strong", "em", "u", "ul", "ol", "li", "br"]);
const GLEICH: Record<string, HtmlTag> = { b: "strong", i: "em", h4: "h3", h5: "h3", h6: "h3" };
const ENTITAETEN: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function entschluesseln(t: string): string {
  return t.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (ganz, c: string) => {
    if (c[0] === "#") {
      const n = c[1] === "x" || c[1] === "X" ? parseInt(c.slice(2), 16) : parseInt(c.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : "";
    }
    return ENTITAETEN[c.toLowerCase()] ?? ganz;
  });
}

export function htmlLesen(html: string): HtmlKnoten[] {
  const wurzel: { tag: HtmlTag | null; kinder: HtmlKnoten[] } = { tag: null, kinder: [] };
  const stapel: { tag: HtmlTag | null; kinder: HtmlKnoten[] }[] = [wurzel];
  for (const m of html.matchAll(/<(\/?)([a-zA-Z0-9]+)[^>]*?(\/?)>|([^<]+)|</g)) {
    const [, schliessen, rohTag, selbst, text] = m;
    if (text !== undefined || m[0] === "<") {
      const t = entschluesseln(text ?? "<");
      if (t) stapel[stapel.length - 1].kinder.push(t);
      continue;
    }
    const name = rohTag.toLowerCase();
    const tag = (GLEICH[name] ?? name) as HtmlTag;
    if (!ERLAUBT.has(tag)) continue; // z. B. <img data-giphy-id>, <a>, <span>: weglassen, Text bleibt
    if (tag === "br") {
      stapel[stapel.length - 1].kinder.push({ tag: "br", kinder: [] });
    } else if (schliessen) {
      const i = stapel.map((s) => s.tag).lastIndexOf(tag);
      if (i > 0) stapel.length = i;
    } else if (!selbst) {
      const knoten = { tag, kinder: [] as HtmlKnoten[] };
      stapel[stapel.length - 1].kinder.push(knoten);
      stapel.push(knoten);
    }
  }
  return leereEntfernen(wurzel.kinder);
}

function leereEntfernen(knoten: HtmlKnoten[]): HtmlKnoten[] {
  const aufgeraeumt: HtmlKnoten[] = [];
  for (const k of knoten) {
    const neu = typeof k === "string" ? k : { tag: k.tag, kinder: leereEntfernen(k.kinder) };
    if (typeof neu === "string" ? neu.length === 0 : neu.tag !== "br" && neu.kinder.length === 0) continue;
    const letzter = aufgeraeumt[aufgeraeumt.length - 1];
    if (typeof neu === "string" && typeof letzter === "string") aufgeraeumt[aufgeraeumt.length - 1] = letzter + neu;
    else aufgeraeumt.push(neu);
  }
  return aufgeraeumt;
}

/** Reiner Text eines Knotenbaums (für Vorlesen und Bildbeschreibungen). */
export function htmlText(knoten: HtmlKnoten[]): string {
  return knoten
    .map((k) => (typeof k === "string" ? k : k.tag === "br" ? " " : `${htmlText(k.kinder)} `))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}
