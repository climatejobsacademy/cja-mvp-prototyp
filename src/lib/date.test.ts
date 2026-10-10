// Tests für den Berlin-Helfer. Ausführen mit `npm test` (node:test, Node 24
// führt .ts direkt aus). Zeitpunkte rund um den Pilotstart 02.11.2026 und die
// Zeitumstellung am 25.10.2026 (03:00 Sommerzeit → 02:00 Winterzeit).

import assert from "node:assert/strict";
import { test } from "node:test";

// Node braucht die Endung .ts zum Auflösen; tsc (TS5097) erlaubt sie nur mit
// allowImportingTsExtensions. Statt tsconfig.json global zu ändern, nur hier.
// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { heuteInBerlin, jetztInBerlin } from "./date.ts";

const FAELLE: { utc: string; heute: string; jetzt: string; hinweis: string }[] = [
  // Am 31.10. gilt schon Winterzeit (UTC+1): Berlin ist noch am 31.10.
  { utc: "2026-10-31T22:30:00Z", heute: "2026-10-31", jetzt: "2026-10-31T23:30:00", hinweis: "Winterzeit, vor Mitternacht" },
  { utc: "2026-11-01T23:30:00Z", heute: "2026-11-02", jetzt: "2026-11-02T00:30:00", hinweis: "Winterzeit, UTC noch Vortag" },
  { utc: "2026-11-02T00:30:00Z", heute: "2026-11-02", jetzt: "2026-11-02T01:30:00", hinweis: "Pilotstart" },
  { utc: "2026-10-24T21:30:00Z", heute: "2026-10-24", jetzt: "2026-10-24T23:30:00", hinweis: "Sommerzeit, vor Mitternacht" },
  { utc: "2026-10-24T22:30:00Z", heute: "2026-10-25", jetzt: "2026-10-25T00:30:00", hinweis: "Sommerzeit, UTC noch Vortag" },
  // Umstellung: 02:30 gibt es am 25.10. zweimal (vor und nach 03:00 → 02:00).
  { utc: "2026-10-25T00:30:00Z", heute: "2026-10-25", jetzt: "2026-10-25T02:30:00", hinweis: "Umstellung, erstes 02:30" },
  { utc: "2026-10-25T01:30:00Z", heute: "2026-10-25", jetzt: "2026-10-25T02:30:00", hinweis: "Umstellung, zweites 02:30" },
];

for (const f of FAELLE) {
  test(`${f.utc} (${f.hinweis})`, () => {
    const zeitpunkt = new Date(f.utc);
    assert.equal(heuteInBerlin(zeitpunkt), f.heute);
    assert.equal(jetztInBerlin(zeitpunkt), f.jetzt);
  });
}

test("Stunde nach Mitternacht ist 00, nicht 24", () => {
  assert.equal(jetztInBerlin(new Date("2026-11-01T23:30:00Z")).slice(11, 13), "00");
  assert.equal(jetztInBerlin(new Date("2026-10-24T22:30:00Z")).slice(11, 13), "00");
});

test("Zeitzone der Umgebung spielt keine Rolle", () => {
  const vorher = process.env.TZ;
  const versatz = new Set<number>();
  try {
    for (const tz of ["UTC", "America/Los_Angeles"]) {
      process.env.TZ = tz;
      // Belegt, dass die Umstellung der Umgebungszone wirklich greift.
      versatz.add(new Date("2026-11-02T00:30:00Z").getTimezoneOffset());
      for (const f of FAELLE) {
        const zeitpunkt = new Date(f.utc);
        assert.equal(heuteInBerlin(zeitpunkt), f.heute, `${tz}: ${f.utc}`);
        assert.equal(jetztInBerlin(zeitpunkt), f.jetzt, `${tz}: ${f.utc}`);
      }
    }
  } finally {
    if (vorher === undefined) delete process.env.TZ;
    else process.env.TZ = vorher;
  }
  assert.equal(versatz.size, 2, "TZ-Wechsel hat nicht gegriffen");
});

test("zeitpunktInBerlin: Anzeige in Berliner Zeit, Sommer- und Winterzeit", async () => {
  // @ts-expect-error TS5097: .ts-Endung für node:test nötig
  const { zeitpunktInBerlin } = await import("./date.ts");
  assert.equal(zeitpunktInBerlin("2026-10-07T12:05:00Z"), "07.10.2026, 14:05");
  assert.equal(zeitpunktInBerlin("2026-11-01T23:30:00Z"), "02.11.2026, 00:30");
  assert.equal(zeitpunktInBerlin("2026-10-07T12:05:00.123456+00:00"), "07.10.2026, 14:05");
});

test("Tagesanzeige: tageZwischen, datumKurz, datumLang, tagRelativ", async () => {
  // @ts-expect-error TS5097: .ts-Endung für node:test nötig
  const { tageZwischen, datumKurz, datumLang, tagRelativ, wochentagLang } = await import("./date.ts");
  assert.equal(tageZwischen("2026-10-09", "2026-10-12"), 3);
  assert.equal(tageZwischen("2026-10-09", "2026-10-08"), -1);
  // Zeitumstellung (25.10.) verschiebt nichts
  assert.equal(tageZwischen("2026-10-24", "2026-10-26"), 2);
  assert.equal(wochentagLang("2026-10-12"), "Montag");
  assert.equal(datumKurz("2026-10-12"), "Mo, 12.10.");
  assert.equal(datumLang("2026-10-09"), "Freitag, 9. Oktober");
  assert.equal(tagRelativ("2026-10-09", "2026-10-09"), "heute");
  assert.equal(tagRelativ("2026-10-10", "2026-10-09"), "morgen");
  assert.equal(tagRelativ("2026-10-12", "2026-10-09"), "Montag");
  assert.equal(tagRelativ("2026-10-20", "2026-10-09"), "Di, 20.10.");
});

test("plusTage und montagDerWoche", async () => {
  // @ts-expect-error TS5097: .ts-Endung für node:test nötig
  const { plusTage, montagDerWoche } = await import("./date.ts");
  assert.equal(plusTage("2026-10-09", 3), "2026-10-12");
  assert.equal(plusTage("2026-10-01", -1), "2026-09-30");
  assert.equal(montagDerWoche("2026-10-09"), "2026-10-05"); // Freitag
  assert.equal(montagDerWoche("2026-10-05"), "2026-10-05"); // Montag
  assert.equal(montagDerWoche("2026-10-11"), "2026-10-05"); // Sonntag
});
