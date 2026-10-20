// Tests für die Logik des Praxisflow-Demos (Fake-Speicher, kein Browser).
// Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BEWERTUNGSBOGEN_STANDARD,
  BEWERTUNGSKRITERIEN,
  PRUEFLISTE_STANDARD,
  DATEIEN,
  DEMO_CODEWORT,
  NOTEN_BESCHREIBUNGEN,
  PHASEN,
  PHASEN_TEXTE,
  PLANEN_UNTERSCHRITTE,
  PUNKTE_SKALA,
  SPEICHER_PRAEFIX,
  // @ts-expect-error TS5097: .ts-Endung für node:test nötig
} from "./praxisflow-daten.ts";
import {
  allesGeprueft,
  bogenVollstaendig,
  nacharbeitNoetig,
  pruefungUmschalten,
  zurNacharbeit,
  alleErledigt,
  bewertungAbschliessbar,
  codewortKorrekt,
  demoZuruecksetzen,
  diktatZuTexten,
  eintraegeAnhaengen,
  zeilenZuTexten,
  eintragBearbeiten,
  eintragHinzufuegen,
  eintragLoeschen,
  eintragVerschieben,
  einschaetzungVollstaendig,
  erledigtBereinigen,
  fremdFreigabeMoeglich,
  planBereit,
  planenWeiter,
  planenWeiterMoeglich,
  planenZurueck,
  schrittStatus,
  schrittUmschalten,
  speicherSchluessel,
  startZustand,
  zustandLaden,
  zustandSpeichern,
  // @ts-expect-error TS5097: .ts-Endung für node:test nötig
} from "./praxisflow-logik.ts";

type E = { id: string; text: string };
const drei: E[] = [
  { id: "a", text: "A" },
  { id: "b", text: "B" },
  { id: "c", text: "C" },
];
const ids = (l: E[]) => l.map((e) => e.id).join("");
const kriterien = [{ id: "k1" }, { id: "k2" }];

function fakeStorage(start: Record<string, string> = {}) {
  const daten = new Map(Object.entries(start));
  return {
    get length() {
      return daten.size;
    },
    key: (i: number) => [...daten.keys()][i] ?? null,
    getItem: (k: string) => daten.get(k) ?? null,
    setItem: (k: string, v: string) => void daten.set(k, v),
    removeItem: (k: string) => void daten.delete(k),
    daten,
  };
}

// ---------- Fixtures ----------

test("Fixtures: Instruktion und Hast-du-alles bleiben erhalten (Anzeige per Schalter)", () => {
  for (const p of PHASEN) {
    assert.ok(PHASEN_TEXTE[p.id].instruktion.trim().length > 0, p.id);
    assert.ok(Array.isArray(PHASEN_TEXTE[p.id].hastDuAlles), p.id);
  }
});

test("Fixtures: Codewort gesetzt, Skala fest, vier Kriterien mit eindeutiger ID", () => {
  assert.ok(DEMO_CODEWORT.length > 0);
  assert.deepEqual([...PUNKTE_SKALA], [10, 9, 7, 5, 3, 0]);
  assert.equal(BEWERTUNGSKRITERIEN.length, 4);
  assert.equal(new Set(BEWERTUNGSKRITERIEN.map((k: { id: string }) => k.id)).size, 4);
});

test("Fixtures: Dateinamen ohne Pfad, Leerzeichen oder externe Links", () => {
  for (const d of DATEIEN as { titel: string; dateiname: string }[]) {
    assert.match(d.dateiname, /^[a-z0-9]+(-[a-z0-9]+)*\.[a-z0-9]+$/, d.dateiname);
  }
});

// ---------- Planen ----------

test("Startzustand: Analyse, alle drei Listen leer, keine Bewertung", () => {
  const z = startZustand();
  assert.equal(z.phase, "analyse");
  assert.deepEqual([z.werkzeuge, z.materialien, z.schritte], [[], [], []]);
  assert.deepEqual([z.selbst, z.fremd], [{}, {}]);
  assert.equal(z.fremdFreigegeben, false);
  assert.equal(z.planenSchritt, 0);
});

