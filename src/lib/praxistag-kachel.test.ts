// SR-13: Praxistag-Kachel mit Fortschritt, gleich für einen und mehrere Aufträge.
import assert from "node:assert/strict";
import { test } from "node:test";

// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { fortschrittKurz, fortschrittText, praxistagFortschritt, praxistagTitel } from "./praxistag-kachel.ts";

test("SR-13: ein Auftrag zeigt seinen Titel und 0 von 1 erledigt", () => {
  const a = [{ titel: "Ausschaltung mit Steckdose", phase: "planen", status: "geplant" }];
  assert.equal(praxistagTitel(a), "Ausschaltung mit Steckdose");
  assert.equal(fortschrittText(praxistagFortschritt(a)), "0 von 1 erledigt");
});

test("SR-13: mehrere Aufträge zeigen die Zahl und je Auftrag den Stand in fester Reihenfolge", () => {
  const a = [
    { titel: "A", phase: "abgeschlossen", status: "geplant" },
    { titel: "B", phase: "ausfuehren", status: "geplant" },
    { titel: "C", phase: "informieren", status: "durchgeführt" },
  ];
  const f = praxistagFortschritt(a);
  assert.equal(praxistagTitel(a), "3 Praxisaufträge");
  assert.deepEqual(f.erledigt, [true, false, true]);
  assert.equal(fortschrittText(f), "2 von 3 erledigt");
  assert.equal(fortschrittKurz(f), "2/3");
});
