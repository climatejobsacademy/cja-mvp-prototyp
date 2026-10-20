// Tests für das Lesen von Elephant-Paketen und die Umwandlung in einen
// Lernkurs (SR-85). Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";
import { zipSync, strToU8 } from "fflate";

import {
  datenBeginn,
  eintragLesen,
  elephantZuLernkurs,
  htmlLesen,
  istElephantPaket,
  istErlaubtesMedium,
  medienPfad,
  verzeichnisLage,
  verzeichnisLesen,
  KURS_ORDNER,
  // @ts-expect-error TS5097: .ts-Endung für node:test nötig
} from "./elephant-kurs.ts";
// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { kursMedien, schrittBilder, schrittFrage, textInhalt, type Schritt } from "./lernkurs.ts";

const L = (werte: Record<string, unknown>) => ({ localizations: { de_DE: werte, metadata: { masterLanguageCode: "de_DE" } } });
const arten = (s: Schritt) => s.bausteine.map((b) => b.art);

test("htmlLesen: erlaubte Tags bleiben, Rest fällt weg, Text bleibt", () => {
  const k = htmlLesen('<h2>Titel &amp; mehr</h2><p>Ein <b>fetter</b> <a href="x">Link</a><img data-giphy-id="1"></p><script>alert(1)</script>');
  assert.deepEqual(k, [
    { tag: "h2", kinder: ["Titel & mehr"] },
    { tag: "p", kinder: ["Ein ", { tag: "strong", kinder: ["fetter"] }, " Link"] },
    "alert(1)",
  ]);
  assert.equal(textInhalt(k), "Titel & mehr Ein fetter Link alert(1)");
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

test("elephantZuLernkurs: Reihenfolge, Umwandlung der Modularten, Übersprungenes", () => {
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
      { lesson_id: "a", module_id: "m0", sort_index: 2, module_type: "page", is_published: false, data: L({ markupContent: "<p>Entwurf</p>" }) },
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
    { lesson_id: "b", module_id: "m6", sort_index: 3, module_type: "video", data: L({ assetName: "videos/v.mp4", thumbnailFilePath: "images/v.jpg" }) },
    {
      lesson_id: "b",
      module_id: "m7",
      sort_index: 4,
      module_type: "imagePicker",
      data: { imageOptions: [{ ...L({ imageFilePath: "images/p1.png" }), isCorrectOption: true }, { ...L({ imageFilePath: "../boese" }) }], ...L({ questionText: "Welches?" }) },
    },
  ];
  const { kurs: k, uebersprungen } = elephantZuLernkurs(kurs, lektionen, lp);
  assert.equal(k.titel, "Kurs");
  assert.equal(k.beschreibung, "Beschreibung");
  assert.deepEqual(k.kapitel.map((x) => x.titel), ["Eins", "Zwei"]);
  assert.deepEqual(k.kapitel[0].schritte.map(arten), [["audio", "text"], ["bild", "frage"]]);
  assert.deepEqual(k.kapitel[1].schritte.map(arten), [["frage"], ["ueberschrift"], ["bild", "text"], ["video"], ["frage"]]);
  assert.deepEqual(uebersprungen, ["neuerTyp"]);

  const wischen = schrittFrage(k.kapitel[0].schritte[1]);
  assert.equal(wischen?.darstellung, "paar");
  assert.deepEqual(
    wischen?.antworten.map((a) => [a.text, a.richtig]),
    [["Stimmt nicht", true], ["Stimmt", false]]
  );
  const auswahl = schrittFrage(k.kapitel[1].schritte[0]);
  assert.equal(auswahl?.frage, "Frage?");
  assert.deepEqual(auswahl?.antworten.map((a) => a.richtig), [true, false]);
  assert.deepEqual(auswahl?.rueckmeldung, []);
  const bildwahl = schrittFrage(k.kapitel[1].schritte[4]);
  assert.deepEqual(bildwahl?.antworten.map((a) => a.bild), ["assets/images/p1.png"]);
  assert.deepEqual(schrittBilder(k.kapitel[1].schritte[3]), ["assets/images/v.jpg"]);

  assert.deepEqual(
    [...kursMedien(k)].sort(),
    ["assets/images/k.jpg", "assets/images/p1.png", "assets/images/s.jpg", "assets/images/v.jpg", "assets/tts/1/a.mp3", "assets/videos/v.mp4"]
  );
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
  const lies = async (start: number, laenge: number) => zip.slice(start, Math.min(zip.length, start + laenge));
  const ende = await lies(Math.max(0, zip.length - 1000), 1000);
  const lage = verzeichnisLage(ende);
  const eintraege = verzeichnisLesen(await lies(lage.offset, lage.groesse));
  assert.equal(istElephantPaket(eintraege.map((e) => e.name)), true);
  const nachName = new Map(eintraege.map((e) => [e.name, e]));
  assert.equal(new TextDecoder().decode(await eintragLesen(lies, nachName.get(`${KURS_ORDNER}course.json`)!)), '{"a":1}');
  assert.deepEqual([...(await eintragLesen(lies, nachName.get("assets/images/x.jpg")!))], [1, 2, 3, 4]);
  assert.equal((await eintragLesen(lies, nachName.get("gross.txt")!)).length, 5000);
  // Ungepackter Eintrag: Daten liegen ab datenBeginn direkt im Paket (für Teilbereiche).
  const beginn = await datenBeginn(lies, nachName.get("assets/images/x.jpg")!);
  assert.deepEqual([...zip.slice(beginn + 1, beginn + 3)], [2, 3]);
});


test("elephantZuLernkurs: Audio-Baustein und Sortieren (Aufbau wie im Elephant-Export vom 17.10.2026)", () => {
  const kurs = { course_name: "K", data: L({ name: "Kurs" }) };
  const lektionen = [{ lesson_id: "a", sort_index: 0, data: L({ name: "Eins" }) }];
  const lp = [
    { lesson_id: "a", module_id: "s", sort_index: 0, module_type: "sort", data: { items: [{ correctIndex: 2, ...L({ text: "C" }) }, { correctIndex: 0, ...L({ text: "A" }) }, { correctIndex: 1, ...L({ text: "B" }) }, { correctIndex: 3, ...L({}) }], ...L({ questionText: "Welche Reihenfolge? " }) } },
    { lesson_id: "a", module_id: "h", sort_index: 1, module_type: "audio", data: L({ assetName: "audio/x/x.wav" }) },
  ];
  const { kurs: k, uebersprungen } = elephantZuLernkurs(kurs, lektionen, lp);
  assert.deepEqual(uebersprungen, []);
  assert.deepEqual(k.kapitel[0].schritte[0].bausteine, [{ art: "sortieren", frage: "Welche Reihenfolge?", elemente: ["A", "B", "C"], rueckmeldung: [] }]);
  assert.deepEqual(k.kapitel[0].schritte[1].bausteine, [{ art: "hoerbeitrag", quelle: "assets/audio/x/x.wav" }]);
  assert.ok(kursMedien(k).has("assets/audio/x/x.wav"));
  assert.equal(istErlaubtesMedium("assets/audio/x/x.wav"), true);
});

test("Formeln: Block bleibt $$…$$, Formel im Satz wird \\(…\\)", () => {
  const knoten = htmlLesen(
    '<p>Spule: <span data-latex="X_L=2\\pi f L" data-type="inline-math">$X_L=2\\pi f L$</span> gilt.</p><div data-type="block-math">$$P=I^2R$$</div><p>Preis: 5 $</p>'
  );
  assert.deepEqual(knoten, [
    { tag: "p", kinder: ["Spule: \\(X_L=2\\pi f L\\) gilt."] },
    "$$P=I^2R$$",
    { tag: "p", kinder: ["Preis: 5 $"] },
  ]);
});
