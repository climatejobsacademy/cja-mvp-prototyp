// Tests für die Meta-Zeile in "Hier lernst du das" (Kompetenzseite v1).
// Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { aktivitaetMeta } from "./kompetenz-aktivitaet.ts";

const HEUTE = "2026-10-09"; // Freitag

test("Live-Unterricht: heute, morgen, Wochentag, später, vorbei, erledigt", () => {
  const live = { art: "live" as const, start: "13:00:00", erledigt: false };
  assert.equal(aktivitaetMeta({ ...live, datum: "2026-10-09" }, HEUTE), "Live-Unterricht · heute, 13:00");
  assert.equal(aktivitaetMeta({ ...live, datum: "2026-10-10" }, HEUTE), "Live-Unterricht · morgen, 13:00");
  assert.equal(aktivitaetMeta({ ...live, datum: "2026-10-12" }, HEUTE), "Live-Unterricht · Montag, 13:00");
  assert.equal(aktivitaetMeta({ ...live, datum: "2026-10-20" }, HEUTE), "Live-Unterricht · Di, 20.10., 13:00");
  assert.equal(aktivitaetMeta({ ...live, datum: "2026-10-05" }, HEUTE), "Live-Unterricht · vorbei");
  assert.equal(aktivitaetMeta({ ...live, datum: "2026-10-05", erledigt: true }, HEUTE), "Live-Unterricht · erledigt");
});

test("Selbstlernen: heute flexibel, offen, erledigt", () => {
  const selbst = { art: "selbst" as const, start: null, erledigt: false };
  assert.equal(aktivitaetMeta({ ...selbst, datum: "2026-10-09" }, HEUTE), "Selbstlernen · heute, flexibel");
  assert.equal(aktivitaetMeta({ ...selbst, datum: "2026-10-01" }, HEUTE), "Selbstlernen · offen");
  assert.equal(aktivitaetMeta({ ...selbst, datum: null }, HEUTE), "Selbstlernen · offen");
  assert.equal(aktivitaetMeta({ ...selbst, datum: "2026-10-01", erledigt: true }, HEUTE), "Selbstlernen · erledigt");
});

test("Praxis: ohne Uhrzeit, durchgeführt, ohne eigenen Termin", () => {
  const praxis = { art: "praxis" as const, start: null, erledigt: false };
  assert.equal(aktivitaetMeta({ ...praxis, datum: "2026-10-12" }, HEUTE), "Praxis · Montag");
  assert.equal(aktivitaetMeta({ ...praxis, datum: "2026-10-12", erledigt: true }, HEUTE), "Praxis · durchgeführt");
  assert.equal(aktivitaetMeta({ ...praxis, datum: null }, HEUTE), "Praxis");
});
