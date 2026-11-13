// SR-68: Zuordnungsliste der Hilfsunterlagen je Praxisaufgabe.
import { test } from "node:test";
import assert from "node:assert/strict";

import { leseZuordnung, mimeTyp, objektName } from "./eingabe.mjs";

const KOPF = "aufgabe_titel;reihenfolge;titel;datei;link\n";

test("SR-68: Objektname ohne Umlaute, Leerzeichen und Großbuchstaben", () => {
  assert.equal(objektName("Datenblatt Schütz Ä1.PDF"), "praxis-hilfen/datenblatt-schuetz-ae1.pdf");
  assert.equal(objektName("foto.JPEG"), "praxis-hilfen/foto.jpg");
  assert.throws(() => objektName("paket.zip"));
});

test("SR-68: Ordner/Datei, gleiche Namen in verschiedenen Ordnern bleiben getrennt", () => {
  assert.equal(objektName("07_Ausschaltung mit Steckdose/Übersichtsschaltplan.png"), "praxis-hilfen/07-ausschaltung-mit-steckdose/uebersichtsschaltplan.png");
  assert.equal(objektName("a\\b\\Plan.pdf"), "praxis-hilfen/a/b/plan.pdf");
  assert.notEqual(objektName("07/Plan.png"), objektName("08/Plan.png"));
  for (const falsch of ["../geheim.pdf", "/abs/plan.pdf", "a//b.pdf", "a/./b.pdf", "a/b/", "!!!/b.pdf"]) {
    assert.throws(() => objektName(falsch), undefined, falsch);
  }
});

test("SR-68: Liste mit Ordnerpfad, angezeigt wird nur der Dateiname", () => {
  const { eintraege, fehler } = leseZuordnung(KOPF + '"A";1;"Plan";"07_Ausschaltung\\Plan.PDF";\n"A";2;"x";"../x.pdf";\n');
  assert.equal(fehler.length, 1);
  assert.equal(eintraege[0].datei, "07_Ausschaltung/Plan.PDF");
  assert.equal(eintraege[0].anzeige, "Plan.PDF");
  assert.equal(eintraege[0].objekt, "praxis-hilfen/07-ausschaltung/plan.pdf");
  assert.equal(eintraege[1].datei, null);
});

test("SR-68: MIME-Typ nur für erlaubte Formate", () => {
  assert.equal(mimeTyp("a.pdf"), "application/pdf");
  assert.equal(mimeTyp("a.svg"), null);
});

test("SR-68: gültige Liste mit Datei und Link", () => {
  const { eintraege, fehler } = leseZuordnung(
    KOPF + '"Errichten";1;"Datenblatt";"Datenblatt.pdf";\n"Errichten";2;"Video";;"https://example.test/v"\n'
  );
  assert.deepEqual(fehler, []);
  assert.equal(eintraege.length, 2);
  assert.equal(eintraege[0].objekt, "praxis-hilfen/datenblatt.pdf");
  assert.equal(eintraege[1].link, "https://example.test/v");
});

test("SR-68: Fehler je Zeile", () => {
  const { fehler } = leseZuordnung(
    KOPF +
      '"A";1;"T";"a.pdf";"https://x.test"\n' + // beides
      '"A";1;"T";"b.pdf";\n' + // Reihenfolge doppelt
      '"A";0;"";"";"http://x.test"\n' // reihenfolge, titel, http
  );
  assert.equal(fehler.length, 5);
});

test("SR-68: fehlende Spalten", () => {
  assert.match(leseZuordnung("aufgabe_titel;titel\n").fehler[0], /Spalten fehlen/);
});
