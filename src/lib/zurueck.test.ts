// SR-64 (Navigation, ergänzt 12.11.2026): Zurück-Link zur Seite, von der man kam.
import assert from "node:assert/strict";
import { test } from "node:test";

// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { praxisZurueck, zurueckZu } from "./zurueck.ts";

const TAG = "2026-11-16";

test("SR-64: Praxisauftrag aus der Tagesübersicht oder über „nächster Praxisauftrag“ zurück zur Tagesübersicht", () => {
  const ziel = { href: `/praxistag/tag/${TAG}`, label: "Zurück zur Tagesübersicht" };
  assert.deepEqual(praxisZurueck("tagesuebersicht", TAG), ziel);
  assert.deepEqual(praxisZurueck("naechster", TAG), ziel);
});

test("SR-64: aus dem Stundenplan und ohne Herkunft zurück zum Stundenplan auf dem Tag des Auftrags", () => {
  const ziel = { href: `/schedule?datum=${TAG}`, label: "Zurück zum Stundenplan" };
  assert.deepEqual(praxisZurueck("stundenplan", TAG), ziel);
  assert.deepEqual(praxisZurueck(undefined, TAG), ziel);
  assert.deepEqual(praxisZurueck("https://evil.example", TAG), ziel);
});

test("SR-64: Home, Programm und Kompetenzen führen dorthin zurück", () => {
  assert.deepEqual(praxisZurueck("home", TAG), { href: "/home", label: "Zurück zu Home" });
  assert.deepEqual(praxisZurueck("programm", TAG), { href: "/content", label: "Zurück zum Programm" });
  assert.deepEqual(praxisZurueck("kompetenzen", TAG), { href: "/kompetenzen", label: "Zurück zu den Kompetenzen" });
});

test("SR-64: ungültiges Datum wird nie Teil des Pfads", () => {
  assert.equal(zurueckZu("tagesuebersicht", "../x").href, "/schedule");
  assert.equal(zurueckZu("stundenplan", "//evil.example").href, "/schedule");
});
