// Tests für die Seite und die Einstiege der Fachsprache-Einheit (Stufe 2, SR
// folgt): Gates (Schalter, Veröffentlichung, Entwurf nur für AfCJ admin),
// Bildlinks und die Funktion für Home und Stundenplan. Die Datenquelle ist
// ein Fake, es läuft keine Datenbank. Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BILD_GUELTIGKEIT_SEKUNDEN,
  einheitFuerLektion,
  einheitHref,
  einheitenFuerLektionen,
  istEinheitId,
  ladeEinheitSeite,
  zurueckZiel,
  type EinheitenListeQuelle,
  type EinheitQuelle,
  type EinheitZeile,
  // @ts-expect-error TS5097: .ts-Endung für node:test nötig
} from "./fachsprache-laden.ts";

const ID = "11111111-1111-4111-8111-111111111111";
const LEKTION = "22222222-2222-4222-8222-222222222222";

const INHALT = {
  wortkarten: [
    { wort: "w1", erklaerung: "e1", beispiel: "b1", bild: "eins.png", bild_alt: "alt eins" },
    { wort: "w2", erklaerung: "e2", beispiel: "b2" },
  ],
  quiz: [{ frage: "f1", antworten: ["a", "b", "c"], richtig: 1, erklaerung: "x", bild: "eins.png", bild_alt: "alt noch einmal" }],
  saetze: ["s1", "s2"],
};

function zeile(teil: Partial<EinheitZeile> = {}): EinheitZeile {
  return { id: ID, lesson_id: LEKTION, titel: "t", dauer_minuten: 15, inhalt: INHALT, status: "veroeffentlicht", ...teil };
}

/** Fake mit Zählern: zeigt, was die Seite gefragt hat. */
function quelle(z: EinheitZeile | null, optionen: { admin?: boolean; links?: Map<string, string> } = {}) {
  const aufrufe = { einheit: 0, admin: 0, links: [] as { pfade: string[]; sekunden: number }[] };
  const q: EinheitQuelle = {
    async einheit() {
      aufrufe.einheit += 1;
      return z;
    },
    async istAfcjAdmin() {
      aufrufe.admin += 1;
      return optionen.admin ?? false;
    },
    async signierteLinks(pfade, sekunden) {
      aufrufe.links.push({ pfade, sekunden });
      return optionen.links ?? new Map(pfade.map((p) => [p, `https://signiert.test/${p}`]));
    },
  };
  return { q, aufrufe };
}

test("Schalter aus: nicht gefunden, die Quelle wird nicht einmal gefragt", async () => {
  const { q, aufrufe } = quelle(zeile());
  assert.deepEqual(await ladeEinheitSeite({ schalterAn: false, einheitId: ID }, q), { art: "nicht_gefunden" });
  assert.equal(aufrufe.einheit, 0);
  assert.equal(aufrufe.admin, 0);
  assert.equal(aufrufe.links.length, 0);
});

test("ungültige Id: nicht gefunden ohne Abfrage", async () => {
  const { q, aufrufe } = quelle(zeile());
  for (const id of ["", "abc", "../x", `${ID}x`, "1".repeat(36)]) {
    assert.deepEqual(await ladeEinheitSeite({ schalterAn: true, einheitId: id }, q), { art: "nicht_gefunden" });
  }
  assert.equal(aufrufe.einheit, 0);
  assert.equal(istEinheitId(ID), true);
});

test("keine lesbare Zeile (nicht veröffentlicht für Lernende, Lektion nicht lesbar, gibt es nicht): nicht gefunden", async () => {
  const { q } = quelle(null);
  assert.deepEqual(await ladeEinheitSeite({ schalterAn: true, einheitId: ID }, q), { art: "nicht_gefunden" });
});

