// scripts/pruefprotokolle/eingabe.mjs
// Reine Hilfsfunktionen für scripts/pruefprotokolle.mjs (SR-91): die beiden
// Vorlagen lesen und prüfen (docs/vorlagen/pruefprotokolle.csv,
// docs/vorlagen/pruefprotokoll-zuordnung.csv). Regeln wie in Migration 0067
// und docs/import-pruefprotokolle.md. Ohne Datenbank, testbar mit node:test.

import { zerlegeCsv } from "../live-links/eingabe.mjs";

const KENNUNG = /^[a-z0-9-]{1,60}$/;
const PUNKT_KENNUNG = /^[a-z0-9_-]{1,20}$/;
const TEIL = { "ohne spannung": "spannungsfrei", "unter spannung": "unter_spannung" };

function tabelle(text, spalten) {
  const zeilen = zerlegeCsv(text).filter((z) => z.zellen.some((x) => x !== ""));
  const kopfZeile = zeilen.shift();
  if (!kopfZeile) return { fehler: ["Die Datei ist leer."], zeilen: [] };
  const kopf = kopfZeile.zellen.map((k) => k.toLowerCase());
  const fehlend = spalten.filter((s) => !kopf.includes(s));
  if (fehlend.length) return { fehler: [`Spalten fehlen: ${fehlend.join(", ")}.`], zeilen: [] };
  return {
    fehler: [],
    zeilen: zeilen.map(({ nr, zellen }) => ({ nr, wert: (s) => zellen[kopf.indexOf(s)] ?? "" })),
  };
}

/**
 * Prüfprotokolle: eine Zeile je Prüfpunkt. Gibt { protokolle, fehler }
 * zurück; protokolle = [{ kennung, titel, punkte: [{ nr, kennung, teil,
 * titel, text, punkte, hinweis }] }] in der Reihenfolge der Datei.
 */
export function leseProtokolle(text) {
  const SPALTEN = ["protokoll_kennung", "protokoll_titel", "punkt_nr", "punkt_kennung", "teil", "titel", "anweisung", "unterpunkte", "hinweis"];
  const t = tabelle(text, SPALTEN);
  if (t.fehler.length) return { protokolle: [], fehler: t.fehler };
  const fehler = [];
  const nachKennung = new Map();
  for (const z of t.zeilen) {
    const wo = `Zeile ${z.nr}`;
    const kennung = z.wert("protokoll_kennung");
    const ptitel = z.wert("protokoll_titel");
    if (!KENNUNG.test(kennung)) {
      fehler.push(`${wo}: protokoll_kennung „${kennung}“ ungültig (Kleinbuchstaben, Ziffern, Bindestrich).`);
      continue;
    }
    let p = nachKennung.get(kennung);
    if (!p) {
      if (!ptitel || ptitel.length > 200) fehler.push(`${wo}: protokoll_titel fehlt oder ist länger als 200 Zeichen.`);
      p = { kennung, titel: ptitel, punkte: [] };
      nachKennung.set(kennung, p);
    } else if (ptitel && ptitel !== p.titel) {
      fehler.push(`${wo}: protokoll_titel weicht vom Titel derselben Variante ab.`);
    }
    const nr = Number(z.wert("punkt_nr"));
    const pk = z.wert("punkt_kennung");
    const teil = TEIL[z.wert("teil").toLowerCase()];
    const titel = z.wert("titel");
    const anweisung = z.wert("anweisung");
    const hinweis = z.wert("hinweis");
    if (!Number.isInteger(nr) || nr < 1) fehler.push(`${wo}: punkt_nr muss eine ganze Zahl ab 1 sein.`);
    if (!PUNKT_KENNUNG.test(pk)) fehler.push(`${wo}: punkt_kennung „${pk}“ ungültig (z. B. a1, c2).`);
    if (!teil) fehler.push(`${wo}: teil muss „ohne Spannung“ oder „unter Spannung“ sein.`);
    if (!titel || titel.length > 200) fehler.push(`${wo}: titel fehlt oder ist länger als 200 Zeichen.`);
    if (anweisung.length > 2000) fehler.push(`${wo}: anweisung ist länger als 2000 Zeichen.`);
    if (hinweis.length > 2000) fehler.push(`${wo}: hinweis ist länger als 2000 Zeichen.`);
    if (p.punkte.some((x) => x.nr === nr)) fehler.push(`${wo}: punkt_nr ${nr} kommt in „${kennung}“ doppelt vor.`);
    if (p.punkte.some((x) => x.kennung === pk)) fehler.push(`${wo}: punkt_kennung ${pk} kommt in „${kennung}“ doppelt vor.`);
    const unterpunkte = z
      .wert("unterpunkte")
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
    p.punkte.push({ zeile: z.nr, nr, kennung: pk, teil, titel, text: anweisung || null, punkte: unterpunkte, hinweis: hinweis || null });
  }
  const protokolle = [...nachKennung.values()];
  for (const p of protokolle) {
    if (!p.punkte.length) continue;
    const sortiert = [...p.punkte].sort((a, b) => a.nr - b.nr);
    const ersterUnter = sortiert.findIndex((x) => x.teil === "unter_spannung");
    if (ersterUnter >= 0 && sortiert.slice(ersterUnter).some((x) => x.teil === "spannungsfrei")) {
      fehler.push(`„${p.kennung}“: Punkte „unter Spannung“ müssen nach allen Punkten „ohne Spannung“ kommen.`);
    }
    p.punkte = sortiert;
  }
  return { protokolle, fehler };
}

/**
 * Zuordnung: welche Praxisaufgabe (Titel) welche Variante nutzt. Eine
 * Aufgabe höchstens einmal. Gibt { zuordnungen, fehler } zurück.
 */
export function leseZuordnung(text, bekannteKennungen) {
  const t = tabelle(text, ["aufgabe_titel", "protokoll_kennung"]);
  if (t.fehler.length) return { zuordnungen: [], fehler: t.fehler };
  const fehler = [];
  const zuordnungen = [];
  const gesehen = new Map();
  for (const z of t.zeilen) {
    const wo = `Zeile ${z.nr}`;
    const aufgabe = z.wert("aufgabe_titel");
    const kennung = z.wert("protokoll_kennung");
    if (!aufgabe) fehler.push(`${wo}: aufgabe_titel fehlt.`);
    if (!bekannteKennungen.has(kennung)) fehler.push(`${wo}: protokoll_kennung „${kennung}“ steht nicht in der Datei der Prüfprotokolle.`);
    if (aufgabe && gesehen.has(aufgabe)) fehler.push(`${wo}: „${aufgabe}“ steht schon in Zeile ${gesehen.get(aufgabe)}.`);
    gesehen.set(aufgabe, z.nr);
    zuordnungen.push({ zeile: z.nr, aufgabe, kennung });
  }
  return { zuordnungen, fehler };
}