test("Einträge hinzufügen, bearbeiten, löschen; leerer Text wird ignoriert", () => {
  let l = eintragHinzufuegen([], "  Akkuschrauber  ", "w1");
  assert.deepEqual(l, [{ id: "w1", text: "Akkuschrauber" }]);
  assert.equal(eintragHinzufuegen(l, "   ", "x"), l);
  l = eintragBearbeiten(l, "w1", " Maßband ");
  assert.equal(l[0].text, "Maßband");
  assert.equal(eintragBearbeiten(l, "w1", " "), l);
  assert.deepEqual(eintragLoeschen(l, "w1"), []);
});

test("Hoch/Runter tauscht Nachbarn, an den Rändern keine Änderung", () => {
  assert.equal(ids(eintragVerschieben(drei, "b", "hoch")), "bac");
  assert.equal(ids(eintragVerschieben(drei, "b", "runter")), "acb");
  assert.equal(eintragVerschieben(drei, "a", "hoch"), drei);
  assert.equal(eintragVerschieben(drei, "c", "runter"), drei);
  assert.equal(eintragVerschieben(drei, "x", "hoch"), drei);
});

test("Weiter zu Entscheiden erst mit mindestens einem Arbeitsschritt", () => {
  assert.equal(planBereit([]), false);
  assert.equal(planBereit([{ id: "s1", text: "Schritt" }]), true);
});

test("Fixtures: Planen-Unterschritte in der Reihenfolge Werkzeuge, Materialien, Arbeitsschritte", () => {
  assert.deepEqual(
    PLANEN_UNTERSCHRITTE.map((u: { id: string }) => u.id),
    ["werkzeuge", "materialien", "schritte"]
  );
});

test("Fixtures: jede Punktestufe hat eine als Platzhalter markierte Beschreibung", () => {
  for (const p of PUNKTE_SKALA) {
    assert.match(NOTEN_BESCHREIBUNGEN[p] ?? "", /\(Platzhalter\)/, String(p));
  }
});

test("Planen: Werkzeuge → Materialien → Arbeitsschritte → Entscheiden, Weiter ohne Checkliste", () => {
  const anzahl = 3;
  let z: ReturnType<typeof startZustand> = { ...startZustand(), phase: "planen" };
  // Unterschritt 1 und 2: Weiter auch mit leeren Listen
  assert.equal(planenWeiterMoeglich(0, [], anzahl), true);
  z = { ...z, ...planenWeiter(z, anzahl) };
  assert.deepEqual([z.phase, z.planenSchritt], ["planen", 1]);
  z = { ...z, ...planenWeiter(z, anzahl) };
  assert.deepEqual([z.phase, z.planenSchritt], ["planen", 2]);
  // Unterschritt 3: erst mit mindestens einem Arbeitsschritt
  assert.equal(planenWeiterMoeglich(2, [], anzahl), false);
  assert.deepEqual(planenWeiter(z, anzahl), { phase: "planen", planenSchritt: 2 });
  z = { ...z, schritte: [{ id: "s1", text: "Schritt" }] };
  assert.equal(planenWeiterMoeglich(2, z.schritte, anzahl), true);
  assert.deepEqual(planenWeiter(z, anzahl), { phase: "entscheiden", planenSchritt: 2 });
});

test("Planen zurück: Unterschritt für Unterschritt, vor dem ersten zu Analyse; Listen bleiben", () => {
  const z = { ...startZustand(), phase: "planen" as const, planenSchritt: 2, werkzeuge: drei, materialien: drei };
  const eins = { ...z, ...planenZurueck(z) };
  assert.deepEqual([eins.phase, eins.planenSchritt], ["planen", 1]);
  const null_ = { ...eins, ...planenZurueck(eins) };
  assert.deepEqual([null_.phase, null_.planenSchritt], ["planen", 0]);
  const analyse = { ...null_, ...planenZurueck(null_) };
  assert.deepEqual([analyse.phase, analyse.planenSchritt], ["analyse", 0]);
  assert.deepEqual([analyse.werkzeuge, analyse.materialien], [drei, drei]);
});

// ---------- Eingabe und Diktat ----------

test("Eingabe: mehrzeiliger Text wird zeilenweise zu Einträgen, leere Zeilen ignoriert", () => {
  assert.deepEqual(zeilenZuTexten("Akkuschrauber\nMaßband\r\n\n  Seitenschneider  \r"), ["Akkuschrauber", "Maßband", "Seitenschneider"]);
  assert.deepEqual(zeilenZuTexten("Kabel abisolieren. Adern prüfen."), ["Kabel abisolieren. Adern prüfen."]);
  assert.deepEqual(zeilenZuTexten(" \n\t\n"), []);
});

