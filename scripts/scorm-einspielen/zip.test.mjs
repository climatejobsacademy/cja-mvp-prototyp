// Tests für scripts/scorm-einspielen/zip.mjs mit kleinen, erfundenen Paketen
// (keine echten Inhalte). Die Audio-Umwandlung (afconvert) wird hier nicht
// getestet, nur das Auspacken. Ausführen: node --test scripts/scorm-einspielen/*.test.mjs

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { strToU8, zipSync } from "fflate";

import { analysierePaket, packeMedienAus } from "./zip.mjs";

const L = (werte) => ({ localizations: { de_DE: werte, metadata: { masterLanguageCode: "de_DE" } } });
const D = "assets/assets/scorm_test_data/";
const MANIFEST = `<manifest><metadata><schemaversion>1.2</schemaversion></metadata>
  <organizations default="o"><organization identifier="o"><title>Testkurs</title><item identifierref="r"/></organization></organizations>
  <resources><resource identifier="r" href="scorm.html"/></resources></manifest>`;

function elephantZip(lp, extra = {}) {
  return zipSync({
    "imsmanifest.xml": strToU8(MANIFEST),
    "scorm.html": strToU8("<html></html>"),
    [`${D}course.json`]: strToU8(JSON.stringify({ data: L({ name: "Kurs" }) })),
    [`${D}lesson_overviews.json`]: strToU8(JSON.stringify([{ lesson_id: "a", sort_index: 0, data: L({ name: "Eins" }) }])),
    [`${D}LP_a.json`]: strToU8(JSON.stringify(lp)),
    "assets/images/bild.jpg": new Uint8Array(1000).fill(7),
    "assets/tts/1/ton.mp3": [new Uint8Array(50).fill(1), { level: 0 }],
    "assets/images/ungenutzt.png": new Uint8Array(10),
    ...extra,
  });
}

const ordner = () => mkdtempSync(join(tmpdir(), "scorm-test-"));

test("Elephant-Paket: Manifest, Modularten, genutzte Medien; Auspacken mit gleichen Bytes", async () => {
  const dir = ordner();
  try {
    const pfad = join(dir, "p.zip");
    writeFileSync(
      pfad,
      elephantZip([
        { lesson_id: "a", module_id: "m1", sort_index: 0, module_type: "page", data: L({ markupContent: "<p>Hallo</p>", audioFilePath: "tts/1/ton.mp3" }) },
        { lesson_id: "a", module_id: "m2", sort_index: 1, module_type: "swipe", data: { correctSwipeChoice: true, ...L({ questionText: "?", imageFilePath: "images/bild.jpg" }) } },
      ])
    );
    const a = await analysierePaket(pfad);
    assert.deepEqual(a.fehler, []);
    assert.deepEqual(a.manifest, { version: "1.2", titel: "Testkurs", entryPoint: "scorm.html" });
    assert.equal(a.elephant.nativ, true);
    assert.deepEqual(a.elephant.modularten, [["page", 1, true], ["swipe", 1, true]]);
    assert.deepEqual(a.medien.map((m) => [m.innen, m.groesse]), [["assets/images/bild.jpg", 1000], ["assets/tts/1/ton.mp3", 50]]);

    const ziel = join(dir, "aus");
    const fertig = await packeMedienAus(pfad, a.medien, ziel);
    assert.deepEqual(readFileSync(join(ziel, "assets/images/bild.jpg")), Buffer.alloc(1000, 7));
    assert.deepEqual(readFileSync(join(ziel, "assets/tts/1/ton.mp3")), Buffer.alloc(50, 1));
    assert.deepEqual(fertig.map((m) => m.groesseZiel), [1000, 50]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("Unbekannte Modulart: keine native Ansicht, nichts auspacken", async () => {
  const dir = ordner();
  try {
    const pfad = join(dir, "p.zip");
    writeFileSync(
      pfad,
      elephantZip([
        { lesson_id: "a", module_id: "m1", sort_index: 0, module_type: "page", data: L({ markupContent: "<p>Hallo</p>" }) },
        { lesson_id: "a", module_id: "m2", sort_index: 1, module_type: "neuerTyp", data: {} },
      ])
    );
    const a = await analysierePaket(pfad);
    assert.equal(a.elephant.nativ, false);
    assert.deepEqual(a.elephant.uebersprungen, ["neuerTyp"]);
    assert.deepEqual(a.elephant.modularten.find(([art]) => art === "neuerTyp"), ["neuerTyp", 1, false]);
    assert.deepEqual(a.medien, []);
    assert.deepEqual(a.fehler, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("Kein Elephant, fehlende Einstiegsdatei, fehlendes Manifest, kein Zip", async () => {
  const dir = ordner();
  try {
    const p1 = join(dir, "a.zip");
    writeFileSync(p1, zipSync({ "imsmanifest.xml": strToU8(MANIFEST), "scorm.html": strToU8("x") }));
    const a1 = await analysierePaket(p1);
    assert.equal(a1.elephant, null);
    assert.deepEqual(a1.fehler, []);

    const p2 = join(dir, "b.zip");
    writeFileSync(p2, zipSync({ "imsmanifest.xml": strToU8(MANIFEST) }));
    assert.match((await analysierePaket(p2)).fehler.join(), /Einstiegsdatei scorm\.html fehlt/);

    const p3 = join(dir, "c.zip");
    writeFileSync(p3, zipSync({ "index.html": strToU8("x") }));
    assert.match((await analysierePaket(p3)).fehler.join(), /imsmanifest\.xml fehlt/);

    const p4 = join(dir, "d.zip");
    writeFileSync(p4, "kein zip");
    assert.match((await analysierePaket(p4)).fehler.join(), /Zip nicht lesbar/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
