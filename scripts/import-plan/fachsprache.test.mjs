// Tests für scripts/import-plan/fachsprache.mjs und den Excel-Leser mit einer
// kleinen, erfundenen Vorlage (keine echten Inhalte, keine Namen).
// Ausführen: node --test scripts/import-plan/fachsprache.test.mjs

import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { strToU8, zipSync } from "fflate";

import { erstelleFachsprache, waehleFachspracheTabs } from "./fachsprache.mjs";
import { leseXlsx, ZEILE } from "./xlsx.mjs";

const plan = () => ({
  module: [{ modul: "II", reihenfolge: 2, titel: "Testmodul" }],
  kurse: [
    { schluessel: "II|Kurs A", modul: "II", woche: 1, name: "Kurs A" },
    { schluessel: "II|Kurs B", modul: "II", woche: 2, name: "Kurs B" },
  ],
  termine: [
    { kennung: "M02-S002", art: "kurs", kurs: "II|Kurs A" },
    { kennung: "M02-S003", art: "kurs", kurs: "II|Kurs A" },
    { kennung: "M02-S010", art: "kurs", kurs: "II|Kurs B" },
    { kennung: "M02-S001", art: "begleit", begleitkurs: "Deutsch/Fachdeutsch" },
    { kennung: "M02-S004", art: "praxis", auftraege: ["M02-A01"] },
  ],
});

let zeilenNr = 2;
const z = (felder) => ({ ...felder, [ZEILE]: zeilenNr++ });

/** Gültige Tabs für eine Kennung; "aendern" darf einzelne Tabs überschreiben. */
function tabs(kennung = "M02-S002", aendern = {}) {
  zeilenNr = 2;
  return {
    Einheit: [z({ Kennung: kennung, Titel: "Die Diode", Dauer: "5.0", Quellen: "eigene", Hinweise: "x" })],
    "Wörter": [z({ Kennung: kennung, Nr: "1.0", Wort: "die Diode", "Erklärung": "Ein Bauteil.", Beispiel: "Ich prüfe die Diode.", Bild: "", Bildbeschreibung: "" })],
    Fragen: [
      z({ Kennung: kennung, Nr: "1.0", Frage: "Was ist eine Diode?", "Antwort A": "Ein Bauteil", "Antwort B": "Ein Kabel", "Antwort C": "", "Antwort D": "", Richtig: "A", "Erklärung": "Weil.", Bild: "", Bildbeschreibung: "" }),
    ],
    "Sätze": [z({ Kennung: kennung, Nr: "1.0", Satz: "Ich prüfe die Diode." })],
    Anleitung: [{ "Fachsprache-Einheiten": "Text" }],
    ...aendern,
  };
}

const fehlertext = (fs, p = plan()) => {
  try {
    erstelleFachsprache(fs, p);
  } catch (e) {
    return e.message;
  }
  return null;
};

test("gültige Einheit: Inhalt, Index von Richtig, Dauer, Kurs aus dem Termin", () => {
  const { einheiten } = erstelleFachsprache(tabs(), plan());
  assert.equal(einheiten.length, 1);
  const e = einheiten[0];
  assert.deepEqual(e.kennungen, ["M02-S002"]);
  assert.equal(e.kursName, "Kurs A");
  assert.equal(e.modulReihenfolge, 2);
  assert.equal(e.woche, 1);
  assert.equal(e.titel, "Die Diode");
  assert.equal(e.dauer, 5);
  assert.deepEqual(e.inhalt.quiz[0], { frage: "Was ist eine Diode?", antworten: ["Ein Bauteil", "Ein Kabel"], richtig: 0, erklaerung: "Weil." });
  assert.deepEqual(e.inhalt.wortkarten[0], { wort: "die Diode", erklaerung: "Ein Bauteil.", beispiel: "Ich prüfe die Diode." });
  assert.deepEqual(e.inhalt.saetze, ["Ich prüfe die Diode."]);
});

test("Status und Prüffelder kommen im Ergebnis nie vor", () => {
  const { einheiten } = erstelleFachsprache(tabs(), plan());
  const alles = JSON.stringify(einheiten);
  for (const wort of ["status", "veroeffentlicht", "geprueft", "geprüft"]) assert.ok(!alles.includes(wort), wort);
});

