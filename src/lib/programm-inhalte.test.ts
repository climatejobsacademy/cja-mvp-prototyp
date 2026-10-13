// Tests für das Seitenpanel "Inhalte des Moduls" (Programmseite, SR-14). Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { panelWochen, wochenTitel } from "./programm-inhalte.ts";

const lektion = (id: string, contentType: string, status = "offen") => ({ id, name: `Lektion ${id}`, contentType, status });
const gruppen = [
  {
    id: "w1",
    name: "Woche 1 – Theorie (online), 28.09.–02.10.2026",
    modulId: "m1",
    wochentyp: "theorie",
    lage: "online",
    courses: [{ id: "k1", name: "Grundlagen", lessons: [lektion("l1", "live"), lektion("s1", "scorm", "abgeschlossen")] }],
    praxisTypen: [],
  },
  {
    id: "w2",
    name: "Woche 2 – Theorie (online), 05.–09.10.2026",
    modulId: "m1",
    wochentyp: "theorie",
    lage: "praesenz",
    courses: [
      { id: "k2", name: "Teil 1", lessons: [lektion("l2", "live"), lektion("s2", "scorm", "abgeschlossen")] },
      { id: "k3", name: "Teil 2", lessons: [lektion("l3", "live"), lektion("s3", "scorm")] },
    ],
    praxisTypen: [{ id: "p1", titel: "Montage Außeneinheit", beschreibung: null, vorbereitungText: null, fieldJobId: "f1" }],
  },
];
const theorie = (lessonId: string, live: { id: string; start: string; ende: string } | null) => ({
  kind: "theorie",
  scheduleEntryId: `e-${lessonId}`,
  lessonId,
  art: live ? "live" : "asynchron",
  titel: "",
  contentType: "kurs",
  unitProgressStatus: null,
  liveSession: live ? { ...live, datum: "", joinLink: "https://raum.example" } : null,
});
const plan = [
  { datum: "2026-09-28", istPraxistag: false, feld: [], theorie: [theorie("l1", { id: "ls1", start: "09:00:00", ende: "12:00:00" })], anwesend: new Set(["ls1"]) },
  { datum: "2026-10-06", istPraxistag: false, feld: [], theorie: [theorie("l2", { id: "ls2", start: "09:00:00", ende: "12:00:00" })], anwesend: new Set() },
  {
    datum: "2026-10-07",
    istPraxistag: true,
    feld: [{ kind: "feld", scheduleEntryId: "ef", fieldJobId: "f1", titel: "", beschreibung: null, bildOderIcon: null, standort: null, status: "durchgeführt" }],
    theorie: [],
    anwesend: new Set(),
  },
  { datum: "2026-10-09", istPraxistag: false, feld: [], theorie: [theorie("l3", { id: "ls3", start: "13:00:00", ende: "16:00:00" })], anwesend: new Set() },
];

test("Status: Live nur mit Anwesenheit erledigt, heute, Praxis durchgeführt", () => {
  const [w1, w2] = panelWochen(gruppen as never, plan as never, "2026-10-09", "2026-10-09T10:00:00", true);
  assert.equal(w1.erledigt, 2);
  assert.equal(w1.lektionen, 2);
  const [teil1, teil2, praxis] = w2.themen;
  assert.equal(teil1.lektionen[0].status, "offen"); // Live vorbei, Anwesenheit nicht bestätigt
  assert.equal(teil1.erledigt, 1);
  assert.equal(teil2.lektionen[0].status, "heute");
  assert.equal(teil2.lektionen[0].meta, "Heute, 13:00");
  assert.equal(teil2.lektionen[0].href, "https://raum.example"); // läuft noch → Live-Raum
  assert.equal(teil2.lektionen[0].extern, true);
  assert.equal(praxis.titel, "Praxistag");
  assert.equal(praxis.lektionen[0].status, "erledigt");
  assert.equal(praxis.lektionen[0].href, "/praxistag/f1?von=programm");
});

test("Aufgeklappt: aktuelle Woche und Thema mit heutiger Lektion", () => {
  const w = panelWochen(gruppen as never, plan as never, "2026-10-09", "2026-10-09T10:00:00", true);
  assert.deepEqual(w.map((x) => [x.aktuell, x.offen]), [[false, false], [true, true]]);
  assert.deepEqual(w[1].themen.map((t) => t.offen), [false, true, false]);
});

test("Anderes Modul: erste Woche auf; nach Ende Lektionsseite statt Live-Raum", () => {
  const w = panelWochen(gruppen as never, plan as never, "2026-10-09", "2026-10-09T17:00:00", false);
  assert.deepEqual(w.map((x) => x.offen), [true, false]);
  assert.equal(w[1].themen[1].lektionen[0].href, "/content/l3");
});

test("Wochentitel aus Nummer im Modul, Typ und Lage -- ohne Datum aus dem Namen", () => {
  const w = panelWochen(gruppen as never, plan as never, "2026-10-09", "2026-10-09T10:00:00", true);
  assert.deepEqual(
    w.map((x) => x.titel),
    ["Woche 1 · Theorie · online", "Woche 2 · Theorie · Präsenz"]
  );
  assert.equal(wochenTitel(4, "praxis", "betrieb"), "Woche 4 · Praxis · im Betrieb");
  assert.equal(wochenTitel(1, null, null), "Woche 1");
});

test("Woche ohne Termine im Plan ist nicht \"Diese Woche\"; ohne Wochen leer", () => {
  const w = panelWochen(gruppen as never, [] as never, "2026-10-09", "2026-10-09T10:00:00", true);
  assert.deepEqual(w.map((x) => [x.aktuell, x.offen]), [[false, true], [false, false]]);
  assert.deepEqual(panelWochen([], [] as never, "2026-10-09", "2026-10-09T10:00:00", true), []);
});
