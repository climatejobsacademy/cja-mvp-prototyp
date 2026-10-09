// Tests für die Logik des Praxisflow-Demos (Fake-Speicher, kein Browser).
// Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BEWERTUNGSKRITERIEN,
  DATEIEN,
  DEMO_CODEWORT,
  PHASEN,
  PHASEN_TEXTE,
  PUNKTE_SKALA,
  SPEICHER_PRAEFIX,
  // @ts-expect-error TS5097: .ts-Endung für node:test nötig
} from "./praxisflow-daten.ts";
import {
  alleErledigt,
  bewertungAbschliessbar,
  codewortKorrekt,
  demoZuruecksetzen,
  eintragBearbeiten,
  eintragHinzufuegen,
  eintragLoeschen,
  eintragVerschieben,
  einschaetzungVollstaendig,
  erledigtBereinigen,
  erledigtUmschalten,
  fremdFreigabeMoeglich,
  planBereit,
  speicherSchluessel,
  startZustand,
  zustandLaden,
  zustandSpeichern,
  // @ts-expect-error TS5097: .ts-Endung für node:test nötig
} from "./praxisflow-logik.ts";

type E = { id: string; text: string };
const drei: E[] = [
  { id: "a", text: "A" },
  { id: "b", text: "B" },
  { id: "c", text: "C" },
];
const ids = (l: E[]) => l.map((e) => e.id).join("");
const kriterien = [{ id: "k1" }, { id: "k2" }];

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

// ---------- Fixtures ----------

test("Fixtures: jede Phase hat Instruktion und Hast-du-alles-Liste", () => {
  for (const p of PHASEN) {
    assert.ok(PHASEN_TEXTE[p.id].instruktion.trim().length > 0, p.id);
    assert.ok(Array.isArray(PHASEN_TEXTE[p.id].hastDuAlles), p.id);
  }
});

test("Fixtures: Codewort gesetzt, Skala fest, vier Kriterien mit eindeutiger ID", () => {
  assert.ok(DEMO_CODEWORT.length > 0);
  assert.deepEqual([...PUNKTE_SKALA], [10, 9, 7, 5, 3, 0]);
  assert.equal(BEWERTUNGSKRITERIEN.length, 4);
  assert.equal(new Set(BEWERTUNGSKRITERIEN.map((k: { id: string }) => k.id)).size, 4);
});

test("Fixtures: Dateinamen ohne Pfad, Leerzeichen oder externe Links", () => {
  for (const d of DATEIEN as { titel: string; dateiname: string }[]) {
    assert.match(d.dateiname, /^[a-z0-9]+(-[a-z0-9]+)*\.[a-z0-9]+$/, d.dateiname);
  }
});

// ---------- Planen ----------

test("Startzustand: Analyse, alle drei Listen leer, keine Bewertung", () => {
  const z = startZustand();
  assert.equal(z.phase, "analyse");
  assert.deepEqual([z.werkzeuge, z.materialien, z.schritte], [[], [], []]);
  assert.deepEqual([z.selbst, z.fremd], [{}, {}]);
  assert.equal(z.fremdFreigegeben, false);
});

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

test("Weiter zu Entscheiden erst mit mindestens einem Arbeitsschritt", () => {
  assert.equal(planBereit([]), false);
  assert.equal(planBereit([{ id: "s1", text: "Schritt" }]), true);
});

// ---------- Durchführen ----------

