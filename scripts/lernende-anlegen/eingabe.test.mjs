// Tests für scripts/lernende-anlegen/eingabe.mjs (SR-48) mit erfundenen Daten
// (example.org, keine echten Namen). Ausführen:
// node --test scripts/lernende-anlegen/eingabe.test.mjs

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  istDemoEmail,
  istDemoKohorte,
  leseLernendeDatei,
  maskiere,
  pruefeDateiZiel,
  pruefeDemo,
} from "./eingabe.mjs";

const KOPF = "E-Mail,Vorname,Nachname,Rufname,Betrieb,Kohorte";

const fehlertext = (fn) => {
  try {
    fn();
  } catch (e) {
    return e.message;
  }
  return null;
};

// ---------- Dateiname und Ziel ----------

test("Dateiname: staging braucht „staging“, production darf es nicht haben", () => {
  assert.doesNotThrow(() => pruefeDateiZiel("/x/lernende-staging.csv", "staging"));
  assert.doesNotThrow(() => pruefeDateiZiel("/x/Lernende-STAGING.CSV", "staging"));
  assert.doesNotThrow(() => pruefeDateiZiel("/x/lernende-production.csv", "production"));
  assert.match(fehlertext(() => pruefeDateiZiel("/x/lernende-production.csv", "staging")), /staging/);
  assert.match(fehlertext(() => pruefeDateiZiel("/x/lernende-staging.csv", "production")), /Staging-Lernenden-Datei/);
});

test("Dateiname: nur .csv, Ziel nur staging oder production, ohne Ziel nur Endung", () => {
  assert.match(fehlertext(() => pruefeDateiZiel("/x/lernende-staging.xlsx", "staging")), /reine CSV/);
  assert.match(fehlertext(() => pruefeDateiZiel("/x/lernende-staging.csv", "test")), /staging oder production/);
  assert.doesNotThrow(() => pruefeDateiZiel("/x/lernende.csv", undefined));
  assert.match(fehlertext(() => pruefeDateiZiel(undefined, undefined)), /reine CSV/);
});

// ---------- Maskierung ----------

test("maskiere: erster Buchstabe und Domain bleiben", () => {
  assert.equal(maskiere("test+lernende1@example.org"), "t***@example.org");
  assert.equal(maskiere("  a@example.org "), "a***@example.org");
  assert.equal(maskiere("ohne-at"), "***");
  assert.equal(maskiere("@example.org"), "***");
  assert.equal(maskiere(""), "***");
  assert.equal(maskiere(undefined), "***");
});

// ---------- CSV ----------

test("CSV: gültige Zeilen, Rufname leer -> Vorname, E-Mail klein, Leerzeichen bereinigt", () => {
  const e = leseLernendeDatei(
    `${KOPF}\n` +
      "Test+Lernende1@Example.org, Erika ,Muster,,Testbetrieb GmbH,Testkohorte 01.01.27\n" +
      "\n" +
      "test+lernende2@example.org,Max  Peter,Probe,Maxi,Testbetrieb GmbH,Testkohorte 01.01.27\n"
  );
  assert.equal(e.length, 2);
  assert.deepEqual(e[0], {
    zeile: 2,
    email: "test+lernende1@example.org",
    maskiert: "t***@example.org",
    name: "Erika Muster",
    rufname: "Erika",
    betrieb: "Testbetrieb GmbH",
    kohorte: "Testkohorte 01.01.27",
  });
  assert.equal(e[1].zeile, 4);
  assert.equal(e[1].name, "Max Peter Probe");
  assert.equal(e[1].rufname, "Maxi");
});

test("CSV: Spalte Rufname darf fehlen, Semikolon und andere Reihenfolge gehen", () => {
  const e = leseLernendeDatei(
    "﻿Kohorte;Betrieb;Nachname;Vorname;E-Mail\nTestkohorte;Testbetrieb;Muster;Erika;test+lernende1@example.org\n"
  );
  assert.equal(e[0].rufname, "Erika");
  assert.equal(e[0].kohorte, "Testkohorte");
});

