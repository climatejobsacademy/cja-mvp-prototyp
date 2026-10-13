// Tests für scripts/import-plan/plan.mjs mit einer kleinen, erfundenen
// Importvorlage (keine echten Daten, keine Namen aus der Excel).
// Ausführen: node --test scripts/import-plan/plan.test.mjs

import assert from "node:assert/strict";
import { test } from "node:test";

import { datumIso, erstellePlan } from "./plan.mjs";

function vorlage() {
  return {
    Module: [{ Modul: "II", Titel: "Testmodul", Reihenfolge: "2.0" }],
    Kompetenzen: [
      { "Kürzel": "M02-K01", "Bisheriges Kürzel": "M2.01", Kurztitel: "Kompetenz A", Modul: "II", "Reihenfolge im Modul": "1.0" },
    ],
    Teilschritte: [
      { Kennung: "M02-K01-T01", "Kompetenz-Kürzel": "M02-K01", Modul: "II", "Reihenfolge in Kompetenz": "1.0", Titel: "Theorie mit Tag", Typ: "theoretisch", Theorietag: "T01", "Aufträge": "M02-A01" },
      { Kennung: "M02-K01-T02", "Kompetenz-Kürzel": "M02-K01", Modul: "II", "Reihenfolge in Kompetenz": "2.0", Titel: "Praxis mit Auftrag", Typ: "praktisch", Theorietag: "T01", "Aufträge": "M02-A01, M02-A02" },
      { Kennung: "M02-K01-T03", "Kompetenz-Kürzel": "M02-K01", Modul: "II", "Reihenfolge in Kompetenz": "3.0", Titel: "Theorie nur an Auftrag", Typ: "theoretisch", Theorietag: "", "Aufträge": "M02-A02" },
    ],
    "Aufträge": [
      { Nummer: "M02-A01", Titel: "Auftrag 1", Modul: "II", "Teilschritte (Kennungen)": "M02-K01-T01, M02-K01-T02" },
      { Nummer: "M02-A02", Titel: "Auftrag 2", Modul: "II", "Teilschritte (Kennungen)": "M02-K01-T02, M02-K01-T03" },
      { Nummer: "M02-A03", Titel: "Auftrag 3", Modul: "II", "Teilschritte (Kennungen)": "" },
    ],
    Stundenplan: [
      { Kennung: "M02-S001", Datum: "02.11.2026", Modul: "II", "Woche im Modul": "1.0", "Theorie/Praxis": "Theorie", "online/Präsenz": "online", von: "08:00", bis: "12:00", Kurstitel: "Deutsch/Fachdeutsch", Ort: "online" },
      { Kennung: "M02-S002", Datum: "02.11.2026", Modul: "II", "Woche im Modul": "1.0", "Theorie/Praxis": "Theorie", "online/Präsenz": "online", von: "13:00", bis: "17:00", Kurstitel: "Kurs", Thema: "Thema X", Theorietag: "T01", "Trainer:in": "Erste", Ort: "online" },
      { Kennung: "M02-S003", Datum: "03.11.2026", Modul: "II", "Woche im Modul": "1.0", "Theorie/Praxis": "Theorie", "online/Präsenz": "online", von: "13:00", bis: "17:00", Kurstitel: "Kurs", Thema: "Thema X", Theorietag: "T01", "Trainer:in": "Erste" },
      { Kennung: "M02-S004", Datum: "09.11.2026", Modul: "II", "Woche im Modul": "2.0", "Theorie/Praxis": "Praxis", "online/Präsenz": "Präsenz", von: "08:00", bis: "17:00", Kurstitel: "Block", Auftragsnummer: "M02-A01, M02-A02, M02-A03", "Trainer:in": "Zweite, Erste" },
      { Kennung: "M02-S005", Datum: "10.11.2026", Modul: "II", "Woche im Modul": "2.0", "Theorie/Praxis": "Praxis", "online/Präsenz": "Präsenz", von: "08:00", bis: "17:00", Kurstitel: "Block", Auftragsnummer: "M02-A01, M02-A02, M02-A03", "Trainer:in": "Zweite, Erste" },
      { Kennung: "M02-S006", Datum: "", Modul: "II", "Woche im Modul": "2.0", "Theorie/Praxis": "Praxis", "online/Präsenz": "Präsenz", von: "08:00", bis: "17:00", Kurstitel: "Block", Auftragsnummer: "M02-A01" },
      { Kennung: "M03-S001", Datum: "30.11.2026", Modul: "III", "Woche im Modul": "1.0", "Theorie/Praxis": "Theorie", "online/Präsenz": "online", Kurstitel: "Anderes" },
    ],
    Trainer: [
      { Kennung: "TR-01", Anzeigename: "Erste" },
      { Kennung: "TR-02", Anzeigename: "Zweite" },
      { Kennung: "TR-03", Anzeigename: "Dritte" },
    ],
  };
}

