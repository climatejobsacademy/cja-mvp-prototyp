// Tests für Ereignisse im Praxisflow (SR-92): nur Kennungen, nie Inhalte.
// Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { einstiegAus, ereignisseFiltern } from "./praxisflow-ereignis.ts";

test("Nur gültige Schritt-Kennungen, höchstens 20 (SR-92)", () => {
  const gut = { art: "schritt_geoeffnet", schritt: "tun:3f2a-9b" } as const;
  assert.deepEqual(ereignisseFiltern([gut]), [gut]);
  assert.deepEqual(ereignisseFiltern([{ art: "schritt_geoeffnet", schritt: "Mein Plan.pdf" }]), []);
  assert.deepEqual(ereignisseFiltern([{ art: "schritt_geoeffnet", schritt: "" }]), []);
  assert.equal(ereignisseFiltern(Array.from({ length: 25 }, () => gut)).length, 20);
});

test("SR-92: Einstieg nur aus der festen Liste, sonst direkt", () => {
  assert.equal(einstiegAus("stundenplan"), "stundenplan");
  assert.equal(einstiegAus("home"), "home");
  assert.equal(einstiegAus("naechster"), "naechster");
  assert.equal(einstiegAus(undefined), "direkt");
  assert.equal(einstiegAus("newsletter"), "direkt");
  assert.deepEqual(ereignisseFiltern([{ art: "auftrag_geoeffnet", schritt: "tagesuebersicht" }]).length, 1);
});