test("Richtig als Buchstabe wird zum Index; Kleinbuchstabe geht, D zeigt auf die vierte Antwort", () => {
  const fs = tabs();
  zeilenNr = 20;
  fs.Fragen = [z({ Kennung: "M02-S002", Nr: "1", Frage: "F", "Antwort A": "a", "Antwort B": "b", "Antwort C": "c", "Antwort D": "d", Richtig: "d", "Erklärung": "E" })];
  assert.equal(erstelleFachsprache(fs, plan()).einheiten[0].inhalt.quiz[0].richtig, 3);
});

test("Reihenfolge nach Nr, nicht nach Zeile in der Excel", () => {
  const fs = tabs();
  zeilenNr = 30;
  fs["Sätze"] = [z({ Kennung: "M02-S002", Nr: "2", Satz: "Zweiter." }), z({ Kennung: "M02-S002", Nr: "1", Satz: "Erster." })];
  assert.deepEqual(erstelleFachsprache(fs, plan()).einheiten[0].inhalt.saetze, ["Erster.", "Zweiter."]);
});

test("unbekannte Spalten und Tabs sowie leere Zeilen sind kein Fehler", () => {
  const fs = tabs();
  fs["Wörter"].push({ [ZEILE]: 99, Kennung: "", Nr: "", Wort: "", "Erklärung": "", Beispiel: "", Bild: "", Bildbeschreibung: "", Notiz: "" });
  fs.Fragen.push({ [ZEILE]: 100, Kennung: "", Nr: "" });
  assert.equal(fehlertext(fs), null);
});

test("Bild: Dateiname gültig, Bildbeschreibung wird übernommen", () => {
  const fs = tabs();
  fs["Wörter"][0].Bild = "diode.PNG";
  fs["Wörter"][0].Bildbeschreibung = "Schaltzeichen";
  const w = erstelleFachsprache(fs, plan()).einheiten[0].inhalt.wortkarten[0];
  assert.equal(w.bild, "diode.PNG");
  assert.equal(w.bild_alt, "Schaltzeichen");
});

for (const [name, bild, alt, muster] of [
  ["Bild ohne Bildbeschreibung", "a.png", "", /Bild ohne Bildbeschreibung/],
  ["Bildbeschreibung ohne Bild", "", "Text", /Bildbeschreibung ohne Bild/],
  ["Bild mit Pfadanteil", "ordner/a.png", "Text", /ungültig/],
  ["Bild mit ..", "a..b.png", "Text", /ungültig/],
  ["SVG", "a.svg", "Text", /ungültig/],
  ["GIF", "a.gif", "Text", /ungültig/],
]) {
  test(`Fehler: ${name}`, () => {
    const fs = tabs();
    fs["Wörter"][0].Bild = bild;
    fs["Wörter"][0].Bildbeschreibung = alt;
    assert.match(fehlertext(fs), muster);
  });
}

for (const [name, aendern, muster] of [
  ["Richtig ungültig", { Richtig: "E" }, /Richtig muss A, B, C oder D sein/],
  ["Richtig zeigt auf leere Antwort", { Richtig: "C" }, /Richtig muss A, B, C oder D sein/],
  ["Richtig leer", { Richtig: "" }, /Richtig muss/],
  ["doppelte Antworten", { "Antwort B": "Ein Bauteil" }, /doppelte Antworten/],
  ["nur eine Antwort", { "Antwort B": "" }, /mindestens 2 Antworten/],
  ["Antwort D ohne C", { "Antwort D": "d" }, /ohne Lücke/],
  ["Frage leer", { Frage: "" }, /Frage oder Erklärung leer/],
  ["Erklärung leer", { "Erklärung": "" }, /Frage oder Erklärung leer/],
]) {
  test(`Fehler Fragen: ${name}`, () => {
    const fs = tabs();
    Object.assign(fs.Fragen[0], aendern);
    const t = fehlertext(fs);
    assert.match(t, muster);
    assert.match(t, /Fragen, Zeile \d+/, "Fehler nennt Tab und Excel-Zeile");
  });
}

