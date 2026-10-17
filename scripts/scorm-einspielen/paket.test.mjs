// Tests für scripts/scorm-einspielen/paket.mjs (erfundene Beispiele, keine
// echten Inhalte). Ausführen: node --test scripts/scorm-einspielen/*.test.mjs

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  einstiegsDatei,
  entpacktPfad,
  inhaltstyp,
  leseManifest,
  mussUmwandeln,
  objektNameGueltig,
  planeUploads,
  speicherName,
  waehleMedien,
  zaehleModularten,
  zipPfad,
} from "./paket.mjs";

const LEKTION = "0b6f2c1e-3a4d-4e5f-8a9b-0c1d2e3f4a5b";

const MANIFEST = `<?xml version="1.0" standalone="no" ?>
<!-- Kommentar mit <resource href="falsch.html" identifier="r1"/> -->
<manifest identifier="com.example.kurs" version="1" xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations default="B0">
    <organization identifier="A0"><title>Andere</title><item identifier="i0" identifierref="r0"><title>x</title></item></organization>
    <organization identifier="B0">
      <title>Kurs: Grundlagen &amp; Praxis</title>
      <item identifier="i1" identifierref="r1" isvisible="true"><title>Item-Titel</title></item>
    </organization>
  </organizations>
  <resources>
    <resource href="anderes.html" identifier="r0" type="webcontent" adlcp:scormtype="sco"><file href="anderes.html"/></resource>
    <resource identifier='r1' type="webcontent" adlcp:scormtype="sco" href='scormcontent/index.html'>
      <file href="scormcontent/index.html"/>
    </resource>
  </resources>
</manifest>`;

test("Manifest: Standard-Organisation, Titel entschlüsselt, Einstieg über identifierref, Kommentare ignoriert", () => {
  assert.deepEqual(leseManifest(MANIFEST), { version: "1.2", titel: "Kurs: Grundlagen & Praxis", entryPoint: "scormcontent/index.html" });
});

test("Manifest: ohne default die erste Organisation; ohne passende Ressource die erste mit href", () => {
  const xml = `<manifest><organizations><organization identifier="o"><title>T</title><item identifierref="fehlt"/></organization></organizations>
    <resources><resource identifier="x"/><resource identifier="y" href="start.html?x=1"/></resources></manifest>`;
  const m = leseManifest(xml);
  assert.equal(m.titel, "T");
  assert.equal(m.entryPoint, "start.html?x=1");
  assert.equal(m.version, null);
  assert.equal(einstiegsDatei(m.entryPoint), "start.html");
});

test("Manifest: Fehler ohne manifest, ohne Einstieg, mit Einstieg außerhalb des Pakets", () => {
  assert.throws(() => leseManifest("<foo/>"), /kein <manifest>/);
  assert.throws(() => leseManifest("<manifest><resources><resource identifier='r'/></resources></manifest>"), /keine Einstiegsdatei/);
  for (const href of ["https://example.org/x.html", "/abs.html", "../raus.html", "a/../../b.html"]) {
    assert.throws(() => leseManifest(`<manifest><resources><resource identifier="r" href="${href}"/></resources></manifest>`), /nicht im Paket/);
  }
});

test("Speichername: a–z, 0–9, Bindestrich; Umlaute umschreiben; Endung .zip Pflicht", () => {
  assert.equal(speicherName("Lernmodul 2_ Die Installation -2026-10-15T12_14_00_649Z.zip"), "lernmodul-2-die-installation-2026-10-15t12-14-00-649z.zip");
  assert.equal(speicherName("Übung Größe ß é.ZIP"), "uebung-groesse-ss-e.zip");
  assert.equal(speicherName("  paket.zip "), "paket.zip");
  assert.equal(speicherName(`${"a".repeat(200)}.zip`).length, 124);
  assert.throws(() => speicherName("paket.rar"), /\.zip/);
  assert.throws(() => speicherName("ordner/paket.zip"), /ohne Ordner/);
  assert.throws(() => speicherName("___.zip"), /kein gültiger/);
  assert.throws(() => speicherName(""), /fehlt/);
});

test("Pfad-Schema: <lesson_id>/<speichername>, Medien unter .entpackt/, umzuwandelndes Audio mit .m4a", () => {
  const zip = zipPfad(LEKTION, "paket-1.zip");
  assert.equal(zip, `${LEKTION}/paket-1.zip`);
  assert.equal(entpacktPfad(zip, "assets/images/a.jpg"), `${LEKTION}/paket-1.zip.entpackt/assets/images/a.jpg`);
  assert.equal(entpacktPfad(zip, "assets/audio/x/x.wav"), `${LEKTION}/paket-1.zip.entpackt/assets/audio/x/x.m4a`);
  assert.equal(entpacktPfad(zip, "assets/tts/x/y.WAV"), `${LEKTION}/paket-1.zip.entpackt/assets/tts/x/y.m4a`);
  assert.equal(entpacktPfad(zip, "assets/tts/x/y.mp3"), `${LEKTION}/paket-1.zip.entpackt/assets/tts/x/y.mp3`);
  assert.throws(() => zipPfad("keine-uuid", "paket.zip"), /UUID/);
  assert.throws(() => zipPfad(LEKTION, "Paket.zip"), /Speichername/);
});

test("Endungstausch und Inhaltstyp", () => {
  assert.equal(mussUmwandeln("assets/audio/a.wav"), true);
  assert.equal(mussUmwandeln("assets/audio/a.mp3"), false);
  assert.equal(mussUmwandeln("assets/audio/a.m4a"), false);
  assert.equal(mussUmwandeln("assets/images/a.jpg"), false);
  assert.equal(mussUmwandeln("assets/audio.x/ohne-endung"), false);
  assert.equal(inhaltstyp("a/b.m4a"), "audio/mp4");
  assert.equal(inhaltstyp("a/b.JPG"), "image/jpeg");
  assert.equal(inhaltstyp("a/b.svg"), null);
  assert.equal(inhaltstyp("a/b.html"), null);
});

