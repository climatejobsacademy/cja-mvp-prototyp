// scripts/scorm-einspielen/zip.mjs
// Lokales Lesen der SCORM-Pakete für scripts/scorm-einspielen.mjs (SR-50,
// SR-85): Zip-Verzeichnis, imsmanifest.xml, Elephant-Kurs und Medienliste;
// Medien in einen eigenen Arbeitsordner auspacken; Audio mit macOS afconvert
// in M4A umwandeln. Liest nur lokale Dateien, keine Datenbank, kein Netz.
//
// Den Zip-Leser und den Elephant-Übersetzer teilt sich das Skript mit der App
// (src/lib/elephant-kurs.ts, src/lib/lernkurs.ts): Ausgepackt wird genau, was
// die native Ansicht nutzt.

import { spawnSync } from "node:child_process";
import { closeSync, existsSync, fstatSync, mkdirSync, openSync, readSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  eintragLesen,
  elephantZuLernkurs,
  istElephantPaket,
  KURS_ORDNER,
  verzeichnisLage,
  verzeichnisLesen,
} from "../../src/lib/elephant-kurs.ts";
import { kursMedien } from "../../src/lib/lernkurs.ts";
import { einstiegsDatei, leseManifest, waehleMedien, zaehleModularten } from "./paket.mjs";

export const AFCONVERT = "/usr/bin/afconvert";
/** Umwandlung: M4A-Container, AAC, 96 kbit/s (Entscheidung Anna 2026-10-17). */
export const AFCONVERT_ARGS = ["-f", "m4af", "-d", "aac", "-b", "96000"];

/** Öffnet eine Zip-Datei zum stückweisen Lesen. Schließen mit .schliessen(). */
export function oeffneZip(pfad) {
  const fd = openSync(pfad, "r");
  const groesse = fstatSync(fd).size;
  const lies = async (start, laenge) => {
    const n = Math.max(0, Math.min(laenge, groesse - start));
    const puffer = Buffer.alloc(n);
    let gelesen = 0;
    while (gelesen < n) {
      const r = readSync(fd, puffer, gelesen, n - gelesen, start + gelesen);
      if (r === 0) break;
      gelesen += r;
    }
    return new Uint8Array(puffer.buffer, puffer.byteOffset, gelesen);
  };
  return { groesse, lies, schliessen: () => closeSync(fd) };
}

/**
 * Analysiert ein Paket. Gibt zurück:
 * { groesse, anzahlDateien, manifest: { version, titel, entryPoint }, fehler: [], hinweise: [],
 *   elephant: null | { titel, kapitel, schritte, modularten, uebersprungen, nativ },
 *   medien: [{ innen, ziel, groesse, umwandeln, typ }] }
 * fehler = Gründe, das Paket nicht einzuspielen; medien nur bei nativ (sonst leer).
 */
