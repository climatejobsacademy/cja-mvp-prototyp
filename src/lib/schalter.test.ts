// Tests für die Funktionsschalter. Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { fachspracheEinheitAn, nativeSelbstlernenAn, praxisaufgabeHref, praxisaufgabeLinkAn } from "./schalter.ts";

test("fachspracheEinheitAn: ohne Variable aus", () => {
  assert.equal(fachspracheEinheitAn({}), false);
});

test("fachspracheEinheitAn: nur der Wert 'an' schaltet ein (Groß-/Kleinschreibung und Leerraum egal)", () => {
  assert.equal(fachspracheEinheitAn({ FACHSPRACHE_EINHEIT: "an" }), true);
  assert.equal(fachspracheEinheitAn({ FACHSPRACHE_EINHEIT: " AN " }), true);
});

test("fachspracheEinheitAn: andere Werte bleiben aus", () => {
  for (const wert of ["", "aus", "true", "1", "ja", "an,aus"]) {
    assert.equal(fachspracheEinheitAn({ FACHSPRACHE_EINHEIT: wert }), false, wert);
  }
});

test("fachspracheEinheitAn: NEXT_PUBLIC_-Variante zählt nicht", () => {
  assert.equal(fachspracheEinheitAn({ NEXT_PUBLIC_FACHSPRACHE_EINHEIT: "an" }), false);
});

test("praxisaufgabeLinkAn: ohne Variable aus, nur 'an' schaltet ein", () => {
  assert.equal(praxisaufgabeLinkAn({}), false);
  assert.equal(praxisaufgabeLinkAn({ PRAXISAUFGABE_LINK: " An " }), true);
  assert.equal(praxisaufgabeLinkAn({ PRAXISAUFGABE_LINK: "true" }), false);
  assert.equal(praxisaufgabeLinkAn({ NEXT_PUBLIC_PRAXISAUFGABE_LINK: "an" }), false);
});

test("praxisaufgabeHref: aus = kein Link, an = Pfad mit optionalem von", () => {
  assert.equal(praxisaufgabeHref("f1", "home", false), null);
  assert.equal(praxisaufgabeHref("f1", undefined, true), "/praxistag/f1");
  assert.equal(praxisaufgabeHref("f1", "home", true), "/praxistag/f1?von=home");
});

test("nativeSelbstlernenAn: ohne Variable an (bewusst anders als die übrigen Schalter)", () => {
  assert.equal(nativeSelbstlernenAn({}), true);
});

test("nativeSelbstlernenAn: nur der Wert 'aus' schaltet aus (Groß-/Kleinschreibung und Leerraum egal)", () => {
  assert.equal(nativeSelbstlernenAn({ NATIVE_SELBSTLERNEN: "aus" }), false);
  assert.equal(nativeSelbstlernenAn({ NATIVE_SELBSTLERNEN: " AUS " }), false);
});

test("nativeSelbstlernenAn: andere Werte bleiben an", () => {
  for (const wert of ["", "an", "false", "0", "nein", "off", "aus,an"]) {
    assert.equal(nativeSelbstlernenAn({ NATIVE_SELBSTLERNEN: wert }), true, wert);
  }
});

test("nativeSelbstlernenAn: NEXT_PUBLIC_-Variante zählt nicht", () => {
  assert.equal(nativeSelbstlernenAn({ NEXT_PUBLIC_NATIVE_SELBSTLERNEN: "aus" }), true);
});
