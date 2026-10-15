// Tests für das Lesen von Elephant-Kursen. Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";
import { zipSync, strToU8 } from "fflate";

// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { begruessungKuerzen, eintragLesen, htmlLesen, htmlText, istElephantPaket, istErlaubtesMedium, kursAufbauen, kursMedien, medienPfad, verzeichnisLage, verzeichnisLesen, KURS_ORDNER } from "./elephant-kurs.ts";

const L = (werte: Record<string, unknown>) => ({ localizations: { de_DE: werte, metadata: { masterLanguageCode: "de_DE" } } });

test("htmlLesen: erlaubte Tags bleiben, Rest fällt weg, Text bleibt", () => {
  const k = htmlLesen('<h2>Titel &amp; mehr</h2><p>Ein <b>fetter</b> <a href="x">Link</a><img data-giphy-id="1"></p><script>alert(1)</script>');
  assert.deepEqual(k, [
    { tag: "h2", kinder: ["Titel & mehr"] },
    { tag: "p", kinder: ["Ein ", { tag: "strong", kinder: ["fetter"] }, " Link"] },
    "alert(1)",
  ]);
  assert.equal(htmlText(k), "Titel & mehr Ein fetter Link alert(1)");
});

test("htmlLesen: leere Absätze verschwinden, kaputtes HTML stürzt nicht ab", () => {
  assert.deepEqual(htmlLesen("<p></p><p>a < b</p><ul><li>x"), [{ tag: "p", kinder: ["a < b"] }, { tag: "ul", kinder: [{ tag: "li", kinder: ["x"] }] }]);
});

test("medienPfad: nur Medienordner, kein Ausbrechen", () => {
  assert.equal(medienPfad("images/a.jpg"), "assets/images/a.jpg");
  assert.equal(medienPfad("tts/x/y.mp3"), "assets/tts/x/y.mp3");
  assert.equal(medienPfad("../main.dart.js"), null);
  assert.equal(medienPfad("images/../../x"), null);
  assert.equal(medienPfad(""), null);
  assert.equal(istErlaubtesMedium("assets/images/a.jpg"), true);
  assert.equal(istErlaubtesMedium("main.dart.js"), false);
  assert.equal(istErlaubtesMedium("assets/assets/scorm_test_data/course.json"), false);
});

test("kursAufbauen: Reihenfolge, Bausteinarten, Übersprungenes", () => {
  const kurs = { course_name: "K", data: L({ name: "Kurs", description: "Beschreibung" }) };
  const lektionen = [
    { lesson_id: "b", sort_index: 1, data: L({ name: " Zwei " }) },
    { lesson_id: "a", sort_index: 0, data: L({ name: "Eins" }) },
    { lesson_id: "leer", sort_index: 2, data: L({ name: "Leer" }) },
  ];
  const lp = [
    [
      { lesson_id: "a", module_id: "m2", sort_index: 1, module_type: "swipe", data: { correctSwipeChoice: false, ...L({ questionText: "Aussage", imageFilePath: "images/s.jpg", markupExplanation: "<p>Weil</p>" }) } },
      { lesson_id: "a", module_id: "m1", sort_index: 0, module_type: "page", data: L({ markupContent: "<h1>Hallo</h1>", audioFilePath: "tts/1/a.mp3" }) },
    ],
    { lesson_id: "b", module_id: "m3", sort_index: 0, module_type: "neuerTyp", data: {} },
    {
      lesson_id: "b",
      module_id: "m4",
      sort_index: 1,
      module_type: "multipleChoice",
      data: { options: [{ ...L({ text: "ja" }), isCorrectOption: true }, { ...L({ text: "nein" }), isCorrectOption: false }], ...L({ questionText: "Frage?", markupExplanation: "" }) },
    },
    {
      lesson_id: "b",
      module_id: "m5",
      sort_index: 2,
      module_type: "flashcards",
      data: { cards: [{ type: "text-and-image", sortIndex: 1, ...L({ markupContent: "<p>Text</p>", imageFilePath: "images/k.jpg" }) }, { type: "title", sortIndex: 0, ...L({ title: "Start" }) }] },
    },
  ];
  const k = kursAufbauen(kurs, lektionen, lp);
  assert.equal(k.titel, "Kurs");
  assert.deepEqual(k.kapitel.map((x) => x.titel), ["Eins", "Zwei"]);
  assert.deepEqual(k.kapitel[0].bausteine.map((b) => b.art), ["seite", "wischen"]);
  assert.deepEqual(k.kapitel[1].bausteine.map((b) => b.art), ["auswahl", "karte", "karte"]);
  const wischen = k.kapitel[0].bausteine[1];
  assert.equal(wischen.art === "wischen" && wischen.stimmt, false);
  const karten = k.kapitel[1].bausteine.slice(1);
  assert.equal(karten[0].art === "karte" && karten[0].titel, "Start");
  assert.deepEqual(k.uebersprungen, ["neuerTyp"]);
  assert.deepEqual([...kursMedien(k)].sort(), ["assets/images/k.jpg", "assets/images/s.jpg", "assets/tts/1/a.mp3"]);
});

