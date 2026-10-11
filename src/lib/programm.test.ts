// Tests für die Logik der Programmseite (v8). Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  datumPunkt,
  gliederungFuer,
  letztesDatumImNamen,
  modulFuerDatum,
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

test("modulStatus: vorbei, aktuell (auch in der Pause davor), kommend", () => {
  const m = [
    { von: "2026-09-28", bis: "2026-10-30" },
    { von: "2026-11-02", bis: "2026-11-28" },
    { von: "2026-11-30", bis: "2026-12-19" },
  ];
  assert.deepEqual(modulStatus(m, "2026-10-09"), ["aktuell", "kommend", "kommend"]);
  assert.deepEqual(modulStatus(m, "2026-10-31"), ["abgeschlossen", "aktuell", "kommend"]);
  assert.deepEqual(modulStatus(m, "2027-01-01"), ["abgeschlossen", "abgeschlossen", "abgeschlossen"]);
});

test("Gliederung EFK-EE: Wochen über ihr Datum den Modulen zuordnen", () => {
  const g = gliederungFuer("Elektrofachkraft für Erneuerbare Energien [IHK]", "2026-09-28");
  assert.ok(g);
  assert.equal(g.length, 6);
  // Zeiträume wie in Annas Tabelle
  assert.deepEqual(g.map((m) => [m.von, m.bis]), [
    ["2026-09-28", "2026-10-30"],
    ["2026-11-02", "2026-11-28"],
    ["2026-11-30", "2026-12-19"],
    ["2027-01-04", "2027-01-30"],
    ["2027-02-01", "2027-02-12"],
    ["2027-02-15", "2027-02-19"],
  ]);
  assert.equal(gliederungFuer("Wärmepumpen-Technik", "2026-09-28"), null);
  assert.equal(gliederungFuer("Erneuerbare Energien", null), null);
  assert.equal(modulFuerDatum(g, "2026-10-09"), 1);
  assert.equal(modulFuerDatum(g, "2026-11-02"), 2);
  assert.equal(modulFuerDatum(g, "2027-01-11"), 4);
  assert.equal(modulFuerDatum(g, "2027-02-17"), 6);
  assert.equal(modulFuerDatum(g, "2026-12-28"), null); // Weihnachtspause
  assert.equal(modulFuerDatum(g, null), null);
});

test("letztesDatumImNamen", () => {
  assert.equal(letztesDatumImNamen("Woche 1 – Theorie (online), 28.09.–02.10.2026"), "2026-10-02");
  assert.equal(letztesDatumImNamen("Woche 3, 12.10.2026 – 16.10.2026"), "2026-10-16");
  assert.equal(letztesDatumImNamen("Grundlagen"), null);
});

test("Gliederung relativ zum Kohortenstart: Demo-Kohorte ab 31.08.2026", () => {
  const g = gliederungFuer("Elektrofachkraft Erneuerbare Energien", "2026-08-31");
  assert.ok(g);
  assert.deepEqual([g[1].von, g[1].bis], ["2026-10-05", "2026-10-31"]); // Modul 2
  assert.equal(modulFuerDatum(g, "2026-10-14"), 2);
  assert.deepEqual(modulStatus(g, "2026-10-14").slice(0, 3), ["abgeschlossen", "aktuell", "kommend"]);
});
