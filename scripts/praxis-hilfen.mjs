#!/usr/bin/env node
// scripts/praxis-hilfen.mjs
//
// Spielt Hilfsunterlagen je Praxisaufgabe ein (SR-68, Migration 0069; auch
// die Unterlagen des Labortags, SR-94): lädt die Dateien in den Bucket
// lesson-resources (Ordner praxis-hilfen/) und legt file_asset und
// field_job_type_resource an. Dateien als "Datei" oder "Ordner/Datei"
// relativ zu --ordner. Anleitung: docs/praxis-hilfen-einspielen.md.
//
//   node scripts/praxis-hilfen.mjs --datei <zuordnung.csv> --ordner <dateien> --ziel staging              (Probelauf)
//   node scripts/praxis-hilfen.mjs --datei <zuordnung.csv> --ordner <dateien> --ziel staging --ausfuehren
//   node scripts/praxis-hilfen.mjs ... --ziel production --production-freigabe [--ausfuehren]
//
// Standard ist der Probelauf: liest die Datenbank, zeigt, was hochgeladen
// würde, und schreibt in einer Transaktion, die zurückgerollt wird. Er lädt
// nichts hoch. Erst mit --ausfuehren (und der eingetippten Projekt-Ref):
// fehlende Dateien hochladen (nie überschreiben), dann eintragen (COMMIT).
// Ein zweiter Lauf mit derselben Liste ändert nichts.
//
// Sicherungen wie scripts/scorm-einspielen.mjs: Hochladen nur mit der
// Supabase CLI und --project-ref, nie --linked, nur "storage cp". Datenbank
// über psql, Passwort aus PGPASSWORD oder dem macOS-Schlüsselbund, nie
// ausgegeben. Keine Personendaten in der Ausgabe.

import { execFileSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { BUCKET, MAX_BYTES, leseZuordnung } from "./praxis-hilfen/eingabe.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SUPABASE_CLI = ["--yes", "supabase@2.117.0"];

const ZIELE = {
  staging: { ref: "keijrwvegmwgpvprpoxa", label: "Staging (Irland)", host: "aws-1-eu-west-1.pooler.supabase.com", schluesselbund: "cja-db-irl" },
  production: { ref: "vqfnmkcfjsudsujiuoqm", label: "Production (Frankfurt)", host: "aws-1-eu-central-1.pooler.supabase.com", schluesselbund: "cja-db-fra" },
};

function abbruch(text) {
  console.error(text);
  process.exit(1);
}

let arg;
try {
  ({ values: arg } = parseArgs({
    options: {
      datei: { type: "string" },
      ordner: { type: "string" },
      ziel: { type: "string" },
      ausfuehren: { type: "boolean", default: false },
      "production-freigabe": { type: "boolean", default: false },
    },
  }));
} catch (e) {
  abbruch(e.message);
}
if (!arg.datei || !arg.ziel) abbruch("Nutzung: --datei <zuordnung.csv> [--ordner <dateien>] --ziel staging|production [--production-freigabe] [--ausfuehren]");
const ziel = ZIELE[arg.ziel];
if (!ziel) abbruch("--ziel muss staging oder production sein.");
if (arg.ziel === "production" && !arg["production-freigabe"]) abbruch("Production nur mit --production-freigabe.");

// ---------- Liste und Dateien prüfen ----------
const { eintraege, fehler } = leseZuordnung(readFileSync(resolve(arg.datei), "utf8"));
if (fehler.length) abbruch(`Die Liste hat Fehler:\n  ${fehler.join("\n  ")}`);
if (!eintraege.length) abbruch("Die Liste hat keine Einträge.");

const mitDatei = eintraege.filter((e) => e.datei);
if (mitDatei.length && !arg.ordner) abbruch("--ordner fehlt (Ordner mit den Dateien der Liste).");
const objekte = new Map(); // objekt -> { lokal, mime, groesse }
for (const e of mitDatei) {
  const lokal = join(resolve(arg.ordner), ...e.datei.split("/"));
  if (!existsSync(lokal)) abbruch(`Zeile ${e.zeile}: Datei „${e.datei}“ nicht im Ordner.`);
  const groesse = statSync(lokal).size;
  if (groesse > MAX_BYTES) abbruch(`Zeile ${e.zeile}: „${e.datei}“ ist größer als 50 MB.`);
  const vorher = objekte.get(e.objekt);
  if (vorher && vorher.lokal !== lokal) abbruch(`Zeile ${e.zeile}: „${e.datei}“ ergibt denselben Speichernamen wie eine andere Datei. Bitte umbenennen.`);
  objekte.set(e.objekt, { lokal, mime: e.mime, groesse });
}

if (arg.ausfuehren) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const antwort = await rl.question(`\nEchter Lauf nach ${ziel.label}. Zur Bestätigung die Projekt-Ref eintippen: `);
  rl.close();
  if (antwort.trim() !== ziel.ref) abbruch("Abbruch: Ref stimmt nicht.");
}

