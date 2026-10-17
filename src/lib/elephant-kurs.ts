// Elephant-SCORM-Paket als Quelle für das eigene Kursformat `Lernkurs`
// (SR-85, src/lib/lernkurs.ts). Elephant legt den Kursinhalt lesbar ins
// Paket (assets/assets/scorm_test_data/: course.json, lesson_overviews.json,
// LP_<lesson_id>.json je Elephant-Lektion), Medien unter assets/images, tts,
// videos, documents. Das Format ist Elephants internes Format, nicht
// offiziell dokumentiert -- deshalb übersetzt diese Datei es sofort in einen
// `Lernkurs`; außerhalb dieser Datei gibt es keinen Elephant-Typ.
//
// Diese Datei liest nur, ohne Server-Import, damit sie in node:test nutzbar ist:
//   1. Zip-Verzeichnis und einzelne Einträge aus Byte-Stücken (das Paket
//      wird nie ganz geladen),
//   2. Kursinhalt -> Lernkurs (`elephantZuLernkurs`),
//   3. Elephant-HTML -> sicherer Knotenbaum (nur Text und wenige Tags).

import { inflateSync } from "fflate";

// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { type Baustein, type Kapitel, type Lernkurs, type Schritt, type TextKnoten, type TextTag } from "./lernkurs.ts";

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

/** Beginn der Daten eines Eintrags im Paket (nach dem lokalen Kopf). */
export async function datenBeginn(lies: BereichLeser, e: ZipEintrag): Promise<number> {
  const kopf = await lies(e.offset, 30);
  if (kopf.length < 30 || u32(kopf, 0) !== 0x04034b50) throw new Error("Kein lokaler Kopf");
  return e.offset + 30 + u16(kopf, 26) + u16(kopf, 28);
}

/** Liest und entpackt eine Datei aus dem Paket (lokaler Kopf + Daten). */
export async function eintragLesen(lies: BereichLeser, e: ZipEintrag): Promise<Uint8Array> {
  // Der lokale Kopf kann ein anderes Extra-Feld haben als das Verzeichnis --
  // großzügig mitlesen, bei Bedarf nachladen.
  const reserve = 30 + e.name.length + 512;
  let stueck = await lies(e.offset, reserve + e.komprimiert);
  if (u32(stueck, 0) !== 0x04034b50) throw new Error("Kein lokaler Kopf");
  const start = 30 + u16(stueck, 26) + u16(stueck, 28);
  if (start + e.komprimiert > stueck.length) stueck = await lies(e.offset, start + e.komprimiert);
  const daten = stueck.subarray(start, start + e.komprimiert);
  if (e.methode === 0) return daten;
  if (e.methode === 8) return inflateSync(daten, { out: new Uint8Array(e.groesse) });
  throw new Error(`Packverfahren ${e.methode} nicht unterstützt`);
}

// ---------------------------------------------------------------------------
// 2. Kursinhalt -> Lernkurs

export const KURS_ORDNER = "assets/assets/scorm_test_data/";
const MEDIEN = /^(images|tts|videos|audio|documents)\//;

/** Zip-Pfad eines Mediums aus dem Kursinhalt ("images/x.jpg" -> "assets/images/x.jpg"). */
export function medienPfad(pfad: unknown): string | null {
  if (typeof pfad !== "string" || !MEDIEN.test(pfad) || pfad.includes("..")) return null;
  return `assets/${pfad}`;
}

/** Nur Pfade in dieser Form gibt die Plattform aus dem Paket heraus (zusätzlich: der Kurs muss sie nutzen). */
export function istErlaubtesMedium(zipPfad: string): boolean {
  return zipPfad.startsWith("assets/") && medienPfad(zipPfad.slice("assets/".length)) === zipPfad;
}

export function istElephantPaket(namen: Iterable<string>): boolean {
  for (const n of namen) if (n === `${KURS_ORDNER}course.json`) return true;
  return false;
}

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

/** Nur gesetzte Bausteine (Medien ohne gültigen Pfad fallen weg). */
const nur = (...b: (Baustein | null | false)[]): Baustein[] => b.filter((x): x is Baustein => !!x);
const bild = (quelle: string | null, beschreibung = ""): Baustein | null => (quelle ? { art: "bild", quelle, beschreibung } : null);
const audio = (quelle: string | null): Baustein | null => (quelle ? { art: "audio", quelle } : null);
const text = (inhalt: TextKnoten[]): Baustein | null => (inhalt.length ? { art: "text", inhalt } : null);

