// Tests für die Termin-Auswahl der Live-Lektion (SR-15, SR-21). Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { eigenerLiveTermin } from "./live-termin.ts";

// Eine Lektion, zwei Kohorten mit eigenem Termin; Kohorte A liegt früher.
const termine = [
  { id: "termin-b", datum: "2026-10-15", start: "09:00", join_link: "https://example.org/b" },
  { id: "termin-a", datum: "2026-10-08", start: "09:00", join_link: "https://example.org/a" },
];
const eintraege = [
  { live_session_id: "termin-a", cohort_id: "kohorte-a", enrolment_id: null },
  { live_session_id: "termin-b", cohort_id: "kohorte-b", enrolment_id: null },
];
const personA = { cohortId: "kohorte-a", enrolmentId: "einschreibung-a" };
const personB = { cohortId: "kohorte-b", enrolmentId: "einschreibung-b" };

test("Zwei Kohorten, gleiche Lektion: jede Person sieht nur ihren Termin", () => {
  assert.equal(eigenerLiveTermin(termine, eintraege, personA)?.id, "termin-a");
  assert.equal(eigenerLiveTermin(termine, eintraege, personB)?.id, "termin-b");
  assert.equal(eigenerLiveTermin(termine, eintraege, personB)?.join_link, "https://example.org/b");
});

test("Termin über die eigene Einschreibung zählt ebenfalls", () => {
  const einzeln = [{ live_session_id: "termin-b", cohort_id: null, enrolment_id: "einschreibung-c" }];
  assert.equal(eigenerLiveTermin(termine, einzeln, { cohortId: "kohorte-c", enrolmentId: "einschreibung-c" })?.id, "termin-b");
});

test("Mehrere eigene Termine: der früheste (Datum, dann Beginn)", () => {
  const mehr = [...termine, { id: "termin-a2", datum: "2026-10-08", start: "08:00", join_link: null }];
  const plan = [...eintraege, { live_session_id: "termin-a2", cohort_id: "kohorte-a", enrolment_id: null }];
  assert.equal(eigenerLiveTermin(mehr, plan, personA)?.id, "termin-a2");
});

test("Kein Termin im eigenen Plan: null statt des Termins einer anderen Kohorte", () => {
  assert.equal(eigenerLiveTermin(termine, eintraege, { cohortId: "kohorte-x", enrolmentId: "einschreibung-x" }), null);
  assert.equal(eigenerLiveTermin(termine, [], personA), null);
  assert.equal(eigenerLiveTermin([], eintraege, personA), null);
});
