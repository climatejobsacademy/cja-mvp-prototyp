// Tests für die Funktionsschalter. Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { fachspracheEinheitAn, fragenThreadAn, nativeSelbstlernenAn, praxisaufgabeHref, praxisaufgabeLinkAn, threadSichtbar, waehrendWartungErreichbar, wartungAn } from "./schalter.ts";
// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { wartungsseiteHtml } from "./wartungsseite.ts";

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

// SR-74 (ergänzt 26.11.2026): Schalter für den Fragen-Thread.
test("SR-74 fragenThreadAn: ohne Variable an (Staging bleibt je Lektion schaltbar)", () => {
  assert.equal(fragenThreadAn({}), true);
});

test("SR-74 fragenThreadAn: nur der Wert 'aus' schaltet aus (Groß-/Kleinschreibung und Leerraum egal)", () => {
  assert.equal(fragenThreadAn({ FRAGEN_THREAD: "aus" }), false);
  assert.equal(fragenThreadAn({ FRAGEN_THREAD: " AUS " }), false);
});

test("SR-74 fragenThreadAn: andere Werte bleiben an", () => {
  for (const wert of ["", "an", "false", "0", "nein", "off", "aus,an"]) {
    assert.equal(fragenThreadAn({ FRAGEN_THREAD: wert }), true, wert);
  }
});

test("SR-74 threadSichtbar: Schalter aus blendet den Thread aus, auch wenn chat_aktiv an ist", () => {
  assert.equal(threadSichtbar(true, false), false);
  assert.equal(threadSichtbar(false, false), false);
});

test("SR-74 threadSichtbar: Schalter an folgt chat_aktiv wie bisher", () => {
  assert.equal(threadSichtbar(true, true), true);
  assert.equal(threadSichtbar(false, true), false);
});

test("wartungAn: ohne Variable und mit 'aus' aus, nur 'an' schaltet ein", () => {
  assert.equal(wartungAn({}), false);
  assert.equal(wartungAn({ WARTUNG: "aus" }), false);
  assert.equal(wartungAn({ WARTUNG: " AN " }), true);
  for (const wert of ["", "true", "1", "ja"]) {
    assert.equal(wartungAn({ WARTUNG: wert }), false, wert);
  }
  assert.equal(wartungAn({ NEXT_PUBLIC_WARTUNG: "an" }), false);
});

test("waehrendWartungErreichbar: nur Pflichtseiten (SR-60), sonst Wartungsseite", () => {
  for (const pfad of ["/impressum", "/datenschutz", "/barrierefreiheit"]) {
    assert.equal(waehrendWartungErreichbar(pfad), true, pfad);
  }
  for (const pfad of ["/", "/login", "/auth/callback", "/schedule", "/trainer", "/impressum-x", "/content/1"]) {
    assert.equal(waehrendWartungErreichbar(pfad), false, pfad);
  }
});

test("wartungsseiteHtml: vollständige Seite auf Deutsch mit Links zu den Pflichtseiten", () => {
  const html = wartungsseiteHtml();
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /<html lang="de">/);
  for (const pfad of ["/impressum", "/datenschutz", "/barrierefreiheit"]) {
    assert.ok(html.includes(`href="${pfad}"`), pfad);
  }
});
