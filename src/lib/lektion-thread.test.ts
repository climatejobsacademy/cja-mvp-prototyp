// Tests für die Helfer des Fragen-Threads. Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { MAX_ZEICHEN, beitraegeGruppieren, beitragNormalisieren, beitragPruefen, zeichenAnzahl } from "./lektion-thread.ts";

test("zeichenAnzahl zählt wie Postgres char_length (Codepoints)", () => {
  assert.equal(zeichenAnzahl(""), 0);
  assert.equal(zeichenAnzahl("a"), 1);
  assert.equal(zeichenAnzahl("ä"), 1);
  assert.equal(zeichenAnzahl("🙂"), 1);
  assert.equal(zeichenAnzahl("👍🏽"), 2);
  assert.equal(zeichenAnzahl("🇩🇪"), 2);
  assert.equal(zeichenAnzahl("👨‍👩‍👧"), 5);
  assert.equal(zeichenAnzahl("❤️"), 2);
  assert.equal(zeichenAnzahl("Zeile 1\nZeile 2"), 15);
});

test("beitragNormalisieren: NFC und Leerraum am Rand entfernen", () => {
  assert.equal(beitragNormalisieren("  Hallo \n"), "Hallo");
  assert.equal(beitragNormalisieren("ä"), "ä");
  assert.equal(zeichenAnzahl(beitragNormalisieren("ä")), 1);
  assert.equal(beitragNormalisieren("Zeile 1\n\nZeile 2"), "Zeile 1\n\nZeile 2");
});

test("beitragPruefen: leer, nur Leerraum, Grenze 1000", () => {
  assert.deepEqual(beitragPruefen(""), { ok: false, fehler: "leer" });
  assert.deepEqual(beitragPruefen("   \n\t "), { ok: false, fehler: "leer" });
  assert.deepEqual(beitragPruefen("x".repeat(MAX_ZEICHEN)), { ok: true, text: "x".repeat(1000) });
  assert.deepEqual(beitragPruefen("x".repeat(1001)), { ok: false, fehler: "zu_lang" });
  assert.deepEqual(beitragPruefen("  " + "x".repeat(1000) + "  "), { ok: true, text: "x".repeat(1000) });
});

test("beitragPruefen: Smileys zählen wie in der Datenbank", () => {
  assert.equal(beitragPruefen("🙂".repeat(1000)).ok, true);
  assert.equal(beitragPruefen("🙂".repeat(1001)).ok, false);
  assert.equal(beitragPruefen("👨‍👩‍👧".repeat(200)).ok, true);
  assert.equal(beitragPruefen("👨‍👩‍👧".repeat(201)).ok, false);
});

const b = (id: string, created_at: string, parent_id: string | null = null) => ({
  id,
  created_at,
  parent_id,
  person_id: null,
  autor_anzeigename: null,
  text: id,
  geloescht_am: null,
});

test("beitraegeGruppieren: Fragen chronologisch, Antworten darunter", () => {
  const g = beitraegeGruppieren([
    b("antwort-2", "2026-10-07T10:05:00Z", "frage-1"),
    b("frage-2", "2026-10-07T10:02:00Z"),
    b("frage-1", "2026-10-07T10:00:00Z"),
    b("antwort-1", "2026-10-07T10:01:00Z", "frage-1"),
  ]);
  assert.deepEqual(g.map((e) => e.id), ["frage-1", "frage-2"]);
  assert.deepEqual(g[0].antworten.map((a) => a.id), ["antwort-1", "antwort-2"]);
  assert.deepEqual(g[1].antworten, []);
});

test("beitraegeGruppieren: Antwort ohne geladene Frage bleibt sichtbar", () => {
  const g = beitraegeGruppieren([b("antwort", "2026-10-07T10:01:00Z", "fehlt"), b("frage", "2026-10-07T10:00:00Z")]);
  assert.deepEqual(g.map((e) => e.id), ["frage", "antwort"]);
});
