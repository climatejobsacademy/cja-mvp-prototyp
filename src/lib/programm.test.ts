// Tests für Zeitraum-Texte und Modul-Status (Modul-Ebene, 0028). Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  aktuellerModulIndex,
  datumPunkt,
  modulStatus,
  zeitraumPunkt,
  // @ts-expect-error TS5097: .ts-Endung für node:test nötig
} from "./programm.ts";

test("datumPunkt und zeitraumPunkt", () => {
  assert.equal(datumPunkt("2026-09-28"), "28.09.2026");
  assert.equal(zeitraumPunkt("2026-09-28", "2026-10-23"), "28.09. – 23.10.2026");
  assert.equal(zeitraumPunkt("2026-12-14", "2027-01-08"), "14.12.2026 – 08.01.2027");
  assert.equal(zeitraumPunkt("2026-09-28", "2026-09-28"), "28.09.2026");
});

const geplant = [
  { von: "2026-09-28", bis: "2026-10-30" },
  { von: "2026-11-02", bis: "2026-11-28" },
  { von: "2026-11-30", bis: "2026-12-19" },
];

test("modulStatus: vorbei, aktuell (auch in der Pause davor), kommend", () => {
  assert.deepEqual(modulStatus(geplant, "2026-09-01"), ["aktuell", "kommend", "kommend"]);
  assert.deepEqual(modulStatus(geplant, "2026-10-09"), ["aktuell", "kommend", "kommend"]);
  assert.deepEqual(modulStatus(geplant, "2026-10-30"), ["aktuell", "kommend", "kommend"]);
  assert.deepEqual(modulStatus(geplant, "2026-10-31"), ["abgeschlossen", "aktuell", "kommend"]);
  assert.deepEqual(modulStatus(geplant, "2027-01-01"), ["abgeschlossen", "abgeschlossen", "abgeschlossen"]);
});

test("modulStatus: ungeplante Module sind kommend, nie aktuell oder abgeschlossen", () => {
  // Heute auf Staging: nur Modul I hat Wochen, II bis Abschluss noch nicht.
  const m = [{ von: "2026-09-28", bis: "2026-10-16" }, ...Array.from({ length: 5 }, () => ({ von: null, bis: null }))];
  assert.deepEqual(modulStatus(m, "2026-10-13"), ["aktuell", "kommend", "kommend", "kommend", "kommend", "kommend"]);
  // Modul I vorbei, der Rest noch nicht geplant: kein aktuelles Modul.
  assert.deepEqual(modulStatus(m, "2026-10-20"), [
    "abgeschlossen",
    "kommend",
    "kommend",
    "kommend",
    "kommend",
    "kommend",
  ]);
  assert.equal(aktuellerModulIndex(m, "2026-10-20"), -1);
});

test("modulStatus: Lücke in der Planung -- ungeplantes Modul vor dem aktuellen bleibt kommend", () => {
  const m = [geplant[0], { von: null, bis: null }, geplant[2]];
  assert.deepEqual(modulStatus(m, "2026-11-10"), ["abgeschlossen", "kommend", "aktuell"]);
});

test("aktuellerModulIndex: ohne Module oder ohne Planung -1", () => {
  assert.equal(aktuellerModulIndex([], "2026-10-13"), -1);
  assert.equal(aktuellerModulIndex([{ von: null, bis: null }], "2026-10-13"), -1);
  assert.equal(aktuellerModulIndex(geplant, "2026-11-01"), 1);
});
