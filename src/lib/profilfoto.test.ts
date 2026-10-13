// Tests für die Profilfoto-Hilfen (SR-77). Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { fotoPfad, initiale, istEigenerFotoPfad, mittigerAusschnitt } from "./profilfoto.ts";

const PERSON = "3f2b8c1e-0d4a-4b6e-9c7f-1a2b3c4d5e6f";
const DATEI = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

test("Pfad liegt im eigenen Ordner und endet auf .jpg", () => {
  assert.equal(fotoPfad(PERSON, DATEI), `${PERSON}/${DATEI}.jpg`);
  assert.equal(istEigenerFotoPfad(PERSON, fotoPfad(PERSON, DATEI)), true);
});

test("fremder Ordner, Unterordner oder andere Endung werden abgelehnt", () => {
  assert.equal(istEigenerFotoPfad(PERSON, `${DATEI}/${DATEI}.jpg`), false);
  assert.equal(istEigenerFotoPfad(PERSON, `${PERSON}/x/${DATEI}.jpg`), false);
  assert.equal(istEigenerFotoPfad(PERSON, `${PERSON}/${DATEI}.png`), false);
  assert.equal(istEigenerFotoPfad(PERSON, `${PERSON}/../${DATEI}.jpg`), false);
});

test("Ausschnitt aus der Bildmitte, kürzere Seite zählt", () => {
  assert.deepEqual(mittigerAusschnitt(4000, 3000), { x: 500, y: 0, kante: 3000 });
  assert.deepEqual(mittigerAusschnitt(1080, 1920), { x: 0, y: 420, kante: 1080 });
  assert.deepEqual(mittigerAusschnitt(512, 512), { x: 0, y: 0, kante: 512 });
});

test("Initiale für den Platzhalter", () => {
  assert.equal(initiale("malte"), "M");
  assert.equal(initiale("  "), "?");
});
