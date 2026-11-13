// Tests für die Listen in Planen (SR-64), aus dem Prototyp übernommen.
// Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  diktatZuTexten,
  eintraegeAnhaengen,
  eintragBearbeiten,
  eintragHinzufuegen,
  eintragAnPosition,
  eintragLoeschen,
  eintragVerschieben,
  zeilenZuTexten,
  // @ts-expect-error TS5097: .ts-Endung für node:test nötig
} from "./praxisflow-liste.ts";

type E = { id: string; text: string };
const drei: E[] = [
  { id: "a", text: "A" },
  { id: "b", text: "B" },
  { id: "c", text: "C" },
];
const ids = (l: E[]) => l.map((e) => e.id).join("");

test("Einträge hinzufügen, bearbeiten, löschen; leerer Text wird ignoriert", () => {
  let l = eintragHinzufuegen([], "  Akkuschrauber  ", "w1");
  assert.deepEqual(l, [{ id: "w1", text: "Akkuschrauber" }]);
  assert.equal(eintragHinzufuegen(l, "   ", "x"), l);
  l = eintragBearbeiten(l, "w1", " Maßband ");
  assert.equal(l[0].text, "Maßband");
  assert.equal(eintragBearbeiten(l, "w1", " "), l);
  assert.deepEqual(eintragLoeschen(l, "w1"), []);
});

test("Hoch/Runter tauscht Nachbarn, an den Rändern keine Änderung", () => {
  assert.equal(ids(eintragVerschieben(drei, "b", "hoch")), "bac");
  assert.equal(ids(eintragVerschieben(drei, "b", "runter")), "acb");
  assert.equal(eintragVerschieben(drei, "a", "hoch"), drei);
  assert.equal(eintragVerschieben(drei, "c", "runter"), drei);
  assert.equal(eintragVerschieben(drei, "x", "hoch"), drei);
});


test("Eingabe: mehrzeiliger Text wird zeilenweise zu Einträgen, leere Zeilen ignoriert", () => {
  assert.deepEqual(zeilenZuTexten("Akkuschrauber\nMaßband\r\n\n  Seitenschneider  \r"), ["Akkuschrauber", "Maßband", "Seitenschneider"]);
  assert.deepEqual(zeilenZuTexten("Kabel abisolieren. Adern prüfen."), ["Kabel abisolieren. Adern prüfen."]);
  assert.deepEqual(zeilenZuTexten(" \n\t\n"), []);
});

test("Diktat: Sätze und Zeilen aufgeteilt", () => {
  assert.deepEqual(diktatZuTexten("Akkuschrauber. Maßband\nSeitenschneider"), ["Akkuschrauber", "Maßband", "Seitenschneider"]);
});

test("Diktat: ein Satz je Eintrag, Satzpunkt am Ende weg, leere Teile ignoriert", () => {
  assert.deepEqual(diktatZuTexten("Akkuschrauber. Maßband! Ist das alles?"), ["Akkuschrauber", "Maßband!", "Ist das alles?"]);
  assert.deepEqual(diktatZuTexten("  Seitenschneider  "), ["Seitenschneider"]);
  assert.deepEqual(diktatZuTexten("Kabel abisolieren.\n\nAdern prüfen..  "), ["Kabel abisolieren", "Adern prüfen"]);
  assert.deepEqual(diktatZuTexten(""), []);
  assert.deepEqual(diktatZuTexten(" . \n . "), []);
  assert.deepEqual(diktatZuTexten("   \n  "), []);
  assert.deepEqual(diktatZuTexten("..."), []);
});

test("Diktat: allein stehende Zahl bleibt beim folgenden Satz", () => {
  assert.deepEqual(diktatZuTexten("1. Kabel abisolieren. 2. Adern prüfen."), ["1. Kabel abisolieren", "2. Adern prüfen"]);
});

test("Diktat: Texte werden unten angehängt und sind danach wie getippte Einträge sortierbar", () => {
  let n = 0;
  const neueId = () => `d${++n}`;
  const l = eintraegeAnhaengen([{ id: "a", text: "A" }], ["B", "  ", "C"], neueId);
  assert.equal(ids(l), "ad1d2");
  assert.deepEqual(l.map((e) => e.text), ["A", "B", "C"]);
  assert.equal(ids(eintragVerschieben(l, "d2", "hoch")), "ad2d1");
  assert.equal(ids(eintragLoeschen(l, "d1")), "ad2");
  assert.equal(eintragBearbeiten(l, "d1", "B neu")[1].text, "B neu");
});

// ---------- Durchführen ----------

test("Eintrag an eine Position ziehen (SR-64, Umsortieren)", () => {
  assert.equal(ids(eintragAnPosition(drei, "a", 2)), "bca");
  assert.equal(ids(eintragAnPosition(drei, "c", 0)), "cab");
  assert.equal(ids(eintragAnPosition(drei, "b", 9)), "acb");
  assert.equal(ids(eintragAnPosition(drei, "b", -3)), "bac");
  assert.equal(eintragAnPosition(drei, "b", 1), drei);
  assert.equal(eintragAnPosition(drei, "x", 0), drei);
});
