// Tests für die Kohortensicht-Texte (SR-30). Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { KOHORTE_AVATARE_MAX, avatarReiheLabel, kohortenAnzahlText } from "./kohorte.ts";

test("kohortenAnzahlText zählt die eigene Person mit", () => {
  assert.equal(kohortenAnzahlText(0), "Du bist bisher allein in deiner Kohorte");
  assert.equal(kohortenAnzahlText(-1), "Du bist bisher allein in deiner Kohorte");
  assert.equal(kohortenAnzahlText(1), "2 Lernende");
  assert.equal(kohortenAnzahlText(11), "12 Lernende");
});

test("avatarReiheLabel nennt höchstens fünf Namen und die Zahl der übrigen", () => {
  assert.equal(KOHORTE_AVATARE_MAX, 5);
  assert.equal(avatarReiheLabel([]), "");
  assert.equal(avatarReiheLabel(["Jo B.", "Cem"]), "Jo B., Cem");
  assert.equal(avatarReiheLabel(["A", "B", "C", "D", "E"]), "A, B, C, D, E");
  assert.equal(avatarReiheLabel(["A", "B", "C", "D", "E", "F", "G"]), "A, B, C, D, E und 2 weitere");
});