test("Zip: Verzeichnis und Einträge stückweise lesen", async () => {
  const zip = zipSync(
    {
      [`${KURS_ORDNER}course.json`]: strToU8('{"a":1}'),
      "assets/images/x.jpg": [new Uint8Array([1, 2, 3, 4]), { level: 0 }],
      "gross.txt": strToU8("x".repeat(5000)),
    },
    { level: 6 }
  );
  const geleseneBytes: number[] = [];
  const lies = async (start: number, laenge: number) => {
    geleseneBytes.push(laenge);
    return zip.slice(start, Math.min(zip.length, start + laenge));
  };
  const ende = await lies(Math.max(0, zip.length - 1000), 1000);
  const lage = verzeichnisLage(ende);
  const eintraege = verzeichnisLesen(await lies(lage.offset, lage.groesse));
  assert.equal(istElephantPaket(eintraege.map((e) => e.name)), true);
  const nachName = new Map(eintraege.map((e) => [e.name, e]));
  assert.equal(new TextDecoder().decode(await eintragLesen(lies, nachName.get(`${KURS_ORDNER}course.json`)!)), '{"a":1}');
  assert.deepEqual([...(await eintragLesen(lies, nachName.get("assets/images/x.jpg")!))], [1, 2, 3, 4]);
  assert.equal((await eintragLesen(lies, nachName.get("gross.txt")!)).length, 5000);
});

test("begruessungKuerzen: Willkommen-Überschrift und Willkommen-Karte fallen weg", () => {
  const kurs = {
    titel: "K",
    beschreibung: "",
    uebersprungen: [],
    kapitel: [
      {
        id: "a",
        titel: "Einführung",
        bausteine: [
          { art: "seite" as const, id: "1", audio: null, html: htmlLesen("<h1>Willkommen zum Wechselstromkreis-Kurs</h1><p>Hey du!</p>") },
          { art: "karte" as const, id: "2", titel: "Willkommen zum Kurs", html: [], bild: null, audio: null },
          { art: "seite" as const, id: "3", audio: null, html: htmlLesen("<h1>Los geht's</h1><p>Text</p>") },
          { art: "seite" as const, id: "4", audio: null, html: htmlLesen("<h1>Willkommen später</h1>") },
        ],
      },
    ],
  };
  const k = begruessungKuerzen(kurs);
  assert.deepEqual(k.kapitel[0].bausteine.map((b) => b.id), ["1", "3", "4"]);
  const erste = k.kapitel[0].bausteine[0];
  assert.deepEqual(erste.art === "seite" && erste.html, [{ tag: "p", kinder: ["Hey du!"] }]);
});