test("Fehler: Nr fehlt, doppelt, Lücke", () => {
  let fs = tabs();
  fs["Wörter"][0].Nr = "";
  assert.match(fehlertext(fs), /Nr fehlt oder ist keine ganze Zahl/);
  fs = tabs();
  fs["Sätze"].push(z({ Kennung: "M02-S002", Nr: "1", Satz: "Doppelt." }));
  assert.match(fehlertext(fs), /Nr 1 steht doppelt/);
  fs = tabs();
  fs["Sätze"][0].Nr = "2";
  assert.match(fehlertext(fs), /lückenlos ab 1/);
});

test("Fehler: Eintrag ohne Zeile im Tab Einheit, Kennung fehlt, Kennung doppelt", () => {
  let fs = tabs();
  fs["Sätze"].push(z({ Kennung: "M02-S999", Nr: "1", Satz: "Fremd." }));
  assert.match(fehlertext(fs), /Sätze M02-S999: Eintrag ohne Zeile im Tab Einheit/);
  fs = tabs();
  fs["Wörter"].push(z({ Kennung: "", Nr: "2", Wort: "w", "Erklärung": "e", Beispiel: "b" }));
  assert.match(fehlertext(fs), /Wörter, Zeile \d+: Kennung fehlt/);
  fs = tabs();
  fs.Einheit.push(z({ Kennung: "M02-S002", Titel: "Nochmal" }));
  assert.match(fehlertext(fs), /Kennung steht mehrfach im Tab Einheit/);
});

test("Fehler: Titel fehlt, Dauer außerhalb 1–60, mindestens 1 Wort und 1 Frage", () => {
  let fs = tabs();
  fs.Einheit[0].Titel = "";
  assert.match(fehlertext(fs), /Titel fehlt/);
  for (const d of ["0", "61", "x", "5.5"]) {
    fs = tabs();
    fs.Einheit[0].Dauer = d;
    assert.match(fehlertext(fs), /Dauer muss eine ganze Zahl von 1 bis 60 sein/, d);
  }
  fs = tabs();
  fs["Wörter"] = [];
  assert.match(fehlertext(fs), /mindestens 1 Wort nötig/);
  fs = tabs();
  fs.Fragen = [];
  assert.match(fehlertext(fs), /mindestens 1 Frage nötig/);
});

test("Fehler: Termin unbekannt, kein Theorie-Termin mit Kurs", () => {
  assert.match(fehlertext(tabs("M02-S404")), /Fachsprache M02-S404: Termin nicht im Tab Stundenplan/);
  assert.match(fehlertext(tabs("M02-S001")), /keine Lektion \(Art „begleit“\)/);
  assert.match(fehlertext(tabs("M02-S004")), /keine Lektion \(Art „praxis“\)/);
});

test("zwei Kennungen desselben Kurses mit unterschiedlichem Inhalt: Fehler nennt beide Kennungen", () => {
  const a = tabs("M02-S002");
  const b = tabs("M02-S003");
  b.Einheit[0].Titel = "Anderer Titel";
  const fs = { Einheit: [...a.Einheit, ...b.Einheit], "Wörter": [...a["Wörter"], ...b["Wörter"]], Fragen: [...a.Fragen, ...b.Fragen], "Sätze": [...a["Sätze"], ...b["Sätze"]] };
  const t = fehlertext(fs);
  assert.match(t, /Fachsprache M02-S002 und M02-S003: dieselbe Lektion \(Kurs „Kurs A“\), aber unterschiedlicher Inhalt/);
});

test("zwei Kennungen desselben Kurses mit gleichem Inhalt: einmal importiert, mit Hinweis", () => {
  const a = tabs("M02-S002");
  const b = tabs("M02-S003");
  const fs = { Einheit: [...a.Einheit, ...b.Einheit], "Wörter": [...a["Wörter"], ...b["Wörter"]], Fragen: [...a.Fragen, ...b.Fragen], "Sätze": [...a["Sätze"], ...b["Sätze"]] };
  const r = erstelleFachsprache(fs, plan());
  assert.equal(r.einheiten.length, 1);
  assert.deepEqual(r.einheiten[0].kennungen, ["M02-S002", "M02-S003"]);
  assert.match(r.meldungen[0].text, /gleicher Inhalt, wird einmal importiert/);
});

test("alle Fehler auf einmal, nicht nur der erste", () => {
  const fs = tabs();
  fs.Fragen[0].Richtig = "E";
  fs["Wörter"][0].Bild = "a.svg";
  fs["Wörter"][0].Bildbeschreibung = "x";
  const t = fehlertext(fs);
  assert.match(t, /^2 Fehler/);
});

