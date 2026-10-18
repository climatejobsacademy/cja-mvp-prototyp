// Tests für scripts/lernende-anlegen/plan-import.mjs (SR-48) mit erfundenen
// Kohorten und Pfaden. Ausführen:
// node --test scripts/lernende-anlegen/plan-import.test.mjs

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  analyseArgumente,
  befehlAlsText,
  bewerteKontrolle,
  importPlanArgumente,
  istJa,
  kohortenFuerImport,
  kontrolleSql,
  leseKontrolle,
  pruefePlanDateien,
} from "./plan-import.mjs";

const BASIS = {
  planDatei: "/daten/plan.xlsx",
  ziel: "staging",
  trainerDatei: "/daten/trainer-staging.csv",
  kohorten: ["Energiehelden 28.09.26"],
};

const wert = (args, name) => args[args.indexOf(name) + 1];

// ---------- Bestätigung ----------

test("istJa: nur „ja“, sonst nein", () => {
  assert.equal(istJa("ja"), true);
  assert.equal(istJa("  JA \n"), true);
  for (const a of ["", "j", "yes", "jaa", "nein", undefined, null, "ja bitte"]) assert.equal(istJa(a), false, String(a));
});

// ---------- Argumente für den Kindprozess ----------

test("Probelauf: Ziel, Trainer-Datei, Kohorten, kein --ausfuehren", () => {
  const a = importPlanArgumente(BASIS);
  assert.equal(a[0], "scripts/import-plan.mjs");
  assert.equal(wert(a, "--datei"), "/daten/plan.xlsx");
  assert.equal(wert(a, "--ziel"), "staging");
  assert.equal(wert(a, "--trainer-datei"), "/daten/trainer-staging.csv");
  assert.equal(wert(a, "--kohorte"), "Energiehelden 28.09.26");
  assert.ok(!a.includes("--ausfuehren"));
  assert.ok(!a.includes("--production-freigabe"));
});

test("mehrere Kohorten: je eine --kohorte, Versatz bleibt", () => {
  const a = importPlanArgumente({ ...BASIS, kohorten: ["A", "B@+7"] });
  assert.deepEqual(a.filter((_, i) => a[i - 1] === "--kohorte"), ["A", "B@+7"]);
});

test("Production: --production-freigabe wird weitergegeben, ohne Freigabe Fehler", () => {
  const a = importPlanArgumente({ ...BASIS, ziel: "production", productionFreigabe: true, trainerDatei: "/d/trainer-production.csv" });
  assert.ok(a.includes("--production-freigabe"));
  assert.equal(wert(a, "--ziel"), "production");
  assert.throws(() => importPlanArgumente({ ...BASIS, ziel: "production" }), /production-freigabe/);
  assert.throws(() => importPlanArgumente({ ...BASIS, ziel: undefined }), /Ziel/);
});

test("Optionen: --module, --ohne-praxis, --ohne-zuordnung-erlauben nur wenn gesetzt", () => {
  const ohne = importPlanArgumente(BASIS);
  for (const o of ["--module", "--ohne-praxis", "--ohne-zuordnung-erlauben", "--fachsprache", "--nur-fachsprache", "--nur-trainer"]) {
    assert.ok(!ohne.includes(o), o);
  }
  const mit = importPlanArgumente({ ...BASIS, module: "I", ohnePraxis: "II", ohneZuordnungErlauben: true });
  assert.equal(wert(mit, "--module"), "I");
  assert.equal(wert(mit, "--ohne-praxis"), "II");
  assert.ok(mit.includes("--ohne-zuordnung-erlauben"));
});

test("--ausfuehren nur mit Bestätigung „ja“", () => {
  assert.throws(() => importPlanArgumente(BASIS, { ausfuehren: true }), /Bestätigung/);
  assert.throws(() => importPlanArgumente(BASIS, { ausfuehren: true, bestaetigung: "nein" }), /Bestätigung/);
  assert.throws(() => importPlanArgumente(BASIS, { ausfuehren: true, bestaetigung: "" }), /Bestätigung/);
  assert.ok(!importPlanArgumente(BASIS, { bestaetigung: "ja" }).includes("--ausfuehren"), "Bestätigung allein speichert nicht");
  const a = importPlanArgumente(BASIS, { ausfuehren: true, bestaetigung: " Ja " });
  assert.equal(a.at(-1), "--ausfuehren");
  assert.equal(a.filter((x) => x === "--ausfuehren").length, 1);
});

test("Pflichtangaben: Plan, Trainer-Datei, mindestens eine Kohorte", () => {
  assert.throws(() => importPlanArgumente({ ...BASIS, planDatei: undefined }), /plan-datei/);
  assert.throws(() => importPlanArgumente({ ...BASIS, trainerDatei: undefined }), /trainer-datei/);
  assert.throws(() => importPlanArgumente({ ...BASIS, kohorten: [] }), /Kohorte/);
});

test("eigener Skriptpfad für den Kindprozess", () => {
  assert.equal(importPlanArgumente({ ...BASIS, skript: "/abs/scripts/import-plan.mjs" })[0], "/abs/scripts/import-plan.mjs");
});

