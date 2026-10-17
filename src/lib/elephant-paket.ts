// Server-Teil der nativen Selbstlern-Ansicht (SR-85): liest das eigene
// SCORM-Paket einer Lektion stückweise per Range-Request aus der signierten
// URL (privater Bucket scorm-packages, Rechte per RLS, siehe
// src/lib/queries/scorm-paket.ts) und liefert einen `Lernkurs` oder einzelne
// Medien. Das Paket wird nie ganz geladen und nirgends abgelegt.
//
// Speicher und Serverless (Vercel: mehrere Instanzen, begrenzter Speicher,
// Instanzen kommen und gehen):
// - Alles hier ist nur ein Zwischenspeicher je Instanz. Nichts verlässt sich
//   darauf, dass ein früherer Aufruf auf derselben Instanz lief; fehlt ein
//   Eintrag, wird er aus dem Paket neu gelesen.
// - Rechte stehen hier nie im Speicher: Wer etwas lesen will, bringt eine
//   frisch mit seiner Session signierte URL mit. Die Schlüssel sind
//   Speicherpfade, kein Token und keine Person.
// - Paket-Verzeichnis und Kurs: höchstens PAKETE_MAX Pakete, 30 Minuten.
// - Medien: LRU, zusammen höchstens 30 MB, je Medium höchstens 4 MB. Größere
//   ungepackte Medien (Video, lange Audios) werden je Anfrage als Teilbereich
//   direkt aus dem Paket gelesen; gepackte nur bis MAX_ENTPACKT.

import {
  datenBeginn,
  eintragLesen,
  elephantZuLernkurs,
  istElephantPaket,
  verzeichnisLage,
  verzeichnisLesen,
  KURS_ORDNER,
  type BereichLeser,
  type ZipEintrag,
} from "@/lib/elephant-kurs";
import { kursMedien, type Lernkurs } from "@/lib/lernkurs";

type Paket = { eintraege: Map<string, ZipEintrag>; kurs: Lernkurs | null; medien: Set<string>; geladen: number };

const HALTBAR_MS = 30 * 60 * 1000;
const PAKETE_MAX = 8;
const MEDIEN_SPEICHER_MAX = 30 * 1024 * 1024;
const MEDIUM_MAX = 4 * 1024 * 1024;
const MAX_ENTPACKT = 64 * 1024 * 1024;

const pakete = new Map<string, Paket>();
const paketeUnterwegs = new Map<string, Promise<Paket>>();
const medienSpeicher = new Map<string, Uint8Array>();
const medienUnterwegs = new Map<string, Promise<Uint8Array>>();
let medienSpeicherBelegt = 0;

function leser(url: string): BereichLeser {
  return async (start, laenge) => {
    const antwort = await fetch(url, { headers: { Range: `bytes=${start}-${start + laenge - 1}` }, cache: "no-store" });
    if (antwort.status !== 206) {
      await antwort.body?.cancel();
      throw new Error(`Speicher liefert keinen Teilbereich (${antwort.status})`);
    }
    return new Uint8Array(await antwort.arrayBuffer());
  };
}

async function paketLesen(url: string): Promise<Paket> {
  // Ende des Pakets (Suffix-Bereich): darin steht, wo das Verzeichnis liegt.
  const antwort = await fetch(url, { headers: { Range: "bytes=-66000" }, cache: "no-store" });
  if (antwort.status !== 206) {
    await antwort.body?.cancel();
    throw new Error(`Speicher liefert keinen Teilbereich (${antwort.status})`);
  }
  const ende = new Uint8Array(await antwort.arrayBuffer());
  const lies = leser(url);
  const lage = verzeichnisLage(ende);
  const eintraege = new Map(verzeichnisLesen(await lies(lage.offset, lage.groesse)).map((e) => [e.name, e]));

  let kurs: Lernkurs | null = null;
  if (istElephantPaket(eintraege.keys())) {
    const json = async (e: ZipEintrag) => JSON.parse(new TextDecoder().decode(await eintragLesen(lies, e)));
    const pflicht = (n: string) => {
      const e = eintraege.get(`${KURS_ORDNER}${n}`);
      if (!e) throw new Error(`${n} fehlt im Paket`);
      return e;
    };
    const lp = await Promise.all([...eintraege.values()].filter((e) => e.name.startsWith(`${KURS_ORDNER}LP_`)).map(json));
    kurs = elephantZuLernkurs(await json(pflicht("course.json")), await json(pflicht("lesson_overviews.json")), lp).kurs;
    if (kurs.kapitel.length === 0) kurs = null;
  }
  return { eintraege, kurs, medien: kurs ? kursMedien(kurs) : new Set(), geladen: Date.now() };
}

