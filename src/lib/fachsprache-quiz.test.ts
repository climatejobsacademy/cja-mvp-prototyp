// Tests für die Quiz-Regeln der Fachsprache-Einheit. Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  erklaerungSichtbar,
  quizSchritt,
  quizStart,
  weiterMoeglich,
  weiterText,
  // @ts-expect-error TS5097: .ts-Endung für node:test nötig
} from "./fachsprache-quiz.ts";

// Zwei Fragen: richtig ist Antwort 1 bzw. 0.
const FRAGEN = [
  { antworten: ["a", "b", "c"], richtig: 1 },
  { antworten: ["x", "y"], richtig: 0 },
];

type Aktion = Parameters<typeof quizSchritt>[1];
const ablauf = (...aktionen: Aktion[]) => aktionen.reduce((z, a) => quizSchritt(z, a, FRAGEN), quizStart());
const waehle = (antwort: number): Aktion => ({ typ: "waehlen", antwort });
const WEITER: Aktion = { typ: "weiter" };

test("Start: erste Frage, keine Auswahl, Weiter gesperrt, keine Erklärung", () => {
  const z = quizStart();
  assert.deepEqual(z, { nr: 0, wahl: null, status: "waehlen", fertig: false });
  assert.equal(weiterMoeglich(z), false);
  assert.equal(weiterText(z, 2), "Weiter");
  assert.equal(erklaerungSichtbar(z), false);
});

test("Weiter ohne Auswahl ändert nichts", () => {
  assert.deepEqual(ablauf(WEITER), quizStart());
});

test("Wählen setzt die Auswahl, Wählen einer anderen ersetzt sie", () => {
  const z = ablauf(waehle(0), waehle(2));
  assert.equal(z.wahl, 2);
  assert.equal(z.status, "waehlen");
  assert.equal(weiterMoeglich(z), true);
});

test("Weiter prüft: falsch → Hinweis, Auswahl leer, neu wählen möglich", () => {
  const z = ablauf(waehle(0), WEITER);
  assert.equal(z.status, "falsch");
  assert.equal(z.wahl, null);
  assert.equal(z.nr, 0);
  assert.equal(weiterMoeglich(z), false);
  assert.equal(erklaerungSichtbar(z), false);
  const neu = quizSchritt(z, waehle(2), FRAGEN);
  assert.equal(neu.status, "waehlen", "neue Wahl nimmt den Hinweis weg");
  assert.equal(neu.wahl, 2);
});

test("Weiter prüft: richtig → Erklärung, Antwort fest, Beschriftung wechselt", () => {
  const z = ablauf(waehle(0), WEITER, waehle(1), WEITER);
  assert.equal(z.status, "richtig");
  assert.equal(z.wahl, 1);
  assert.equal(erklaerungSichtbar(z), true);
  assert.equal(weiterText(z, 2), "Nächste Frage");
  assert.deepEqual(quizSchritt(z, waehle(2), FRAGEN), z, "nach richtig keine neue Wahl");
});

test("Weiter nach richtig: nächste Frage beginnt leer", () => {
  const z = ablauf(waehle(1), WEITER, WEITER);
  assert.deepEqual(z, { nr: 1, wahl: null, status: "waehlen", fertig: false });
});

test("letzte Frage richtig: Beschriftung 'Weiter zu den Sätzen', danach fertig", () => {
  const vorher = ablauf(waehle(1), WEITER, WEITER, waehle(0), WEITER);
  assert.equal(weiterText(vorher, 2), "Weiter zu den Sätzen");
  const z = quizSchritt(vorher, WEITER, FRAGEN);
  assert.equal(z.fertig, true);
  assert.equal(weiterMoeglich(z), false);
  assert.deepEqual(quizSchritt(z, WEITER, FRAGEN), z, "fertig bleibt fertig");
  assert.deepEqual(quizSchritt(z, waehle(1), FRAGEN), z);
});

test("Wiederholen beginnt von vorn, beliebig oft, auch mitten im Quiz", () => {
  const fertig = ablauf(waehle(1), WEITER, WEITER, waehle(0), WEITER, WEITER);
  assert.deepEqual(quizSchritt(fertig, { typ: "wiederholen" }, FRAGEN), quizStart());
  const mitten = ablauf(waehle(1), WEITER, WEITER, waehle(1), { typ: "wiederholen" });
  assert.deepEqual(mitten, quizStart());
  const zweimal = ablauf(waehle(1), WEITER, WEITER, waehle(0), WEITER, WEITER, { typ: "wiederholen" }, waehle(1), WEITER);
  assert.equal(zweimal.status, "richtig");
});

test("Zurück: zur vorigen Frage als richtig beantwortet; auf der ersten Frage keine Änderung", () => {
  const z = ablauf(waehle(1), WEITER, WEITER, { typ: "zurueck" });
  assert.deepEqual(z, { nr: 0, wahl: 1, status: "richtig", fertig: false });
  assert.deepEqual(ablauf({ typ: "zurueck" }), quizStart());
});

test("ungültige Antwort-Indizes werden ignoriert", () => {
  for (const antwort of [-1, 3, 1.5, Number.NaN]) assert.deepEqual(ablauf(waehle(antwort)), quizStart(), String(antwort));
});

test("ohne Fragen passiert nichts", () => {
  const z = quizSchritt(quizStart(), waehle(0), []);
  assert.deepEqual(z, quizStart());
});

test("kein Ergebnis: der Zustand enthält keine Zählung richtiger oder falscher Antworten", () => {
  const z = ablauf(waehle(0), WEITER, waehle(2), WEITER, waehle(1), WEITER);
  assert.deepEqual(Object.keys(z).sort(), ["fertig", "nr", "status", "wahl"]);
});
