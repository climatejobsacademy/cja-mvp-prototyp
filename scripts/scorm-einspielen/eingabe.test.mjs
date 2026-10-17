// Tests für scripts/scorm-einspielen/eingabe.mjs (erfundene Beispiele, keine
// echten Inhalte). Ausführen: node --test scripts/scorm-einspielen/*.test.mjs

import assert from "node:assert/strict";
import { test } from "node:test";

import { leseListe, loeseKennungenAuf, pruefeDateiZiel, zerlegeCsv } from "./eingabe.mjs";

const L1 = "0b6f2c1e-3a4d-4e5f-8a9b-0c1d2e3f4a5b";
const L2 = "1c7a3d2f-4b5e-4f6a-9b0c-1d2e3f4a5b6c";

test("Dateiname gegen Ziel: .csv Pflicht, staging braucht „staging“, production darf es nicht", () => {
  assert.doesNotThrow(() => pruefeDateiZiel("/x/scorm.csv"));
  assert.doesNotThrow(() => pruefeDateiZiel("/x/SCORM-Staging.csv", "staging"));
  assert.doesNotThrow(() => pruefeDateiZiel("/x/scorm-production.csv", "production"));
  assert.throws(() => pruefeDateiZiel("/x/scorm.xlsx"), /reine CSV/);
  assert.throws(() => pruefeDateiZiel("/x/scorm.csv", "staging"), /staging/);
  assert.throws(() => pruefeDateiZiel("/x/scorm-staging.csv", "production"), /Staging-Liste/);
  assert.throws(() => pruefeDateiZiel("/x/scorm.csv", "test"), /Ziel/);
});

test("CSV: Komma oder Semikolon (nach Kopfzeile), Anführungszeichen, BOM, leere Zeilen, CRLF", () => {
  assert.deepEqual(zerlegeCsv('﻿a;b\r\n"x;1";"sag ""hallo"""\r\n\r\n;\r\nc;d'), [
    { nr: 1, zellen: ["a", "b"] },
    { nr: 2, zellen: ["x;1", 'sag "hallo"'] },
    { nr: 5, zellen: ["c", "d"] },
  ]);
  assert.deepEqual(zerlegeCsv('a,b\n"zwei\nzeilen",y\nz,w\n'), [
    { nr: 1, zellen: ["a", "b"] },
    { nr: 2, zellen: ["zwei\nzeilen", "y"] },
    { nr: 4, zellen: ["z", "w"] },
  ]);
  assert.throws(() => zerlegeCsv('a,b\n"offen,x'), /nicht geschlossen/);
});

test("Liste mit Kennung: Speichername je Zeile, weitere Spalten egal", () => {
  const l = leseListe("Kennung,Datei,Bemerkung\nM02-S002,Lernmodul 2_ Die Installation.zip,egal\n");
  assert.equal(l.variante, "kennung");
  assert.deepEqual(l.eintraege[0], { zeile: 2, kennung: "M02-S002", datei: "Lernmodul 2_ Die Installation.zip", speichername: "lernmodul-2-die-installation.zip" });
});

test("Liste mit lesson_id: UUID klein geschrieben, Kopf ohne Rücksicht auf Groß/klein", () => {
  const l = leseListe(`LESSON_ID;datei\n${L1.toUpperCase()};a.zip\n${L2};a.zip\n`);
  assert.equal(l.variante, "lesson");
  assert.deepEqual(l.eintraege.map((e) => [e.lessonId, e.speichername]), [[L1, "a.zip"], [L2, "a.zip"]]);
});

