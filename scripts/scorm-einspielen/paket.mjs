// scripts/scorm-einspielen/paket.mjs
// Reine Funktionen für scripts/scorm-einspielen.mjs (SR-50, SR-85): Manifest
// lesen, Speicherpfade bauen, Medien auswählen, Upload-Plan gegen den Bucket.
// Keine Datenbank, kein Dateisystem, keine Uhr. Getestet in paket.test.mjs.
// Anleitung: docs/scorm-einspielen.md.
//
// Pfad-Schema (verbindlich, die App liest genau so, src/lib/scorm-entpackt.ts):
//   Zip:         <lesson_id>/<speichername>.zip      (= file_asset.storage_pfad,
//                bucket-relativ ohne Bucketnamen, Konvention aus 0017)
//   Ausgepackt:  <storage_pfad>.entpackt/<innerer Zip-Pfad>
//                Audio, das nicht MP3/M4A ist (z. B. WAV): Endung .m4a, das
//                Original wird nicht hochgeladen.

import { posix } from "node:path";

import { istErlaubtesMedium } from "../../src/lib/elephant-kurs.ts";
import { entpacktPfad, entpackterInnererPfad } from "../../src/lib/scorm-entpackt.ts";

export { entpacktPfad, entpackterInnererPfad };

export const BUCKET = "scorm-packages";

/** Inhaltstypen wie in der Medien-Route (src/app/(learner)/content/[lessonId]/medium/route.ts). SVG nie. */
export const INHALTSTYP = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  mp4: "video/mp4",
};

/** Bekannte Elephant-Modularten (src/lib/elephant-kurs.ts, modulZuSchritten). */
export const BEKANNTE_MODULARTEN = ["page", "flashcards", "multipleChoice", "swipe", "hotspot", "video", "audio", "sort", "imagePicker"];

const endungVon = (pfad) => {
  const name = posix.basename(pfad);
  const punkt = name.lastIndexOf(".");
  return punkt > 0 ? name.slice(punkt + 1).toLowerCase() : "";
};

/** true, wenn das Medium vor dem Hochladen in M4A umgewandelt wird (Pfad ändert sich). */
export function mussUmwandeln(innererPfad) {
  return entpackterInnererPfad(innererPfad) !== innererPfad;
}

/** Inhaltstyp der Datei, wie sie im Bucket liegt (nach einer Umwandlung: audio/mp4); null = nicht erlaubt. */
export function inhaltstyp(zielPfad) {
  return INHALTSTYP[endungVon(zielPfad)] ?? null;
}

// ---------------------------------------------------------------------------
// Dateinamen und Pfade

const UMLAUTE = { ä: "ae", ö: "oe", ü: "ue", ß: "ss", Ä: "ae", Ö: "oe", Ü: "ue" };
const MAX_NAME = 120;

/**
 * Speichername der Zip im Bucket aus dem lokalen Dateinamen: nur a–z, 0–9 und
 * Bindestrich (Konvention docs/lernmaterialien-upload.md; Storage lehnt z. B.
 * Umlaute ab), Endung .zip. Wirft bei ungeeignetem Namen.
 * "Lernmodul 2_ Die Installation -2026-10-15T12_14_00_649Z.zip"
 *   -> "lernmodul-2-die-installation-2026-10-15t12-14-00-649z.zip"
 */
export function speicherName(dateiname) {
  const name = (dateiname ?? "").trim();
  if (!name) throw new Error("Dateiname fehlt.");
  if (name.includes("/") || name.includes("\\")) throw new Error(`„${name}“: nur der Dateiname, ohne Ordner.`);
  if (!/\.zip$/i.test(name)) throw new Error(`„${name}“: Die Datei muss auf .zip enden.`);
  const stamm = name
    .slice(0, -4)
    .replace(/[äöüßÄÖÜ]/g, (z) => UMLAUTE[z])
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_NAME)
    .replace(/-+$/, "");
  if (!stamm) throw new Error(`„${name}“: Aus dem Namen bleibt kein gültiger Speichername übrig.`);
  return `${stamm}.zip`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** file_asset.storage_pfad einer Lektion: "<lesson_id>/<speichername>". */
export function zipPfad(lessonId, speichername) {
  if (!UUID.test(lessonId ?? "")) throw new Error("lesson_id ist keine gültige UUID.");
  if (!/^[a-z0-9][a-z0-9-]*\.zip$/.test(speichername ?? "")) throw new Error("Speichername ungültig.");
  return `${lessonId}/${speichername}`;
}

