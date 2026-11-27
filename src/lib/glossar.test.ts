// Tests für das Glossar der Woche (SR-101). Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { glossarAus, glossarHref, sortierWort, wocheParam } from "./glossar.ts";

const k = (wort: string, erklaerung = "E", beispiel = "B") => ({ wort, erklaerung, beispiel });

test("SR-101 Glossar: alphabetisch nach Wort ohne Artikel", () => {
  const liste = glossarAus([k("der Wechselrichter"), k("die Diode"), k("das Amperemeter"), k("Ökostrom"), k("Leiter")]);
  assert.deepEqual(liste.map((e: { wort: string }) => e.wort), ["das Amperemeter", "die Diode", "Leiter", "Ökostrom", "der Wechselrichter"]);
});

test("SR-101 Glossar: jedes Wort einmal, der erste Eintrag gewinnt", () => {
  const liste = glossarAus([k("die Diode", "erste"), k("Die  Diode ", "zweite"), k("die Diode", "dritte")]);
  assert.equal(liste.length, 1);
  assert.equal(liste[0].erklaerung, "erste");
});

test("SR-101 Glossar: leere Wörter fallen weg, Texte ohne Rand-Leerraum", () => {
  const liste = glossarAus([k("  "), k(" der Leiter ", " Leitet Strom. ", " Beispiel. ")]);
  assert.deepEqual(liste, [{ wort: "der Leiter", erklaerung: "Leitet Strom.", beispiel: "Beispiel." }]);
});

test("SR-101 Glossar: Sortierwort ohne bestimmten Artikel", () => {
  assert.equal(sortierWort("die Diode"), "Diode");
  assert.equal(sortierWort("Diode"), "Diode");
  assert.equal(sortierWort("Dieselgenerator"), "Dieselgenerator");
});

test("SR-101 Glossar: Link und Parameter der Woche", () => {
  assert.equal(glossarHref("2026-11-30"), "/fachsprache/glossar?woche=2026-11-30");
  assert.equal(wocheParam("2026-11-30"), "2026-11-30");
  assert.equal(wocheParam("30.11.2026"), null);
  assert.equal(wocheParam(["2026-11-30"]), null);
  assert.equal(wocheParam(undefined), null);
});