async function paketOeffnen(speicherPfad: string, url: string): Promise<Paket> {
  const alt = pakete.get(speicherPfad);
  if (alt && Date.now() - alt.geladen < HALTBAR_MS) return alt;
  const laeuft = paketeUnterwegs.get(speicherPfad);
  if (laeuft) return laeuft;

  const ladung = paketLesen(url);
  paketeUnterwegs.set(speicherPfad, ladung);
  try {
    const paket = await ladung;
    pakete.delete(speicherPfad);
    pakete.set(speicherPfad, paket);
    while (pakete.size > PAKETE_MAX) pakete.delete(pakete.keys().next().value!);
    return paket;
  } finally {
    paketeUnterwegs.delete(speicherPfad);
  }
}

/**
 * Lernkurs aus dem SCORM-Paket, wenn es ein Elephant-Paket ist; sonst null
 * (dann bleibt es beim SCORM-Player). Fehler beim Lesen -> ebenfalls null.
 */
export async function lernkursLaden(speicherPfad: string, signierteUrl: string): Promise<Lernkurs | null> {
  try {
    return (await paketOeffnen(speicherPfad, signierteUrl)).kurs;
  } catch (fehler) {
    // Keine personenbezogenen Daten, keine URL, kein Pfad (CLAUDE.md Regel 9).
    console.error("Selbstlern-Paket nicht lesbar:", fehler instanceof Error ? fehler.message : "unbekannt");
    return null;
  }
}

function merken(key: string, daten: Uint8Array) {
  if (daten.length > MEDIUM_MAX) return;
  const alt = medienSpeicher.get(key);
  if (alt) medienSpeicherBelegt -= alt.length;
  medienSpeicher.delete(key);
  medienSpeicher.set(key, daten);
  medienSpeicherBelegt += daten.length;
  // Älteste zuerst hinaus (Map hält die Einfüge-Reihenfolge).
  while (medienSpeicherBelegt > MEDIEN_SPEICHER_MAX) {
    const [k, v] = medienSpeicher.entries().next().value!;
    medienSpeicher.delete(k);
    medienSpeicherBelegt -= v.length;
  }
}

function gemerkt(key: string): Uint8Array | undefined {
  const daten = medienSpeicher.get(key);
  if (daten) {
    // Zuletzt benutzt -> ans Ende.
    medienSpeicher.delete(key);
    medienSpeicher.set(key, daten);
  }
  return daten;
}

export type Medium = {
  groesse: number;
  /** Bytes [start, ende] (beide einschließlich). */
  lesen: (start: number, ende: number) => Promise<Uint8Array>;
};

/**
 * Ein Medium des Kurses (Bild, Audio, Video); null, wenn das Paket kein
 * Elephant-Kurs ist oder der Kurs das Medium nicht nutzt.
 */
export async function mediumOeffnen(speicherPfad: string, signierteUrl: string, pfad: string): Promise<Medium | null> {
  const paket = await paketOeffnen(speicherPfad, signierteUrl);
  if (!paket.medien.has(pfad)) return null;
  const eintrag = paket.eintraege.get(pfad);
  if (!eintrag || (eintrag.methode !== 0 && eintrag.methode !== 8)) return null;
  const lies = leser(signierteUrl);
  const key = `${speicherPfad}#${pfad}`;

  async function ganz(): Promise<Uint8Array> {
    const da = gemerkt(key);
    if (da) return da;
    // Läuft dasselbe Medium schon (mehrere Anfragen gleichzeitig): mitwarten.
    const laeuft = medienUnterwegs.get(key);
    if (laeuft) return laeuft;
    if (eintrag!.groesse > MAX_ENTPACKT) throw new Error("Medium zu groß");
    const ladung = eintragLesen(lies, eintrag!);
    medienUnterwegs.set(key, ladung);
    try {
      const daten = await ladung;
      merken(key, daten);
      return daten;
    } finally {
      medienUnterwegs.delete(key);
    }
  }

  return {
    groesse: eintrag.groesse,
    async lesen(start, ende) {
      const da = gemerkt(key);
      if (da) return da.subarray(start, ende + 1);
      // Ungepackt und groß: nur den Teilbereich aus dem Paket lesen.
      if (eintrag.methode === 0 && eintrag.groesse > MEDIUM_MAX) {
        const beginn = await datenBeginn(lies, eintrag);
        return lies(beginn + start, ende - start + 1);
      }
      return (await ganz()).subarray(start, ende + 1);
    },
  };
}
