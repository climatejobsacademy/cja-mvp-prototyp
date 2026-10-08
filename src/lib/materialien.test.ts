// Tests für die Lernmaterial-Helfer. Ausführen mit `npm test` (node:test,
// Node 24 führt .ts direkt aus).

import assert from "node:assert/strict";
import { test } from "node:test";

// Node braucht die Endung .ts zum Auflösen; tsc (TS5097) erlaubt sie nur mit
// allowImportingTsExtensions. Statt tsconfig.json global zu ändern, nur hier.
// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { dateinameAusPfad, formatBezeichnung, groesseFormatieren, hatVorschau, istSichererLink } from "./materialien.ts";

test("dateinameAusPfad: letztes Segment des Storage-Pfads", () => {
  assert.equal(dateinameAusPfad("test-a-oe.pdf"), "test-a-oe.pdf");
  assert.equal(dateinameAusPfad("modul-2/uebung-loeten.pptx"), "uebung-loeten.pptx");
  assert.equal(dateinameAusPfad("test//test-a-oe.pdf"), "test-a-oe.pdf");
  assert.equal(dateinameAusPfad("ordner/"), "ordner");
  assert.equal(dateinameAusPfad(""), "");
});

test("formatBezeichnung: erlaubte MIME-Typen", () => {
  assert.equal(formatBezeichnung("application/pdf", "a.pdf"), "PDF");
  assert.equal(formatBezeichnung("image/png", "a.png"), "PNG");
  assert.equal(formatBezeichnung("image/jpeg", "a.jpg"), "JPEG");
  assert.equal(formatBezeichnung("image/webp", "a.webp"), "WebP");
  assert.equal(
    formatBezeichnung("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "a.docx"),
    "Word (DOCX)"
  );
  assert.equal(
    formatBezeichnung("application/vnd.openxmlformats-officedocument.presentationml.presentation", "a.pptx"),
    "PowerPoint (PPTX)"
  );
  assert.equal(
    formatBezeichnung("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "a.xlsx"),
    "Excel (XLSX)"
  );
});

test("formatBezeichnung: Rückfall auf Endung bzw. 'Datei'", () => {
  assert.equal(formatBezeichnung(null, "liste.csv"), "CSV");
  assert.equal(formatBezeichnung("application/octet-stream", "plan.dwg"), "DWG");
  assert.equal(formatBezeichnung(null, "ohne-endung"), "Datei");
  assert.equal(formatBezeichnung(null, ".versteckt"), "Datei");
  assert.equal(formatBezeichnung(null, "punkt-am-ende."), "Datei");
});

test("groesseFormatieren: Bytes, KB, MB in deutscher Schreibweise", () => {
  assert.equal(groesseFormatieren(0), "0 B");
  assert.equal(groesseFormatieren(512), "512 B");
  assert.equal(groesseFormatieren(1024), "1 KB");
  assert.equal(groesseFormatieren(1100), "1 KB");
  assert.equal(groesseFormatieren(97332), "95 KB");
  assert.equal(groesseFormatieren(1024 * 1024), "1 MB");
  assert.equal(groesseFormatieren(1.25 * 1024 * 1024), "1,3 MB");
  assert.equal(groesseFormatieren(52428800), "50 MB");
});

test("groesseFormatieren: unbekannte Größe ergibt null", () => {
  assert.equal(groesseFormatieren(null), null);
  assert.equal(groesseFormatieren(undefined), null);
  assert.equal(groesseFormatieren(-1), null);
  assert.equal(groesseFormatieren(Number.NaN), null);
});

test("istSichererLink: nur https mit Host", () => {
  assert.equal(istSichererLink("https://example.com"), true);
  assert.equal(istSichererLink("https://www.youtube.com/watch?v=abc"), true);
  assert.equal(istSichererLink("http://example.com"), false);
  assert.equal(istSichererLink("HTTPS://example.com"), false);
  assert.equal(istSichererLink("javascript:alert(1)"), false);
  assert.equal(istSichererLink(" https://example.com"), false);
  assert.equal(istSichererLink("https://"), false);
  assert.equal(istSichererLink("ftp://example.com"), false);
  assert.equal(istSichererLink(""), false);
  assert.equal(istSichererLink(null), false);
  assert.equal(istSichererLink(undefined), false);
});

test("hatVorschau: PDF und Bilder ja, Office nein", () => {
  assert.equal(hatVorschau("application/pdf"), true);
  assert.equal(hatVorschau("image/png"), true);
  assert.equal(hatVorschau("image/jpeg"), true);
  assert.equal(hatVorschau("image/webp"), true);
  assert.equal(hatVorschau("application/vnd.openxmlformats-officedocument.wordprocessingml.document"), false);
  assert.equal(hatVorschau("image/svg+xml"), false);
  assert.equal(hatVorschau(null), false);
});
