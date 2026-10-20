// Tests für die Tageszustände der Home-Seite (Brief Abschnitt 3, SR-73).
// Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { getDayState, type TagesAktivitaeten } from "./home-tag.ts";

const DATUM = "2026-10-09";
const jetzt = (hhmm: string) => `${DATUM}T${hhmm}:00`;

const live = { id: "l1", titel: "Grundschaltungen", thema: null, start: "13:00:00", ende: "14:30:00", joinLink: null, lessonId: "les-1", trainerId: null };
const flexOffen = { id: "f1", titel: "Wissen festigen", thema: null, lessonId: "les-2", erledigt: false, begonnen: false, festigt: true };
const flexErledigt = { ...flexOffen, erledigt: true };
const praxis = { id: "p1", fieldJobId: "fj-1", titel: "Schuko-Verlängerung", standort: null, start: null, ende: null, durchgefuehrt: false, trainerId: null };

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

test("Durchgeführter Praxistag bleibt die Praxistag-Karte (E)", () => {
  const z = getDayState(jetzt("16:00"), tag({ praxis: [{ ...praxis, durchgefuehrt: true }] }));
  assert.ok(z.zustand === "E" && z.praxis.durchgefuehrt);
});

test("F: nichts geplant", () => {
  const z = getDayState(jetzt("10:00"), tag({}));
  assert.ok(z.zustand === "F" && z.nachholen === null);
});

const nachholen = { lessonId: "les-alt", titel: "Ohmsches Gesetz", begonnen: false, datum: "2026-10-08" };

test("F: offene Lektion von früher wird zum Weiterlernen angeboten", () => {
  const z = getDayState(jetzt("10:00"), tag({ nachholen }));
  assert.ok(z.zustand === "F" && z.nachholen?.lessonId === "les-alt");
});

test("E: 'Noch offen von …' nur, wenn heute nichts Flexibles offen ist", () => {
  const ohneFlex = getDayState(jetzt("07:00"), tag({ praxis: [praxis], nachholen }));
  assert.ok(ohneFlex.zustand === "E" && ohneFlex.nachholen?.lessonId === "les-alt");
  const mitFlex = getDayState(jetzt("07:00"), tag({ praxis: [praxis], flex: [flexOffen], nachholen }));
  assert.ok(mitFlex.zustand === "E" && mitFlex.nachholen === null && mitFlex.danach?.id === "f1");
});

test("A/B/C/D zeigen nie Offenes von früher", () => {
  const a = getDayState(jetzt("09:00"), tag({ live: [live], nachholen }));
  const d = getDayState(jetzt("18:00"), tag({ live: [live], nachholen }));
  assert.equal(a.zustand, "A");
  assert.equal(d.zustand, "D");
  assert.ok(!("nachholen" in a) && !("nachholen" in d));
});

test("Mehrere Live-Sessions: die nächste bevorstehende wird gewählt", () => {
  const frueh = { ...live, id: "l0", start: "08:00:00", ende: "09:30:00" };
  const z = getDayState(jetzt("10:00"), tag({ live: [live, frueh] }));
  assert.ok(z.zustand === "A" && z.live.id === "l1");
});