test("Gate 2: erst aktiv, wenn jeder geplante Schritt abgehakt ist", () => {
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

// ---------- Codewort und Bewertung ----------

test("Codewort: ohne Groß-/Kleinschreibung und Leerraum, leer ist falsch", () => {
  assert.equal(codewortKorrekt("  WerkStatt ", "werkstatt"), true);
  assert.equal(codewortKorrekt("werkstat", "werkstatt"), false);
  assert.equal(codewortKorrekt("", ""), false);
});

test("Einschätzung vollständig nur mit Skalenwerten für jedes Kriterium", () => {
  assert.equal(einschaetzungVollstaendig(kriterien, {}, PUNKTE_SKALA), false);
  assert.equal(einschaetzungVollstaendig(kriterien, { k1: 10 }, PUNKTE_SKALA), false);
  assert.equal(einschaetzungVollstaendig(kriterien, { k1: 10, k2: 8 }, PUNKTE_SKALA), false);
  assert.equal(einschaetzungVollstaendig(kriterien, { k1: 10, k2: 0 }, PUNKTE_SKALA), true);
});

test("Fremdeinschätzung: Freigabe erst nach vollständiger Selbsteinschätzung", () => {
  assert.equal(fremdFreigabeMoeglich(kriterien, { k1: 9 }, PUNKTE_SKALA), false);
  assert.equal(fremdFreigabeMoeglich(kriterien, { k1: 9, k2: 7 }, PUNKTE_SKALA), true);
});

test("Abschluss erst mit Selbst- und Fremdeinschätzung und Freigabe per Codewort", () => {
  const selbst = { k1: 9, k2: 7 };
  const fremd = { k1: 10, k2: 5 };
  assert.equal(bewertungAbschliessbar({ selbst, fremd, fremdFreigegeben: false }, kriterien, PUNKTE_SKALA), false);
  assert.equal(bewertungAbschliessbar({ selbst, fremd: { k1: 10 }, fremdFreigegeben: true }, kriterien, PUNKTE_SKALA), false);
  assert.equal(bewertungAbschliessbar({ selbst: {}, fremd, fremdFreigegeben: true }, kriterien, PUNKTE_SKALA), false);
  assert.equal(bewertungAbschliessbar({ selbst, fremd, fremdFreigegeben: true }, kriterien, PUNKTE_SKALA), true);
});

// ---------- Speichern ----------

test("Speichern und Laden über den Fake-Speicher unter Schlüssel v2", () => {
  const s = fakeStorage();
  const z = { ...startZustand(), phase: "durchfuehren" as const, schritte: drei, erledigt: ["a"], selbst: { k1: 9 } };
  zustandSpeichern(s, "p:", z);
  assert.deepEqual([...s.daten.keys()], ["p:zustand-v2"]);
  assert.equal(speicherSchluessel("p:"), "p:zustand-v2");
  assert.deepEqual(zustandLaden(s, "p:"), z);
});

test("Alter Stand (v1) und kaputter oder fremder Inhalt ergeben den Startzustand", () => {
  const v1 = JSON.stringify({ phase: "planen", schritte: [{ id: "s1", text: "A", kontrollierbar: true }], erledigt: [], noten: {}, bewertungAbgeschlossen: false });
  assert.deepEqual(zustandLaden(fakeStorage({ "p:zustand-v1": v1 }), "p:"), startZustand());
  assert.deepEqual(zustandLaden(fakeStorage({ "p:zustand-v2": v1 }), "p:"), startZustand());
  assert.deepEqual(zustandLaden(fakeStorage({ "p:zustand-v2": "{kaputt" }), "p:"), startZustand());
  assert.deepEqual(zustandLaden(null, "p:"), startZustand());
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
  assert.deepEqual(zustandLaden(kaputt, "p:"), startZustand());
  assert.doesNotThrow(() => zustandSpeichern(kaputt, "p:", startZustand()));
  assert.doesNotThrow(() => demoZuruecksetzen(kaputt, "p:"));
});

test("Zurücksetzen löscht nur Schlüssel mit dem Demo-Präfix, auch alte Versionen", () => {
  const s = fakeStorage({
    [`${SPEICHER_PRAEFIX}zustand-v1`]: "{}",
    [`${SPEICHER_PRAEFIX}zustand-v2`]: "{}",
    fremd: "bleibt",
  });
  demoZuruecksetzen(s, SPEICHER_PRAEFIX);
  assert.deepEqual([...s.daten.keys()], ["fremd"]);
});
