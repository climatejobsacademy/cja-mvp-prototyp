// Tests für die Kalender-Logik des Stundenplans (v2). Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  arbeitstage,
  haupttyp,
  monatsWochen,
  monatText,
  naechsterArbeitstag,
  naechsterTerminId,
  spuren,
  stundenBereich,
  plusMonate,
  tagestypAus,
  wocheSeit,
  zeitraumText,
  // @ts-expect-error TS5097: .ts-Endung für node:test nötig
} from "./stundenplan.ts";

test("stundenBereich: 1 h vor dem ersten bis 1 h nach dem letzten Termin", () => {
  assert.deepEqual(stundenBereich([]), { von: 8, bis: 17 });
  assert.deepEqual(stundenBereich([{ start: "13:00:00", ende: "16:00:00" }]), { von: 12, bis: 17 });
  assert.deepEqual(
    stundenBereich([
      { start: "09:00:00", ende: "12:00:00" },
      { start: "13:00:00", ende: "16:30:00" },
    ]),
    { von: 8, bis: 18 }
  );
  assert.deepEqual(stundenBereich([{ start: "08:30:00", ende: "16:30:00" }]), { von: 7, bis: 18 });
  assert.deepEqual(stundenBereich([{ start: "00:30:00", ende: "23:30:00" }]), { von: 0, bis: 24 });
});

test("spuren: Überlappungen nebeneinander, getrennte Gruppen unabhängig", () => {
  const s = spuren([
    { id: "a", start: "09:00:00", ende: "12:00:00" },
    { id: "b", start: "10:00:00", ende: "11:00:00" },
    { id: "c", start: "11:30:00", ende: "13:00:00" },
    { id: "d", start: "14:00:00", ende: "15:00:00" },
  ]);
  assert.deepEqual(s.get("a"), { spalte: 0, spalten: 2 });
  assert.deepEqual(s.get("b"), { spalte: 1, spalten: 2 });
  assert.deepEqual(s.get("c"), { spalte: 1, spalten: 2 }); // b ist um 11:00 frei
  assert.deepEqual(s.get("d"), { spalte: 0, spalten: 1 });
});

test("spuren: direkt aneinander anschließende Termine überlappen nicht", () => {
  const s = spuren([
    { id: "a", start: "09:00:00", ende: "10:00:00" },
    { id: "b", start: "10:00:00", ende: "11:00:00" },
  ]);
  assert.deepEqual(s.get("a"), { spalte: 0, spalten: 1 });
  assert.deepEqual(s.get("b"), { spalte: 0, spalten: 1 });
});

test("tagestypAus: Praxis vor Live vor Lernen", () => {
  assert.equal(tagestypAus({ live: 1, praxis: 1, flex: 1 }), "praxis");
  assert.equal(tagestypAus({ live: 1, praxis: 0, flex: 1 }), "theorie");
  assert.equal(tagestypAus({ live: 0, praxis: 0, flex: 2 }), "lernen");
  assert.equal(tagestypAus({ live: 0, praxis: 0, flex: 0 }), null);
});

test("naechsterTerminId: laufender oder nächster, vorbei zählt nicht", () => {
  const t = [
    { id: "mo", datum: "2026-10-05", start: "09:00:00", ende: "12:00:00" },
    { id: "fr", datum: "2026-10-09", start: "13:00:00", ende: "16:00:00" },
  ];
  assert.equal(naechsterTerminId(t, "2026-10-09T09:00:00"), "fr");
  assert.equal(naechsterTerminId(t, "2026-10-09T14:00:00"), "fr"); // läuft
  assert.equal(naechsterTerminId(t, "2026-10-09T16:00:00"), null);
});

test("arbeitstage und naechsterArbeitstag", () => {
  assert.deepEqual(arbeitstage("2026-10-08"), ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09"]);
  assert.equal(naechsterArbeitstag("2026-10-09", 1), "2026-10-12"); // Fr → Mo
  assert.equal(naechsterArbeitstag("2026-10-12", -1), "2026-10-09"); // Mo → Fr
  assert.equal(naechsterArbeitstag("2026-10-07", 1), "2026-10-08");
});

test("wocheSeit: ab Kohortenstart gezählt", () => {
  assert.equal(wocheSeit("2026-09-28", "2026-10-05"), 2); // Bug aus der Änderungsliste
  assert.equal(wocheSeit("2026-09-28", "2026-10-09"), 2);
  assert.equal(wocheSeit("2026-10-07", "2026-10-05"), 1); // gleiche Woche
  assert.equal(wocheSeit("2026-10-12", "2026-10-09"), null); // vor dem Start
  assert.equal(wocheSeit(null, "2026-10-09"), null);
});

test("haupttyp: häufigster Tagestyp, Gleichstand Theorie zuerst", () => {
  assert.equal(haupttyp(["theorie", "theorie", "praxis", null, "theorie"]), "theorie");
  assert.equal(haupttyp(["praxis", "praxis", "theorie"]), "praxis");
  assert.equal(haupttyp(["praxis", "theorie"]), "theorie");
  assert.equal(haupttyp([null, null]), null);
});

test("Monat: Wochenzeilen, Monatswechsel, Titel", () => {
  // Oktober 2026: 1.10. ist ein Donnerstag, 31.10. ein Samstag → 5 Zeilen
  assert.deepEqual(monatsWochen("2026-10-15"), ["2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"]);
  // Februar 2027 beginnt am Montag → erste Zeile ab 1.2.
  assert.equal(monatsWochen("2027-02-10")[0], "2027-02-01");
  assert.equal(plusMonate("2026-12-31", 1), "2027-01-01");
  assert.equal(plusMonate("2026-01-15", -1), "2025-12-01");
  assert.equal(monatText("2026-10-15"), "Oktober 2026");
});

test("zeitraumText: gleicher Monat, Monats- und Jahreswechsel, kurz", () => {
  assert.equal(zeitraumText("2026-10-05"), "5. – 9. Oktober 2026");
  assert.equal(zeitraumText("2026-09-28"), "28. September – 2. Oktober 2026");
  assert.equal(zeitraumText("2026-12-28"), "28. Dezember 2026 – 1. Januar 2027");
  assert.equal(zeitraumText("2026-10-05", true), "5. – 9. Okt.");
});