export async function analysierePaket(pfad) {
  const zip = oeffneZip(pfad);
  const fehler = [];
  const hinweise = [];
  try {
    const ende = await zip.lies(Math.max(0, zip.groesse - 66000), 66000);
    const lage = verzeichnisLage(ende);
    if (lage.offset === 0xffffffff || lage.groesse === 0xffffffff) throw new Error("ZIP64 wird nicht unterstützt.");
    const liste = verzeichnisLesen(await zip.lies(lage.offset, lage.groesse));
    const eintraege = new Map(liste.map((e) => [e.name, e]));
    const json = async (e) => JSON.parse(new TextDecoder().decode(await eintragLesen(zip.lies, e)));

    for (const e of liste) {
      if (e.name.startsWith("/") || e.name.split("/").includes("..")) fehler.push(`Unsicherer Pfad im Zip: ${e.name}`);
    }

    let manifest = null;
    const m = eintraege.get("imsmanifest.xml");
    if (!m) {
      fehler.push("imsmanifest.xml fehlt im Paket (kein SCORM-Paket?).");
    } else {
      try {
        manifest = leseManifest(new TextDecoder().decode(await eintragLesen(zip.lies, m)));
        if (!eintraege.has(einstiegsDatei(manifest.entryPoint))) fehler.push(`Einstiegsdatei ${manifest.entryPoint} fehlt im Paket.`);
        if (manifest.version && !manifest.version.startsWith("1.2")) hinweise.push(`SCORM-Version „${manifest.version}“ (der Player erwartet 1.2).`);
      } catch (f) {
        fehler.push(f.message);
      }
    }

    let elephant = null;
    let medien = [];
    if (istElephantPaket(eintraege.keys())) {
      const pflicht = (n) => {
        const e = eintraege.get(`${KURS_ORDNER}${n}`);
        if (!e) throw new Error(`${n} fehlt im Paket`);
        return e;
      };
      try {
        const lp = [];
        for (const e of liste) if (e.name.startsWith(`${KURS_ORDNER}LP_`)) lp.push(await json(e));
        const ergebnis = elephantZuLernkurs(await json(pflicht("course.json")), await json(pflicht("lesson_overviews.json")), lp);
        // Wie src/lib/elephant-paket.ts: nur ohne übersprungene Modulart und mit
        // Inhalt zeigt die App die native Ansicht, sonst den SCORM-Player.
        const nativ = ergebnis.uebersprungen.length === 0 && ergebnis.kurs.kapitel.length > 0;
        elephant = {
          titel: ergebnis.kurs.titel,
          kapitel: ergebnis.kurs.kapitel.length,
          schritte: ergebnis.kurs.kapitel.reduce((n, k) => n + k.schritte.length, 0),
          modularten: zaehleModularten(lp),
          uebersprungen: ergebnis.uebersprungen,
          nativ,
        };
        if (nativ) {
          const auswahl = waehleMedien(kursMedien(ergebnis.kurs), eintraege);
          medien = auswahl.medien;
          hinweise.push(...auswahl.meldungen);
          for (const md of medien) {
            const e = eintraege.get(md.innen);
            if (e.methode !== 0 && e.methode !== 8) fehler.push(`${md.innen}: Packverfahren ${e.methode} nicht unterstützt.`);
          }
        }
      } catch (f) {
        fehler.push(`Elephant-Kursdaten nicht lesbar: ${f.message}`);
      }
    }
    return { groesse: zip.groesse, anzahlDateien: liste.length, manifest, fehler, hinweise, elephant, medien };
  } catch (f) {
    fehler.push(`Zip nicht lesbar: ${f.message}`);
    return { groesse: zip.groesse, anzahlDateien: 0, manifest: null, fehler, hinweise, elephant: null, medien: [] };
  } finally {
    zip.schliessen();
  }
}

export function afconvertVorhanden() {
  return existsSync(AFCONVERT);
}

/** Wandelt eine Audiodatei in M4A (AAC) um. Wirft bei Fehler; gibt die Größe des Ergebnisses zurück. */
export function wandleUm(quelle, ziel) {
  mkdirSync(dirname(ziel), { recursive: true });
  const r = spawnSync(AFCONVERT, [...AFCONVERT_ARGS, quelle, ziel], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (r.status !== 0) throw new Error(`afconvert fehlgeschlagen (${(r.stderr || r.stdout || "").trim().split("\n").at(-1) || `Status ${r.status}`}).`);
  return statSync(ziel).size;
}

/**
 * Packt die gewählten Medien eines Pakets in den Ordner `ziel` aus (Pfade =
 * Zielpfade im Bucket, also nach einer Umwandlung mit .m4a) und wandelt
 * Audio um. Das Original umzuwandelnder Dateien liegt nur kurz im Ordner und
 * wird danach gelöscht. Gibt [{ ...medium, datei, groesseZiel }] zurück.
 */
export async function packeMedienAus(pfad, medien, ziel, fortschritt = () => {}) {
  const zip = oeffneZip(pfad);
  try {
    const ende = await zip.lies(Math.max(0, zip.groesse - 66000), 66000);
    const lage = verzeichnisLage(ende);
    const eintraege = new Map(verzeichnisLesen(await zip.lies(lage.offset, lage.groesse)).map((e) => [e.name, e]));
    const ergebnis = [];
    for (const md of medien) {
      const e = eintraege.get(md.innen);
      if (!e) throw new Error(`${md.innen} fehlt im Paket.`);
      const daten = await eintragLesen(zip.lies, e);
      if (daten.length !== e.groesse) throw new Error(`${md.innen}: ausgepackte Größe stimmt nicht.`);
      const datei = join(ziel, md.ziel);
      mkdirSync(dirname(datei), { recursive: true });
      if (md.umwandeln) {
        const roh = join(ziel, ".roh", md.innen);
        mkdirSync(dirname(roh), { recursive: true });
        writeFileSync(roh, daten);
        try {
          ergebnis.push({ ...md, datei, groesseZiel: wandleUm(roh, datei) });
        } finally {
          rmSync(roh, { force: true });
        }
      } else {
        writeFileSync(datei, daten);
        ergebnis.push({ ...md, datei, groesseZiel: daten.length });
      }
      fortschritt(md);
    }
    return ergebnis;
  } finally {
    zip.schliessen();
  }
}
