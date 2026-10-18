// scripts/live-links/eingabe.mjs
// Reine Funktionen für scripts/live-links.mjs: CSV lesen, Link prüfen,
// Dateiname gegen das Ziel prüfen. Keine Datenbank, keine Uhr. Getestet in
// eingabe.test.mjs. Anleitung: docs/live-links.md.
//
// Links können Zugangsdaten enthalten (z. B. ein Kennwort im Teams-Link).
// Darum nennt keine Fehlermeldung hier den Link selbst, höchstens Zeile,
// Kohorte, Modul bzw. Datum/Start und die Domain.

import { basename } from "node:path";

/** Erlaubte Hosts (genau diese, keine Unterdomains). */
export const TEAMS_DOMAINS = ["teams.microsoft.com", "teams.live.com"];

const MAX_LINK = 2000;

/** Modul-Angabe -> Reihenfolge in `modul` (wie ROEMISCH in import-plan/plan.mjs). */
const ROEMISCH = { I: 1, II: 2, III: 3, IV: 4, V: 5, ABSCHLUSS: 6 };

/**
 * Prüft, ob die CSV-Datei zum Ziel passt (wie die Trainer-Datei in
 * import-plan.mjs): reine .csv; für staging muss "staging" im Namen stehen,
 * für production darf es nicht drinstehen. Ohne Ziel nur die Endung.
 */
export function pruefeDateiZiel(pfad, ziel) {
  const name = basename(pfad ?? "").toLowerCase();
  if (!name.endsWith(".csv")) throw new Error(`Die Link-Datei muss reine CSV sein (.csv), nicht ${basename(pfad ?? "") || "(leer)"}.`);
  if (ziel === "staging" && !name.includes("staging")) {
    throw new Error("Auf Staging nur eine Link-Datei mit „staging“ im Namen (z. B. teams-links-staging.csv).");
  }
  if (ziel === "production" && name.includes("staging")) {
    throw new Error("Die Staging-Link-Datei nicht für Production verwenden.");
  }
  if (ziel !== undefined && ziel !== "staging" && ziel !== "production") {
    throw new Error("Ziel muss staging oder production sein.");
  }
}

/**
 * Prüft einen Teams-Link. Gibt { link, domain } zurück oder wirft einen Error,
 * dessen Text den Link nicht enthält.
 */
export function pruefeLink(wert) {
  const link = (wert ?? "").trim();
  if (!link) throw new Error("Link fehlt.");
  if (link.length > MAX_LINK) throw new Error(`Link ist länger als ${MAX_LINK} Zeichen.`);
  if (/\s/.test(link)) throw new Error("Link enthält Leerzeichen oder Zeilenumbrüche.");
  let url;
  try {
    url = new URL(link);
  } catch {
    throw new Error("Link ist keine gültige Adresse.");
  }
  if (url.protocol !== "https:") throw new Error("Link muss mit https:// beginnen.");
  if (url.username || url.password) throw new Error("Link darf keinen Benutzernamen oder kein Kennwort vor dem Host enthalten.");
  if (url.port) throw new Error("Link darf keinen eigenen Port enthalten.");
  const domain = url.hostname.toLowerCase();
  if (!TEAMS_DOMAINS.includes(domain)) {
    throw new Error(`Link zeigt nicht auf Teams (erlaubt: ${TEAMS_DOMAINS.join(", ")}; gefunden: ${domain}).`);
  }
  return { link, domain };
}

/**
 * Zerlegt CSV-Text in Zeilen mit Zellen (Anführungszeichen wie in Excel/Numbers,
 * "" als Anführungszeichen im Feld). Trennzeichen ist das der Kopfzeile:
 * Semikolon, wenn sie eins enthält, sonst Komma. Gibt [{ nr, zellen }] zurück;
 * nr ist die Zeilennummer in der Datei (Kopf = 1).
 */
export function zerlegeCsv(text) {
  const t = (text ?? "").replace(/^﻿/, "");
  const ersteZeile = t.split(/\r?\n/, 1)[0] ?? "";
  const trenner = ersteZeile.includes(";") ? ";" : ",";
  const zeilen = [];
  let zellen = [];
  let feld = "";
  let inAnf = false;
  let nr = 1;
  let start = 1;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inAnf) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          feld += '"';
          i++;
        } else {
          inAnf = false;
        }
      } else {
        if (c === "\n") nr++;
        feld += c;
      }
    } else if (c === '"' && feld.trim() === "") {
      feld = "";
      inAnf = true;
    } else if (c === trenner) {
      zellen.push(feld);
      feld = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      zellen.push(feld);
      zeilen.push({ nr: start, zellen });
      zellen = [];
      feld = "";
      nr++;
      start = nr;
    } else {
      feld += c;
    }
  }
  if (inAnf) throw new Error(`CSV: Anführungszeichen ab Zeile ${start} nicht geschlossen.`);
  if (feld !== "" || zellen.length) {
    zellen.push(feld);
    zeilen.push({ nr: start, zellen });
  }
  return zeilen.map((z) => ({ nr: z.nr, zellen: z.zellen.map((x) => x.trim()) }));
}

/** "II", "Modul II", "2", "M02", "Abschluss" -> 1 … 6, sonst null. */
export function modulReihenfolge(wert) {
  const w = (wert ?? "").trim().replace(/^modul\s+/i, "").toUpperCase();
  if (ROEMISCH[w]) return ROEMISCH[w];
  const m = /^M?0*([1-6])$/.exec(w);
  return m ? Number(m[1]) : null;
}