test("Objektnamen: nur sichere Zeichen, keine leeren oder ../-Teile", () => {
  assert.equal(objektNameGueltig(`${LEKTION}/p.zip.entpackt/assets/images/a_b-1.jpg`), true);
  for (const n of ["", "a//b", "/a", "a/", "a/../b", "a/./b", "ä.jpg", "a b.jpg", "a?.jpg", "x".repeat(1025)]) {
    assert.equal(objektNameGueltig(n), false, n);
  }
});

test("Medienauswahl: nur genutzte, erlaubte, vorhandene Medien mit erlaubtem Typ", () => {
  const eintraege = new Map(
    [
      ["assets/images/a.jpg", 10],
      ["assets/audio/x/x.wav", 1000],
      ["assets/tts/t.mp3", 20],
      ["assets/images/b.svg", 5],
      ["assets/images/ungenutzt.png", 7],
      ["assets/videos/v.mp4", 300],
      ["scorm.html", 1],
    ].map(([name, groesse]) => [name, { groesse }])
  );
  const { medien, meldungen } = waehleMedien(
    ["assets/images/a.jpg", "assets/audio/x/x.wav", "assets/tts/t.mp3", "assets/images/b.svg", "assets/images/fehlt.jpg", "scorm.html", "assets/videos/v.mp4", "assets/images/a.jpg"],
    eintraege
  );
  assert.deepEqual(
    medien.map((m) => [m.innen, m.ziel, m.groesse, m.umwandeln, m.typ]),
    [
      ["assets/audio/x/x.wav", "assets/audio/x/x.m4a", 1000, true, "audio/mp4"],
      ["assets/images/a.jpg", "assets/images/a.jpg", 10, false, "image/jpeg"],
      ["assets/tts/t.mp3", "assets/tts/t.mp3", 20, false, "audio/mpeg"],
      ["assets/videos/v.mp4", "assets/videos/v.mp4", 300, false, "video/mp4"],
    ]
  );
  assert.equal(meldungen.length, 3);
  assert.match(meldungen.join("\n"), /b\.svg: Dateityp nicht erlaubt/);
  assert.match(meldungen.join("\n"), /fehlt\.jpg: vom Kurs genutzt, fehlt aber im Paket/);
  assert.match(meldungen.join("\n"), /scorm\.html: kein erlaubter Medienpfad/);
});

test("Medienauswahl: WAV und M4A mit gleichem Stamm ergeben denselben Zielnamen -> nur einer", () => {
  const eintraege = new Map([["assets/audio/a.m4a", { groesse: 1 }], ["assets/audio/a.wav", { groesse: 2 }]]);
  const { medien, meldungen } = waehleMedien(["assets/audio/a.wav", "assets/audio/a.m4a"], eintraege);
  assert.deepEqual(medien.map((m) => m.innen), ["assets/audio/a.m4a"]);
  assert.match(meldungen[0], /denselben Zielnamen/);
});

test("Modularten zählen: nur veröffentlichte Module, unbekannte markiert", () => {
  const lp = [
    [{ module_type: "page" }, { module_type: "page" }, { module_type: "quizShow" }],
    { module_type: "swipe" },
    [{ module_type: "page", is_published: false }, { module_type: 3 }],
  ];
  assert.deepEqual(zaehleModularten(lp), [
    ["page", 2, true],
    ["(ohne Art)", 1, false],
    ["quizShow", 1, false],
    ["swipe", 1, true],
  ]);
});

test("Upload-Plan: fehlend -> hochladen, gleiche Größe -> vorhanden, andere Größe -> Konflikt, Größe unbekannt -> nur Vorhandensein", () => {
  const plan = planeUploads(
    [
      { name: "z.zip", groesse: 100 },
      { name: "z.zip.entpackt/a.jpg", groesse: 10 },
      { name: "z.zip.entpackt/b.jpg", groesse: 20 },
      { name: "z.zip.entpackt/c.m4a", groesse: null },
      { name: "z.zip.entpackt/d.m4a", groesse: null },
    ],
    [
      { name: "z.zip", groesse: 100 },
      { name: "z.zip.entpackt/a.jpg", groesse: "11" },
      { name: "z.zip.entpackt/c.m4a", groesse: 5 },
      { name: "z.zip.entpackt/alt.jpg", groesse: 1 },
    ]
  );
  assert.deepEqual(plan.hochladen.map((o) => o.name), ["z.zip.entpackt/b.jpg", "z.zip.entpackt/d.m4a"]);
  assert.deepEqual(plan.vorhanden.map((o) => o.name), ["z.zip", "z.zip.entpackt/c.m4a"]);
  assert.deepEqual(plan.konflikte, [{ name: "z.zip.entpackt/a.jpg", erwartet: 10, gefunden: 11 }]);
  assert.deepEqual(plan.fremd, ["z.zip.entpackt/alt.jpg"]);
  assert.throws(() => planeUploads([{ name: "x" }, { name: "x" }], []), /doppelt/);
});

test("Upload-Plan: zweiter Lauf nach dem Hochladen ist leer", () => {
  const erwartet = [{ name: "z.zip", groesse: 100 }, { name: "z.zip.entpackt/c.m4a", groesse: null }];
  const plan = planeUploads(erwartet, [{ name: "z.zip", groesse: 100 }, { name: "z.zip.entpackt/c.m4a", groesse: 42 }]);
  assert.equal(plan.hochladen.length, 0);
  assert.equal(plan.konflikte.length, 0);
});
