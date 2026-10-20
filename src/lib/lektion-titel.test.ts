// Tests für Lektionstitel und Thema (SR-13). Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { lektionTitel } from "./lektion-titel.ts";

test("ohne Thema bleibt der Name unverändert, auch mit Klammer", () => {
  assert.deepEqual(lektionTitel("Ohmsches Gesetz", null), { titel: "Ohmsches Gesetz", thema: null });
  assert.deepEqual(lektionTitel("Grundlagen (Messen)", null), { titel: "Grundlagen (Messen)", thema: null });
  assert.deepEqual(lektionTitel("Grundlagen (Messen)", "  "), { titel: "Grundlagen (Messen)", thema: null });
});

test("mit Thema verschwindet die erste Klammer aus dem Titel", () => {
  assert.deepEqual(
    lektionTitel("Grundlagen der Elektrotechnik (Der Transistor / Die Dioden)", "Der Transistor / Die Dioden"),
    { titel: "Grundlagen der Elektrotechnik", thema: "Der Transistor / Die Dioden" }
  );
  assert.deepEqual(
    lektionTitel("Grundschaltungen (Umgang mit Multimeter) – Teil 2", "Umgang mit Multimeter"),
    { titel: "Grundschaltungen – Teil 2", thema: "Umgang mit Multimeter" }
  );
});

test("nach dem Datenskript (Name ohne Klammer) bleibt der Titel gleich", () => {
  assert.deepEqual(lektionTitel("Grundlagen der Elektrotechnik", "Der Transistor"), {
    titel: "Grundlagen der Elektrotechnik",
    thema: "Der Transistor",
  });
});

test("nur Klammer: der Name bleibt als Titel stehen", () => {
  assert.deepEqual(lektionTitel("(Nur Klammer)", "Nur Klammer"), { titel: "(Nur Klammer)", thema: "Nur Klammer" });
});