test("CSV: Kopf falsch, unbekannte oder fehlende Spalte", () => {
  assert.match(fehlertext(() => leseLernendeDatei("")), /leer/);
  assert.match(fehlertext(() => leseLernendeDatei("E-Mail,Vorname,Nachname,Betrieb\n")), /Fehlt: Kohorte/);
  assert.match(fehlertext(() => leseLernendeDatei(`${KOPF},Sprache\n`)), /Unbekannt: sprache/);
  assert.match(fehlertext(() => leseLernendeDatei(`${KOPF},Kohorte\n`)), /Doppelt: kohorte/);
  assert.match(fehlertext(() => leseLernendeDatei(`${KOPF}\n`)), /keine Zeilen/);
});

test("CSV: ungültige E-Mail, fehlende Werte, Dubletten -- Meldungen ohne Name und Adresse", () => {
  const text =
    `${KOPF}\n` +
    "keine-adresse,Erika,Muster,,Testbetrieb,Testkohorte\n" +
    "test+lernende2@example.org,,Muster,,,Testkohorte\n" +
    "test+lernende3@example.org,Erika,Muster,,Testbetrieb,Testkohorte\n" +
    "TEST+lernende3@example.org,Erika,Muster,,Testbetrieb,Testkohorte\n" +
    `test+lernende4@example.org,Erika,Muster,${"x".repeat(61)},Testbetrieb,Testkohorte\n` +
    "test+lernende5@example.org,Erika,Muster,,Testbetrieb,Testkohorte,zuviel\n";
  const m = fehlertext(() => leseLernendeDatei(text));
  assert.match(m, /Zeile 2 \(\*\*\*\): E-Mail ist ungültig/);
  assert.match(m, /Zeile 3 \(t\*\*\*@example\.org\): Vorname fehlt/);
  assert.match(m, /Zeile 3 .*Betrieb fehlt/);
  assert.match(m, /Zeile 5 .*doppelt, dieselbe E-Mail steht schon in Zeile 4/);
  assert.match(m, /Zeile 6 .*Rufname ist länger als 60/);
  assert.match(m, /Zeile 7: mehr Werte als Spalten/);
  assert.doesNotMatch(m, /lernende\d/);
  assert.doesNotMatch(m, /Muster|Erika/);
});

test("CSV: Werte in Anführungszeichen mit Komma", () => {
  const e = leseLernendeDatei(`${KOPF}\ntest+lernende1@example.org,Erika,Muster,,"Testbetrieb, Zweigstelle",Testkohorte\n`);
  assert.equal(e[0].betrieb, "Testbetrieb, Zweigstelle");
});

// ---------- Demo-Schutz ----------

test("Demo: +demo@ und Kohorte „DEMO …“ werden erkannt", () => {
  assert.equal(istDemoEmail("test+demo@example.org"), true);
  assert.equal(istDemoEmail("TEST+DEMO@example.org"), true);
  assert.equal(istDemoEmail("test+demonstration@example.org"), false);
  assert.equal(istDemoEmail("demo@example.org"), false);
  assert.equal(istDemoKohorte("DEMO Rim"), true);
  assert.equal(istDemoKohorte(" demo rim"), true);
  assert.equal(istDemoKohorte("DEMO"), true);
  assert.equal(istDemoKohorte("Demonstration 2027"), false);
  assert.equal(istDemoKohorte("Testkohorte DEMO"), false);
});

test("Demo: pruefeDemo bricht ab und nennt nur Zeile und maskierte Adresse", () => {
  const ok = { zeile: 2, email: "test+lernende1@example.org", maskiert: "t***@example.org", kohorte: "Testkohorte" };
  assert.doesNotThrow(() => pruefeDemo([ok]));
  const m = fehlertext(() =>
    pruefeDemo([
      ok,
      { zeile: 3, email: "test+demo@example.org", maskiert: "t***@example.org", kohorte: "Testkohorte" },
      { zeile: 4, email: "test+lernende4@example.org", maskiert: "t***@example.org", kohorte: "DEMO Rim" },
    ])
  );
  assert.match(m, /Zeile 3 \(t\*\*\*@example\.org\), Zeile 4/);
  assert.doesNotMatch(m, /Zeile 2/);
  assert.doesNotMatch(m, /lernende4|test\+demo/);
});
