// Sichert ab, dass der Code der Fachsprache-Einheit (Seite, Query, Komponenten,
// Regeln) nur liest: keine Schreibzugriffe auf die Datenbank oder den Speicher,
// kein Lernstand, keine competency_evidence (Regel 6), kein Tracking, kein
// Service-Role-Key, keine Ablage von Ergebnissen im Browser (Beschluss
// 2026-10-16). Prüft den Quelltext ohne Kommentare. Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const WURZEL = process.cwd();
const ORTE = [
  "src/lib/fachsprache-laden.ts",
  "src/lib/fachsprache-einstiege.ts",
  "src/lib/fachsprache.ts",
  "src/lib/fachsprache-quiz.ts",
  "src/lib/schalter.ts",
  "src/lib/queries/fachsprache.ts",
  "src/components/fachsprache",
  "src/app/(learner)/fachsprache",
  "src/app/(learner)/schedule/fachsprache-chip.tsx",
];

function dateien(pfad: string): string[] {
  const voll = join(WURZEL, pfad);
  if (!statSync(voll).isDirectory()) return [pfad];
  return readdirSync(voll).flatMap((n) => dateien(join(pfad, n)));
}

function ohneKommentare(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

const VERBOTEN: [string, RegExp][] = [
  ["Schreibzugriff (insert/update/upsert/delete)", /\.(insert|update|upsert|delete)\s*\(/],
  ["rpc-Aufruf", /\.rpc\s*\(/],
  ["Schreiben im Storage", /\.(upload|remove|move|copy|uploadToSignedUrl|createSignedUploadUrl)\s*\(/],
  ["Server Action", /["']use server["']/],
  ["Speicher im Browser", /localStorage|sessionStorage|indexedDB|document\.cookie|cookies\s*\(/],
  ["Netzwerkaufruf aus dem Code", /\bfetch\s*\(|sendBeacon|XMLHttpRequest|WebSocket|EventSource/],
  ["Lernstand oder Evidenz", /competency_evidence|unit_progress|enrolment|attendance|verification|field_capture/],
  ["Tracking oder Analytics", /analytics|gtag|posthog|plausible|mixpanel|track(Event)?\s*\(|@vercel\/analytics/i],
  ["Service-Role-Key", /service_role|SERVICE_ROLE|createServiceClient/],
];

test("Fachsprache-Code: nur Lesen, kein Lernstand, kein Tracking", () => {
  const alle = ORTE.flatMap(dateien).filter((d) => /\.(ts|tsx)$/.test(d) && !/\.test\.ts$/.test(d));
  assert.ok(alle.length >= 11, `zu wenige Dateien geprüft: ${alle.length}`);
  const funde: string[] = [];
  for (const datei of alle) {
    const quelltext = ohneKommentare(readFileSync(join(WURZEL, datei), "utf8"));
    for (const [name, muster] of VERBOTEN) if (muster.test(quelltext)) funde.push(`${datei}: ${name}`);
  }
  assert.deepEqual(funde, []);
});

test("Fachsprache-Code: die Prüfung erkennt Verbotenes (Gegenprobe)", () => {
  const schlecht = ohneKommentare('const a = supabase.from("x").insert({}); localStorage.setItem("k", "v");');
  assert.ok(VERBOTEN.filter(([, m]) => m.test(schlecht)).length >= 2);
  const nurKommentar = ohneKommentare("// competency_evidence und .insert( stehen hier nur im Kommentar\n/* unit_progress */ const ok = 1;");
  assert.equal(VERBOTEN.filter(([, m]) => m.test(nurKommentar)).length, 0);
});

test("Query: nur der Client der angemeldeten Person, kein Service-Role", () => {
  const q = readFileSync(join(WURZEL, "src/lib/queries/fachsprache.ts"), "utf8");
  assert.match(q, /createClient\(\)/);
  assert.match(q, /@\/lib\/supabase\/server/);
});
