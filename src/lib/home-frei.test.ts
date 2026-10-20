// Tests für Home, Zustand "freier Tag" (SR-79): Zählung und Schwellen. Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { SCHWELLE_GUT, SCHWELLE_STARK, freiText, wochenrueckblick, zaehlText } from "./home-frei.ts";

const live = (id: string) => ({ art: "live", lessonId: `l${id}`, liveSession: { id }, unitProgressStatus: null });
const selbst = (fertig: boolean) => ({ art: "asynchron", lessonId: "s", liveSession: null, unitProgressStatus: fertig ? "abgeschlossen" : null });
const tag = (datum: string, theorie: unknown[], anwesend: string[] = []) => ({ datum, theorie, feld: [], anwesend: new Set(anwesend) });

// Woche 05.–09.10.2026, heute Sonntag 11.10.
const woche = (anwesendFr: boolean, selbstFertig: boolean) => [
  tag("2026-10-05", [live("a"), selbst(true)], ["a"]),
  tag("2026-10-06", [live("b")], ["b"]),
  tag("2026-10-07", []), // nichts geplant → nicht in der Wochenreihe
  tag("2026-10-08", [live("c"), selbst(selbstFertig)], ["c"]),
  tag("2026-10-09", [live("d")], anwesendFr ? ["d"] : []),
];

test("wochenrueckblick: nur Tage mit Plan, Live nur mit Anwesenheit erledigt", () => {
  const r = wochenrueckblick(woche(true, true) as never, "2026-10-11");
  assert.ok(r);
  assert.deepEqual(r.tage.map((t) => t.kurz), ["Mo", "Di", "Do", "Fr"]);
  assert.equal(r.liveGesamt, 4);
  assert.equal(r.einheitenErledigt, 6);
});

test("wochenrueckblick: nur die laufende Woche -- am freien Montag null, ohne Plan null", () => {
  assert.equal(wochenrueckblick(woche(true, true) as never, "2026-10-12"), null);
  assert.equal(wochenrueckblick([], "2026-10-11"), null);
  // Mittwoch: nur Mo und Di zählen, heute nicht
  assert.deepEqual(wochenrueckblick(woche(true, true) as never, "2026-10-07")?.tage.map((t) => t.kurz), ["Mo", "Di"]);
});

test("zaehlText: abgeschlossene Lektionen und besuchte Live-Termine, ohne Aktivität null", () => {
  assert.equal(zaehlText(wochenrueckblick(woche(true, true) as never, "2026-10-11")), "Diese Woche: 2 Lektionen abgeschlossen · 4 Live-Termine besucht");
  assert.equal(zaehlText(wochenrueckblick(woche(false, false) as never, "2026-10-11")), "Diese Woche: 1 Lektion abgeschlossen · 3 Live-Termine besucht");
  const nichts = [tag("2026-10-05", [live("a"), selbst(false)])];
  assert.equal(zaehlText(wochenrueckblick(nichts as never, "2026-10-11")), null);
  assert.equal(zaehlText(null), null);
});

test("Schwellen: 90 % und 50 %, jeweils einschließlich", () => {
  assert.equal(SCHWELLE_STARK, 0.9);
  assert.equal(SCHWELLE_GUT, 0.5);
  // 10 Einheiten: 9 erledigt = 90 % → stark; 5 = 50 % → gut; 4 = 40 % → neutral
  const zehn = (erledigt: number) => [
    tag("2026-10-05", Array.from({ length: 10 }, (_, i) => selbst(i < erledigt))),
  ];
  const zustand = (n: number) => freiText(wochenrueckblick(zehn(n) as never, "2026-10-11"), "Anna", "2026-10-11", null, true).zustand;
  assert.deepEqual([zustand(10), zustand(9), zustand(8), zustand(5), zustand(4), zustand(0)], [1, 1, 2, 2, 3, 3]);
});

test("freiText: Zustand 1 bis 4", () => {
  const stark = freiText(wochenrueckblick(woche(true, true) as never, "2026-10-11"), "Anna", "2026-10-11", "2026-10-12", true);
  assert.equal(stark.zustand, 1);
  assert.equal(stark.headline, "Starke Woche, Anna.");
  assert.equal(stark.unterzeile, "Alle 4 Live-Termine geschafft. Genieß deinen Sonntag.");

  // 4 von 6 erledigt = 67 % → Zustand 2
  const gut = freiText(wochenrueckblick(woche(false, false) as never, "2026-10-11"), "Anna", "2026-10-11", "2026-10-12", true);
  assert.equal(gut.zustand, 2);
  assert.equal(gut.unterzeile, "2 von 4 Tagen geschafft. Den Rest holst du ganz entspannt nach – aber erst nach dem Sonntag.");

  const wenig = [tag("2026-10-05", [live("a"), selbst(false), selbst(false)])];
  const t3 = freiText(wochenrueckblick(wenig as never, "2026-10-11"), "Anna", "2026-10-11", "2026-10-12", true);
  assert.deepEqual([t3.zustand, t3.headline, t3.wochenreihe], [3, "Montag geht’s weiter.", false]);
  assert.doesNotMatch(t3.unterzeile, /\d/); // keine Zahlen

  const neu = freiText(null, "Anna", "2026-09-27", "2026-09-28", false);
  assert.deepEqual([neu.zustand, neu.unterzeile], [4, "Genieß deinen Sonntag – am Montag startet dein Programm."]);
  assert.equal(freiText(null, "Anna", "2026-12-27", null, true).zustand, 3);
});
