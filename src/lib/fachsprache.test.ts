// Tests für die Fachsprache-Einheit (Stufe 2): Parser für inhalt, Lektion des
// Tages, Anzeige von Entwürfen. Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ENTWURF_BANNER,
  bildDateien,
  bildPfad,
  einheitAnzeige,
  einheitenDesTages,
  einheitenJeTag,
  liveLektionIds,
  parseInhalt,
  // @ts-expect-error TS5097: .ts-Endung für node:test nötig
} from "./fachsprache.ts";

const wort = (extra: Record<string, unknown> = {}) => ({
  wort: "Leitungsschutzschalter",
  erklaerung: "Schaltet bei Überlast ab.",
  beispiel: "Der Leitungsschutzschalter hat ausgelöst.",
  ...extra,
});
const frage = (extra: Record<string, unknown> = {}) => ({
  frage: "Was schützt die Leitung?",
  antworten: ["Der Leitungsschutzschalter", "Die Steckdose", "Der Schalter"],
  richtig: 0,
  erklaerung: "Er schaltet bei Überlast ab.",
  ...extra,
});
const inhalt = (extra: Record<string, unknown> = {}) => ({
  wortkarten: [wort()],
  quiz: [frage()],
  saetze: ["Ich prüfe den Leitungsschutzschalter."],
  ...extra,
});

// ---------- parseInhalt ----------

test("parseInhalt: gültiger Inhalt ohne Bilder", () => {
  const p = parseInhalt(inhalt());
  assert.ok(p);
  assert.equal(p.wortkarten[0].wort, "Leitungsschutzschalter");
  assert.equal(p.wortkarten[0].bild, null);
  assert.equal(p.quiz[0].richtig, 0);
  assert.deepEqual(p.saetze, ["Ich prüfe den Leitungsschutzschalter."]);
});

test("parseInhalt: Bild mit Alternativtext an Wortkarte und Frage", () => {
  const p = parseInhalt(
    inhalt({
      wortkarten: [wort({ bild: "ls-schalter.png", bild_alt: "Ein Leitungsschutzschalter im Verteiler" })],
      quiz: [frage({ bild: "Verteiler_01.JPG", bild_alt: "Verteiler" })],
    })
  );
  assert.ok(p);
  assert.deepEqual(p.wortkarten[0].bild, { datei: "ls-schalter.png", alt: "Ein Leitungsschutzschalter im Verteiler" });
  assert.deepEqual(p.quiz[0].bild, { datei: "Verteiler_01.JPG", alt: "Verteiler" });
});

test("parseInhalt: leere Sätze-Liste ist erlaubt (wie 0051)", () => {
  assert.ok(parseInhalt(inhalt({ saetze: [] })));
});

test("parseInhalt: kein Objekt, fehlende oder leere Listen → null", () => {
  for (const roh of [null, undefined, "x", 1, [], {}]) assert.equal(parseInhalt(roh), null, String(roh));
  assert.equal(parseInhalt(inhalt({ wortkarten: [] })), null);
  assert.equal(parseInhalt(inhalt({ quiz: [] })), null);
  assert.equal(parseInhalt(inhalt({ saetze: undefined })), null);
  assert.equal(parseInhalt(inhalt({ saetze: "Satz" })), null);
});

test("parseInhalt: Pflichttexte fehlen oder sind nur Leerraum → null", () => {
  assert.equal(parseInhalt(inhalt({ wortkarten: [wort({ wort: " " })] })), null);
  assert.equal(parseInhalt(inhalt({ wortkarten: [wort({ erklaerung: undefined })] })), null);
  assert.equal(parseInhalt(inhalt({ wortkarten: [wort({ beispiel: 3 })] })), null);
  assert.equal(parseInhalt(inhalt({ quiz: [frage({ frage: "" })] })), null);
  assert.equal(parseInhalt(inhalt({ quiz: [frage({ erklaerung: "  " })] })), null);
  assert.equal(parseInhalt(inhalt({ saetze: ["ok", " "] })), null);
});

test("parseInhalt: Antworten 2 bis 4, alle verschieden (nach Trimmen), nicht leer", () => {
  assert.equal(parseInhalt(inhalt({ quiz: [frage({ antworten: ["nur eine"] })] })), null);
  assert.equal(parseInhalt(inhalt({ quiz: [frage({ antworten: ["a", "b", "c", "d", "e"] })] })), null);
  assert.equal(parseInhalt(inhalt({ quiz: [frage({ antworten: ["a", " a "] })] })), null);
  assert.equal(parseInhalt(inhalt({ quiz: [frage({ antworten: ["a", ""] })] })), null);
  assert.equal(parseInhalt(inhalt({ quiz: [frage({ antworten: ["a", 2] })] })), null);
  assert.ok(parseInhalt(inhalt({ quiz: [frage({ antworten: ["a", "b"], richtig: 1 })] })));
  assert.ok(parseInhalt(inhalt({ quiz: [frage({ antworten: ["a", "b", "c", "d"], richtig: 3 })] })));
});

test("parseInhalt: richtig muss ganzzahliger Index innerhalb der Antworten sein", () => {
  for (const richtig of [-1, 3, 1.5, "0", null, undefined]) {
    assert.equal(parseInhalt(inhalt({ quiz: [frage({ richtig })] })), null, String(richtig));
  }
});

