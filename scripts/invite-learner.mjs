#!/usr/bin/env node
// scripts/invite-learner.mjs
//
// SR-49: automatisiert den bisher manuellen Schritt, den Magic-Link nach
// Anlage eines Learners weiterzuleiten. Die person-Zeile selbst wird
// weiterhin händisch per Supabase Table Editor/SQL angelegt (docs/data-
// model.md, Schritt 4d: "Händische Account-Anlage durch Admin (Prototyp)")
// -- es gibt bewusst keine Admin-UI dafür (docs/design-specifications.md,
// Abschnitt 3). Dieses Skript ersetzt nur den Einladungsmail-Versand.
//
// Nutzung (nach Anlage der person-Zeile, oder davor -- Reihenfolge ist
// egal, solange die id am Ende zusammengeführt wird):
//   node scripts/invite-learner.mjs --target=production [--dry-run] <email> ["Voller Name"]
//   node --env-file=.env.local scripts/invite-learner.mjs --target=staging [--dry-run] <email> ["Voller Name"]
//
// Das Ziel ist Pflicht und bestimmt Supabase-URL, Einladungslink und die
// Quelle des Service-Role-Keys. NEXT_PUBLIC_SUPABASE_URL wird bewusst nicht
// gelesen, damit eine .env.local nie unbemerkt das Ziel wechselt:
//   production: Frankfurt, Key aus dem macOS-Schlüsselbund (cja-fra-service-role),
//               vor dem Versand muss die Ref eingetippt werden.
//   staging:    Irland, Key aus SUPABASE_SERVICE_ROLE_KEY (z. B. .env.local).
// Vor jedem Versand wird geprüft, dass der Key ein service_role-JWT genau
// dieses Projekts ist. --dry-run führt alle Prüfungen aus, verschickt aber
// nichts. Der Key wird nie ausgegeben.

import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";

import { createClient } from "@supabase/supabase-js";

const TARGETS = {
  production: {
    ref: "vqfnmkcfjsudsujiuoqm",
    label: "Production (Frankfurt)",
    redirectTo: "https://learn.climatejobsacademy.com/auth/callback",
    keySource: "Schlüsselbund-Eintrag cja-fra-service-role",
    readKey: () => readKeychain("cja-fra-service-role"),
    confirm: true,
  },
  staging: {
    ref: "keijrwvegmwgpvprpoxa",
    label: "Staging (Irland)",
    redirectTo: "https://cja-mvp-prototyp-git-dev-af-cj-s.vercel.app/auth/callback",
    keySource: "Umgebungsvariable SUPABASE_SERVICE_ROLE_KEY",
    readKey: () => process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null,
    confirm: false,
  },
};

const USAGE =
  'Nutzung: node scripts/invite-learner.mjs --target=production|staging [--dry-run] <email> ["Voller Name"]';

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readKeychain(service) {
  try {
    return execFileSync("security", ["find-generic-password", "-s", service, "-w"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

// Prüft nur die Form und die Claims, nicht die Signatur -- das erledigt
// Supabase beim Aufruf. Reicht, um Key und Ziel nicht zu verwechseln.
function checkServiceRoleKey(key, expectedRef) {
  const parts = key.split(".");
  if (parts.length !== 3) {
    return `Key hat ${parts.length} statt 3 Teile (erwartet: Legacy-service_role-JWT).`;
  }
  let claims;
  try {
    claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return "Key-Payload ist kein lesbares JSON.";
  }
  if (claims.role !== "service_role") {
    return `Key hat die Rolle "${claims.role}", erwartet "service_role".`;
  }
  if (claims.ref !== expectedRef) {
    return `Key gehört zum Projekt "${claims.ref}", erwartet "${expectedRef}".`;
  }
  return null;
}

let parsed;
try {
  parsed = parseArgs({
    options: {
      target: { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
    allowPositionals: true,
  });
} catch (error) {
  fail(`${error.message}\n${USAGE}`);
}

const { values, positionals } = parsed;
const [email, fullName] = positionals;
const target = TARGETS[values.target];
const dryRun = values["dry-run"];

if (!target) fail(`--target fehlt oder ist unbekannt.\n${USAGE}`);
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  fail(`E-Mail-Adresse fehlt oder ist ungültig.\n${USAGE}`);
}

const serviceRoleKey = target.readKey();
if (!serviceRoleKey) fail(`Kein Service-Role-Key gefunden (${target.keySource}).`);

const keyProblem = checkServiceRoleKey(serviceRoleKey, target.ref);
if (keyProblem) fail(`Key-Prüfung fehlgeschlagen: ${keyProblem}`);

const supabaseUrl = `https://${target.ref}.supabase.co`;

console.log(`Ziel:       ${target.label}, Ref ${target.ref}`);
console.log(`Supabase:   ${supabaseUrl}`);
console.log(`Link auf:   ${target.redirectTo}`);
console.log(`Key:        ${target.keySource}, Prüfung ok (service_role, Ref passt)`);
console.log(`Einladung:  ${email}${fullName ? ` (${fullName})` : ""}`);

if (dryRun) {
  console.log("Dry-Run: keine Einladung versendet.");
  process.exit(0);
}

if (target.confirm) {
  if (!process.stdin.isTTY) fail("Production braucht eine Bestätigung im Terminal (kein TTY).");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`Zur Bestätigung die Ref von ${target.label} eintippen: `)).trim();
  rl.close();
  if (answer !== target.ref) fail("Ref stimmt nicht, abgebrochen. Nichts versendet.");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
  redirectTo: target.redirectTo,
  data: fullName ? { full_name: fullName } : undefined,
});

if (error) fail(`Einladung fehlgeschlagen: ${error.message}`);

console.log("Einladung versendet an", email);
console.log("Auth-User-ID (für die person-Zeile, id = auth.users.id):", data.user.id);
