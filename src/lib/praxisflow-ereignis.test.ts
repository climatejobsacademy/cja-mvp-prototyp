// Tests für Ereignisse im Praxisflow (SR-92): nur Kennungen, nie Inhalte.
// Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { ereignisseFiltern } from "./praxisflow-ereignis.ts";

test("Nur gültige Schritt-Kennungen, höchstens 20 (SR-92)", () => {
  const gut = { art: "schritt_geoeffnet", schritt: "tun:3f2a-9b" } as const;
  assert.deepEqual(ereignisseFiltern([gut]), [gut]);
  assert.deepEqual(ereignisseFiltern([{ art: "schritt_geoeffnet", schritt: "Mein Plan.pdf" }]), []);
  assert.deepEqual(ereignisseFiltern([{ art: "schritt_geoeffnet", schritt: "" }]), []);
  assert.equal(ereignisseFiltern(Array.from({ length: 25 }, () => gut)).length, 20);
});