test("Liste: Fehler sammeln (Kopf, fehlende Werte, doppelte Lektion, keine Zip, ungültige UUID)", () => {
  assert.throws(() => leseListe(""), /leer/);
  assert.throws(() => leseListe("Kennung,lesson_id,Datei\nx,y,z.zip"), /genau eine/);
  assert.throws(() => leseListe("Datei\nz.zip"), /Kopfzeile/);
  assert.throws(() => leseListe("Kennung,Datei\n"), /keine Zeilen/);
  const fehler = (() => {
    try {
      leseListe(`Kennung,Datei\nM02-S002,a.zip\n,b.zip\nM02-S002,c.zip\nM02-S003,d.pdf\nM02 S004,e.zip\nM02-S005,ordner/f.zip`);
    } catch (f) {
      return f.message;
    }
  })();
  assert.match(fehler, /^5 Fehler/);
  assert.match(fehler, /Zeile 3: Kennung fehlt/);
  assert.match(fehler, /Zeile 4: M02-S002 steht schon in Zeile 2/);
  assert.match(fehler, /Zeile 5: .*\.zip/);
  assert.match(fehler, /Zeile 6: Kennung „M02 S004“ ungültig/);
  assert.match(fehler, /Zeile 7: .*ohne Ordner/);
  assert.throws(() => leseListe("lesson_id,Datei\nkeine-uuid,a.zip"), /keine gültige UUID/);
});

const plan = () => ({
  module: [{ modul: "II", reihenfolge: 2 }],
  kurse: [
    { schluessel: "II|Kurs A", modul: "II", woche: 1, name: "Kurs A" },
    { schluessel: "II|Kurs B", modul: "II", woche: 2, name: "Kurs B" },
    { schluessel: "IX|Kurs C", modul: "IX", woche: 1, name: "Kurs C" },
  ],
  termine: [
    { kennung: "M02-S002", art: "kurs", kurs: "II|Kurs A" },
    { kennung: "M02-S003", art: "kurs", kurs: "II|Kurs A" },
    { kennung: "M02-S010", art: "kurs", kurs: "II|Kurs B" },
    { kennung: "M02-S001", art: "begleit", begleitkurs: "Deutsch" },
    { kennung: "M02-S020", art: "kurs", kurs: "II|Fehlt" },
    { kennung: "M09-S001", art: "kurs", kurs: "IX|Kurs C" },
  ],
});

test("Kennungen: Termin -> Kurs (Woche, Name, Modul-Reihenfolge); gleicher Kurs mit gleicher Datei einmal", () => {
  const { eintraege } = leseListe("Kennung,Datei\nM02-S002,a.zip\nM02-S003,a.zip\nM02-S010,b.zip");
  const r = loeseKennungenAuf(eintraege, plan());
  assert.deepEqual(
    r.eintraege.map((e) => [e.kennungen, e.kursName, e.modul, e.modulReihenfolge, e.woche, e.speichername]),
    [
      [["M02-S002", "M02-S003"], "Kurs A", "II", 2, 1, "a.zip"],
      [["M02-S010"], "Kurs B", "II", 2, 2, "b.zip"],
    ]
  );
  assert.match(r.meldungen[0], /M02-S002 und M02-S003: gleicher Kurs „Kurs A“/);
});

test("Kennungen: Fehler für unbekannten Termin, Termin ohne Lektion, fehlenden Kurs/Modul, gleicher Kurs mit anderer Datei", () => {
  const { eintraege } = leseListe("Kennung,Datei\nM02-S002,a.zip\nM02-S003,b.zip\nM02-S999,c.zip\nM02-S001,d.zip\nM02-S020,e.zip\nM09-S001,f.zip");
  const fehler = (() => {
    try {
      loeseKennungenAuf(eintraege, plan());
    } catch (f) {
      return f.message;
    }
  })();
  assert.match(fehler, /^5 Fehler/);
  assert.match(fehler, /M02-S003\): derselbe Kurs „Kurs A“ wie Zeile 2/);
  assert.match(fehler, /M02-S999\): Termin nicht im Tab Stundenplan/);
  assert.match(fehler, /M02-S001\): Der Termin hat keine Lektion \(Art „begleit“\)/);
  assert.match(fehler, /M02-S020\): Kurs „II\|Fehlt“/);
  assert.match(fehler, /M09-S001\): Modul IX steht nicht im Plan/);
});