/** "19.10.2026", "19.10.26" oder "2026-10-19" -> "2026-10-19", sonst null. */
export function datumIso(wert) {
  const w = (wert ?? "").trim();
  let j, mo, t;
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(w);
  if (m) [, j, mo, t] = m.map(Number);
  else if ((m = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/.exec(w))) {
    [, t, mo, j] = m.map(Number);
    if (j < 100) j += 2000;
  } else return null;
  const d = new Date(Date.UTC(j, mo - 1, t));
  if (d.getUTCFullYear() !== j || d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== t) return null;
  return `${String(j).padStart(4, "0")}-${String(mo).padStart(2, "0")}-${String(t).padStart(2, "0")}`;
}

/** "9:00", "09:00", "09:00:00" -> "09:00", sonst null. */
export function uhrzeit(wert) {
  const m = /^(\d{1,2}):(\d{2})(?::00)?$/.exec((wert ?? "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

const VARIANTEN = {
  modul: ["Kohorte", "Modul", "Link"],
  termin: ["Kohorte", "Datum", "Start", "Link"],
};

/**
 * Liest die Link-Datei. Zwei Varianten, erkannt am Kopf (Reihenfolge egal,
 * Groß-/Kleinschreibung egal):
 *   Kohorte,Modul,Link         -> alle Live-Termine der Kohorte im Modul
 *   Kohorte,Datum,Start,Link   -> die Live-Termine der Kohorte an diesem Tag zu dieser Startzeit
 * Leere Zeilen werden übersprungen. Wirft einen Error mit allen Fehlern (eine
 * Zeile je Fehler, ohne Links).
 *
 * @returns { variante: "modul"|"termin", eintraege: [...] }
 */
export function leseLinkDatei(text) {
  const zeilen = zerlegeCsv(text).filter((z) => z.zellen.some((x) => x !== ""));
  const kopfZeile = zeilen.shift();
  if (!kopfZeile) throw new Error("Die Link-Datei ist leer.");
  const kopf = kopfZeile.zellen.map((k) => k.toLowerCase());

  // Leere Spalten hinten (Export aus Excel) sind erlaubt, wenn sie leer bleiben.
  while (kopf.length && kopf[kopf.length - 1] === "") kopf.pop();

  if (kopf.includes("kennung")) {
    throw new Error(
      "Spalte „Kennung“ geht nicht: Die Termin-Kennungen (z. B. M02-S002) sind in der Datenbank nicht gespeichert. " +
        "Je Termin bitte die Spalten Kohorte,Datum,Start,Link verwenden, je Modul Kohorte,Modul,Link."
    );
  }
  const variante = Object.keys(VARIANTEN).find((v) => {
    const soll = VARIANTEN[v].map((s) => s.toLowerCase());
    return soll.length === kopf.length && soll.every((s) => kopf.includes(s));
  });
  if (!variante) {
    throw new Error("Kopfzeile muss genau „Kohorte,Modul,Link“ (je Modul) oder „Kohorte,Datum,Start,Link“ (je Termin) sein.");
  }
  const spalte = Object.fromEntries(VARIANTEN[variante].map((s) => [s, kopf.indexOf(s.toLowerCase())]));

  const fehler = [];
  const eintraege = [];
  const gesehen = new Map();
  for (const z of zeilen) {
    const wert = (name) => z.zellen[spalte[name]] ?? "";
    const ueberzaehlig = z.zellen.slice(kopf.length).some((x) => x !== "");
    if (ueberzaehlig) {
      fehler.push(`Zeile ${z.nr}: mehr Werte als Spalten (Komma oder Semikolon im Link? Dann den Link in Anführungszeichen setzen).`);
      continue;
    }
    const kohorte = wert("Kohorte");
    if (!kohorte) fehler.push(`Zeile ${z.nr}: Kohorte fehlt.`);

    let eintrag;
    if (variante === "modul") {
      const modul = wert("Modul");
      const reihenfolge = modulReihenfolge(modul);
      if (reihenfolge === null) fehler.push(`Zeile ${z.nr}: Modul „${modul}“ unbekannt (I, II, III, IV, V oder Abschluss; auch 1–6).`);
      eintrag = { zeile: z.nr, kohorte, modul, modulReihenfolge: reihenfolge };
    } else {
      const datum = datumIso(wert("Datum"));
      const start = uhrzeit(wert("Start"));
      if (!datum) fehler.push(`Zeile ${z.nr}: Datum „${wert("Datum")}“ ungültig (TT.MM.JJJJ oder JJJJ-MM-TT).`);
      if (!start) fehler.push(`Zeile ${z.nr}: Start „${wert("Start")}“ ungültig (HH:MM).`);
      eintrag = { zeile: z.nr, kohorte, datum, start };
    }

    try {
      Object.assign(eintrag, pruefeLink(wert("Link")));
    } catch (e) {
      fehler.push(`Zeile ${z.nr}: ${e.message}`);
      continue;
    }

    const schluessel =
      variante === "modul"
        ? `${kohorte}|${eintrag.modulReihenfolge}`
        : `${kohorte}|${eintrag.datum}|${eintrag.start}`;
    if (kohorte && gesehen.has(schluessel)) {
      fehler.push(`Zeile ${z.nr}: doppelt, derselbe Eintrag steht schon in Zeile ${gesehen.get(schluessel)}.`);
      continue;
    }
    gesehen.set(schluessel, z.nr);
    eintraege.push(eintrag);
  }
  if (!fehler.length && !eintraege.length) fehler.push("Die Link-Datei hat keine Zeilen unter dem Kopf.");
  if (fehler.length) throw new Error(fehler.join("\n"));
  return { variante, eintraege };
}

/** Kurztext eines Eintrags für die Ausgabe (ohne Link). */
export function beschreibe(variante, e) {
  return variante === "modul" ? `${e.kohorte}, Modul ${e.modul}` : `${e.kohorte}, ${e.datum} ${e.start}`;
}