test("Analyse: nur Datei, Module, ohne-praxis und --nur-analyse, kein Ziel", () => {
  assert.deepEqual(analyseArgumente({ planDatei: "/p.xlsx", ohnePraxis: "II" }), ["scripts/import-plan.mjs", "--datei", "/p.xlsx", "--ohne-praxis", "II", "--nur-analyse"]);
});

// ---------- Kohorten ----------

test("Kohorten: aus der Liste, jede einmal, Reihenfolge der Datei", () => {
  assert.deepEqual(kohortenFuerImport(["B", "A", "B"]), ["B", "A"]);
});

test("Kohorten: Versatz per --kohorte für eine Listen-Kohorte", () => {
  assert.deepEqual(kohortenFuerImport(["A", "B"], ["B@+7"]), ["A", "B@+7"]);
  assert.deepEqual(kohortenFuerImport(["A"], ["A@-3"]), ["A@-3"]);
  assert.deepEqual(kohortenFuerImport(["A"], ["A"]), ["A"]);
  assert.deepEqual(kohortenFuerImport(["A"], ["A@+0"]), ["A"]);
});

test("Kohorten: fremde oder doppelte --kohorte ist ein Fehler", () => {
  assert.throws(() => kohortenFuerImport(["A"], ["C"]), /nicht in der Lernenden-Liste/);
  assert.throws(() => kohortenFuerImport(["A"], ["A@+7", "A"]), /doppelt/);
  assert.throws(() => kohortenFuerImport([]), /Keine Kohorte/);
  assert.throws(() => kohortenFuerImport(["X@+7"]), /Versatz/);
});

// ---------- Dateien ----------

test("Plan-Dateien: .xlsx, Trainer-Datei Pflicht und staging-Regel", () => {
  pruefePlanDateien({ planDatei: "/d/plan.xlsx", trainerDatei: "/d/trainer-staging.csv", ziel: "staging" });
  pruefePlanDateien({ planDatei: "/d/plan.xlsx", trainerDatei: "/d/trainer-production.csv", ziel: "production" });
  assert.throws(() => pruefePlanDateien({ planDatei: "/d/plan.csv", trainerDatei: "/d/trainer-staging.csv", ziel: "staging" }), /xlsx/);
  assert.throws(() => pruefePlanDateien({ planDatei: "/d/plan.xlsx", ziel: "staging" }), /trainer-datei/);
  assert.throws(() => pruefePlanDateien({ planDatei: "/d/plan.xlsx", trainerDatei: "/d/trainer.csv", ziel: "staging" }), /staging/);
  assert.throws(() => pruefePlanDateien({ planDatei: "/d/plan.xlsx", trainerDatei: "/d/trainer-staging.csv", ziel: "production" }), /Staging/);
  assert.throws(() => pruefePlanDateien({ planDatei: "/d/plan.xlsx", trainerDatei: "/d/trainer-staging.rtf", ziel: "staging" }), /CSV/);
});

// ---------- Befehl zum Kopieren ----------

test("Befehl: Werte mit Leerzeichen und Apostroph in Anführungszeichen", () => {
  const t = befehlAlsText(importPlanArgumente({ ...BASIS, kohorten: ["Energiehelden 28.09.26", "O'Neil@+7"] }));
  assert.match(t, /^node scripts\/import-plan\.mjs --datei \/daten\/plan\.xlsx --ziel staging /);
  assert.match(t, /--kohorte 'Energiehelden 28\.09\.26'/);
  assert.match(t, /--kohorte 'O'\\''Neil@\+7'/);
});

// ---------- Kontrolle ----------

test("Kontroll-SQL: nur lesend, Kohorten im Literal, keine Schreibbefehle", () => {
  const sql = kontrolleSql(["A", "A", "B"], "k_test");
  assert.match(sql, /begin transaction read only;/);
  assert.match(sql, /rollback;/);
  assert.ok(sql.includes('$k_test$["A","B"]$k_test$'));
  assert.doesNotMatch(sql, /\b(insert|update|delete|commit)\b/i);
  assert.throws(() => kontrolleSql(["k_test"], "k_test"), /Interner Fehler/);
});

test("Kontrolle lesen: letzte Zeile JSON", () => {
  const w = leseKontrolle('\n[{"kohorte":"A","aktiv":3,"mitTerminen":2,"ohne":1}]\n');
  assert.deepEqual(w, [{ kohorte: "A", aktiv: 3, mitTerminen: 2, ohne: 1 }]);
  assert.throws(() => leseKontrolle(""));
});

test("Kontrolle bewerten: zählt nur Kohorten mit Praxistagen", () => {
  const r = bewerteKontrolle(
    [
      { kohorte: "A", aktiv: 3, mitTerminen: 2, ohne: 1 },
      { kohorte: "B", aktiv: 2, mitTerminen: 0, ohne: 2 },
      { kohorte: "C", aktiv: 4, mitTerminen: 4, ohne: 0 },
    ],
    ["A", "B", "C", "D"]
  );
  assert.equal(r.ohne, 1);
  assert.match(r.zeilen[0], /A: 1 von 3 .*OHNE Praxistage/);
  assert.match(r.zeilen[1], /B: .*noch keine Praxistage/);
  assert.match(r.zeilen[2], /C: alle 4/);
  assert.match(r.zeilen[3], /D: Kohorte nicht gefunden/);
});
