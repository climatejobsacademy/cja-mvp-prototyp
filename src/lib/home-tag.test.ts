// Tests für die Tageszustände der Home-Seite (Home v6, Brief Abschnitt 3).
// Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { getDayState, parseNowParameter, type TagesAktivitaeten } from "./home-tag.ts";

const DATUM = "2026-10-09";
const jetzt = (hhmm: string) => `${DATUM}T${hhmm}:00`;

const live = { id: "l1", titel: "Grundschaltungen", start: "13:00:00", ende: "14:30:00", joinLink: null, lessonId: "les-1" };
const flexOffen = { id: "f1", titel: "Wissen festigen", lessonId: "les-2", erledigt: false };
const flexErledigt = { ...flexOffen, erledigt: true };
const praxis = { id: "p1", fieldJobId: "fj-1", titel: "Schuko-Verlängerung", standort: null, durchgefuehrt: false };

function tag(teil: Partial<TagesAktivitaeten>): TagesAktivitaeten {
  return { datum: DATUM, live: [], flex: [], praxis: [], ...teil };
}

test("A: Live-Session steht bevor, offene Selbstlernlektion ist nur 'danach'", () => {
  const z = getDayState(jetzt("09:00"), tag({ live: [live], flex: [flexOffen] }));
  assert.equal(z.zustand, "A");
  assert.ok(z.zustand === "A" && z.live.id === "l1" && z.danach?.id === "f1");
});

test("B: zwischen Start und Ende läuft die Live-Session", () => {
  assert.equal(getDayState(jetzt("13:00"), tag({ live: [live], flex: [flexOffen] })).zustand, "B");
  assert.equal(getDayState(jetzt("14:29"), tag({ live: [live] })).zustand, "B");
});

test("C: nach dem Unterricht wird die offene Selbstlernlektion zum Fokus", () => {
  const z = getDayState(jetzt("14:30"), tag({ live: [live], flex: [flexOffen] }));
  assert.equal(z.zustand, "C");
  assert.ok(z.zustand === "C" && z.fokus.id === "f1" && z.erledigt[0].typ === "live");
});

test("C: auch an einem Tag nur mit Selbstlernen", () => {
  assert.equal(getDayState(jetzt("10:00"), tag({ flex: [flexOffen] })).zustand, "C");
});

test("D: alles von heute erledigt", () => {
  const z = getDayState(jetzt("18:00"), tag({ live: [live], flex: [flexErledigt] }));
  assert.equal(z.zustand, "D");
  assert.ok(z.zustand === "D" && z.erledigt.length === 2);
});

test("E: offener Praxistag hat Vorrang, auch vor Live-Unterricht", () => {
  const z = getDayState(jetzt("07:00"), tag({ praxis: [praxis], live: [live], flex: [flexOffen] }));
  assert.equal(z.zustand, "E");
  assert.ok(z.zustand === "E" && z.danach?.id === "f1");
});

test("Durchgeführter Praxistag zählt als erledigt", () => {
  assert.equal(getDayState(jetzt("16:00"), tag({ praxis: [{ ...praxis, durchgefuehrt: true }] })).zustand, "D");
});

test("F: nichts geplant", () => {
  assert.equal(getDayState(jetzt("10:00"), tag({})).zustand, "F");
});

test("Mehrere Live-Sessions: die nächste bevorstehende wird gewählt", () => {
  const frueh = { ...live, id: "l0", start: "08:00:00", ende: "09:30:00" };
  const z = getDayState(jetzt("10:00"), tag({ live: [live, frueh] }));
  assert.ok(z.zustand === "A" && z.live.id === "l1");
});

test("parseNowParameter: gültige und ungültige Werte", () => {
  assert.equal(parseNowParameter("2026-10-09T13:05"), "2026-10-09T13:05:00");
  assert.equal(parseNowParameter("2026-10-09T13:05:30"), "2026-10-09T13:05:30");
  assert.equal(parseNowParameter("2026-10-09T25:00"), null);
  assert.equal(parseNowParameter("morgen"), null);
  assert.equal(parseNowParameter(undefined), null);
});
