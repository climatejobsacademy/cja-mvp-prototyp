// Tests für die Logik des Praxisflow-Demos (Fake-Speicher, kein Browser).
// Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { DEMO_CODEWORT, DEMO_SCHRITTE, PUNKTE_SKALA, SPEICHER_PRAEFIX } from "./praxisflow-daten.ts";
import {
  alleErledigt,
  bewertungVollstaendig,
  codewortKorrekt,
  demoZuruecksetzen,
  erledigtBereinigen,
  erledigtUmschalten,
  kontrollierbarUmschalten,
  planVollstaendig,
  schrittBearbeiten,
  schrittHinzufuegen,
  schrittLoeschen,
  schrittVerschieben,
  speicherSchluessel,
  startZustand,
  zustandLaden,
  zustandSpeichern,
  // @ts-expect-error TS5097: .ts-Endung für node:test nötig
} from "./praxisflow-logik.ts";

type S = { id: string; text: string; kontrollierbar: boolean };
const drei: S[] = [
  { id: "a", text: "A", kontrollierbar: false },
  { id: "b", text: "B", kontrollierbar: true },
  { id: "c", text: "C", kontrollierbar: false },
];
const ids = (l: S[]) => l.map((s) => s.id).join("");

function fakeStorage(start: Record<string, string> = {}) {
  const daten = new Map(Object.entries(start));
  return {
    get length() {
      return daten.size;
    },
    key: (i: number) => [...daten.keys()][i] ?? null,
    getItem: (k: string) => daten.get(k) ?? null,
    setItem: (k: string, v: string) => void daten.set(k, v),
    removeItem: (k: string) => void daten.delete(k),
    daten,
  };
}

test("Demo-Daten: Codewort gesetzt, Skala fest, mindestens ein kontrollierbarer Beispielschritt", () => {
  assert.ok(DEMO_CODEWORT.length > 0);
  assert.deepEqual([...PUNKTE_SKALA], [10, 9, 7, 5, 3, 0]);
  assert.ok(DEMO_SCHRITTE.some((s: S) => s.kontrollierbar));
  assert.equal(new Set(DEMO_SCHRITTE.map((s: S) => s.id)).size, DEMO_SCHRITTE.length);
});

test("Startzustand: Analyse, Kopie der Beispielschritte, nichts abgehakt", () => {
  const z = startZustand(drei);
  assert.equal(z.phase, "analyse");
  assert.deepEqual(z.schritte, drei);
  assert.notEqual(z.schritte[0], drei[0]);
  assert.deepEqual(z.erledigt, []);
});

test("Schritte hinzufügen, bearbeiten, löschen; leerer Text wird ignoriert", () => {
  let l = schrittHinzufuegen(drei, "  D  ", "d");
  assert.equal(l[3].text, "D");
  assert.equal(l[3].kontrollierbar, false);
  assert.equal(schrittHinzufuegen(drei, "   ", "x"), drei);
  l = schrittBearbeiten(l, "a", " Neu ");
  assert.equal(l[0].text, "Neu");
  assert.equal(schrittBearbeiten(l, "a", " "), l);
  assert.equal(ids(schrittLoeschen(l, "b")), "acd");
});

test("Hoch/Runter tauscht Nachbarn, an den Rändern keine Änderung", () => {
  assert.equal(ids(schrittVerschieben(drei, "b", "hoch")), "bac");
  assert.equal(ids(schrittVerschieben(drei, "b", "runter")), "acb");
  assert.equal(schrittVerschieben(drei, "a", "hoch"), drei);
  assert.equal(schrittVerschieben(drei, "c", "runter"), drei);
  assert.equal(schrittVerschieben(drei, "x", "hoch"), drei);
});

test("kontrollierbar umschalten und Plan vollständig", () => {
  assert.equal(kontrollierbarUmschalten(drei, "a")[0].kontrollierbar, true);
  assert.equal(planVollstaendig(drei), true);
  assert.equal(planVollstaendig([]), false);
});

test("Abhaken: alle erledigt erst, wenn jeder geplante Schritt abgehakt ist", () => {
  let e: string[] = [];
  e = erledigtUmschalten(e, "a");
  e = erledigtUmschalten(e, "b");
  assert.equal(alleErledigt(drei, e), false);
  e = erledigtUmschalten(e, "c");
  assert.equal(alleErledigt(drei, e), true);
  assert.equal(alleErledigt(drei, erledigtUmschalten(e, "c")), false);
  assert.equal(alleErledigt([], []), false);
});

test("Nach Änderung des Plans bleiben nur Haken vorhandener Schritte", () => {
  assert.deepEqual(erledigtBereinigen(["a", "b", "weg"], drei), ["a", "b"]);
});

test("Codewort: ohne Groß-/Kleinschreibung und Leerraum, leer ist falsch", () => {
  assert.equal(codewortKorrekt("  WerkStatt ", "werkstatt"), true);
  assert.equal(codewortKorrekt("werkstat", "werkstatt"), false);
  assert.equal(codewortKorrekt("", ""), false);
});

test("Bewertung vollständig nur mit Punkten aus der Skala für jeden kontrollierbaren Schritt", () => {
  assert.equal(bewertungVollstaendig(drei, {}, PUNKTE_SKALA), false);
  assert.equal(bewertungVollstaendig(drei, { b: 8 }, PUNKTE_SKALA), false);
  assert.equal(bewertungVollstaendig(drei, { b: 0 }, PUNKTE_SKALA), true);
  assert.equal(bewertungVollstaendig([{ id: "a", text: "A", kontrollierbar: false }], {}, PUNKTE_SKALA), true);
});

test("Speichern und Laden über den Fake-Speicher", () => {
  const s = fakeStorage();
  const z = { ...startZustand(drei), phase: "durchfuehren" as const, erledigt: ["a"] };
  zustandSpeichern(s, "p:", z);
  assert.deepEqual([...s.daten.keys()], [speicherSchluessel("p:")]);
  assert.deepEqual(zustandLaden(s, "p:", drei), z);
});

test("Laden ohne Speicher, mit kaputtem oder fremdem Inhalt ergibt den Startzustand", () => {
  assert.deepEqual(zustandLaden(null, "p:", drei), startZustand(drei));
  assert.deepEqual(zustandLaden(fakeStorage({ "p:zustand-v1": "{kaputt" }), "p:", drei), startZustand(drei));
  assert.deepEqual(
    zustandLaden(fakeStorage({ "p:zustand-v1": JSON.stringify({ phase: "unbekannt" }) }), "p:", drei),
    startZustand(drei)
  );
});

test("Speicher, der wirft, bricht nichts", () => {
  const kaputt = {
    length: 0,
    key: () => null,
    getItem: () => {
      throw new Error("gesperrt");
    },
    setItem: () => {
      throw new Error("gesperrt");
    },
    removeItem: () => {
      throw new Error("gesperrt");
    },
  };
  assert.deepEqual(zustandLaden(kaputt, "p:", drei), startZustand(drei));
  assert.doesNotThrow(() => zustandSpeichern(kaputt, "p:", startZustand(drei)));
  assert.doesNotThrow(() => demoZuruecksetzen(kaputt, "p:"));
});

test("Zurücksetzen löscht nur Schlüssel mit dem Demo-Präfix", () => {
  const s = fakeStorage({ [`${SPEICHER_PRAEFIX}zustand-v1`]: "{}", [`${SPEICHER_PRAEFIX}anderes`]: "1", fremd: "bleibt" });
  demoZuruecksetzen(s, SPEICHER_PRAEFIX);
  assert.deepEqual([...s.daten.keys()], ["fremd"]);
});
