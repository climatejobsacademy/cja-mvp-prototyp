// Tests für den Stand "begonnen" (SR-73). Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { begonnenSetzen } from "./lektion-begonnen.ts";

test("Selbstlern-Lektionen werden beim ersten Öffnen begonnen", () => {
  assert.equal(begonnenSetzen("scorm", "offen"), true);
  assert.equal(begonnenSetzen("repository", "offen"), true);
});

test("Live-Lektionen nicht -- dort zählt die Anwesenheit", () => {
  assert.equal(begonnenSetzen("live", "offen"), false);
});

test("Begonnen oder abgeschlossen bleibt unverändert", () => {
  assert.equal(begonnenSetzen("scorm", "in Bearbeitung"), false);
  assert.equal(begonnenSetzen("scorm", "abgeschlossen"), false);
});
