import assert from "node:assert/strict";
import { test } from "node:test";

// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { neuererStand, standPruefen, type LernStand } from "./lernstand.ts";

const kurs = [3, 2, 4]; // drei Kapitel mit 3, 2, 4 Schritten
const zeit = "2026-10-20T10:00:00";

test("gültiger Stand bleibt erhalten", () => {
  const s = standPruefen({ kap: 1, schritt: 1, geschafft: [0], geloest: ["f1"], zeit }, kurs);
  assert.deepEqual(s, { kap: 1, schritt: 1, geschafft: [0], geloest: ["f1"], zeit });
});

test("kaputter oder nicht passender Stand ergibt null", () => {
  assert.equal(standPruefen(null, kurs), null);
  assert.equal(standPruefen([1, 2], kurs), null);
  assert.equal(standPruefen({ kap: 5, schritt: 0, geschafft: [], geloest: [], zeit }, kurs), null, "Kapitel gibt es nicht");
  assert.equal(standPruefen({ kap: 1, schritt: 2, geschafft: [], geloest: [], zeit }, kurs), null, "Schritt gibt es nicht");
  assert.equal(standPruefen({ kap: 0, schritt: 0, geschafft: [], geloest: [], zeit: "gestern" }, kurs), null);
});

test("fremde Werte in den Listen werden aussortiert", () => {
  const s = standPruefen({ kap: 0, schritt: 0, geschafft: [0, 7, "x", 0], geloest: ["a", 3, "a"], zeit }, kurs);
  assert.deepEqual(s?.geschafft, [0]);
  assert.deepEqual(s?.geloest, ["a"]);
});

test("Ende eines fertigen Kapitels: weiter mit dem nächsten Kapitel", () => {
  const s = standPruefen({ kap: 0, schritt: 2, geschafft: [0], geloest: [], zeit }, kurs);
  assert.equal(s?.kap, 1);
  assert.equal(s?.schritt, 0);
  const letztes = standPruefen({ kap: 2, schritt: 3, geschafft: [0, 1, 2], geloest: [], zeit }, kurs);
  assert.equal(letztes?.kap, 2, "letztes Kapitel bleibt");
});

test("der neuere Stand gewinnt", () => {
  const alt: LernStand = { kap: 0, schritt: 1, geschafft: [], geloest: [], zeit: "2026-10-20T09:00:00" };
  const neu: LernStand = { ...alt, schritt: 2, zeit: "2026-10-20T11:00:00" };
  assert.equal(neuererStand(alt, neu), neu);
  assert.equal(neuererStand(neu, alt), neu);
  assert.equal(neuererStand(null, alt), alt);
  assert.equal(neuererStand(alt, null), alt);
});
