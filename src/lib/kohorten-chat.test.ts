// Tests für die Hilfsfunktionen des Kohorten-Chats (SR-83). Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { istKanal, KANAELE, kuerzel, nachrichtPruefen, vorschau } from "./kohorten-chat.ts";

test("nachrichtPruefen: wie der Check der Datenbank", () => {
  assert.deepEqual(nachrichtPruefen("  Hallo  "), { ok: true, text: "Hallo" });
  assert.deepEqual(nachrichtPruefen("   "), { ok: false, fehler: "leer" });
  assert.deepEqual(nachrichtPruefen("x".repeat(1001)), { ok: false, fehler: "zu_lang" });
  assert.equal(nachrichtPruefen("☕".repeat(1000)).ok, true);
});

test("kuerzel: Initialen aus dem Anzeigenamen", () => {
  assert.equal(kuerzel("Lea M."), "LM");
  assert.equal(kuerzel("Cem"), "C");
  assert.equal(kuerzel(null), "?");
});

test("vorschau: kürzt lange Nachrichten", () => {
  assert.equal(vorschau("Lea M.", "Hi"), "Lea M.: Hi");
  assert.equal([...vorschau("Lea M.", "x".repeat(100))].length, 60);
  assert.ok(vorschau("Lea M.", "x".repeat(100)).endsWith("…"));
});

test("Kanäle: genau Ankündigungen und Treffpunkt", () => {
  assert.deepEqual(KANAELE.map((k) => k.kanal), ["ankuendigungen", "treffpunkt"]);
  assert.equal(istKanal("treffpunkt"), true);
  assert.equal(istKanal("modul-1"), false);
});
