// scripts/lernende-anlegen/eingabe.mjs
// Reine Funktionen für scripts/lernende-anlegen.mjs (SR-48): CSV lesen und
// prüfen, E-Mail maskieren, Dateiname gegen das Ziel prüfen, Demo-Schutz.
// Keine Datenbank, keine Uhr. Getestet in eingabe.test.mjs. Anleitung:
// docs/lernende-anlegen.md.
//
// Die Datei enthält Namen und E-Mail-Adressen. Darum nennt keine Meldung hier
// einen Namen oder eine Adresse im Klartext, höchstens die Zeilennummer und
// die maskierte Adresse (t***@example.org).

import { basename } from "node:path";

import { zerlegeCsv } from "../live-links/eingabe.mjs";

/** Spalten der CSV. Rufname ist optional (Spalte darf fehlen oder leer sein). */
export const SPALTEN = ["E-Mail", "Vorname", "Nachname", "Rufname", "Betrieb", "Kohorte"];
const PFLICHT = ["E-Mail", "Vorname", "Nachname", "Betrieb", "Kohorte"];

/** person.rufname: nicht leer, höchstens 60 Zeichen (Constraint aus 0029). */
export const MAX_RUFNAME = 60;
const MAX_NAME = 200;

const EMAIL = /^[^\s@,;"<>()]+@[^\s@,;"<>()]+\.[^\s@,;"<>()]+$/;

/**
 * Prüft, ob die CSV-Datei zum Ziel passt (wie die Trainer-Datei in
 * import-plan.mjs): reine .csv; für staging muss "staging" im Namen stehen
 * (Test-Adressen, Staging verschickt echte Mails), für production darf es
 * nicht drinstehen. Ohne Ziel nur die Endung.
 */
export function pruefeDateiZiel(pfad, ziel) {
  const name = basename(pfad ?? "").toLowerCase();
  if (!name.endsWith(".csv")) throw new Error(`Die Lernenden-Datei muss reine CSV sein (.csv), nicht ${basename(pfad ?? "") || "(leer)"}.`);
  if (ziel !== undefined && ziel !== "staging" && ziel !== "production") {
    throw new Error("Ziel muss staging oder production sein.");
  }
  if (ziel === "staging" && !name.includes("staging")) {
    throw new Error("Auf Staging nur eine Lernenden-Datei mit „staging“ im Namen (z. B. lernende-staging.csv, nur Test-Adressen).");
  }
  if (ziel === "production" && name.includes("staging")) {
    throw new Error("Die Staging-Lernenden-Datei nicht für Production verwenden.");
  }
}

/**
 * "test+lernende1@example.org" -> "t***@example.org". Nur der erste Buchstabe
 * vor dem @ bleibt sichtbar, die Domain bleibt ganz. Ohne @ -> "***".
 */
export function maskiere(email) {
  const w = (email ?? "").trim();
  const at = w.lastIndexOf("@");
  if (at < 1) return "***";
  return `${w[0]}***${w.slice(at)}`;
}

/** Demo-Konto: Adresse mit "+demo@" (z. B. rim+demo@…). */
export function istDemoEmail(email) {
  return /\+demo@/i.test(email ?? "");
}

/** Demo-Kohorte: Name beginnt mit "DEMO" (z. B. "DEMO Rim"). Gleiche Regel in anlegen.sql. */
export function istDemoKohorte(name) {
  return /^\s*demo(\s|$)/i.test(name ?? "");
}

/**
 * Bricht ab (Error), wenn eine Zeile ein Demo-Konto oder eine Demo-Kohorte
 * betrifft. Demo-Konten fasst das Skript nie an.
 */
export function pruefeDemo(eintraege) {
  const treffer = eintraege
    .filter((e) => istDemoEmail(e.email) || istDemoKohorte(e.kohorte))
    .map((e) => `Zeile ${e.zeile} (${e.maskiert})`);
  if (treffer.length) {
    throw new Error(`Demo-Konten oder Demo-Kohorte („+demo@“ bzw. Kohorte „DEMO …“) werden nie angefasst: ${treffer.join(", ")}.`);
  }
}

const leer = (s) => (s ?? "").replace(/\s+/g, " ").trim();

/**
 * Liest die Lernenden-Datei. Kopf (Groß-/Kleinschreibung und Reihenfolge
 * egal): E-Mail,Vorname,Nachname,Rufname,Betrieb,Kohorte; Rufname darf fehlen.
 * Leere Zeilen werden übersprungen. Wirft einen Error mit allen Fehlern (eine
 * Zeile je Fehler, ohne Namen und ohne Adresse im Klartext).
 *
 * @returns {{ zeile, email, maskiert, name, rufname, betrieb, kohorte }[]}
 */
export function leseLernendeDatei(text) {
  const zeilen = zerlegeCsv(text).filter((z) => z.zellen.some((x) => x !== ""));
  const kopfZeile = zeilen.shift();
  if (!kopfZeile) throw new Error("Die Lernenden-Datei ist leer.");
  const kopf = kopfZeile.zellen.map((k) => k.toLowerCase());
  while (kopf.length && kopf[kopf.length - 1] === "") kopf.pop();

  const bekannt = SPALTEN.map((s) => s.toLowerCase());
  const unbekannt = kopf.filter((k) => !bekannt.includes(k));
  const fehlend = PFLICHT.filter((s) => !kopf.includes(s.toLowerCase()));
  const doppelt = kopf.filter((k, i) => kopf.indexOf(k) !== i);
  if (unbekannt.length || fehlend.length || doppelt.length) {
    throw new Error(
      `Kopfzeile muss „${SPALTEN.join(",")}“ sein (Rufname optional).` +
        (fehlend.length ? ` Fehlt: ${fehlend.join(", ")}.` : "") +
        (unbekannt.length ? ` Unbekannt: ${unbekannt.join(", ")}.` : "") +
        (doppelt.length ? ` Doppelt: ${[...new Set(doppelt)].join(", ")}.` : "")
    );
  }
  const spalte = Object.fromEntries(SPALTEN.map((s) => [s, kopf.indexOf(s.toLowerCase())]));

  const fehler = [];
  const eintraege = [];
  const gesehen = new Map();
  for (const z of zeilen) {
    const wert = (name) => (spalte[name] < 0 ? "" : leer(z.zellen[spalte[name]]));
    if (z.zellen.slice(kopf.length).some((x) => x !== "")) {
      fehler.push(`Zeile ${z.nr}: mehr Werte als Spalten (Komma im Namen? Dann den Wert in Anführungszeichen setzen).`);
      continue;
    }
    const email = wert("E-Mail").toLowerCase();
    const maskiert = maskiere(email);
    const vor = `Zeile ${z.nr} (${maskiert})`;
    let ok = true;
    const melde = (text) => {
      fehler.push(`${vor}: ${text}`);
      ok = false;
    };

    if (!email) melde("E-Mail fehlt.");
    else if (!EMAIL.test(email)) melde("E-Mail ist ungültig.");

    const vorname = wert("Vorname");
    const nachname = wert("Nachname");
    if (!vorname) melde("Vorname fehlt.");
    if (!nachname) melde("Nachname fehlt.");
    const name = `${vorname} ${nachname}`.trim();
    if (name.length > MAX_NAME) melde(`Name ist länger als ${MAX_NAME} Zeichen.`);

    const rufname = wert("Rufname") || vorname;
    if (rufname.length > MAX_RUFNAME) melde(`Rufname ist länger als ${MAX_RUFNAME} Zeichen.`);

    const betrieb = wert("Betrieb");
    const kohorte = wert("Kohorte");
    if (!betrieb) melde("Betrieb fehlt.");
    if (!kohorte) melde("Kohorte fehlt.");

    if (email && gesehen.has(email)) {
      melde(`doppelt, dieselbe E-Mail steht schon in Zeile ${gesehen.get(email)}.`);
    }
    if (email && !gesehen.has(email)) gesehen.set(email, z.nr);
    if (ok) eintraege.push({ zeile: z.nr, email, maskiert, name, rufname, betrieb, kohorte });
  }
  if (!fehler.length && !eintraege.length) fehler.push("Die Lernenden-Datei hat keine Zeilen unter dem Kopf.");
  if (fehler.length) throw new Error(fehler.join("\n"));
  return eintraege;
}
