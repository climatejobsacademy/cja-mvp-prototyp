// Server-Teil der nativen Selbstlern-Lektion (VORLÄUFIG, nur Demo, Anna
// 2026-10-15; SR folgt): liest ein Elephant-SCORM-Paket stückweise aus dem
// privaten Bucket scorm-packages (signierte URL aus getLessonDetail, RLS wie
// beim SCORM-Player). Das Paket wird nie ganz geladen und nirgends abgelegt;
// nur Verzeichnis, Kursinhalt und kleine Medien bleiben kurz im Speicher
// des Servers.

import {
  eintragLesen,
  istElephantPaket,
  kursAufbauen,
  kursMedien,
  verzeichnisLage,
  verzeichnisLesen,
  KURS_ORDNER,
  type BereichLeser,
  type ElephantKurs,
  type ZipEintrag,
} from "@/lib/elephant-kurs";

type Paket = { eintraege: Map<string, ZipEintrag>; kurs: ElephantKurs | null; medien: Set<string>; geladen: number };

const HALTBAR_MS = 30 * 60 * 1000;
const pakete = new Map<string, Paket>();
const medienSpeicher = new Map<string, Uint8Array>();
const unterwegs = new Map<string, Promise<Uint8Array>>();
const MEDIEN_SPEICHER_MAX = 150 * 1024 * 1024;
let medienSpeicherBelegt = 0;

/** Schlüssel ohne Token: die signierte URL ändert sich bei jedem Aufruf, der Pfad nicht. */
const schluessel = (signierteUrl: string) => signierteUrl.split("?")[0];

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

async function paketOeffnen(url: string): Promise<Paket> {
  const alt = pakete.get(schluessel(url));
  if (alt && Date.now() - alt.geladen < HALTBAR_MS) return alt;

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

  let kurs: ElephantKurs | null = null;
  if (istElephantPaket(eintraege.keys())) {
    const json = async (e: ZipEintrag) => JSON.parse(new TextDecoder().decode(await eintragLesen(lies, e)));
    const pflicht = (n: string) => {
      const e = eintraege.get(`${KURS_ORDNER}${n}`);
      if (!e) throw new Error(`${n} fehlt im Paket`);
      return e;
    };
    const lp = await Promise.all([...eintraege.values()].filter((e) => e.name.startsWith(`${KURS_ORDNER}LP_`)).map(json));
    kurs = kursAufbauen(await json(pflicht("course.json")), await json(pflicht("lesson_overviews.json")), lp);
    if (kurs.kapitel.length === 0) kurs = null;
  }

  const paket: Paket = { eintraege, kurs, medien: kurs ? kursMedien(kurs) : new Set(), geladen: Date.now() };
  pakete.set(schluessel(url), paket);
  return paket;
}

/**
 * Kurs aus einem SCORM-Paket, wenn es ein Elephant-Paket ist; sonst null
 * (dann bleibt es beim SCORM-Player). Fehler beim Lesen -> ebenfalls null.
 */
export async function elephantKursLaden(signierteUrl: string): Promise<ElephantKurs | null> {
  try {
    return (await paketOeffnen(signierteUrl)).kurs;
  } catch (fehler) {
    // Keine personenbezogenen Daten: nur die Fehlermeldung, keine URL.
    console.error("Elephant-Paket nicht lesbar:", fehler instanceof Error ? fehler.message : "unbekannt");
    return null;
  }
}

/** Ein Medium des Kurses (Bild, Audio, Video); null, wenn es nicht zum Kurs gehört. */
export async function elephantMediumLaden(signierteUrl: string, pfad: string): Promise<Uint8Array | null> {
  const paket = await paketOeffnen(signierteUrl);
  if (!paket.medien.has(pfad)) return null;
  const eintrag = paket.eintraege.get(pfad);
  if (!eintrag) return null;

  const key = `${schluessel(signierteUrl)}#${pfad}`;
  const gemerkt = medienSpeicher.get(key);
  if (gemerkt) return gemerkt;
  // Läuft dasselbe Medium schon (Vorwärmen und Browser gleichzeitig): mitwarten.
  const laeuft = unterwegs.get(key);
  if (laeuft) return laeuft;

  const ladung = eintragLesen(leser(signierteUrl), eintrag);
  unterwegs.set(key, ladung);
  let daten: Uint8Array;
  try {
    daten = await ladung;
  } finally {
    unterwegs.delete(key);
  }
  // Einfacher Speicher: wird er zu voll, fängt er von vorn an.
  if (medienSpeicherBelegt + daten.length > MEDIEN_SPEICHER_MAX) {
    medienSpeicher.clear();
    medienSpeicherBelegt = 0;
  }
  if (daten.length < MEDIEN_SPEICHER_MAX / 4) {
    medienSpeicher.set(key, daten);
    medienSpeicherBelegt += daten.length;
  }
  return daten;
}

// ---------------------------------------------------------------------------
// Schneller Start (Anna 2026-10-15: das erste Bild kam spät)

const zugriff = new Map<string, { url: string; bis: number }>();

/**
 * Merkt sich die signierte URL einer Lektion für eine Person. Die Seite hat
 * den Zugriff beim Laden schon per RLS geprüft; die Medien-Route muss das
 * dann nicht für jedes Bild wiederholen.
 */
export function zugriffMerken(personId: string, lessonId: string, signierteUrl: string, gueltigMs: number) {
  zugriff.set(`${personId}:${lessonId}`, { url: signierteUrl, bis: Date.now() + gueltigMs });
}

export function zugriffHolen(personId: string, lessonId: string): string | null {
  const z = zugriff.get(`${personId}:${lessonId}`);
  return z && z.bis > Date.now() ? z.url : null;
}

/** Lädt die ersten Bilder schon in den Speicher, während der Browser die Seite aufbaut. */
export async function medienVorwaermen(signierteUrl: string, pfade: string[]) {
  await Promise.all(pfade.map((p) => elephantMediumLaden(signierteUrl, p).catch(() => null)));
}
