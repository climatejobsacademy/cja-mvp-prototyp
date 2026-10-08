// Tests für den Marker "heruntergeladen" ohne Browser (Fake-Storage).
// Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { MARKER_PREFIX, erstelleDownloadMarker, markierteIds } from "./download-marker.ts";

function fakeStorage() {
  const daten = new Map<string, string>();
  return {
    get length() {
      return daten.size;
    },
    key: (i: number) => [...daten.keys()][i] ?? null,
    getItem: (k: string) => daten.get(k) ?? null,
    setItem: (k: string, v: string) => void daten.set(k, v),
    daten,
  };
}

test("setzen schreibt je Material-ID einen eigenen Schlüssel", () => {
  const s = fakeStorage();
  const marker = erstelleDownloadMarker(() => s);
  marker.setzen("id-a");
  marker.setzen("id-b");
  marker.setzen("id-a");
  assert.deepEqual([...s.daten.keys()].sort(), [MARKER_PREFIX + "id-a", MARKER_PREFIX + "id-b"]);
  assert.equal(marker.lesen(), "id-a,id-b");
});

test("setzen benachrichtigt Abonnenten sofort im selben Tab", () => {
  const marker = erstelleDownloadMarker(() => fakeStorage());
  let aufrufe = 0;
  const abmelden = marker.abonnieren(() => aufrufe++);
  marker.setzen("id-a");
  assert.equal(aufrufe, 1);
  abmelden();
  marker.setzen("id-b");
  assert.equal(aufrufe, 1);
});

test("lesen ignoriert fremde Schlüssel und liefert stabilen String", () => {
  const s = fakeStorage();
  s.setItem("anderer-schluessel", "1");
  const marker = erstelleDownloadMarker(() => s);
  assert.equal(marker.lesen(), "");
  marker.setzen("z");
  marker.setzen("a");
  assert.equal(marker.lesen(), "a,z");
  assert.equal(marker.lesen(), marker.lesen());
});

test("ohne oder mit kaputtem Speicher: kein Fehler, Abonnenten trotzdem benachrichtigt", () => {
  const ohne = erstelleDownloadMarker(() => null);
  let aufrufe = 0;
  ohne.abonnieren(() => aufrufe++);
  assert.doesNotThrow(() => ohne.setzen("id-a"));
  assert.equal(ohne.lesen(), "");
  assert.equal(aufrufe, 1);

  const kaputt = erstelleDownloadMarker(() => {
    throw new Error("SecurityError");
  });
  assert.doesNotThrow(() => kaputt.setzen("id-a"));
  assert.equal(kaputt.lesen(), "");
});

test("markierteIds macht aus dem Snapshot eine Menge", () => {
  assert.deepEqual([...markierteIds("")], []);
  assert.deepEqual([...markierteIds("a,b")], ["a", "b"]);
});