// ---------- Datenbank ----------
function passwort() {
  if (process.env.PGPASSWORD) return process.env.PGPASSWORD;
  try {
    return execFileSync("security", ["find-generic-password", "-s", ziel.schluesselbund, "-w"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    abbruch(`Kein Passwort: PGPASSWORD setzen oder Schlüsselbund-Eintrag ${ziel.schluesselbund} anlegen.`);
  }
}
function psqlPfad() {
  if (process.env.PSQL) return process.env.PSQL;
  for (const p of ["/opt/homebrew/opt/postgresql@17/bin/psql", "/Applications/Postgres.app/Contents/Versions/latest/bin/psql"]) if (existsSync(p)) return p;
  return "psql";
}
const dbPasswort = passwort();
function psql(sql, { ausgabeFangen = false } = {}) {
  return spawnSync(
    psqlPfad(),
    [`host=${ziel.host} port=5432 dbname=postgres user=postgres.${ziel.ref} sslmode=require`, "-X", "-q", "-P", "pager=off", ...(ausgabeFangen ? ["-A", "-t"] : [])],
    { input: sql, encoding: "utf8", maxBuffer: 16 * 1024 * 1024, stdio: ["pipe", ausgabeFangen ? "pipe" : "inherit", "inherit"], env: { ...process.env, PGPASSWORD: dbPasswort } }
  );
}
function jsonLiteral(wert) {
  const tag = `h_${randomBytes(6).toString("hex")}`;
  const json = JSON.stringify(wert);
  if (json.includes(tag)) abbruch("Abbruch: interner Fehler beim Zusammensetzen.");
  return `$${tag}$${json}$${tag}$::jsonb`;
}

const eingabe = {
  aufgaben: [...new Set(eintraege.map((e) => e.aufgabe))],
  objekte: [...objekte.keys()],
};
console.log(`\n== Datenbank lesen: ${ziel.label}, ${arg.ausfuehren ? "ECHTER LAUF" : "Probelauf"} ==`);
const gelesen = psql(
  `\\set ON_ERROR_STOP 1
set client_min_messages = warning;
begin read only;
with e as (select ${jsonLiteral(eingabe)} as j)
select json_build_object(
  'aufgaben', (select coalesce(json_agg(json_build_object('titel', a, 'ids', (select coalesce(json_agg(t.id), '[]') from field_job_type t where t.titel = a))), '[]')
               from e, jsonb_array_elements_text(e.j -> 'aufgaben') a),
  'vorhanden', (select coalesce(json_agg(o.name), '[]') from e, storage.objects o
                where o.bucket_id = '${BUCKET}' and o.name in (select jsonb_array_elements_text(e.j -> 'objekte'))),
  'tabelle', to_regclass('public.field_job_type_resource') is not null
);
rollback;`,
  { ausgabeFangen: true }
);
if (gelesen.status !== 0) abbruch("Abbruch: Datenbank nicht lesbar (Meldung von psql oben).");
const db = JSON.parse(gelesen.stdout.trim().split("\n").filter(Boolean).at(-1));
if (!db.tabelle) abbruch("Abbruch: Tabelle field_job_type_resource fehlt. Erst Migration 0069 anwenden.");

const aufgabeId = new Map();
const aufgabeFehler = [];
for (const a of db.aufgaben) {
  if (a.ids.length === 1) aufgabeId.set(a.titel, a.ids[0]);
  else aufgabeFehler.push(`„${a.titel}“: ${a.ids.length === 0 ? "keine Praxisaufgabe mit diesem Titel" : `${a.ids.length} Praxisaufgaben mit diesem Titel`}`);
}
if (aufgabeFehler.length) abbruch(`Abbruch, Praxisaufgaben nicht eindeutig:\n  ${aufgabeFehler.join("\n  ")}`);

const vorhanden = new Set(db.vorhanden);
const hochladen = [...objekte.entries()].filter(([name]) => !vorhanden.has(name));
console.log(`Praxisaufgaben: ${aufgabeId.size}, Zeilen: ${eintraege.length} (Dateien ${mitDatei.length}, Links ${eintraege.length - mitDatei.length})`);
console.log(`Dateien im Bucket schon vorhanden: ${objekte.size - hochladen.length}, hochzuladen: ${hochladen.length}`);

// ---------- Hochladen (nur mit --ausfuehren) ----------
if (arg.ausfuehren) {
  let n = 0;
  for (const [name, o] of hochladen) {
    const args = [...SUPABASE_CLI, "storage", "cp", o.lokal, `ss:///${BUCKET}/${name}`, "--experimental", "--project-ref", ziel.ref, "--content-type", o.mime];
    const env = { ...process.env };
    delete env.PGPASSWORD;
    const r = spawnSync("npx", args, { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env });
    if (r.status !== 0) abbruch(`Abbruch beim Hochladen von ${name} (Status ${r.status}). Nichts eingetragen; ein neuer Lauf erkennt Hochgeladenes als vorhanden.`);
    console.log(`  [${++n}/${hochladen.length}] ${name}`);
  }
}

// ---------- Eintragen (eine Transaktion) ----------
const zeilen = eintraege.map((e) => ({
  zeile: e.zeile,
  typ_id: aufgabeId.get(e.aufgabe),
  reihenfolge: e.reihenfolge,
  titel: e.titel,
  objekt: e.objekt,
  dateiname: e.anzeige,
  mime: e.mime,
  link: e.link,
}));
const echt = arg.ausfuehren;
const ergebnis = psql(`\\set ON_ERROR_STOP 1
\\set VERBOSITY terse
set client_min_messages = notice;
begin;
create temp table hilfen_bericht (lauf int, aktion text) on commit drop;
create function pg_temp.hilfen(p jsonb, p_lauf int) returns void language plpgsql as $f$
declare z jsonb; v_asset uuid; v_alt field_job_type_resource;
begin
  for z in select * from jsonb_array_elements(p) loop
    v_asset := null;
    if z ->> 'objekt' is not null then
      select id into v_asset from file_asset where storage_pfad = z ->> 'objekt' order by created_at limit 1;
      if v_asset is null then
        insert into file_asset (dateiname, dateityp, storage_pfad) values (z ->> 'dateiname', z ->> 'mime', z ->> 'objekt') returning id into v_asset;
      end if;
    end if;
    select * into v_alt from field_job_type_resource
     where field_job_type_id = (z ->> 'typ_id')::uuid and reihenfolge = (z ->> 'reihenfolge')::int;
    if v_alt.id is null then
      insert into field_job_type_resource (field_job_type_id, reihenfolge, typ, titel, file_asset_id, external_url)
      values ((z ->> 'typ_id')::uuid, (z ->> 'reihenfolge')::int, case when v_asset is null then 'link' else 'datei' end,
              z ->> 'titel', v_asset, z ->> 'link');
      insert into hilfen_bericht values (p_lauf, 'neu');
    elsif v_alt.titel is distinct from z ->> 'titel' or v_alt.file_asset_id is distinct from v_asset or v_alt.external_url is distinct from z ->> 'link' then
      update field_job_type_resource
         set typ = case when v_asset is null then 'link' else 'datei' end, titel = z ->> 'titel', file_asset_id = v_asset, external_url = z ->> 'link'
       where id = v_alt.id;
      insert into hilfen_bericht values (p_lauf, 'geändert');
    else
      insert into hilfen_bericht values (p_lauf, 'unverändert');
    end if;
  end loop;
end $f$;
select pg_temp.hilfen(${jsonLiteral(zeilen)}, 1) \\g /dev/null
select pg_temp.hilfen(${jsonLiteral(zeilen)}, 2) \\g /dev/null
\\echo '== Ergebnis (erster Durchgang) =='
select aktion as "Aktion", count(*) as "Zeilen" from hilfen_bericht where lauf = 1 group by aktion order by aktion;
do $d$ begin
  if exists (select 1 from hilfen_bericht where lauf = 2 and aktion <> 'unverändert') then
    raise exception 'Abbruch: Der zweite Durchgang hätte etwas geändert -- nicht idempotent.';
  end if;
end $d$;
${echt ? "commit;\n\\echo '== GESPEICHERT (COMMIT) =='" : "rollback;\n\\echo '== PROBELAUF: nichts hochgeladen, Datenbank zurückgerollt (ROLLBACK) =='"}
`);
process.exit(ergebnis.status ?? 1);
