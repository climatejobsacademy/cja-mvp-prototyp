// Tests für das Organisations-Logo im Header (SR-76). Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";

// @ts-expect-error TS5097: .ts-Endung für node:test nötig
import { headerLogo } from "./org-logo.ts";

const URL_STAGING = "https://beispiel.supabase.co";
const PFAD = "3f2b8c1e-0d4a-4b6e-9c7f-1a2b3c4d5e6f.jpg";

test("ohne Logo-Pfad kein Logo (Fallback)", () => {
  assert.equal(headerLogo({ name: "Betrieb A", logoPfad: null }, URL_STAGING), null);
  assert.equal(headerLogo({ name: "Betrieb A", logoPfad: "" }, URL_STAGING), null);
});

test("ohne Organisation oder ohne Supabase-URL kein Logo", () => {
  assert.equal(headerLogo(null, URL_STAGING), null);
  assert.equal(headerLogo({ name: "Betrieb A", logoPfad: PFAD }, undefined), null);
});

test("mit Logo: Public-URL im Bucket org-logos", () => {
  assert.deepEqual(headerLogo({ name: "Betrieb A", logoPfad: PFAD }, URL_STAGING), {
    src: `${URL_STAGING}/storage/v1/object/public/org-logos/${PFAD}`,
    alt: "Betrieb A",
  });
});

test("Schrägstrich am Ende der Supabase-URL wird nicht verdoppelt", () => {
  assert.equal(
    headerLogo({ name: "Betrieb A", logoPfad: PFAD }, `${URL_STAGING}/`)?.src,
    `${URL_STAGING}/storage/v1/object/public/org-logos/${PFAD}`
  );
});

test("Alt-Text ist der Name der Organisation, ohne Leerraum außen", () => {
  assert.equal(headerLogo({ name: "  Energie GmbH ", logoPfad: PFAD }, URL_STAGING)?.alt, "Energie GmbH");
});

test("ohne Namen kein Logo (kein leerer Alt-Text)", () => {
  assert.equal(headerLogo({ name: "  ", logoPfad: PFAD }, URL_STAGING), null);
  assert.equal(headerLogo({ name: null, logoPfad: PFAD }, URL_STAGING), null);
});

test("Pfade außerhalb des Musters werden ignoriert", () => {
  for (const pfad of [
    "energiehelden-logo.jpg",
    "3f2b8c1e-0d4a-4b6e-9c7f-1a2b3c4d5e6f.svg",
    "logos/3f2b8c1e-0d4a-4b6e-9c7f-1a2b3c4d5e6f.png",
    "3F2B8C1E-0D4A-4B6E-9C7F-1A2B3C4D5E6F.png",
    "../3f2b8c1e-0d4a-4b6e-9c7f-1a2b3c4d5e6f.png",
  ]) {
    assert.equal(headerLogo({ name: "Betrieb A", logoPfad: pfad }, URL_STAGING), null, pfad);
  }
});

test("alle erlaubten Endungen", () => {
  for (const endung of ["png", "webp", "jpg", "jpeg"]) {
    const pfad = `3f2b8c1e-0d4a-4b6e-9c7f-1a2b3c4d5e6f.${endung}`;
    assert.ok(headerLogo({ name: "Betrieb A", logoPfad: pfad }, URL_STAGING), endung);
  }
});
