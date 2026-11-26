// Tests für Sitzung und Abmelden. Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { ABMELDEN_SCOPE } from "./sitzung.ts";

test("SR-99 Abmelden beendet nur die Sitzung auf diesem Gerät (scope local, nicht global)", () => {
  assert.equal(ABMELDEN_SCOPE, "local");
});
