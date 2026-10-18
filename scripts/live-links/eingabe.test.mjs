// Tests für scripts/live-links/eingabe.mjs mit erfundenen Daten (keine echten
// Links, keine Namen). Ausführen: node --test scripts/live-links/eingabe.test.mjs

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  beschreibe,
  datumIso,
  leseLinkDatei,
  modulReihenfolge,
  pruefeDateiZiel,
  pruefeLink,
  uhrzeit,
  zerlegeCsv,
} from "./eingabe.mjs";

const LINK_A = "https://teams.microsoft.com/l/meetup-join/19%3ameeting_TEST%40thread.v2/0?context=%7b%22Tid%22%3a%22x%22%7d";
const LINK_B = "https://teams.live.com/meet/9999999999?p=GEHEIM123";

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
  assert.doesNotThrow(() => pruefeDateiZiel("/x/teams-links-staging.csv", "staging"));
  assert.doesNotThrow(() => pruefeDateiZiel("/x/Teams-Links-STAGING.CSV", "staging"));
  assert.doesNotThrow(() => pruefeDateiZiel("/x/teams-links-production.csv", "production"));
  assert.match(fehlertext(() => pruefeDateiZiel("/x/teams-links-production.csv", "staging")), /staging/);
  assert.match(fehlertext(() => pruefeDateiZiel("/x/teams-links-staging.csv", "production")), /Staging-Link-Datei/);
});

test("Dateiname: nur .csv, Ziel nur staging oder production", () => {
  assert.match(fehlertext(() => pruefeDateiZiel("/x/teams-links-staging.xlsx", "staging")), /\.csv/);
  assert.match(fehlertext(() => pruefeDateiZiel("/x/teams-links-staging.rtf")), /\.csv/);
  assert.match(fehlertext(() => pruefeDateiZiel("/x/teams-links-staging.csv", "dev")), /staging oder production/);
  assert.doesNotThrow(() => pruefeDateiZiel("/x/irgendwas.csv"));
});

// ---------- Link ----------

test("Link: Teams-Domains mit https sind gültig, Domain kommt zurück", () => {
  assert.deepEqual(pruefeLink(`  ${LINK_A}  `), { link: LINK_A, domain: "teams.microsoft.com" });
  assert.equal(pruefeLink(LINK_B).domain, "teams.live.com");
  assert.equal(pruefeLink("https://TEAMS.MICROSOFT.COM/l/x").domain, "teams.microsoft.com");
});

test("Link: ungültige Links brechen ab, die Meldung enthält den Link nicht", () => {
  const falsch = [
    ["", /fehlt/],
    ["http://teams.microsoft.com/l/x", /https/],
    ["https://teams.microsoft.com.evil.example/l/x", /nicht auf Teams/],
    ["https://evil.example/teams.microsoft.com", /nicht auf Teams/],
    ["https://zoom.us/j/123?pwd=GEHEIM", /nicht auf Teams/],
    ["https://user:GEHEIM@teams.microsoft.com/l/x", /Benutzernamen/],
    ["https://teams.microsoft.com:8443/l/x", /Port/],
    ["https://teams.microsoft.com/l/x y", /Leerzeichen/],
    ["teams.microsoft.com/l/x", /keine gültige Adresse/],
    ["javascript:alert(1)", /https/],
    [`https://teams.microsoft.com/${"a".repeat(2001)}`, /länger/],
  ];
  for (const [link, muster] of falsch) {
    const text = fehlertext(() => pruefeLink(link));
    assert.match(text ?? "", muster, `erwartet Fehler für ${link.slice(0, 40)}`);
    assert.ok(!text.includes("GEHEIM"), "Meldung darf keine Zugangsdaten enthalten");
    if (link) assert.ok(!text.includes(link), "Meldung darf den Link nicht enthalten");
  }
  // Unterdomain von Teams ist nicht erlaubt (nur genau die zwei Hosts).
  assert.match(fehlertext(() => pruefeLink("https://gov.teams.microsoft.com/l/x")), /nicht auf Teams/);
});

// ---------- CSV zerlegen ----------

test("CSV: Komma oder Semikolon (aus der Kopfzeile), BOM, CRLF, Anführungszeichen", () => {
  assert.deepEqual(zerlegeCsv("﻿a,b\r\n1,2\r\n"), [
    { nr: 1, zellen: ["a", "b"] },
    { nr: 2, zellen: ["1", "2"] },
  ]);
  assert.deepEqual(zerlegeCsv("a;b\n1,5;2"), [
    { nr: 1, zellen: ["a", "b"] },
    { nr: 2, zellen: ["1,5", "2"] },
  ]);
  assert.deepEqual(zerlegeCsv('a,b\n"x, ""y""",2\n'), [
    { nr: 1, zellen: ["a", "b"] },
    { nr: 2, zellen: ['x, "y"', "2"] },
  ]);
  assert.match(fehlertext(() => zerlegeCsv('a,b\n"offen,2\n')), /nicht geschlossen/);
});

test("CSV: Zeilennummern zählen Umbrüche in Anführungszeichen mit", () => {
  const z = zerlegeCsv('a,b\n"x\ny",1\nc,2');
  assert.deepEqual(z.map((r) => r.nr), [1, 2, 4]);
});

// ---------- Hilfswerte ----------