test("parseInhalt: Bildregeln wie 0051 (Dateiname, Endung, Alternativtext)", () => {
  const mitBild = (bild: unknown, bild_alt: unknown) => parseInhalt(inhalt({ wortkarten: [wort({ bild, bild_alt })] }));
  assert.equal(mitBild("bild.svg", "Alt"), null, "kein SVG");
  assert.equal(mitBild("ordner/bild.png", "Alt"), null, "keine Pfadanteile");
  assert.equal(mitBild("a..png", "Alt"), null, "kein ..");
  assert.equal(mitBild("-bild.png", "Alt"), null, "muss mit Buchstabe oder Ziffer beginnen");
  assert.equal(mitBild("bild mit leer.png", "Alt"), null, "keine Leerzeichen");
  assert.equal(mitBild("bild.png", undefined), null, "Alternativtext Pflicht");
  assert.equal(mitBild("bild.png", "  "), null, "Alternativtext nicht leer");
  assert.equal(mitBild(undefined, "Alt"), null, "kein Alternativtext ohne Bild");
  assert.equal(mitBild(3, "Alt"), null);
  assert.ok(mitBild("bild.webp", "Alt"));
  assert.ok(mitBild("bild.jpeg", "Alt"));
  assert.ok(mitBild(null, null), "null wie fehlend");
});

test("bildPfad und bildDateien: Pfad im Bucket, Dateien ohne Doppelte", () => {
  assert.equal(bildPfad("lektion-1", "a.png"), "lektion-1/a.png");
  const p = parseInhalt(
    inhalt({
      wortkarten: [wort({ bild: "a.png", bild_alt: "A" }), wort({ bild: "b.png", bild_alt: "B" }), wort()],
      quiz: [frage({ bild: "a.png", bild_alt: "A" })],
    })
  );
  assert.ok(p);
  assert.deepEqual(bildDateien(p), ["a.png", "b.png"]);
});

// ---------- Lektion des Tages ----------

const termin = (
  datum: string,
  lessonId: string | null,
  art: "live" | "asynchron" | "feld" = "live",
  start: string | null = "09:00"
) => ({
  datum,
  start,
  lessonId,
  art,
});
const einheit = (id: string, lessonId: string, status: "entwurf" | "veroeffentlicht" = "veroeffentlicht") => ({ id, lessonId, titel: `Einheit ${id}`, status });

test("einheitenJeTag: nur Live-Termine mit veröffentlichter Einheit", () => {
  const termine = [
    termin("2026-11-02", "live-a"),
    termin("2026-11-02", "selbst-a", "asynchron", null),
    termin("2026-11-03", "live-b"),
    termin("2026-11-04", null, "feld", null),
  ];
  const einheiten = [einheit("e1", "live-a"), einheit("e2", "live-b", "entwurf"), einheit("e3", "selbst-a")];
  const m = einheitenJeTag(termine, einheiten);
  assert.deepEqual([...m.keys()], ["2026-11-02"]);
  assert.deepEqual(m.get("2026-11-02"), [{ einheitId: "e1", lessonId: "live-a", titel: "Einheit e1" }]);
});

test("einheitenJeTag: mehrere Live-Termine an einem Tag nach Startzeit, Einheit je Tag nur einmal", () => {
  const termine = [
    termin("2026-11-02", "live-b", "live", "13:00"),
    termin("2026-11-02", "live-a", "live", "09:00"),
    termin("2026-11-02", "live-a", "live", "15:00"),
    termin("2026-11-03", "live-a", "live", null),
  ];
  const m = einheitenJeTag(termine, [einheit("e1", "live-a"), einheit("e2", "live-b")]);
  assert.deepEqual(m.get("2026-11-02")?.map((e) => e.einheitId), ["e1", "e2"]);
  assert.deepEqual(m.get("2026-11-03")?.map((e) => e.einheitId), ["e1"]);
});

test("einheitenDesTages: leer ohne Einheit oder ohne Live-Termin", () => {
  const termine = [termin("2026-11-02", "live-a"), termin("2026-11-05", "selbst-a", "asynchron")];
  const einheiten = [einheit("e1", "live-a"), einheit("e3", "selbst-a")];
  assert.equal(einheitenDesTages("2026-11-02", termine, einheiten).length, 1);
  assert.deepEqual(einheitenDesTages("2026-11-05", termine, einheiten), []);
  assert.deepEqual(einheitenDesTages("2026-11-09", termine, einheiten), []);
  assert.deepEqual(einheitenDesTages("2026-11-02", termine, []), []);
});

test("liveLektionIds: Lektionen der Live-Termine ohne Doppelte, ohne Selbstlernen und Feld", () => {
  const termine = [
    termin("2026-11-02", "live-a"),
    termin("2026-11-03", "live-a"),
    termin("2026-11-03", "live-b"),
    termin("2026-11-03", "selbst-a", "asynchron"),
    termin("2026-11-04", null, "feld"),
    termin("2026-11-04", null, "live"),
  ];
  assert.deepEqual(liveLektionIds(termine), ["live-a", "live-b"]);
});

// ---------- Anzeige ----------

test("einheitAnzeige: veröffentlicht für alle, Entwurf nur AfCJ admin mit Banner", () => {
  assert.deepEqual(einheitAnzeige("veroeffentlicht", false), { entwurf: false });
  assert.deepEqual(einheitAnzeige("veroeffentlicht", true), { entwurf: false });
  assert.deepEqual(einheitAnzeige("entwurf", true), { entwurf: true });
  assert.equal(einheitAnzeige("entwurf", false), null);
  assert.equal(ENTWURF_BANNER, "Entwurf, für Lernende nicht sichtbar");
});