/**
 * Objektname, den das Skript in den Bucket schreiben darf: nur ASCII-Buchstaben,
 * Ziffern, Punkt, Bindestrich, Unterstrich und Schrägstrich; keine leeren
 * Teile, kein "." oder "..", höchstens 1024 Zeichen. Strenger als Supabase.
 */
export function objektNameGueltig(name) {
  if (typeof name !== "string" || !name || name.length > 1024) return false;
  if (!/^[A-Za-z0-9._\-/]+$/.test(name)) return false;
  return name.split("/").every((teil) => teil !== "" && teil !== "." && teil !== "..");
}

// ---------------------------------------------------------------------------
// imsmanifest.xml

const ENTITAETEN = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function entschluesseln(t) {
  return t.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (ganz, c) => {
    if (c[0] === "#") {
      const n = c[1] === "x" || c[1] === "X" ? parseInt(c.slice(2), 16) : parseInt(c.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : "";
    }
    return ENTITAETEN[c.toLowerCase()] ?? ganz;
  });
}

/** Attribute eines Start-Tags ("<x a="1" b='2'>") -> { a: "1", b: "2" } (Namen klein, ohne Präfix-Änderung). */
function attribute(tag) {
  const a = {};
  for (const m of tag.matchAll(/([A-Za-z_:][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)')/g)) a[m[1].toLowerCase()] = entschluesseln(m[3] ?? m[4]);
  return a;
}

/** Erstes <title> direkt im Text (vor dem ersten <item>), Text entschlüsselt. */
function titelVor(text) {
  const bis = text.search(/<item[\s>]/i);
  const m = /<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/i.exec(bis >= 0 ? text.slice(0, bis) : text);
  if (!m) return null;
  const t = entschluesseln(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
  return t || null;
}

/**
 * Liest SCORM-Version, Titel und Einstiegsdatei aus imsmanifest.xml.
 * Einstieg = href der Ressource, auf die das erste Item der Standard-
 * Organisation zeigt; Rückfall: erste Ressource mit href. Gibt
 * { version, titel, entryPoint } zurück, wirft bei fehlendem Einstieg.
 */
export function leseManifest(xml) {
  const text = (xml ?? "").replace(/^﻿/, "").replace(/<!--[\s\S]*?-->/g, "");
  if (!/<manifest[\s>]/i.test(text)) throw new Error("imsmanifest.xml: kein <manifest>.");
  const version = /<schemaversion>\s*([^<]*?)\s*<\/schemaversion>/i.exec(text)?.[1] ?? null;

  const orgsTag = /<organizations(?:\s[^>]*)?>/i.exec(text);
  const standard = orgsTag ? attribute(orgsTag[0]).default : undefined;
  const orgs = [...text.matchAll(/<organization(\s[^>]*)?>([\s\S]*?)<\/organization>/gi)].map((m) => ({
    id: attribute(`<x${m[1] ?? ""}>`).identifier,
    inhalt: m[2],
  }));
  const org = orgs.find((o) => standard && o.id === standard) ?? orgs[0];

  const ressourcen = [...text.matchAll(/<resource(\s[^>]*?)\/?>/gi)].map((m) => attribute(`<x${m[1]}>`));
  let ressource;
  if (org) {
    const item = /<item(\s[^>]*?)\/?>/i.exec(org.inhalt);
    const ref = item ? attribute(`<x${item[1]}>`).identifierref : undefined;
    ressource = ressourcen.find((r) => ref && r.identifier === ref && r.href);
  }
  ressource ??= ressourcen.find((r) => r.href);
  const entryPoint = ressource?.href?.trim();
  if (!entryPoint) throw new Error("imsmanifest.xml: keine Einstiegsdatei (resource href) gefunden.");
  if (/^[a-z][a-z0-9+.-]*:/i.test(entryPoint) || entryPoint.startsWith("/") || entryPoint.split(/[?#]/)[0].split("/").includes("..")) {
    throw new Error(`imsmanifest.xml: Einstiegsdatei „${entryPoint}“ liegt nicht im Paket.`);
  }
  const titel = (org ? titelVor(org.inhalt) : null) ?? titelVor(text.replace(/<organizations[\s\S]*$/i, ""));
  return { version, titel, entryPoint };
}

/** Datei-Teil der Einstiegsdatei ohne ?… und #… (zum Prüfen, ob sie im Zip liegt). */
export function einstiegsDatei(entryPoint) {
  return entryPoint.split(/[?#]/)[0];
}

// ---------------------------------------------------------------------------
// Medien

/**
 * Wählt die Medien zum Auspacken: Pfade, die der Kurs nutzt (kursMedien),
 * die istErlaubtesMedium erlaubt und die im Zip liegen. Gibt
 * { medien: [{ innen, ziel, groesse, umwandeln, typ }], meldungen } zurück
 * (ziel = innerer Pfad im Bucket nach einer Umwandlung).
 *
 * @param genutzt    Iterable der Medien-Schlüssel des Kurses (Zip-Pfade)
 * @param eintraege  Map Zip-Pfad -> { groesse } (aus dem Zip-Verzeichnis)
 */
export function waehleMedien(genutzt, eintraege) {
  const medien = [];
  const meldungen = [];
  const ziele = new Map();
  for (const innen of [...new Set(genutzt)].sort()) {
    if (!istErlaubtesMedium(innen)) {
      meldungen.push(`${innen}: kein erlaubter Medienpfad, wird nicht ausgepackt.`);
      continue;
    }
    const e = eintraege.get(innen);
    if (!e) {
      meldungen.push(`${innen}: vom Kurs genutzt, fehlt aber im Paket.`);
      continue;
    }
    const umwandeln = mussUmwandeln(innen);
    const ziel = entpackterInnererPfad(innen);
    const typ = inhaltstyp(ziel);
    if (!typ) {
      meldungen.push(`${innen}: Dateityp nicht erlaubt (erlaubt: ${Object.keys(INHALTSTYP).join(", ")}), wird nicht ausgepackt (bleibt im Zip).`);
      continue;
    }
    if (ziele.has(ziel)) {
      meldungen.push(`${innen}: ergibt denselben Zielnamen wie ${ziele.get(ziel)} (${ziel}), wird nicht ausgepackt.`);
      continue;
    }
    ziele.set(ziel, innen);
    medien.push({ innen, ziel, groesse: e.groesse, umwandeln, typ });
  }
  return { medien, meldungen };
}

/** Zählt Elephant-Modularten (nur veröffentlichte Module) -> [[art, anzahl, bekannt]] absteigend. */
export function zaehleModularten(lpDateien) {
  const zaehler = new Map();
  for (const datei of lpDateien) {
    for (const m of Array.isArray(datei) ? datei : [datei]) {
      if (!m || typeof m !== "object" || m.is_published === false) continue;
      const art = typeof m.module_type === "string" ? m.module_type : "(ohne Art)";
      zaehler.set(art, (zaehler.get(art) ?? 0) + 1);
    }
  }
  return [...zaehler].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([art, n]) => [art, n, BEKANNTE_MODULARTEN.includes(art)]);
}

// ---------------------------------------------------------------------------
// Upload-Plan

/**
 * Vergleicht die erwarteten Objekte mit denen im Bucket. Nie überschreiben:
 * Liegt ein Objekt schon da, zählt es nur bei gleicher Größe als vorhanden,
 * sonst als Konflikt. groesse null (umgewandeltes Audio, Größe erst nach der
 * Umwandlung bekannt) = nur das Vorhandensein zählt.
 *
 * @param erwartet  [{ name, groesse }]
 * @param vorhanden [{ name, groesse }] aus storage.objects (metadata->>'size')
 * @returns { hochladen, vorhanden, konflikte: [{ name, erwartet, gefunden }], fremd: [name] }
 */
export function planeUploads(erwartet, vorhanden) {
  const imBucket = new Map(vorhanden.map((o) => [o.name, o.groesse == null ? null : Number(o.groesse)]));
  const plan = { hochladen: [], vorhanden: [], konflikte: [], fremd: [] };
  const namen = new Set();
  for (const o of erwartet) {
    if (namen.has(o.name)) throw new Error(`Objekt ${o.name} doppelt geplant.`);
    namen.add(o.name);
    if (!imBucket.has(o.name)) plan.hochladen.push(o);
    else if (o.groesse == null || imBucket.get(o.name) === Number(o.groesse)) plan.vorhanden.push(o);
    else plan.konflikte.push({ name: o.name, erwartet: o.groesse, gefunden: imBucket.get(o.name) });
  }
  plan.fremd = [...imBucket.keys()].filter((n) => !namen.has(n)).sort();
  return plan;
}

/** "1234567" -> "1,2 MB" (für die Ausgabe). */
export function groesseText(bytes) {
  if (bytes == null) return "?";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