test("Diktat: Sätze und Zeilen aufgeteilt", () => {
  assert.deepEqual(diktatZuTexten("Akkuschrauber. Maßband\nSeitenschneider"), ["Akkuschrauber", "Maßband", "Seitenschneider"]);
});

test("Diktat: ein Satz je Eintrag, Satzpunkt am Ende weg, leere Teile ignoriert", () => {
  assert.deepEqual(diktatZuTexten("Akkuschrauber. Maßband! Ist das alles?"), ["Akkuschrauber", "Maßband!", "Ist das alles?"]);
  assert.deepEqual(diktatZuTexten("  Seitenschneider  "), ["Seitenschneider"]);
  assert.deepEqual(diktatZuTexten("Kabel abisolieren.\n\nAdern prüfen..  "), ["Kabel abisolieren", "Adern prüfen"]);
  assert.deepEqual(diktatZuTexten(""), []);
  assert.deepEqual(diktatZuTexten(" . \n . "), []);
  assert.deepEqual(diktatZuTexten("   \n  "), []);
  assert.deepEqual(diktatZuTexten("..."), []);
});

test("Diktat: allein stehende Zahl bleibt beim folgenden Satz", () => {
  assert.deepEqual(diktatZuTexten("1. Kabel abisolieren. 2. Adern prüfen."), ["1. Kabel abisolieren", "2. Adern prüfen"]);
});

test("Diktat: Texte werden unten angehängt und sind danach wie getippte Einträge sortierbar", () => {
  let n = 0;
  const neueId = () => `d${++n}`;
  const l = eintraegeAnhaengen([{ id: "a", text: "A" }], ["B", "  ", "C"], neueId);
  assert.equal(ids(l), "ad1d2");
  assert.deepEqual(l.map((e) => e.text), ["A", "B", "C"]);
  assert.equal(ids(eintragVerschieben(l, "d2", "hoch")), "ad2d1");
  assert.equal(ids(eintragLoeschen(l, "d1")), "ad2");
  assert.equal(eintragBearbeiten(l, "d1", "B neu")[1].text, "B neu");
});

// ---------- Durchführen ----------

test("Reihenfolge: nur der nächste offene Schritt ist abhakbar", () => {
  assert.deepEqual(
    drei.map((s) => schrittStatus(drei, [], s.id)),
    ["abhakbar", "gesperrt", "gesperrt"]
  );
  assert.deepEqual(schrittUmschalten(drei, [], "b"), []);
  assert.deepEqual(schrittUmschalten(drei, [], "c"), []);
  let e = schrittUmschalten(drei, [], "a");
  assert.deepEqual(e, ["a"]);
  assert.deepEqual(
    drei.map((s) => schrittStatus(drei, e, s.id)),
    ["zuruecknehmbar", "abhakbar", "gesperrt"]
  );
  assert.deepEqual(schrittUmschalten(drei, e, "c"), ["a"]);
  e = schrittUmschalten(drei, e, "b");
  assert.deepEqual(e, ["a", "b"]);
});

test("Zurücknehmen nur beim zuletzt abgehakten Schritt", () => {
  const e = ["a", "b"];
  assert.deepEqual(
    drei.map((s) => schrittStatus(drei, e, s.id)),
    ["erledigt", "zuruecknehmbar", "abhakbar"]
  );
  assert.deepEqual(schrittUmschalten(drei, e, "a"), ["a", "b"]);
  assert.deepEqual(schrittUmschalten(drei, e, "b"), ["a"]);
  assert.equal(schrittStatus(drei, e, "unbekannt"), "gesperrt");
});

test("Bereinigung: Haken nur bis zur ersten Lücke und nur für vorhandene Schritte", () => {
  assert.deepEqual(erledigtBereinigen(["a", "c"], drei), ["a"]);
  assert.deepEqual(erledigtBereinigen(["b", "c"], drei), []);
  assert.deepEqual(erledigtBereinigen(["c", "b", "a"], drei), ["a", "b", "c"]);
  assert.deepEqual(erledigtBereinigen(["a", "b", "weg"], drei), ["a", "b"]);
  // Nach Umsortieren in Planen: neue Reihenfolge c, a, b
  assert.deepEqual(erledigtBereinigen(["a", "b"], [drei[2], drei[0], drei[1]]), []);
});