test("datumIso", () => {
  assert.equal(datumIso("02.11.2026"), "2026-11-02");
  assert.equal(datumIso("2.11.2026"), null);
  assert.equal(datumIso(""), null);
});

test("Typ-Regel: theoretisch nur an Lektionen, praktisch nur an Aufträge", () => {
  const plan = erstellePlan(vorlage(), { module: ["II"] });
  assert.deepEqual(
    plan.auftragZuordnungen.map((z) => `${z.teilschritt}>${z.auftrag}`).sort(),
    ["M02-K01-T02>M02-A01", "M02-K01-T02>M02-A02"]
  );
  assert.ok(plan.lektionZuordnungen.every((z) => z.teilschritt === "M02-K01-T01"));
  assert.deepEqual(
    plan.analyse.typregel.theoretischAnAuftrag.map((z) => `${z.teilschritt}>${z.auftrag}`),
    ["M02-K01-T01>M02-A01", "M02-K01-T03>M02-A02"]
  );
  assert.deepEqual(plan.analyse.typregel.praktischAnTheorietag, [{ teilschritt: "M02-K01-T02", theorietag: "M02-T01" }]);
  assert.deepEqual(plan.analyse.ohneZuordnung.map((o) => o.teilschritt), ["M02-K01-T03"]);
});

test("Gleicher Kurs zweimal im Modul: Teil 1 und Teil 2, Theorietag an beide", () => {
  const plan = erstellePlan(vorlage(), { module: ["II"] });
  assert.deepEqual(plan.kurse.map((k) => k.name), ["Kurs (Thema X) – Teil 1", "Kurs (Thema X) – Teil 2"]);
  assert.deepEqual(plan.kurse.map((k) => k.lektion), ["Kurs – Teil 1", "Kurs – Teil 2"]);
  assert.equal(plan.lektionZuordnungen.length, 2);
});

test("Eine Trainer:in je Termin, nur benutzte werden angelegt", () => {
  const plan = erstellePlan(vorlage(), { module: ["II"] });
  const praxis = plan.termine.filter((t) => t.art === "praxis");
  assert.ok(praxis.every((t) => t.trainer === "TR-02"));
  assert.deepEqual(plan.trainer.map((t) => t.kennung), ["TR-01", "TR-02"]);
});

test("Praxisblock ohne Tagesbindung: der Reihe nach verteilt, ohne Uhrzeit", () => {
  const plan = erstellePlan(vorlage(), { module: ["II"] });
  const praxis = plan.termine.filter((t) => t.art === "praxis");
  assert.deepEqual(praxis.map((t) => [t.datum, t.auftraege]), [
    ["2026-11-09", ["M02-A01", "M02-A02"]],
    ["2026-11-10", ["M02-A03"]],
  ]);
  assert.ok(praxis.every((t) => t.start === null && t.ende === null));
});

test("Ohne Datum und außerhalb des Umfangs: übersprungen und gemeldet", () => {
  const plan = erstellePlan(vorlage(), { module: ["II"] });
  assert.ok(!plan.termine.some((t) => t.kennung === "M02-S006" || t.kennung === "M03-S001"));
  assert.ok(plan.meldungen.some((m) => m.art === "ohne-datum" && m.text.startsWith("M02-S006")));
  assert.ok(plan.meldungen.some((m) => m.art === "ausser-umfang" && m.text.startsWith("Modul III")));
});

test("Deutsch/Fachdeutsch wird Begleitkurs, Woche bekommt Typ und Lage", () => {
  const plan = erstellePlan(vorlage(), { module: ["II"] });
  assert.deepEqual(plan.begleitkurse, ["Deutsch/Fachdeutsch"]);
  assert.deepEqual(plan.wochen, [
    { modul: "II", nummer: 1, wochentyp: "theorie", lage: "online" },
    { modul: "II", nummer: 2, wochentyp: "praxis", lage: "praesenz" },
  ]);
});

test("Unbekannter Typ bricht ab", () => {
  const v = vorlage();
  v.Teilschritte[0].Typ = "gemischt";
  assert.throws(() => erstellePlan(v, { module: ["II"] }), /weder theoretisch noch praktisch/);
});
