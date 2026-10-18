#!/usr/bin/env node
// scripts/live-links.mjs
//
// Schreibt Teams-Links in die Live-Termine (live_session.join_link), entweder
// je Kohorte und Modul oder je Termin (Kohorte, Datum, Start). SR-15.
// Anleitung: docs/live-links.md.
//
//   node scripts/live-links.mjs --datei <teams-links-staging.csv> --nur-pruefen
//   node scripts/live-links.mjs --datei <teams-links-staging.csv> --ziel staging            (Probelauf)
//   node scripts/live-links.mjs --datei <teams-links-staging.csv> --ziel staging --ausfuehren
//   node scripts/live-links.mjs --datei <teams-links-production.csv> --ziel production --production-freigabe [--ausfuehren]
//
// Standard ist der Probelauf: alles läuft in einer Transaktion, die am Ende
// zurückgerollt wird (ROLLBACK). Im selben Lauf wird alles ein zweites Mal
// ausgeführt; ändert der zweite Durchgang etwas, bricht das Skript ab
// (Idempotenz). Erst mit --ausfuehren wird gespeichert (COMMIT).
//
// Links können Zugangsdaten enthalten: Das Skript gibt keinen Link aus (nur
// die Domain), schreibt nichts auf die Platte (psql bekommt alles über stdin)
// und stellt psql auf knappe Fehlermeldungen (VERBOSITY terse), damit psql
// bei einem Fehler keine Zeile der Anfrage zeigt. Das Datenbank-Passwort kommt
// aus PGPASSWORD oder dem macOS-Schlüsselbund und wird nie ausgegeben.

import { execFileSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { beschreibe, leseLinkDatei, pruefeDateiZiel } from "./live-links/eingabe.mjs";

const HIER = dirname(fileURLToPath(import.meta.url));

// Wie in scripts/import-plan.mjs
const ZIELE = {
  staging: {
    ref: "keijrwvegmwgpvprpoxa",
    label: "Staging (Irland)",
    host: "aws-1-eu-west-1.pooler.supabase.com",
    schluesselbund: "cja-db-irl",
  },
  production: {
    ref: "vqfnmkcfjsudsujiuoqm",
    label: "Production (Frankfurt)",
    host: "aws-1-eu-central-1.pooler.supabase.com",
    schluesselbund: "cja-db-fra",
  },
};

const NUTZUNG = `Nutzung:
  node scripts/live-links.mjs --datei <pfad.csv> --nur-pruefen [--ziel staging|production]
  node scripts/live-links.mjs --datei <pfad.csv> --ziel staging|production
       [--mit-begleitkursen] [--production-freigabe] [--ausfuehren]
  CSV je Modul:  Kohorte,Modul,Link
  CSV je Termin: Kohorte,Datum,Start,Link`;

function abbruch(text) {
  console.error(text);
  process.exit(1);
}

let arg;
try {
  ({ values: arg } = parseArgs({
    options: {
      datei: { type: "string" },
      ziel: { type: "string" },
      "mit-begleitkursen": { type: "boolean", default: false },
      "nur-pruefen": { type: "boolean", default: false },
      ausfuehren: { type: "boolean", default: false },
      "production-freigabe": { type: "boolean", default: false },
      hilfe: { type: "boolean", default: false },
    },
  }));
} catch (fehler) {
  abbruch(`${fehler.message}\n${NUTZUNG}`);
}

if (arg.hilfe) {
  console.log(NUTZUNG);
  process.exit(0);
}
if (!arg.datei) abbruch(`--datei fehlt.\n${NUTZUNG}`);
if (arg.ziel !== undefined && !ZIELE[arg.ziel]) abbruch(`--ziel staging oder --ziel production angeben.\n${NUTZUNG}`);

// ---------- Datei prüfen und lesen ----------
try {
  pruefeDateiZiel(arg.datei, arg.ziel);
} catch (fehler) {
  abbruch(`Abbruch: ${fehler.message}`);
}
if (!existsSync(arg.datei)) abbruch(`Link-Datei nicht gefunden: ${arg.datei}`);

let eingabe;
try {
  eingabe = leseLinkDatei(readFileSync(arg.datei, "utf8"));
} catch (fehler) {
  abbruch(`Abbruch beim Lesen der Link-Datei:\n${fehler.message}`);
}
if (eingabe.variante === "termin" && arg["mit-begleitkursen"]) {
  abbruch("Abbruch: --mit-begleitkursen gilt nur für die Variante je Modul (Kohorte,Modul,Link).");
}

console.log(`\n== Link-Datei: ${eingabe.eintraege.length} Zeilen, ${eingabe.variante === "modul" ? "je Kohorte und Modul" : "je Termin (Kohorte, Datum, Start)"} ==`);
for (const e of eingabe.eintraege) console.log(`  Zeile ${e.zeile}: ${beschreibe(eingabe.variante, e)} -> ${e.domain}`);
if (arg["nur-pruefen"]) process.exit(0);

// ---------- Ziel und Freigaben ----------
const ziel = ZIELE[arg.ziel];
if (!ziel) abbruch(`--ziel staging oder --ziel production angeben.\n${NUTZUNG}`);
if (arg.ziel === "production" && !arg["production-freigabe"]) {
  abbruch("Abbruch: Production nur mit --production-freigabe (auch für den Probelauf).");
}
if (arg.ausfuehren && arg.ziel === "production") {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const antwort = await rl.question(`\nEchter Lauf nach ${ziel.label}. Zur Bestätigung die Projekt-Ref eintippen: `);
  rl.close();
  if (antwort.trim() !== ziel.ref) abbruch("Abbruch: Ref stimmt nicht.");
}

function passwort() {
  if (process.env.PGPASSWORD) return process.env.PGPASSWORD;
  try {
    return execFileSync("security", ["find-generic-password", "-s", ziel.schluesselbund, "-w"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    abbruch(`Kein Passwort: PGPASSWORD setzen oder Schlüsselbund-Eintrag ${ziel.schluesselbund} anlegen.`);
  }
}

function psqlPfad() {
  if (process.env.PSQL) return process.env.PSQL;
  const brew = "/opt/homebrew/opt/postgresql@17/bin/psql";
  if (existsSync(brew)) return brew;
  // Postgres.app (Mac ohne Homebrew), Anna 2026-10-18
  const app = "/Applications/Postgres.app/Contents/Versions/latest/bin/psql";
  return existsSync(app) ? app : "psql";
}

// ---------- SQL zusammensetzen ----------
const tag = `links_${randomBytes(6).toString("hex")}`;
const json = JSON.stringify(eingabe);
if (json.includes(tag)) abbruch("Abbruch: interner Fehler beim Zusammensetzen (Trennzeichen kommt im Inhalt vor).");
const literal = `$${tag}$${json}$${tag}$::jsonb`;
const mitBegleit = arg["mit-begleitkursen"];

const sql = `
\\set ON_ERROR_STOP 1
\\set VERBOSITY terse
\\pset footer off
set client_min_messages = warning;
begin;
${readFileSync(join(HIER, "live-links", "live-links.sql"), "utf8")}

select pg_temp.live_links(${literal}, 1, ${mitBegleit}) \\g /dev/null
select pg_temp.live_links(${literal}, 2, ${mitBegleit}) \\g /dev/null

\\echo
\\echo '== Ergebnis je Zeile (erster Durchgang; Anzahl Live-Termine) =='
select z.zeile as "Zeile", z.eintrag as "Eintrag", z.domain as "Domain",
       count(t.live_session_id) as "Termine",
       count(*) filter (where nullif(btrim(t.alt), '') is null) as "neu",
       count(*) filter (where nullif(btrim(t.alt), '') is not null and t.alt is distinct from t.link) as "geändert",
       count(*) filter (where t.alt = t.link) as "unverändert",
       z.begleit_ausgelassen as "Begleitkurs ausgelassen"
  from live_link_zeile z
  join live_link_ziel t on t.lauf = z.lauf and t.zeile = z.zeile
 where z.lauf = 1
 group by z.zeile, z.eintrag, z.domain, z.begleit_ausgelassen
 order by z.zeile;

\\echo '== Meldungen =='
select art as "Art", text as "Meldung" from live_link_meldung where lauf = 1 order by nr;

\\echo '== Zweiter Durchgang (muss leer sein) =='
select zeile as "Zeile", count(*) as "noch abweichend"
  from live_link_ziel where lauf = 2 and alt is distinct from link
 group by zeile order by zeile;
do $$ begin
  if exists (select 1 from live_link_ziel where lauf = 2 and alt is distinct from link) then
    raise exception 'Abbruch: Der zweite Durchgang hätte etwas geändert -- nicht idempotent.';
  end if;
end $$;

${arg.ausfuehren ? "commit;\n\\echo '== GESPEICHERT (COMMIT) =='" : "rollback;\n\\echo '== PROBELAUF: nichts gespeichert (ROLLBACK) =='"}
`;

console.log(`\n== Datenbank: ${ziel.label}, ${arg.ausfuehren ? "ECHTER LAUF" : "Probelauf"}${mitBegleit ? ", mit Begleitkursen" : ""} ==`);

const ergebnis = spawnSync(
  psqlPfad(),
  [
    `host=${ziel.host} port=5432 dbname=postgres user=postgres.${ziel.ref} sslmode=require`,
    "-X",
    "-q",
    "-P",
    "pager=off",
  ],
  { input: sql, stdio: ["pipe", "inherit", "inherit"], env: { ...process.env, PGPASSWORD: passwort() } }
);
process.exit(ergebnis.status ?? 1);
