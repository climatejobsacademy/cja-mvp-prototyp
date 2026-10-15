// Tests für den Bereich der Trainer:innen (SR-81, Paket G2): Rollen-Gate,
// Tageswahl, Terminzustand und Anwesenheit speichern/stornieren.
// Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  anwesenheitAktion,
  bestaetigtZaehlen,
  datumAusParameter,
  terminZustand,
  trainerZugang,
  zielOhneEinschreibung,
  // @ts-expect-error TS5097: .ts-Endung für node:test nötig
} from "./trainer-tag.ts";

test("Rollen-Gate: Trainer:in ohne aktive Einschreibung darf /trainer", () => {
  assert.deepEqual(trainerZugang({ istTrainer: true, hatAktiveEinschreibung: false }), { erlaubt: true });
});

test("Rollen-Gate: Lernende sehen /trainer nicht, auch mit Rolle trainer", () => {
  assert.deepEqual(trainerZugang({ istTrainer: false, hatAktiveEinschreibung: true }), { erlaubt: false, ziel: "/home" });
  assert.deepEqual(trainerZugang({ istTrainer: true, hatAktiveEinschreibung: true }), { erlaubt: false, ziel: "/home" });
});

test("Rollen-Gate: ohne Rolle und ohne Einschreibung zum Login", () => {
  assert.deepEqual(trainerZugang({ istTrainer: false, hatAktiveEinschreibung: false }), {
    erlaubt: false,
    ziel: "/login?error=keine-einschreibung",
  });
});

test("Lernenden-Bereich ohne Einschreibung: Trainer:in nach /trainer, sonst Login", () => {
  assert.equal(zielOhneEinschreibung(true), "/trainer");
  assert.equal(zielOhneEinschreibung(false), "/login?error=keine-einschreibung");
});

test("Datum aus dem Parameter, sonst heute", () => {
  assert.equal(datumAusParameter("2026-11-03", "2026-10-14"), "2026-11-03");
  assert.equal(datumAusParameter(undefined, "2026-10-14"), "2026-10-14");
  assert.equal(datumAusParameter("2026-02-30", "2026-10-14"), "2026-10-14");
  assert.equal(datumAusParameter("morgen", "2026-10-14"), "2026-10-14");
});

test("Terminzustand: später, jetzt, vorbei; ganztägig zählt der ganze Tag", () => {
  const d = "2026-11-03";
  assert.equal(terminZustand(`${d}T12:59:00`, d, "13:00:00", "17:00:00"), "spaeter");
  assert.equal(terminZustand(`${d}T13:00:00`, d, "13:00:00", "17:00:00"), "jetzt");
  assert.equal(terminZustand(`${d}T17:00:00`, d, "13:00:00", "17:00:00"), "vorbei");
  assert.equal(terminZustand(`${d}T08:00:00`, d, null, null), "jetzt");
  assert.equal(terminZustand("2026-11-04T08:00:00", d, null, null), "vorbei");
  assert.equal(terminZustand("2026-11-02T20:00:00", d, "13:00:00", "17:00:00"), "spaeter");
});

test("Anwesenheit: neu, unverändert, Storno auf die aktuelle Zeile", () => {
  assert.deepEqual(anwesenheitAktion(null, "anwesend"), { art: "neu" });
  assert.deepEqual(anwesenheitAktion({ id: "a1", status: "anwesend" }, "anwesend"), { art: "unveraendert" });
  assert.deepEqual(anwesenheitAktion({ id: "a1", status: "anwesend" }, "nicht anwesend"), {
    art: "storno",
    korrigiertId: "a1",
  });
});

test("Zählung bestätigt", () => {
  assert.deepEqual(bestaetigtZaehlen([null, { id: "a", status: "anwesend" }, { id: "b", status: "nicht anwesend" }]), {
    bestaetigt: 2,
    gesamt: 3,
  });
});
