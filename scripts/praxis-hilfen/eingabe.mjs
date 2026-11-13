// scripts/praxis-hilfen/eingabe.mjs
// Reine Hilfsfunktionen für scripts/praxis-hilfen.mjs (SR-68, SR-94): Liste
// lesen und prüfen, Speichernamen und Formate. Ohne Datenbank, testbar mit
// node:test (eingabe.test.mjs).

import { zerlegeCsv } from "../live-links/eingabe.mjs";

export const BUCKET = "lesson-resources";
export const MAX_BYTES = 52428800;

// Wie der Bucket lesson-resources (0023).
export const FORMATE = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

const UMLAUTE = { ä: "ae", ö: "oe", ü: "ue", ß: "ss", Ä: "ae", Ö: "oe", Ü: "ue" };

/** Endung in Kleinbuchstaben, sonst "". */
export function endung(name) {
  const m = /\.([A-Za-z0-9]{1,5})$/.exec(name ?? "");
  return m ? m[1].toLowerCase() : "";
}

/** MIME-Typ aus der Endung, null bei nicht erlaubtem Format. */
export function mimeTyp(name) {
  return FORMATE[endung(name)] ?? null;
}

/** Ein Namensteil als Speichername: nur a–z, Ziffern und Bindestriche. */
function kuerzel(teil) {
  return teil
    .replace(/[äöüßÄÖÜ]/g, (z) => UMLAUTE[z])
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/, "");
}

/**
 * Pfad relativ zum Ordner der Dateien, "Datei" oder "Ordner/Datei"
 * (auch mehrere Ordner; "\" zählt wie "/"). Gibt die Teile zurück; kein
 * absoluter Pfad, kein "." oder "..", keine leeren Teile.
 */
export function pfadTeile(dateipfad) {
  const pfad = (dateipfad ?? "").trim().replace(/\\/g, "/");
  if (!pfad) throw new Error("Dateiname fehlt.");
  const teile = pfad.split("/").map((t) => t.trim());
  if (pfad.startsWith("/") || teile.some((t) => !t || t === "." || t === "..")) {
    throw new Error(`„${dateipfad}“: nur „Datei“ oder „Ordner/Datei“ innerhalb des Ordners, ohne „..“ und ohne „/“ am Anfang.`);
  }
  return teile;
}

/**
 * Objektname im Bucket: "praxis-hilfen/[<ordner>/]<name>", jeder Teil nur
 * a–z, Ziffern und Bindestriche, Endung klein. Gleicher Pfad ergibt gleichen
 * Objektnamen; so erkennt ein neuer Lauf schon hochgeladene Dateien. Gleiche
 * Dateinamen in verschiedenen Ordnern bleiben getrennt.
 */
export function objektName(dateipfad) {
  const teile = pfadTeile(dateipfad);
  const name = teile.pop();
  const e = endung(name);
  if (!FORMATE[e]) throw new Error(`„${dateipfad}“: Format nicht erlaubt (erlaubt: ${Object.keys(FORMATE).join(", ")}).`);
  const stamm = kuerzel(name.slice(0, -(e.length + 1)));
  const ordner = teile.map(kuerzel);
  if (!stamm || ordner.some((o) => !o)) throw new Error(`„${dateipfad}“: Aus dem Namen bleibt kein gültiger Speichername übrig.`);
  return ["praxis-hilfen", ...ordner, `${stamm}.${e === "jpeg" ? "jpg" : e}`].join("/");
}

/** Angezeigter Dateiname: nur der letzte Teil des Pfads. */
export function anzeigeName(dateipfad) {
  return pfadTeile(dateipfad).at(-1);
}

/** Nur https-Links mit Host. */
export function linkGueltig(wert) {
  try {
    const u = new URL(wert);
    return u.protocol === "https:" && u.hostname.length > 0;
  } catch {
    return false;
  }
}

/**
 * Liest die Zuordnungsliste. Spalten (Kopfzeile, Groß-/Kleinschreibung egal):
 * aufgabe_titel; reihenfolge; titel; datei; link. Je Zeile genau eine von
 * datei und link; datei ist "Datei" oder "Ordner/Datei" im Ordner der Dateien. Gibt { eintraege, fehler } zurück; bei Fehlern bricht das
 * Skript vor jeder Datenbankverbindung ab.
 */
export function leseZuordnung(text) {
  const zeilen = zerlegeCsv(text).filter((z) => z.zellen.some((x) => x !== ""));
  const kopfZeile = zeilen.shift();
  if (!kopfZeile) return { eintraege: [], fehler: ["Die Liste ist leer."] };
  const kopf = kopfZeile.zellen.map((k) => k.toLowerCase());
  const spalte = (n) => kopf.indexOf(n);
  const fehlend = ["aufgabe_titel", "reihenfolge", "titel", "datei", "link"].filter((n) => spalte(n) < 0);
  if (fehlend.length) return { eintraege: [], fehler: [`Spalten fehlen: ${fehlend.join(", ")}.`] };

  const fehler = [];
  const eintraege = [];
  const gesehen = new Map();
  for (const { nr, zellen } of zeilen) {
    const wert = (n) => zellen[spalte(n)] ?? "";
    const wo = `Zeile ${nr}`;
    const aufgabe = wert("aufgabe_titel");
    const reihenfolge = Number(wert("reihenfolge"));
    const titel = wert("titel");
    const datei = wert("datei");
    const link = wert("link");
    if (!aufgabe) fehler.push(`${wo}: aufgabe_titel fehlt.`);
    if (!Number.isInteger(reihenfolge) || reihenfolge < 1) fehler.push(`${wo}: reihenfolge muss eine ganze Zahl ab 1 sein.`);
    if (!titel) fehler.push(`${wo}: titel fehlt.`);
    else if (titel.length > 200) fehler.push(`${wo}: titel ist länger als 200 Zeichen.`);
    if (!!datei === !!link) fehler.push(`${wo}: genau eins von datei und link ausfüllen.`);
    let objekt = null;
    if (datei) {
      try {
        objekt = objektName(datei);
      } catch (e) {
        fehler.push(`${wo}: ${e.message}`);
      }
    }
    if (link && !linkGueltig(link)) fehler.push(`${wo}: link muss mit https:// beginnen.`);
    const schluessel = `${aufgabe}\u0000${reihenfolge}`;
    if (aufgabe && gesehen.has(schluessel)) fehler.push(`${wo}: Reihenfolge ${reihenfolge} steht für diese Aufgabe schon in Zeile ${gesehen.get(schluessel)}.`);
    gesehen.set(schluessel, nr);
    const pfad = objekt ? pfadTeile(datei).join("/") : null;
    eintraege.push({
      zeile: nr,
      aufgabe,
      reihenfolge,
      titel,
      datei: pfad,
      anzeige: pfad ? anzeigeName(pfad) : null,
      link: link || null,
      objekt,
      mime: objekt ? mimeTyp(datei) : null,
    });
  }
  return { eintraege, fehler };
}