/** Ein Elephant-Modul -> Schritte; null bei unbekannter Art. */
function modulZuSchritten(modul: Obj, id: string): Schritt[] | null {
  const d = obj(modul.data);
  const l = lokal(d);
  switch (modul.module_type) {
    case "page":
      return [{ id, bausteine: nur(audio(medienPfad(l.audioFilePath)), text(htmlLesen(str(l.markupContent)))) }];
    case "flashcards":
      return sortiert(arr(d.cards).map(obj), (k) => Number(k.sortIndex) || 0).map((k, i) => {
        const kl = lokal(k);
        const titelKarte = k.type === "title";
        return {
          id: `${id}-${i}`,
          bausteine: nur(
            bild(medienPfad(kl.imageFilePath)),
            titelKarte && !!str(kl.title) && { art: "ueberschrift", text: str(kl.title) },
            !titelKarte && text(htmlLesen(str(kl.markupContent))),
            audio(medienPfad(kl.audioFilePath))
          ),
        };
      });
    case "multipleChoice":
      return [
        {
          id,
          bausteine: nur(bild(medienPfad(l.imageFilePath)), {
            art: "frage",
            frage: str(l.questionText),
            hinweis: null,
            darstellung: "liste",
            mischen: true,
            antworten: arr(d.options).map((o) => ({
              text: str(lokal(o).text),
              bild: null,
              symbol: null,
              richtig: obj(o).isCorrectOption === true,
            })),
            rueckmeldung: htmlLesen(str(l.markupExplanation)),
          }),
        },
      ];
    case "swipe": {
      const stimmt = d.correctSwipeChoice === true;
      return [
        {
          id,
          bausteine: nur(bild(medienPfad(l.imageFilePath)), {
            art: "frage",
            frage: str(l.questionText),
            hinweis: "Stimmt das?",
            darstellung: "paar",
            mischen: false,
            antworten: [
              { text: "Stimmt nicht", bild: null, symbol: "daumen-runter", richtig: !stimmt },
              { text: "Stimmt", bild: null, symbol: "daumen-hoch", richtig: stimmt },
            ],
            rueckmeldung: htmlLesen(str(l.markupExplanation)),
          }),
        },
      ];
    }
    case "hotspot": {
      const quelle = medienPfad(l.imageFilePath);
      if (!quelle) return null;
      return [
        {
          id,
          bausteine: [
            {
              art: "hotspot",
              titel: str(l.title) || null,
              bild: quelle,
              punkte: arr(d.hotspots).map((h) => ({
                x: Math.min(1, Math.max(0, Number(obj(h).xOffset) || 0)),
                y: Math.min(1, Math.max(0, Number(obj(h).yOffset) || 0)),
                inhalt: htmlLesen(str(lokal(h).markupContent)),
              })),
            },
          ],
        },
      ];
    }
    case "video": {
      const quelle = medienPfad(l.assetName ?? d.assetName);
      return quelle ? [{ id, bausteine: [{ art: "video", quelle, vorschau: medienPfad(l.thumbnailFilePath) }] }] : null;
    }
    case "audio": {
      const quelle = medienPfad(l.assetName ?? d.assetName);
      return quelle ? [{ id, bausteine: [{ art: "hoerbeitrag", quelle }] }] : null;
    }
    case "sort": {
      const elemente = sortiert(arr(d.items).map(obj), (e) => Number(e.correctIndex) || 0)
        .map((e) => str(lokal(e).text).trim())
        .filter(Boolean);
      if (elemente.length < 2) return null;
      return [
        {
          id,
          bausteine: [{ art: "sortieren", frage: str(l.questionText).trim(), elemente, rueckmeldung: htmlLesen(str(l.markupExplanation)) }],
        },
      ];
    }
    case "imagePicker":
      return [
        {
          id,
          bausteine: [
            {
              art: "frage",
              frage: str(l.questionText),
              hinweis: null,
              darstellung: "bilder",
              mischen: true,
              antworten: arr(d.imageOptions)
                .map((o) => ({ quelle: medienPfad(lokal(o).imageFilePath), richtig: obj(o).isCorrectOption === true }))
                .filter((o): o is { quelle: string; richtig: boolean } => !!o.quelle)
                .map((o, i) => ({ text: `Bild ${i + 1}`, bild: o.quelle, symbol: null, richtig: o.richtig })),
              rueckmeldung: htmlLesen(str(l.markupExplanation)),
            },
          ],
        },
      ];
    default:
      return null;
  }
}

export type ElephantErgebnis = { kurs: Lernkurs; uebersprungen: string[] };

