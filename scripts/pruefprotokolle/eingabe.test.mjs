// SR-91: Vorlagen der Prüfprotokolle und ihrer Zuordnung lesen.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { leseProtokolle, leseZuordnung } from "./eingabe.mjs";

const KOPF = "protokoll_kennung;protokoll_titel;punkt_nr;punkt_kennung;teil;titel;anweisung;unterpunkte;hinweis\n";

test("SR-91: die Vorlage im Repo ist gültig", () => {
  const { protokolle, fehler } = leseProtokolle(readFileSync(new URL("../../docs/vorlagen/pruefprotokolle.csv", import.meta.url), "utf8"));
  assert.deepEqual(fehler, []);
  assert.equal(protokolle.length, 1);
  assert.ok(protokolle[0].punkte.length >= 2);
  assert.ok(protokolle[0].punkte.some((p) => p.teil === "unter_spannung"));
});

test("SR-91: Unterpunkte, Teil und Sortierung nach punkt_nr", () => {
  const { protokolle, fehler } = leseProtokolle(
    KOPF + '"v1";"Variante";2;"u1";"unter Spannung";"Messen";"";"";""\n"v1";"Variante";1;"s1";"ohne Spannung";"Sehen";"Tu es";"a | b";"Achtung"\n'
  );
  assert.deepEqual(fehler, []);
  assert.deepEqual(protokolle[0].punkte.map((p) => [p.kennung, p.teil]), [["s1", "spannungsfrei"], ["u1", "unter_spannung"]]);
  assert.deepEqual(protokolle[0].punkte[0].punkte, ["a", "b"]);
  assert.equal(protokolle[0].punkte[1].text, null);
});

test("SR-91: unter Spannung vor ohne Spannung wird abgelehnt", () => {
  const { fehler } = leseProtokolle(KOPF + '"v1";"V";1;"u1";"unter Spannung";"M";"";"";""\n"v1";"V";2;"s1";"ohne Spannung";"S";"";"";""\n');
  assert.match(fehler.join(" "), /nach allen Punkten/);
});

test("SR-91: Fehler je Zeile", () => {
  const { fehler } = leseProtokolle(KOPF + '"V 1";"V";1;"a1";"ohne Spannung";"T";"";"";""\n"v2";"V";0;"A 1";"spannend";"";"";"";""\n"v2";"V";0;"x";"ohne Spannung";"T";"";"";""\n');
  // Kennung, punkt_nr, punkt_kennung, teil, titel, punkt_nr, doppelte Nummer
  assert.equal(fehler.length, 7);
});

test("SR-91: Zuordnung nur mit bekannter Kennung, Aufgabe nur einmal", () => {
  const { fehler } = leseZuordnung('aufgabe_titel;protokoll_kennung\n"A";"v1"\n"A";"v1"\n"B";"unbekannt"\n', new Set(["v1"]));
  assert.equal(fehler.length, 2);
});