test("Entwurf ohne AfCJ admin: nicht gefunden (zweite Sicherung neben der RLS)", async () => {
  const { q, aufrufe } = quelle(zeile({ status: "entwurf" }), { admin: false });
  assert.deepEqual(await ladeEinheitSeite({ schalterAn: true, einheitId: ID }, q), { art: "nicht_gefunden" });
  assert.equal(aufrufe.admin, 1);
  assert.equal(aufrufe.links.length, 0, "kein Bildlink für eine Einheit, die nicht gezeigt wird");
});

test("Entwurf mit AfCJ admin: wird gezeigt, mit Entwurf-Kennzeichnung", async () => {
  const { q } = quelle(zeile({ status: "entwurf" }), { admin: true });
  const r = await ladeEinheitSeite({ schalterAn: true, einheitId: ID }, q);
  assert.equal(r.art, "ok");
  if (r.art === "ok") assert.equal(r.einheit.entwurf, true);
});

test("veröffentlicht: ohne Banner, die Admin-Frage entfällt", async () => {
  const { q, aufrufe } = quelle(zeile());
  const r = await ladeEinheitSeite({ schalterAn: true, einheitId: ID }, q);
  assert.equal(r.art, "ok");
  assert.equal(aufrufe.admin, 0);
  if (r.art === "ok") {
    assert.equal(r.einheit.entwurf, false);
    assert.equal(r.einheit.id, ID);
    assert.equal(r.einheit.dauerMinuten, 15);
    assert.equal(r.einheit.wortkarten.length, 2);
    assert.equal(r.einheit.quiz.length, 1);
    assert.deepEqual(r.einheit.saetze, ["s1", "s2"]);
  }
});

test("unbekannter Status oder ungültiger Inhalt: nicht gefunden", async () => {
  for (const z of [
    zeile({ status: "geloescht" }),
    zeile({ inhalt: null }),
    zeile({ inhalt: { wortkarten: [], quiz: [], saetze: [] } }),
    zeile({ inhalt: { ...INHALT, quiz: [{ ...INHALT.quiz[0], richtig: 7 }] } }),
    zeile({ inhalt: { ...INHALT, wortkarten: [{ ...INHALT.wortkarten[0], bild_alt: "" }] } }),
  ]) {
    const { q } = quelle(z, { admin: true });
    assert.deepEqual(await ladeEinheitSeite({ schalterAn: true, einheitId: ID }, q), { art: "nicht_gefunden" });
  }
});

test("Bilder: ein Aufruf, Pfad <lesson_id>/<datei>, kurzlebig, doppelte Datei einmal", async () => {
  const { q, aufrufe } = quelle(zeile());
  const r = await ladeEinheitSeite({ schalterAn: true, einheitId: ID }, q);
  assert.equal(aufrufe.links.length, 1);
  assert.deepEqual(aufrufe.links[0].pfade, [`${LEKTION}/eins.png`]);
  assert.equal(aufrufe.links[0].sekunden, BILD_GUELTIGKEIT_SEKUNDEN);
  assert.ok(BILD_GUELTIGKEIT_SEKUNDEN <= 3600, "kurzlebig");
  assert.equal(r.art, "ok");
  if (r.art === "ok") {
    assert.deepEqual(r.einheit.wortkarten[0].bild, { url: `https://signiert.test/${LEKTION}/eins.png`, alt: "alt eins" });
    assert.equal(r.einheit.wortkarten[1].bild, null);
    assert.equal(r.einheit.quiz[0].bild?.alt, "alt noch einmal");
    assert.equal(r.einheit.bilderOhneLink, 0);
  }
});

test("Bild ohne lesbaren Link: kein Bild auf der Karte, gezählt, nichts erfunden", async () => {
  const { q } = quelle(zeile(), { links: new Map() });
  const r = await ladeEinheitSeite({ schalterAn: true, einheitId: ID }, q);
  assert.equal(r.art, "ok");
  if (r.art === "ok") {
    assert.equal(r.einheit.wortkarten[0].bild, null);
    assert.equal(r.einheit.quiz[0].bild, null);
    assert.equal(r.einheit.bilderOhneLink, 2);
  }
});