/**
 * Baut den Lernkurs aus course.json, lesson_overviews.json und den LP-Dateien.
 * Elephant-Lektion = Kapitel, Modul = ein Schritt (Lernkarten: ein Schritt je
 * Karte). Unbekannte Modularten werden übersprungen und in `uebersprungen`
 * gezählt; leere Schritte und Kapitel fallen weg.
 */
export function elephantZuLernkurs(kurs: unknown, lektionen: unknown, lpDateien: unknown[]): ElephantErgebnis {
  const k = lokal(obj(kurs).data);
  const alleModule = lpDateien.flatMap((x) => arr(Array.isArray(x) ? x : [x])).map(obj);
  const uebersprungen: string[] = [];
  const kapitel = sortiert(arr(lektionen).map(obj), (l) => Number(l.sort_index) || 0)
    .map((lektion): Kapitel => {
      const lektionId = str(lektion.lesson_id);
      const schritte = sortiert(
        alleModule.filter((m) => m.lesson_id === lektionId && m.is_published !== false),
        (m) => Number(m.sort_index) || 0
      )
        .flatMap((m) => {
          const s = modulZuSchritten(m, str(m.module_id));
          if (!s) uebersprungen.push(str(m.module_type));
          return s ?? [];
        })
        .filter((s) => s.bausteine.length > 0);
      return { id: lektionId, titel: str(lokal(lektion.data).name).trim(), schritte };
    })
    .filter((kap) => kap.schritte.length > 0);
  return {
    kurs: { titel: str(k.name) || str(obj(kurs).course_name), beschreibung: str(k.description), kapitel },
    uebersprungen,
  };
}


// ---------------------------------------------------------------------------
// 3. HTML -> sichere Knoten (nur Text und erlaubte Tags, keine Attribute)

const ERLAUBT = new Set<string>(["h1", "h2", "h3", "p", "strong", "em", "u", "ul", "ol", "li", "br"]);
const GLEICH: Record<string, TextTag> = { b: "strong", i: "em", h4: "h3", h5: "h3", h6: "h3" };
const ENTITAETEN: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function entschluesseln(t: string): string {
  return t.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (ganz, c: string) => {
    if (c[0] === "#") {
      const n = c[1] === "x" || c[1] === "X" ? parseInt(c.slice(2), 16) : parseInt(c.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : "";
    }
    return ENTITAETEN[c.toLowerCase()] ?? ganz;
  });
}

export function htmlLesen(html: string): TextKnoten[] {
  const wurzel: { tag: TextTag | null; kinder: TextKnoten[] } = { tag: null, kinder: [] };
  const stapel: { tag: TextTag | null; kinder: TextKnoten[] }[] = [wurzel];
  for (const m of html.matchAll(/<(\/?)([a-zA-Z0-9]+)[^>]*?(\/?)>|([^<]+)|</g)) {
    const [, schliessen, rohTag, selbst, roh] = m;
    if (roh !== undefined || m[0] === "<") {
      const t = entschluesseln(roh ?? "<");
      if (t) stapel[stapel.length - 1].kinder.push(t);
      continue;
    }
    const name = rohTag.toLowerCase();
    const tag = (GLEICH[name] ?? name) as TextTag;
    if (!ERLAUBT.has(tag)) continue; // z. B. <img data-giphy-id>, <a>, <span>: weglassen, Text bleibt
    if (tag === "br") {
      stapel[stapel.length - 1].kinder.push({ tag: "br", kinder: [] });
    } else if (schliessen) {
      const i = stapel.map((s) => s.tag).lastIndexOf(tag);
      if (i > 0) stapel.length = i;
    } else if (!selbst) {
      const knoten = { tag, kinder: [] as TextKnoten[] };
      stapel[stapel.length - 1].kinder.push(knoten);
      stapel.push(knoten);
    }
  }
  return leereEntfernen(wurzel.kinder);
}

function leereEntfernen(knoten: TextKnoten[]): TextKnoten[] {
  const aufgeraeumt: TextKnoten[] = [];
  for (const k of knoten) {
    const neu = typeof k === "string" ? k : { tag: k.tag, kinder: leereEntfernen(k.kinder) };
    if (typeof neu === "string" ? neu.length === 0 : neu.tag !== "br" && neu.kinder.length === 0) continue;
    const letzter = aufgeraeumt[aufgeraeumt.length - 1];
    if (typeof neu === "string" && typeof letzter === "string") aufgeraeumt[aufgeraeumt.length - 1] = letzter + neu;
    else aufgeraeumt.push(neu);
  }
  return aufgeraeumt;
}
