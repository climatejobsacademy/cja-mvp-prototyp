// scripts/scorm-einspielen/eingabe.mjs
// Reine Funktionen für scripts/scorm-einspielen.mjs (SR-50, SR-85): Liste
// (CSV) lesen, Dateiname gegen das Ziel prüfen, Termin-Kennungen über den
// Stundenplan der Plan-Excel zum Kurs auflösen. Keine Datenbank, keine Uhr.
// Getestet in eingabe.test.mjs. Anleitung: docs/scorm-einspielen.md.
//
// Die Liste enthält keine Personendaten: je Zeile eine Lektion (Termin-
// Kennung wie bei der Fachsprache oder direkt lesson_id) und den Dateinamen
// der Zip im Paket-Ordner.

import { basename } from "node:path";

import { speicherName } from "./paket.mjs";

/**
 * Prüft, ob die CSV-Datei zum Ziel passt (wie die Trainer-Datei in
 * import-plan.mjs): reine .csv; für staging muss "staging" im Namen stehen,
 * für production darf es nicht drinstehen. Ohne Ziel nur die Endung.
 */
export function pruefeDateiZiel(pfad, ziel) {
  const name = basename(pfad ?? "").toLowerCase();
  if (!name.endsWith(".csv")) throw new Error(`Die Liste muss reine CSV sein (.csv), nicht ${basename(pfad ?? "") || "(leer)"}.`);
  if (ziel !== undefined && ziel !== "staging" && ziel !== "production") throw new Error("Ziel muss staging oder production sein.");
  if (ziel === "staging" && !name.includes("staging")) {
    throw new Error("Auf Staging nur eine Liste mit „staging“ im Namen (z. B. scorm-staging.csv).");
  }
  if (ziel === "production" && name.includes("staging")) throw new Error("Die Staging-Liste nicht für Production verwenden.");
}

/**
 * Zerlegt CSV-Text in Zeilen mit Zellen (Anführungszeichen wie in Excel/Numbers,
 * "" als Anführungszeichen im Feld). Trennzeichen ist das der Kopfzeile:
 * Semikolon, wenn sie eins enthält, sonst Komma. Gibt [{ nr, zellen }] zurück
 * (nr = Zeilennummer in der Datei, Kopf = 1); leere Zeilen fallen weg.
 */
export function zerlegeCsv(text) {
  const t = (text ?? "").replace(/^﻿/, "");
  const trenner = (t.split(/\r?\n/, 1)[0] ?? "").includes(";") ? ";" : ",";
  const zeilen = [];
  let zellen = [];
  let feld = "";
  let inAnf = false;
  let nr = 1;
  let start = 1;
  const zeileFertig = () => {
    zellen.push(feld);
    zeilen.push({ nr: start, zellen: zellen.map((x) => x.trim()) });
    zellen = [];
    feld = "";
  };
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inAnf) {
      if (c === '"' && t[i + 1] === '"') {
        feld += '"';
        i++;
      } else if (c === '"') {
        inAnf = false;
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
      zeileFertig();
      nr++;
      start = nr;
    } else {
      feld += c;
    }
  }
  if (inAnf) throw new Error(`CSV: Anführungszeichen ab Zeile ${start} nicht geschlossen.`);
  if (feld !== "" || zellen.length) zeileFertig();
  return zeilen.filter((z) => z.zellen.some((x) => x !== ""));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const KENNUNG = /^[A-Za-z0-9][A-Za-z0-9-]{0,39}$/;

/**
 * Liest die Liste. Kopf "Kennung,Datei" oder "lesson_id,Datei" (Groß-/
 * Kleinschreibung egal, weitere Spalten werden ignoriert). Gibt
 * { variante: "kennung" | "lesson", eintraege: [{ zeile, kennung | lessonId, datei, speichername }] }
 * zurück; wirft einen Error mit allen Fehlern (einer je Zeile).
 */