test("ohne Bilder im Inhalt: kein Aufruf zum Signieren", async () => {
  const ohne = { ...INHALT, wortkarten: [{ wort: "w", erklaerung: "e", beispiel: "b" }], quiz: [{ ...INHALT.quiz[0], bild: undefined, bild_alt: undefined }] };
  const { q, aufrufe } = quelle(zeile({ inhalt: ohne }));
  const r = await ladeEinheitSeite({ schalterAn: true, einheitId: ID }, q);
  assert.equal(r.art, "ok");
  assert.equal(aufrufe.links.length, 0);
});

// ---------- Einstiege (Etappe 2) ----------

function liste(zeilen: { id: string; lesson_id: string; titel: string; status: string }[]) {
  let aufrufe = 0;
  let zuletzt: string[] = [];
  const q: EinheitenListeQuelle = {
    async fuerLektionen(ids) {
      aufrufe += 1;
      zuletzt = ids;
      return zeilen;
    },
  };
  return { q, aufrufe: () => aufrufe, ids: () => zuletzt };
}

test("Einstiege: Schalter aus oder keine Lektionen -> leer, ohne Abfrage", async () => {
  const l = liste([{ id: ID, lesson_id: LEKTION, titel: "t", status: "veroeffentlicht" }]);
  assert.equal((await einheitenFuerLektionen({ schalterAn: false, lessonIds: [LEKTION] }, l.q)).size, 0);
  assert.equal((await einheitenFuerLektionen({ schalterAn: true, lessonIds: [] }, l.q)).size, 0);
  assert.equal(await einheitFuerLektion({ schalterAn: false, lessonId: LEKTION }, l.q), null);
  assert.equal(l.aufrufe(), 0);
});

test("Einstiege: nur Veröffentlichtes, Link je Lektion, Entwürfe und fremde Lektionen fallen weg", async () => {
  const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const l = liste([
    { id: "e1", lesson_id: A, titel: "ta", status: "veroeffentlicht" },
    { id: "e2", lesson_id: B, titel: "tb", status: "entwurf" },
    { id: "e3", lesson_id: C, titel: "tc", status: "veroeffentlicht" },
  ]);
  const karte = await einheitenFuerLektionen({ schalterAn: true, lessonIds: [A, B, A], von: "stundenplan" }, l.q);
  assert.deepEqual(l.ids(), [A, B], "doppelte Lektionen nur einmal erfragt");
  assert.deepEqual([...karte.keys()], [A]);
  assert.deepEqual(karte.get(A), { einheitId: "e1", lessonId: A, titel: "ta", href: "/fachsprache/e1?von=stundenplan" });
  assert.equal(await einheitFuerLektion({ schalterAn: true, lessonId: B }, l.q), null);
});

test("Link und Zurück-Ziel: nur feste Ziele", () => {
  assert.equal(einheitHref("x"), "/fachsprache/x");
  assert.equal(einheitHref("x", "home"), "/fachsprache/x");
  assert.equal(einheitHref("x", "stundenplan"), "/fachsprache/x?von=stundenplan");
  assert.deepEqual(zurueckZiel(), { href: "/home", label: "Zurück zu Home" });
  assert.deepEqual(zurueckZiel("home"), { href: "/home", label: "Zurück zu Home" });
  assert.deepEqual(zurueckZiel("stundenplan"), { href: "/schedule", label: "Zurück zum Stundenplan" });
  assert.deepEqual(zurueckZiel("stundenplan", "2026-10-20"), { href: "/schedule?datum=2026-10-20", label: "Zurück zum Stundenplan" });
  assert.equal(zurueckZiel("stundenplan", "//evil.example").href, "/schedule");
  assert.equal(zurueckZiel("https://evil.example").href, "/home");
});
