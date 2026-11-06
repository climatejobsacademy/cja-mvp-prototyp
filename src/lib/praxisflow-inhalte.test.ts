// Tests für die Inhalte des Praxisflows: ids müssen zu den Funktionen in der
// Datenbank passen (fn_praxis_pruefliste, 0060; fn_praxis_bewertungsbogen,
// 0061), Dateitypen wie Bucket praxis-dateien (0059, SR-88).
// Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BEWERTUNGSBOGEN_STANDARD,
  PHASEN,
  PRUEFLISTE_STANDARD,
  dateiTyp,
  // @ts-expect-error TS5097: .ts-Endung für node:test nötig
} from "./praxisflow-inhalte.ts";

test("Phasen in der Reihenfolge von field_job.phase", () => {
  assert.deepEqual(
    PHASEN.map((p: { id: string }) => p.id),
    ["informieren", "planen", "entscheiden", "ausfuehren", "kontrollieren", "bewerten"]
  );
});

test("Prüfliste passt zu fn_praxis_pruefliste (0060)", () => {
  assert.deepEqual(PRUEFLISTE_STANDARD.spannungsfrei.map((p: { id: string }) => p.id), ["a1", "a2", "a3", "a4"]);
  assert.deepEqual(PRUEFLISTE_STANDARD.unterSpannung.map((p: { id: string }) => p.id), ["c1", "c2"]);
});

test("Bewertungsbogen passt zu fn_praxis_bewertungsbogen (0061)", () => {
  assert.deepEqual(
    BEWERTUNGSBOGEN_STANDARD.map((k: { id: string; skala: readonly number[]; ko?: boolean }) => [k.id, [...k.skala], Boolean(k.ko)]),
    [
      ["funktion", [10, 0], true],
      ["ausfuehrung", [10, 9, 7, 5, 3, 0], false],
      ["schutz", [10, 0], true],
      ["protokoll", [10, 9, 7, 5, 3, 0], false],
      ["unterlagen", [10, 9, 7, 5, 3, 0], false],
    ]
  );
});

test("Dateityp: Browser-Typ, sonst nach Endung; CAD nur als Plan; Unbekanntes abgelehnt", () => {
  assert.equal(dateiTyp("foto.jpg", "image/jpeg", "auftrag"), "image/jpeg");
  assert.equal(dateiTyp("plan.dwg", "", "plan"), "image/vnd.dwg");
  assert.equal(dateiTyp("plan.dwg", "", "auftrag"), null);
  assert.equal(dateiTyp("modell.glb", "application/octet-stream", "plan"), "model/gltf-binary");
  assert.equal(dateiTyp("liste.xlsx", "", "hilfe"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  assert.equal(dateiTyp("archiv.zip", "application/zip", "hilfe"), null);
});
