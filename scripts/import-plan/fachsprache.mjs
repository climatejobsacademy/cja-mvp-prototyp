// scripts/import-plan/fachsprache.mjs
// Wandelt die Fachsprache-Tabs (Einheit, Wörter, Fragen, Sätze) in
// Einheiten für fachsprache_einheit (Migration 0051) um. Reine Funktion ohne
// Datenbank und ohne Uhr; getestet in fachsprache.test.mjs. Anleitung:
// docs/import-plan.md, Abschnitt "Fachsprache-Einheiten".
//
// Regeln (Entscheidungen 2026-10-16):
// - Kennung = Kennung eines Termins im Tab Stundenplan der Plan-Excel; aufgelöst
//   über den Kurs des Termins zu dessen erster Live-Lektion. Eine Einheit hängt an
//   der Lektion. Zwei Kennungen derselben Lektion müssen denselben Inhalt haben.
// - Dieselben Prüfregeln wie fn_fachsprache_inhalt_gueltig (0051); die
//   Datenbank prüft zusätzlich.
// - Unbekannte Spalten (Quellen, Hinweise, …), unbekannte Tabs (Anleitung) und
//   leere Zeilen sind kein Fehler.
// - Status und Prüffelder kommen hier nie vor: der Import setzt nie
//   "veröffentlicht" und trägt nie eine Prüfung ein.

import { ZEILE } from "./xlsx.mjs";

export const FACHSPRACHE_TABS = ["Einheit", "Wörter", "Fragen", "Sätze"];

const BILD_MUSTER = /^[a-z0-9][a-z0-9._-]{0,99}\.(png|jpe?g|webp)$/i;
const BUCHSTABEN = ["A", "B", "C", "D"];

/**
 * Wählt die Quelle der vier Tabs: Sind sie in der Plan-Excel vorhanden, gelten
 * sie von dort; sonst die zweite Datei (--fachsprache-datei). Gibt
 * { tabs, quelle } zurück; "quelle" ist "plan" oder "datei".
 */
export function waehleFachspracheTabs(planTabs, dateiTabs) {
  const imPlan = FACHSPRACHE_TABS.filter((n) => planTabs?.[n]);
  if (imPlan.length) {
    const fehlt = FACHSPRACHE_TABS.filter((n) => !planTabs[n]);
    if (fehlt.length) throw new Error(`Fachsprache: In der Plan-Excel fehlen die Tabs ${fehlt.map((n) => `"${n}"`).join(", ")}.`);
    return { tabs: planTabs, quelle: "plan" };
  }
  if (!dateiTabs) {
    throw new Error("Fachsprache: Die Tabs Einheit, Wörter, Fragen und Sätze stehen nicht in der Plan-Excel; --fachsprache-datei <pfad.xlsx> angeben.");
  }
  const fehlt = FACHSPRACHE_TABS.filter((n) => !dateiTabs[n]);
  if (fehlt.length) throw new Error(`Fachsprache: In der Fachsprache-Datei fehlen die Tabs ${fehlt.map((n) => `"${n}"`).join(", ")}.`);
  return { tabs: dateiTabs, quelle: "datei" };
}

const text = (wert) => (wert ?? "").trim();
const leer = (z, spalten) => spalten.every((s) => !text(z[s]));

/** "3", "3.0", "3,0" -> 3; sonst null. */
function ganzeZahl(wert) {
  const m = /^(\d+)(?:[.,]0+)?$/.exec(text(wert));
  return m ? Number(m[1]) : null;
}

/**
 * @param fsTabs   { Einheit, Wörter, Fragen, Sätze } (Zeilen-Objekte aus xlsx.mjs)
 * @param plan     Ergebnis von erstellePlan (nutzt plan.termine, plan.kurse, plan.module)
 * @returns        { einheiten, meldungen } -- wirft einen Error mit allen Fehlern, einer je Zeile
 */