test("leere Vorlage (nur Köpfe): keine Einheiten, kein Fehler", () => {
  const r = erstelleFachsprache({ Einheit: [], "Wörter": [], Fragen: [], "Sätze": [] }, plan());
  assert.deepEqual(r.einheiten, []);
});

test("Quelle der Tabs: Plan-Excel hat Vorrang, sonst die zweite Datei; fehlende Tabs sind ein Fehler", () => {
  const eigene = { Einheit: [], "Wörter": [], Fragen: [], "Sätze": [] };
  assert.equal(waehleFachspracheTabs({ ...eigene, Stundenplan: [] }, { ...eigene }).quelle, "plan");
  assert.equal(waehleFachspracheTabs({ Stundenplan: [] }, eigene).quelle, "datei");
  assert.throws(() => waehleFachspracheTabs({ Stundenplan: [] }, null), /--fachsprache-datei/);
  assert.throws(() => waehleFachspracheTabs({ Stundenplan: [] }, { Einheit: [] }), /fehlen die Tabs "Wörter", "Fragen", "Sätze"/);
  assert.throws(() => waehleFachspracheTabs({ Einheit: [] }, eigene), /Plan-Excel fehlen die Tabs/);
});

// ---------- Excel-Leser: Zeilennummern, leere vorformatierte Zeilen ----------
function xlsxMitZeilen() {
  const blatt = (zeilen) =>
    `<?xml version="1.0"?><worksheet><sheetData>${zeilen}</sheetData></worksheet>`;
  const zelle = (ref, wert) => `<c r="${ref}" t="inlineStr"><is><t>${wert}</t></is></c>`;
  const leereZeilen = Array.from({ length: 5 }, (_, i) => `<row r="${i + 5}"><c r="A${i + 5}" s="2"/><c r="B${i + 5}" s="2"/></row>`).join("") + `<row r="10" ht="15"/>`;
  const einheit = blatt(
    `<row r="1">${zelle("A1", "Kennung")}${zelle("B1", "Titel")}${zelle("C1", "Quellen")}</row>` +
      `<row r="2">${zelle("A2", "M02-S002")}${zelle("B2", "Die Diode")}${zelle("C2", "eigene")}</row>` +
      `<row r="3"><c r="A3" s="2"/><c r="B3" s="2"/></row>` +
      `<row r="4">${zelle("A4", "M02-S010")}${zelle("B4", "Der Schalter")}</row>` +
      leereZeilen
  );
  const nurKopf = blatt(`<row r="1">${zelle("A1", "Kennung")}</row>` + leereZeilen);
  const dateien = {
    "xl/workbook.xml": strToU8(
      `<workbook xmlns:r="x"><sheets><sheet name="Anleitung" r:id="rId1"/><sheet name="Einheit" r:id="rId2"/><sheet name="W&#246;rter" r:id="rId3"/></sheets></workbook>`
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      `<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Target="worksheets/sheet3.xml"/></Relationships>`
    ),
    "xl/worksheets/sheet1.xml": strToU8(blatt(`<row r="1">${zelle("A1", "Hinweis")}</row><row r="2">${zelle("A2", "Text")}</row>`)),
    "xl/worksheets/sheet2.xml": strToU8(einheit),
    "xl/worksheets/sheet3.xml": strToU8(nurKopf),
  };
  const ordner = mkdtempSync(join(tmpdir(), "fachsprache-test-"));
  const pfad = join(ordner, "vorlage.xlsx");
  writeFileSync(pfad, zipSync(dateien));
  return pfad;
}

test("Excel-Leser: leere und selbstschließende Zeilen entfallen, Zeilennummern bleiben, nur Kopf ergibt eine leere Liste", () => {
  const t = leseXlsx(xlsxMitZeilen());
  assert.deepEqual(Object.keys(t), ["Anleitung", "Einheit", "Wörter"]);
  assert.equal(t.Einheit.length, 2);
  assert.equal(t.Einheit[0][ZEILE], 2);
  assert.equal(t.Einheit[1][ZEILE], 4, "Zeile 3 war leer, die Nummer von Zeile 4 bleibt");
  assert.equal(t.Einheit[0].Quellen, "eigene");
  assert.deepEqual(t["Wörter"], []);
});
