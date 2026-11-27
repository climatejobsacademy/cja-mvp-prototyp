// Tests für YouTube-Videos in Lektionen (SR-102). Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { einbettAdresse, startSekunden, youtubeId } from "./youtube.ts";

const ID = "dQw4w9WgXcQ";

test("SR-102: YouTube: Kennung aus den üblichen Adressen", () => {
  for (const url of [
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=42`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}?si=abc`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube-nocookie.com/embed/${ID}`,
  ]) {
    assert.equal(youtubeId(url), ID, url);
  }
});

test("SR-102: YouTube: keine Kennung bei fremden Seiten, http, Kanälen oder kaputten Adressen", () => {
  for (const url of [
    `http://www.youtube.com/watch?v=${ID}`,
    `https://www.youtube.com.evil.example/watch?v=${ID}`,
    "https://www.youtube.com/@kanal",
    "https://www.youtube.com/watch?v=zu-kurz",
    "https://example.com/video.mp4",
    "kein link",
    "",
    null,
  ]) {
    assert.equal(youtubeId(url), null, String(url));
  }
});

test("SR-102: YouTube: Startzeit aus t oder start", () => {
  assert.equal(startSekunden(`https://youtu.be/${ID}?t=90`), 90);
  assert.equal(startSekunden(`https://youtu.be/${ID}?t=1m30s`), 90);
  assert.equal(startSekunden(`https://www.youtube.com/watch?v=${ID}&start=12`), 12);
  assert.equal(startSekunden(`https://youtu.be/${ID}`), null);
  assert.equal(startSekunden(`https://youtu.be/${ID}?t=abc`), null);
});

test("SR-102: YouTube: Player nur über youtube-nocookie, Untertitel an, deutsch, ohne fremde Vorschläge", () => {
  const url = new URL(einbettAdresse(ID, 90));
  assert.equal(url.origin, "https://www.youtube-nocookie.com");
  assert.equal(url.pathname, `/embed/${ID}`);
  assert.equal(url.searchParams.get("cc_load_policy"), "1");
  assert.equal(url.searchParams.get("cc_lang_pref"), "de");
  assert.equal(url.searchParams.get("rel"), "0");
  assert.equal(url.searchParams.get("start"), "90");
  assert.equal(new URL(einbettAdresse(ID)).searchParams.get("start"), null);
});