test("Gespeicherter Stand mit Lücke wird beim Laden bereinigt", () => {
  const z = { ...startZustand(), phase: "durchfuehren" as const, schritte: drei, erledigt: ["a", "c"] };
  const s = fakeStorage({ "p:zustand-v7": JSON.stringify(z) });
  assert.deepEqual(zustandLaden(s, "p:").erledigt, ["a"]);
});

test("Gate 2: erst aktiv, wenn jeder geplante Schritt abgehakt ist", () => {
  let e: string[] = [];
  for (const id of ["a", "b"]) e = schrittUmschalten(drei, e, id);
  assert.equal(alleErledigt(drei, e), false);
  e = schrittUmschalten(drei, e, "c");
  assert.equal(alleErledigt(drei, e), true);
  assert.equal(alleErledigt(drei, schrittUmschalten(drei, e, "c")), false);
  assert.equal(alleErledigt([], []), false);
});

// ---------- Codewort und Bewertung ----------

test("Codewort: ohne Groß-/Kleinschreibung und Leerraum, leer ist falsch", () => {
  assert.equal(codewortKorrekt("  WerkStatt ", "werkstatt"), true);
  assert.equal(codewortKorrekt("werkstat", "werkstatt"), false);
  assert.equal(codewortKorrekt("", ""), false);
});

test("Einschätzung vollständig nur mit Skalenwerten für jedes Kriterium", () => {
  assert.equal(einschaetzungVollstaendig(kriterien, {}, PUNKTE_SKALA), false);
  assert.equal(einschaetzungVollstaendig(kriterien, { k1: 10 }, PUNKTE_SKALA), false);
  assert.equal(einschaetzungVollstaendig(kriterien, { k1: 10, k2: 8 }, PUNKTE_SKALA), false);
  assert.equal(einschaetzungVollstaendig(kriterien, { k1: 10, k2: 0 }, PUNKTE_SKALA), true);
});

test("Fremdeinschätzung: Freigabe erst nach vollständiger Selbsteinschätzung", () => {
  assert.equal(fremdFreigabeMoeglich(kriterien, { k1: 9 }, PUNKTE_SKALA), false);
  assert.equal(fremdFreigabeMoeglich(kriterien, { k1: 9, k2: 7 }, PUNKTE_SKALA), true);
});

test("Abschluss erst mit Selbst- und Fremdeinschätzung und Freigabe per Codewort", () => {
  const selbst = { k1: 9, k2: 7 };
  const fremd = { k1: 10, k2: 5 };
  assert.equal(bewertungAbschliessbar({ selbst, fremd, fremdFreigegeben: false }, kriterien, PUNKTE_SKALA), false);
  assert.equal(bewertungAbschliessbar({ selbst, fremd: { k1: 10 }, fremdFreigegeben: true }, kriterien, PUNKTE_SKALA), false);
  assert.equal(bewertungAbschliessbar({ selbst: {}, fremd, fremdFreigegeben: true }, kriterien, PUNKTE_SKALA), false);
  assert.equal(bewertungAbschliessbar({ selbst, fremd, fremdFreigegeben: true }, kriterien, PUNKTE_SKALA), true);
});

// ---------- Speichern ----------

test("Speichern und Laden über den Fake-Speicher unter Schlüssel v7", () => {
  const s = fakeStorage();
  const z = { ...startZustand(), phase: "durchfuehren" as const, schritte: drei, erledigt: ["a"], selbst: { k1: 9 } };
  zustandSpeichern(s, "p:", z);
  assert.deepEqual([...s.daten.keys()], ["p:zustand-v7"]);
  assert.equal(speicherSchluessel("p:"), "p:zustand-v7");
  assert.deepEqual(zustandLaden(s, "p:"), z);
});

