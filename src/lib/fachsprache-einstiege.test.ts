// Tests für die Einstiege der Fachsprache-Einheit auf Home und im Stundenplan
// (Etappe 2, SR-84): Schalter aus, Entwurf, nicht lesbar, mehrere Einheiten an
// einem Tag, Tag ohne Einheit, Selbstlernen. Ohne Datenbank. Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  einheitenFuerLektionen,
  einheitHref,
  type EinheitenListeQuelle,
  // @ts-expect-error TS5097: .ts-Endung für node:test nötig
} from "./fachsprache-laden.ts";
import {
  einstiegeJeTag,
  lektionIdsFuerEinstiege,
  termineAus,
  type EinstiegTheorie,
  type TagMitTerminen,
  // @ts-expect-error TS5097: .ts-Endung für node:test nötig
} from "./fachsprache-einstiege.ts";

const L1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const L2 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const L3 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3";

const live = (lessonId: string | null, start = "09:00:00"): EinstiegTheorie => ({ art: "live", lessonId, liveSession: { start } });
const selbst = (lessonId: string): EinstiegTheorie => ({ art: "asynchron", lessonId, liveSession: null });
const tag = (datum: string, ...theorie: EinstiegTheorie[]): TagMitTerminen => ({ datum, theorie });

/** Fake-Quelle wie die RLS: liefert, was lesbar ist (hier: alles, was sie kennt), zählt die Aufrufe. */
function quelle(zeilen: { id: string; lesson_id: string; titel: string; status: string }[]) {
  const aufrufe: string[][] = [];
  const q: EinheitenListeQuelle = {
    async fuerLektionen(ids) {
      aufrufe.push(ids);
      return zeilen.filter((z) => ids.includes(z.lesson_id));
    },
  };
  return { q, aufrufe };
}

/** Der ganze Weg wie in queries/fachsprache.ts: Lektionen -> Einheiten -> Einträge je Tag. */
async function einstiege(tage: TagMitTerminen[], zeilen: Parameters<typeof quelle>[0], schalterAn = true, von?: "stundenplan" | "home") {
  const { q, aufrufe } = quelle(zeilen);
  const ids = lektionIdsFuerEinstiege(tage);
  const links = await einheitenFuerLektionen({ schalterAn, lessonIds: ids, von }, q);
  return { karte: einstiegeJeTag(tage, links, von), aufrufe };
}

const E = (id: string, lesson: string, status = "veroeffentlicht") => ({ id, lesson_id: lesson, titel: `t-${id}`, status });

test("Termine: nur Live mit Live-Sitzung zählt, Selbstlernen und Termine ohne Lektion nicht", () => {
  const t = termineAus([tag("2026-11-02", live(L1), selbst(L2), live(null), { art: "live", lessonId: L3, liveSession: null })]);
  assert.deepEqual(t.map((x: { lessonId: string | null }) => x.lessonId), [L1, null]);
  assert.deepEqual(lektionIdsFuerEinstiege([tag("2026-11-02", live(L1), live(L1, "13:00:00"), selbst(L2))]), [L1]);
});

test("Schalter aus: keine Einträge und keine Abfrage", async () => {
  const { karte, aufrufe } = await einstiege([tag("2026-11-02", live(L1))], [E("e1", L1)], false);
  assert.equal(karte.size, 0);
  assert.equal(aufrufe.length, 0);
});

test("Entwurf: kein Eintrag, auch wenn die RLS ihn (z. B. AfCJ admin) lieferte", async () => {
  const { karte } = await einstiege([tag("2026-11-02", live(L1))], [E("e1", L1, "entwurf")]);
  assert.equal(karte.size, 0);
});

test("nicht lesbare oder nicht vorhandene Einheit: kein Eintrag, kein Fehler", async () => {
  const { karte, aufrufe } = await einstiege([tag("2026-11-02", live(L1))], []);
  assert.equal(karte.size, 0);
  assert.equal(aufrufe.length, 1);
});

test("Tag ohne Einheit fehlt, Tag mit Einheit erscheint", async () => {
  const tage = [tag("2026-11-02", live(L1)), tag("2026-11-03", live(L2)), tag("2026-11-04")];
  const { karte } = await einstiege(tage, [E("e1", L1)]);
  assert.deepEqual([...karte.keys()], ["2026-11-02"]);
  assert.equal(karte.get("2026-11-03"), undefined);
});

test("nur Selbstlernen am Tag: kein Einstieg, und es wird nicht gefragt", async () => {
  const { karte, aufrufe } = await einstiege([tag("2026-11-02", selbst(L1))], [E("e1", L1)]);
  assert.equal(karte.size, 0);
  assert.equal(aufrufe.length, 0);
});

test("mehrere Einheiten an einem Tag: alle, in der Reihenfolge der Startzeit", async () => {
  const tage = [tag("2026-11-02", live(L2, "13:00:00"), live(L1, "09:00:00"), live(L3, "15:00:00"))];
  const { karte, aufrufe } = await einstiege(tage, [E("e1", L1), E("e2", L2), E("e3", L3, "entwurf")]);
  assert.deepEqual(karte.get("2026-11-02")?.map((e: { einheitId: string }) => e.einheitId), ["e1", "e2"]);
  assert.equal(aufrufe.length, 1, "eine Abfrage für alle Tage");
  assert.deepEqual([...aufrufe[0]].sort(), [L1, L2, L3]);
});

test("dieselbe Lektion zweimal am Tag: eine Einheit, einmal", async () => {
  const { karte } = await einstiege([tag("2026-11-02", live(L1, "09:00:00"), live(L1, "13:00:00"))], [E("e1", L1)]);
  assert.equal(karte.get("2026-11-02")?.length, 1);
});

test("dieselbe Einheit an zwei Tagen: an beiden, je mit eigenem Link zum Tag", async () => {
  const tage = [tag("2026-11-02", live(L1)), tag("2026-11-09", live(L1))];
  const { karte } = await einstiege(tage, [E("e1", L1)], true, "stundenplan");
  assert.equal(karte.get("2026-11-02")?.[0].href, "/fachsprache/e1?von=stundenplan&datum=2026-11-02");
  assert.equal(karte.get("2026-11-09")?.[0].href, "/fachsprache/e1?von=stundenplan&datum=2026-11-09");
});

test("Home: Link ohne Herkunftsparameter", async () => {
  const { karte } = await einstiege([tag("2026-11-02", live(L1))], [E("e1", L1)], true, "home");
  assert.equal(karte.get("2026-11-02")?.[0].href, "/fachsprache/e1");
});

test("einheitHref: nur gültiges Datum kommt in die URL", () => {
  assert.equal(einheitHref("x", "stundenplan", "2026-11-02"), "/fachsprache/x?von=stundenplan&datum=2026-11-02");
  assert.equal(einheitHref("x", "stundenplan", "//evil.example"), "/fachsprache/x?von=stundenplan");
  assert.equal(einheitHref("x", "home", "2026-11-02"), "/fachsprache/x");
});
