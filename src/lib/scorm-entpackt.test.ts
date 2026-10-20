// Tests für das Pfad-Schema ausgepackter SCORM-Medien (SR-50, SR-85, 0055).
// Ausführen mit `npm test` (node:test, Node 24 führt .ts direkt aus).

import assert from "node:assert/strict";
import { test } from "node:test";

// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { entpacktPfad, entpackterInnererPfad } from "./scorm-entpackt.ts";

test("entpacktPfad: <storage_pfad>.entpackt/<innerer Pfad>", () => {
  assert.equal(entpacktPfad("x/paket.zip", "assets/images/a.jpg"), "x/paket.zip.entpackt/assets/images/a.jpg");
  assert.equal(entpacktPfad("paket.zip", "assets/videos/v.mp4"), "paket.zip.entpackt/assets/videos/v.mp4");
});

test("entpacktPfad: WAV liegt umgewandelt als M4A", () => {
  assert.equal(entpacktPfad("x/paket.zip", "assets/audio/u/u.wav"), "x/paket.zip.entpackt/assets/audio/u/u.m4a");
  assert.equal(entpackterInnererPfad("assets/tts/t.WAV"), "assets/tts/t.m4a");
  assert.equal(entpackterInnererPfad("assets/audio/a.flac"), "assets/audio/a.m4a");
});

test("entpacktPfad: MP3, M4A, Bilder und Video bleiben unverändert", () => {
  for (const p of ["assets/audio/a.mp3", "assets/audio/a.m4a", "assets/images/b.png", "assets/videos/v.mp4"]) {
    assert.equal(entpackterInnererPfad(p), p);
  }
});

test("entpackterInnererPfad: Punkt nur im Ordnernamen ist keine Endung", () => {
  assert.equal(entpackterInnererPfad("assets/audio.wav/datei"), "assets/audio.wav/datei");
  assert.equal(entpackterInnererPfad("assets/audio/ohne-endung"), "assets/audio/ohne-endung");
});
