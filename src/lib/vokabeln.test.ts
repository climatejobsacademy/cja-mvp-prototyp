// Tests für den Vokabelklick (SR-24). Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { begriffe, knotenMarkieren, markieren, sucheAus, type Vokabel } from "./vokabeln.ts";

const v = (id: string, wort: string, formen: string[] = []): Vokabel => ({
  id, wort, erklaerung: "E", beispiel: "B", bildUrl: null, bildAlt: null, formen,
});

const markiert = (text: string, vokabeln: Vokabel[], gesehen = new Set<string>()) =>
  markieren(text, sucheAus(vokabeln), gesehen).map((a: { text: string; vokabelId?: string }) => ("vokabelId" in a ? `[${a.text}]` : a.text)).join("");

test("SR-24 Begriffe: Wort ohne Artikel plus Formen", () => {
  assert.deepEqual(begriffe(v("1", "die Diode", ["Dioden"])), ["Diode", "Dioden"]);
  assert.deepEqual(begriffe(v("1", "Leiter", ["Leiter"])), ["Leiter"]);
});

test("SR-24 Markieren: ganzes Wort, ohne Groß-/Kleinschreibung, nicht mitten im Wort", () => {
  assert.equal(markiert("Die Diode sperrt. Diodenlaser nicht.", [v("1", "die Diode")]), "Die [Diode] sperrt. Diodenlaser nicht.");
  assert.equal(markiert("diode", [v("1", "die Diode")]), "[diode]");
});

test("SR-24 Markieren: Formen werden gefunden", () => {
  assert.equal(markiert("Zwei Leitern liegen hier.", [v("1", "der Leiter", ["Leitern"])]), "Zwei [Leitern] liegen hier.");
});

test("SR-24 Markieren: je Schritt nur das erste Vorkommen, auch über mehrere Texte", () => {
  const gesehen = new Set<string>();
  const vok = [v("1", "die Diode")];
  assert.equal(markiert("Diode und Diode.", vok, gesehen), "[Diode] und Diode.");
  assert.equal(markiert("Noch eine Diode.", vok, gesehen), "Noch eine Diode.");
});

test("SR-24 Markieren: längerer Begriff vor kürzerem, Umlaute und Bindestrich", () => {
  const vok = [v("1", "der Leiter"), v("2", "der PE-Leiter"), v("3", "der Wärmeübertrager")];
  assert.equal(markiert("Der PE-Leiter und der Leiter am Wärmeübertrager.", vok), "Der [PE-Leiter] und der [Leiter] am [Wärmeübertrager].");
});

test("SR-24 Markieren: Texte mit Formeln und ohne Vokabeln bleiben unverändert", () => {
  assert.equal(markiert("Die Diode: $$U = R \\cdot I$$", [v("1", "die Diode")]), "Die Diode: $$U = R \\cdot I$$");
  assert.equal(markiert("Die Diode.", []), "Die Diode.");
});

test("SR-24 Markieren: Sonderzeichen in Begriffen werden nicht als Muster gelesen", () => {
  assert.equal(markiert("Ein RCD (FI) schützt.", [v("1", "RCD (FI)")]), "Ein [RCD (FI)] schützt.");
});

test("SR-24 Textbaum: Lesereihenfolge über verschachtelte Knoten, erstes Vorkommen je Schritt", () => {
  const suche = sucheAus([v("1", "die Diode")]);
  const baum = knotenMarkieren([{ tag: "p", kinder: ["Eine ", { tag: "strong", kinder: ["Diode"] }] }, "Die Diode."], suche, new Set());
  assert.deepEqual(baum, [
    { tag: "p", kinder: [{ abschnitte: [{ text: "Eine " }] }, { tag: "strong", kinder: [{ abschnitte: [{ text: "Diode", vokabelId: "1" }] }] }] },
    { abschnitte: [{ text: "Die Diode." }] },
  ]);
});