test("Modul, Datum, Start werden vereinheitlicht", () => {
  assert.equal(modulReihenfolge("II"), 2);
  assert.equal(modulReihenfolge("Modul III"), 3);
  assert.equal(modulReihenfolge("modul iv"), 4);
  assert.equal(modulReihenfolge("Abschluss"), 6);
  assert.equal(modulReihenfolge("2"), 2);
  assert.equal(modulReihenfolge("M02"), 2);
  assert.equal(modulReihenfolge("VII"), null);
  assert.equal(modulReihenfolge("7"), null);
  assert.equal(datumIso("19.10.2026"), "2026-10-19");
  assert.equal(datumIso("2.11.26"), "2026-11-02");
  assert.equal(datumIso("2026-11-02"), "2026-11-02");
  assert.equal(datumIso("31.02.2026"), null);
  assert.equal(datumIso("2026/11/02"), null);
  assert.equal(uhrzeit("9:00"), "09:00");
  assert.equal(uhrzeit("13:30:00"), "13:30");
  assert.equal(uhrzeit("24:00"), null);
  assert.equal(uhrzeit("13.30"), null);
});

// ---------- Link-Datei ----------

test("Variante je Modul: Kopf in beliebiger Reihenfolge, leere Zeilen übersprungen", () => {
  const { variante, eintraege } = leseLinkDatei(`Modul,Kohorte,Link\nII,Kohorte A,${LINK_A}\n\n,,\nIII,Kohorte A,${LINK_B}\n`);
  assert.equal(variante, "modul");
  assert.deepEqual(
    eintraege.map((e) => [e.zeile, e.kohorte, e.modul, e.modulReihenfolge, e.domain]),
    [
      [2, "Kohorte A", "II", 2, "teams.microsoft.com"],
      [5, "Kohorte A", "III", 3, "teams.live.com"],
    ]
  );
  assert.equal(eintraege[0].link, LINK_A);
  assert.equal(beschreibe(variante, eintraege[0]), "Kohorte A, Modul II");
});

test("Variante je Termin: Datum und Start vereinheitlicht, Semikolon, leere Spalten hinten", () => {
  const { variante, eintraege } = leseLinkDatei(`Kohorte;Datum;Start;Link;;\nKohorte A;02.11.2026;9:00;${LINK_A};;\n`);
  assert.equal(variante, "termin");
  assert.deepEqual(eintraege.map((e) => [e.kohorte, e.datum, e.start]), [["Kohorte A", "2026-11-02", "09:00"]]);
  assert.equal(beschreibe(variante, eintraege[0]), "Kohorte A, 2026-11-02 09:00");
});

test("Kopf: Kennung wird mit Hinweis abgelehnt, unbekannter Kopf bricht ab", () => {
  assert.match(fehlertext(() => leseLinkDatei(`Kennung,Link\nM02-S002,${LINK_A}`)), /nicht gespeichert/);
  assert.match(fehlertext(() => leseLinkDatei(`Kohorte,Link\nA,${LINK_A}`)), /Kopfzeile/);
  assert.match(fehlertext(() => leseLinkDatei(`Kohorte,Modul,Link,Hinweis\nA,II,${LINK_A},x`)), /Kopfzeile/);
  assert.match(fehlertext(() => leseLinkDatei("")), /leer/);
  assert.match(fehlertext(() => leseLinkDatei("Kohorte,Modul,Link\n")), /keine Zeilen/);
});

test("Doppelte Zeilen brechen ab (gleicher Schlüssel, auch mit anderem Link)", () => {
  const je_modul = `Kohorte,Modul,Link\nA,II,${LINK_A}\nA,Modul II,${LINK_B}\n`;
  assert.match(fehlertext(() => leseLinkDatei(je_modul)), /Zeile 3: doppelt.*Zeile 2/);
  const je_termin = `Kohorte,Datum,Start,Link\nA,02.11.2026,09:00,${LINK_A}\nA,2026-11-02,9:00,${LINK_A}\n`;
  assert.match(fehlertext(() => leseLinkDatei(je_termin)), /Zeile 3: doppelt/);
  // Andere Kohorte oder anderes Modul ist kein Duplikat
  assert.equal(leseLinkDatei(`Kohorte,Modul,Link\nA,II,${LINK_A}\nB,II,${LINK_A}\nA,III,${LINK_A}`).eintraege.length, 3);
});

test("Alle Fehler auf einmal, je Zeile, ohne Link", () => {
  const text = [
    "Kohorte,Modul,Link",
    ",II,https://teams.microsoft.com/l/x?pwd=GEHEIM",
    "A,VII,https://teams.microsoft.com/l/y",
    "B,II,http://teams.microsoft.com/l/z?pwd=GEHEIM",
    "C,II,https://teams.microsoft.com/l/a,b?pwd=GEHEIM",
  ].join("\n");
  const meldung = fehlertext(() => leseLinkDatei(text));
  assert.match(meldung, /Zeile 2: Kohorte fehlt/);
  assert.match(meldung, /Zeile 3: Modul „VII“ unbekannt/);
  assert.match(meldung, /Zeile 4: Link muss mit https/);
  assert.match(meldung, /Zeile 5: mehr Werte als Spalten/);
  assert.ok(!meldung.includes("GEHEIM"));
  assert.ok(!meldung.includes("/l/"));
});

test("Link mit Komma in Anführungszeichen ist erlaubt", () => {
  const { eintraege } = leseLinkDatei('Kohorte,Modul,Link\nA,II,"https://teams.microsoft.com/l/a,b"\n');
  assert.equal(eintraege[0].link, "https://teams.microsoft.com/l/a,b");
});