test("Alte Stände (v1, v2) und kaputter oder fremder Inhalt ergeben den Startzustand", () => {
  const v1 = JSON.stringify({ phase: "planen", schritte: [{ id: "s1", text: "A", kontrollierbar: true }], erledigt: [], noten: {}, bewertungAbgeschlossen: false });
  // v2: Struktur ohne Planen-Unterschritt
  const v2Zustand: Record<string, unknown> = { ...startZustand(), phase: "durchfuehren", schritte: drei };
  delete v2Zustand.planenSchritt;
  const v2 = JSON.stringify(v2Zustand);
  assert.deepEqual(zustandLaden(fakeStorage({ "p:zustand-v1": v1 }), "p:"), startZustand());
  assert.deepEqual(zustandLaden(fakeStorage({ "p:zustand-v2": v2 }), "p:"), startZustand());
  assert.deepEqual(zustandLaden(fakeStorage({ "p:zustand-v7": v1 }), "p:"), startZustand());
  assert.deepEqual(zustandLaden(fakeStorage({ "p:zustand-v7": v2 }), "p:"), startZustand());
  assert.deepEqual(zustandLaden(fakeStorage({ "p:zustand-v7": JSON.stringify({ ...startZustand(), planenSchritt: 3 }) }), "p:"), startZustand());
  assert.deepEqual(zustandLaden(fakeStorage({ "p:zustand-v7": "{kaputt" }), "p:"), startZustand());
  assert.deepEqual(zustandLaden(null, "p:"), startZustand());
});

test("Speicher, der wirft, bricht nichts", () => {
  const kaputt = {
    length: 0,
    key: () => null,
    getItem: () => {
      throw new Error("gesperrt");
    },
    setItem: () => {
      throw new Error("gesperrt");
    },
    removeItem: () => {
      throw new Error("gesperrt");
    },
  };
  assert.deepEqual(zustandLaden(kaputt, "p:"), startZustand());
  assert.doesNotThrow(() => zustandSpeichern(kaputt, "p:", startZustand()));
  assert.doesNotThrow(() => demoZuruecksetzen(kaputt, "p:"));
});

test("Zurücksetzen löscht nur Schlüssel mit dem Demo-Präfix, auch alte Versionen", () => {
  const s = fakeStorage({
    [`${SPEICHER_PRAEFIX}zustand-v1`]: "{}",
    [`${SPEICHER_PRAEFIX}zustand-v2`]: "{}",
    [`${SPEICHER_PRAEFIX}zustand-v7`]: "{}",
    fremd: "bleibt",
  });
  demoZuruecksetzen(s, SPEICHER_PRAEFIX);
  assert.deepEqual([...s.daten.keys()], ["fremd"]);
});

test("Kontrollieren: Prüfungen abhaken und vollständig erkennen", () => {
  const a = PRUEFLISTE_STANDARD.spannungsfrei;
  let erledigt: string[] = [];
  for (const p of a) erledigt = pruefungUmschalten(erledigt, p.id);
  assert.ok(allesGeprueft(a, erledigt));
  assert.ok(!allesGeprueft(a, pruefungUmschalten(erledigt, a[0].id)));
});

test("Bewertungsbogen: jede Skala je Kriterium, K.-o. führt zur Nacharbeit", () => {
  const voll = Object.fromEntries(BEWERTUNGSBOGEN_STANDARD.map((k) => [k.id, k.skala[0]]));
  assert.ok(bogenVollstaendig(BEWERTUNGSBOGEN_STANDARD, voll));
  assert.ok(!bogenVollstaendig(BEWERTUNGSBOGEN_STANDARD, { ...voll, funktion: 7 }), "7 gibt es bei Ja/Nein nicht");
  assert.ok(!nacharbeitNoetig(BEWERTUNGSBOGEN_STANDARD, voll));
  assert.ok(nacharbeitNoetig(BEWERTUNGSBOGEN_STANDARD, { ...voll, funktion: 0 }));
  assert.ok(!nacharbeitNoetig(BEWERTUNGSBOGEN_STANDARD, { ...voll, ausfuehrung: 0 }), "kein K.-o.-Kriterium");
});

test("Nacharbeit: zurück zu Ausführen, Plan und Dateien bleiben", () => {
  const z = { ...startZustand(), phase: "bewerten" as const, schritte: [{ id: "s1", text: "A" }], erledigt: ["s1"], planDateien: ["plan.pdf"], inbetriebnahmeFreigegeben: true, fremd: { funktion: 0 }, fremdFreigegeben: true };
  const n = zurNacharbeit(z);
  assert.equal(n.phase, "durchfuehren");
  assert.deepEqual(n.erledigt, ["s1"]);
  assert.deepEqual(n.planDateien, ["plan.pdf"]);
  assert.equal(n.inbetriebnahmeFreigegeben, false);
  assert.deepEqual(n.fremd, {});
  assert.equal(n.fremdFreigegeben, false);
});