export function erstelleFachsprache(fsTabs, plan) {
  const fehler = [];
  const meldungen = [];
  const fehl = (t) => fehler.push(t);
  const ort = (tab, z) => `${tab}, Zeile ${z[ZEILE] ?? "?"}`;

  // ---------- Einheit ----------
  const einheitSpalten = ["Kennung", "Titel", "Dauer"];
  const einheiten = new Map();
  for (const z of fsTabs["Einheit"] ?? []) {
    if (leer(z, einheitSpalten)) continue;
    const kennung = text(z["Kennung"]);
    if (!kennung) {
      fehl(`Einheit, Zeile ${z[ZEILE]}: Kennung fehlt.`);
      continue;
    }
    if (einheiten.has(kennung)) {
      fehl(`Fachsprache ${kennung}: Kennung steht mehrfach im Tab Einheit (Zeilen ${einheiten.get(kennung).zeile} und ${z[ZEILE]}).`);
      continue;
    }
    const titel = text(z["Titel"]);
    if (!titel) fehl(`Fachsprache ${kennung}: Titel fehlt (${ort("Einheit", z)}).`);
    let dauer = null;
    if (text(z["Dauer"])) {
      dauer = ganzeZahl(z["Dauer"]);
      if (dauer === null || dauer < 1 || dauer > 60) {
        fehl(`Fachsprache ${kennung}: Dauer muss eine ganze Zahl von 1 bis 60 sein (${ort("Einheit", z)}).`);
        dauer = null;
      }
    }
    einheiten.set(kennung, { kennung, zeile: z[ZEILE], titel, dauer, wortkarten: [], quiz: [], saetze: [], gesehen: { woerter: 0, fragen: 0 } });
  }

  const holeEinheit = (tab, z, kennung) => {
    const e = einheiten.get(kennung);
    if (!e) fehl(`${tab} ${kennung}: Eintrag ohne Zeile im Tab Einheit (${ort(tab, z)}).`);
    return e;
  };

  // Nr: ganze Zahl ab 1, eindeutig je Kennung
  const nummern = new Map();
  const pruefeNr = (tab, z, kennung) => {
    const nr = ganzeZahl(z["Nr"]);
    if (nr === null || nr < 1) {
      fehl(`${tab} ${kennung}: Nr fehlt oder ist keine ganze Zahl ab 1 (${ort(tab, z)}).`);
      return null;
    }
    const schluessel = `${tab}|${kennung}|${nr}`;
    if (nummern.has(schluessel)) {
      fehl(`${tab} ${kennung}: Nr ${nr} steht doppelt (Zeilen ${nummern.get(schluessel)} und ${z[ZEILE]}).`);
      return null;
    }
    nummern.set(schluessel, z[ZEILE]);
    return nr;
  };

  // Bild + Bildbeschreibung -> { bild, bild_alt } (nur gesetzte Felder)
  const bildFelder = (tab, z, kennung, nr) => {
    const bild = text(z["Bild"]);
    const alt = text(z["Bildbeschreibung"]);
    const wo = `${tab} ${kennung} Nr ${nr}`;
    if (!bild) {
      if (alt) fehl(`${wo}: Bildbeschreibung ohne Bild (${ort(tab, z)}).`);
      return {};
    }
    if (!BILD_MUSTER.test(bild) || bild.includes("..")) {
      fehl(`${wo}: Bild „${bild}“ ungültig (nur Dateiname, PNG/JPG/WebP, keine Pfadanteile; ${ort(tab, z)}).`);
      return {};
    }
    if (!alt) {
      fehl(`${wo}: Bild ohne Bildbeschreibung (${ort(tab, z)}).`);
      return {};
    }
    return { bild, bild_alt: alt };
  };

  // ---------- Wörter ----------
  const wortSpalten = ["Kennung", "Nr", "Wort", "Erklärung", "Beispiel", "Bild", "Bildbeschreibung"];
  const woerter = [];
  for (const z of fsTabs["Wörter"] ?? []) {
    if (leer(z, wortSpalten)) continue;
    const kennung = text(z["Kennung"]);
    if (!kennung) {
      fehl(`Wörter, Zeile ${z[ZEILE]}: Kennung fehlt.`);
      continue;
    }
    const e = holeEinheit("Wörter", z, kennung);
    if (e) e.gesehen.woerter++;
    const nr = pruefeNr("Wörter", z, kennung);
    if (!e || nr === null) continue;
    const wort = text(z["Wort"]);
    const erklaerung = text(z["Erklärung"]);
    const beispiel = text(z["Beispiel"]);
    if (!wort || !erklaerung || !beispiel) {
      fehl(`Wörter ${kennung} Nr ${nr}: Wort, Erklärung oder Beispiel leer (${ort("Wörter", z)}).`);
      continue;
    }
    woerter.push({ e, nr, karte: { wort, erklaerung, beispiel, ...bildFelder("Wörter", z, kennung, nr) } });
  }

  // ---------- Fragen ----------
  const frageSpalten = ["Kennung", "Nr", "Frage", "Antwort A", "Antwort B", "Antwort C", "Antwort D", "Richtig", "Erklärung", "Bild", "Bildbeschreibung"];
  const fragen = [];
  for (const z of fsTabs["Fragen"] ?? []) {
    if (leer(z, frageSpalten)) continue;
    const kennung = text(z["Kennung"]);
    if (!kennung) {
      fehl(`Fragen, Zeile ${z[ZEILE]}: Kennung fehlt.`);
      continue;
    }
    const e = holeEinheit("Fragen", z, kennung);
    if (e) e.gesehen.fragen++;
    const nr = pruefeNr("Fragen", z, kennung);
    if (!e || nr === null) continue;
    const wo = `Fragen ${kennung} Nr ${nr}`;
    const frage = text(z["Frage"]);
    const erklaerung = text(z["Erklärung"]);
    if (!frage || !erklaerung) {
      fehl(`${wo}: Frage oder Erklärung leer (${ort("Fragen", z)}).`);
      continue;
    }
    // A–D müssen fortlaufend gefüllt sein, mindestens A und B
    const felder = BUCHSTABEN.map((b) => text(z[`Antwort ${b}`]));
    const gefuellt = felder.filter(Boolean).length;
    const fortlaufend = felder.every((w, i) => (i < gefuellt ? w : !w));
    if (gefuellt < 2 || !fortlaufend) {
      fehl(`${wo}: mindestens 2 Antworten, ohne Lücke (A, B, dann C, dann D; ${ort("Fragen", z)}).`);
      continue;
    }
    const antworten = felder.slice(0, gefuellt);
    if (new Set(antworten).size !== antworten.length) {
      fehl(`${wo}: doppelte Antworten (${ort("Fragen", z)}).`);
      continue;
    }
    const buchstabe = text(z["Richtig"]).toUpperCase();
    const richtig = BUCHSTABEN.indexOf(buchstabe);
    if (richtig < 0 || richtig >= gefuellt) {
      fehl(`${wo}: Richtig muss A, B, C oder D sein und auf eine gefüllte Antwort zeigen (${ort("Fragen", z)}).`);
      continue;
    }
    fragen.push({ e, nr, frage: { frage, antworten, richtig, erklaerung, ...bildFelder("Fragen", z, kennung, nr) } });
  }

  // ---------- Sätze ----------
  const saetze = [];
  for (const z of fsTabs["Sätze"] ?? []) {
    if (leer(z, ["Kennung", "Nr", "Satz"])) continue;
    const kennung = text(z["Kennung"]);
    if (!kennung) {
      fehl(`Sätze, Zeile ${z[ZEILE]}: Kennung fehlt.`);
      continue;
    }
    const e = holeEinheit("Sätze", z, kennung);
    const nr = pruefeNr("Sätze", z, kennung);
    if (!e || nr === null) continue;
    const satz = text(z["Satz"]);
    if (!satz) {
      fehl(`Sätze ${kennung} Nr ${nr}: Satz leer (${ort("Sätze", z)}).`);
      continue;
    }
    saetze.push({ e, nr, satz });
  }

  // Nach Nr sortiert einsetzen; Nr müssen je Kennung lückenlos ab 1 laufen
  const einsetzen = (liste, feld, rein, tab) => {
    for (const e of einheiten.values()) {
      const eigene = liste.filter((x) => x.e === e).sort((a, b) => a.nr - b.nr);
      const luecke = eigene.findIndex((x, i) => x.nr !== i + 1);
      if (luecke >= 0) fehl(`${tab} ${e.kennung}: Nr müssen lückenlos ab 1 laufen (erwartet ${luecke + 1}, gefunden ${eigene[luecke].nr}).`);
      for (const x of eigene) e[feld].push(rein(x));
    }
  };
  einsetzen(woerter, "wortkarten", (x) => x.karte, "Wörter");
  einsetzen(fragen, "quiz", (x) => x.frage, "Fragen");
  einsetzen(saetze, "saetze", (x) => x.satz, "Sätze");

  for (const e of einheiten.values()) {
    // nur melden, wenn gar keine Zeile da ist (fehlerhafte Zeilen sind oben schon gemeldet)
    if (!e.gesehen.woerter) fehl(`Fachsprache ${e.kennung}: mindestens 1 Wort nötig.`);
    if (!e.gesehen.fragen) fehl(`Fachsprache ${e.kennung}: mindestens 1 Frage nötig.`);
  }

  // ---------- Kennung -> Termin -> Kurs; gleiche Lektion zusammenfassen ----------
  const termine = new Map((plan.termine ?? []).map((t) => [t.kennung, t]));
  const kurse = new Map((plan.kurse ?? []).map((k) => [k.schluessel, k]));
  const modulReihenfolge = new Map((plan.module ?? []).map((m) => [m.modul, m.reihenfolge]));
  const nachKurs = new Map();
  for (const e of einheiten.values()) {
    const t = termine.get(e.kennung);
    if (!t) {
      fehl(`Fachsprache ${e.kennung}: Termin nicht im Tab Stundenplan (oder ohne Datum bzw. außerhalb der importierten Module).`);
      continue;
    }
    if (t.art !== "kurs") {
      fehl(`Fachsprache ${e.kennung}: Der Termin hat keine Lektion (Art „${t.art}“); nur Theorie-Termine mit Kurs sind möglich.`);
      continue;
    }
    const k = kurse.get(t.kurs);
    if (!k) {
      fehl(`Fachsprache ${e.kennung}: Kurs „${t.kurs}“ des Termins steht nicht im Plan.`);
      continue;
    }
    const inhalt = { wortkarten: e.wortkarten, quiz: e.quiz, saetze: e.saetze };
    const eintrag = { kennungen: [e.kennung], kurs: k.schluessel, kursName: k.name, modul: k.modul, modulReihenfolge: modulReihenfolge.get(k.modul), woche: k.woche, titel: e.titel, dauer: e.dauer, inhalt };
    const bisher = nachKurs.get(k.schluessel);
    if (!bisher) {
      nachKurs.set(k.schluessel, eintrag);
    } else if (JSON.stringify([bisher.titel, bisher.dauer, bisher.inhalt]) === JSON.stringify([eintrag.titel, eintrag.dauer, eintrag.inhalt])) {
      bisher.kennungen.push(e.kennung);
      meldungen.push({ art: "fachsprache", text: `Fachsprache ${bisher.kennungen.join(" und ")}: gleicher Kurs „${k.name}“, gleicher Inhalt, wird einmal importiert.` });
    } else {
      fehl(`Fachsprache ${bisher.kennungen[0]} und ${e.kennung}: dieselbe Lektion (Kurs „${k.name}“), aber unterschiedlicher Inhalt. Eine Einheit je Kurs.`);
    }
  }

  if (fehler.length) {
    throw new Error(`${fehler.length} Fehler in den Fachsprache-Tabs:\n  - ${fehler.join("\n  - ")}`);
  }
  return { einheiten: [...nachKurs.values()], meldungen };
}
