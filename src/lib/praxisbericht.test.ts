// Tests für das Prüfen von Praxisberichten (SR-82, Paket G3).
// Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { berichtStand, pruefAktion, sortiereBerichte } from "./praxisbericht.ts";

test("Freigeben: neu, unverändert, Storno auf die aktuelle Entscheidung", () => {
  assert.deepEqual(pruefAktion(null, "verified", null), { art: "neu" });
  assert.deepEqual(pruefAktion({ id: "v1", entscheidung: "verified" }, "verified", null), { art: "unveraendert" });
  assert.deepEqual(pruefAktion({ id: "v1", entscheidung: "rejected" }, "verified", ""), { art: "storno", korrigiertId: "v1" });
});

test("Zurückgeben nur mit Kommentar", () => {
  assert.equal(pruefAktion(null, "rejected", null).art, "fehler");
  assert.equal(pruefAktion(null, "rejected", "  ok ").art, "fehler");
  assert.deepEqual(pruefAktion(null, "rejected", "Foto vom Prüfprotokoll fehlt"), { art: "neu" });
  assert.deepEqual(pruefAktion({ id: "v1", entscheidung: "verified" }, "rejected", "Messwert fehlt"), {
    art: "storno",
    korrigiertId: "v1",
  });
});

test("Stand eines Berichts", () => {
  assert.equal(berichtStand(null), "offen");
  assert.equal(berichtStand({ id: "v", entscheidung: "verified" }), "freigegeben");
  assert.equal(berichtStand({ id: "v", entscheidung: "rejected" }), "zurueckgegeben");
});

test("Sortierung: offene zuerst (älteste oben), dann geprüfte (neueste oben)", () => {
  const liste = sortiereBerichte([
    { id: "a", stand: "freigegeben" as const, eingereichtAm: "2026-11-02T10:00", geprueftAm: "2026-11-03T09:00" },
    { id: "b", stand: "offen" as const, eingereichtAm: "2026-11-05T10:00", geprueftAm: null },
    { id: "c", stand: "offen" as const, eingereichtAm: "2026-11-04T10:00", geprueftAm: null },
    { id: "d", stand: "zurueckgegeben" as const, eingereichtAm: "2026-11-01T10:00", geprueftAm: "2026-11-06T09:00" },
  ]);
  assert.deepEqual(liste.map((x) => x.id), ["c", "b", "d", "a"]);
});