export function leseListe(text) {
  const zeilen = zerlegeCsv(text);
  const kopfZeile = zeilen.shift();
  if (!kopfZeile) throw new Error("Die Liste ist leer.");
  const kopf = kopfZeile.zellen.map((k) => k.toLowerCase());
  const iDatei = kopf.indexOf("datei");
  const iKennung = kopf.indexOf("kennung");
  const iLesson = kopf.indexOf("lesson_id");
  if (iDatei < 0 || (iKennung < 0) === (iLesson < 0)) {
    throw new Error("Kopfzeile muss „Kennung,Datei“ oder „lesson_id,Datei“ sein (genau eine der beiden Schlüsselspalten).");
  }
  const variante = iKennung >= 0 ? "kennung" : "lesson";
  const iSchluessel = variante === "kennung" ? iKennung : iLesson;

  const fehler = [];
  const eintraege = [];
  const gesehen = new Map();
  for (const { nr, zellen } of zeilen) {
    const schluessel = zellen[iSchluessel] ?? "";
    const datei = zellen[iDatei] ?? "";
    const wo = `Zeile ${nr}`;
    if (!schluessel) {
      fehler.push(`${wo}: ${variante === "kennung" ? "Kennung" : "lesson_id"} fehlt.`);
      continue;
    }
    const wert = variante === "lesson" ? schluessel.toLowerCase() : schluessel;
    if (variante === "lesson" && !UUID.test(wert)) {
      fehler.push(`${wo}: lesson_id „${schluessel}“ ist keine gültige UUID.`);
      continue;
    }
    if (variante === "kennung" && !KENNUNG.test(wert)) {
      fehler.push(`${wo}: Kennung „${schluessel}“ ungültig (nur Buchstaben, Ziffern, Bindestrich, z. B. M02-S002).`);
      continue;
    }
    if (gesehen.has(wert)) {
      fehler.push(`${wo}: ${schluessel} steht schon in Zeile ${gesehen.get(wert)} (eine Zeile je Lektion).`);
      continue;
    }
    gesehen.set(wert, nr);
    let name;
    try {
      name = speicherName(datei);
    } catch (f) {
      fehler.push(`${wo}: ${f.message}`);
      continue;
    }
    eintraege.push({ zeile: nr, ...(variante === "kennung" ? { kennung: wert } : { lessonId: wert }), datei, speichername: name });
  }
  if (!eintraege.length && !fehler.length) fehler.push("Die Liste hat keine Zeilen unter dem Kopf.");
  if (fehler.length) throw new Error(`${fehler.length} Fehler in der Liste:\n  - ${fehler.join("\n  - ")}`);
  return { variante, eintraege };
}

/**
 * Löst Termin-Kennungen auf wie die Fachsprache (scripts/import-plan/
 * fachsprache.mjs): Kennung -> Termin im Tab Stundenplan -> Kurs. Die
 * Datenbank sucht dann Woche + Kursname -> course -> Selbstlern-Lektion
 * (content_type 'scorm'). Zwei Kennungen desselben Kurses sind dieselbe
 * Lektion: mit gleicher Datei einmal (Meldung), mit anderer ein Fehler.
 *
 * @param eintraege  aus leseListe (Variante "kennung")
 * @param plan       Ergebnis von erstellePlan (nutzt plan.termine, plan.kurse, plan.module)
 * @returns { eintraege: [{ ...eintrag, kennungen, kurs, kursName, modul, modulReihenfolge, woche }], meldungen }
 */
export function loeseKennungenAuf(eintraege, plan) {
  const termine = new Map((plan.termine ?? []).map((t) => [t.kennung, t]));
  const kurse = new Map((plan.kurse ?? []).map((k) => [k.schluessel, k]));
  const modulReihenfolge = new Map((plan.module ?? []).map((m) => [m.modul, m.reihenfolge]));
  const fehler = [];
  const meldungen = [];
  const nachKurs = new Map();
  for (const e of eintraege) {
    const wo = `Zeile ${e.zeile} (${e.kennung})`;
    const t = termine.get(e.kennung);
    if (!t) {
      fehler.push(`${wo}: Termin nicht im Tab Stundenplan (oder ohne Datum bzw. außerhalb der Module in --module). Sonst lesson_id verwenden.`);
      continue;
    }
    if (t.art !== "kurs") {
      fehler.push(`${wo}: Der Termin hat keine Lektion (Art „${t.art}“); nur Theorie-Termine mit Kurs sind möglich.`);
      continue;
    }
    const k = kurse.get(t.kurs);
    if (!k) {
      fehler.push(`${wo}: Kurs „${t.kurs}“ des Termins steht nicht im Plan.`);
      continue;
    }
    const bisher = nachKurs.get(k.schluessel);
    if (bisher) {
      if (bisher.datei === e.datei) {
        bisher.kennungen.push(e.kennung);
        meldungen.push(`${bisher.kennungen.join(" und ")}: gleicher Kurs „${k.name}“, gleiche Datei, wird einmal eingespielt.`);
      } else {
        fehler.push(`${wo}: derselbe Kurs „${k.name}“ wie Zeile ${bisher.zeile} (${bisher.kennung}), aber eine andere Datei. Eine Datei je Lektion.`);
      }
      continue;
    }
    nachKurs.set(k.schluessel, {
      ...e,
      kennungen: [e.kennung],
      kurs: k.schluessel,
      kursName: k.name,
      modul: k.modul,
      modulReihenfolge: modulReihenfolge.get(k.modul) ?? null,
      woche: k.woche,
    });
  }
  for (const e of nachKurs.values()) {
    if (e.modulReihenfolge == null) fehler.push(`Zeile ${e.zeile} (${e.kennung}): Modul ${e.modul} steht nicht im Plan.`);
  }
  if (fehler.length) throw new Error(`${fehler.length} Fehler beim Auflösen der Kennungen:\n  - ${fehler.join("\n  - ")}`);
  return { eintraege: [...nachKurs.values()], meldungen };
}
