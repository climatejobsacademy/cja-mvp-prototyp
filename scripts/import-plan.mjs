#!/usr/bin/env node
// scripts/import-plan.mjs
//
// Importiert Module, Wochen, Kompetenzen, Teilschritte, Aufträge, Theorietage
// und Termine aus der Importvorlage von Content & Learning (Excel) in
// Supabase. Erstes Paket: Modul I (Rest) und Modul II (Entscheidungen
// 2026-10-13; SR-05, SR-71, SR-78). Anleitung: docs/import-plan.md.
//
//   node scripts/import-plan.mjs --datei <pfad.xlsx> --nur-analyse
//   node scripts/import-plan.mjs --datei <pfad.xlsx> --ziel staging \
//        --trainer-datei <trainer-staging.csv> --kohorte "Energiehelden 28.09.26"
//   node scripts/import-plan.mjs ... --ausfuehren                       (speichert)
//   node scripts/import-plan.mjs --datei <pfad.xlsx> --ziel staging --trainer-datei <…staging.csv> --nur-trainer
//        (nur Trainer-Konten verknüpfen: alle aus dem Tab Trainer, sonst nichts)
//   node scripts/import-plan.mjs ... --ziel production --production-freigabe [--ausfuehren]
//
// Standard ist der Probelauf: alles läuft in einer Transaktion, die am Ende
// zurückgerollt wird (ROLLBACK). Im selben Lauf wird der Import ein zweites
// Mal ausgeführt; ändert der zweite Durchgang etwas, bricht das Skript ab
// (Idempotenz). Erst mit --ausfuehren wird gespeichert (COMMIT).
//
// Die Excel-Datei enthält Trainer-Namen, die Trainer-Datei E-Mail-Adressen:
// beide nicht ins Repo kopieren. Das Skript liest sie nur über die Parameter,
// gibt keine Adressen aus und schreibt den Plan nirgends auf die Platte (psql
// bekommt ihn über stdin). Auf Staging nur eine Trainer-Datei mit "staging"
// im Namen (Test-Adressen), weil Staging echte Mails über Brevo verschickt. Das Datenbank-Passwort kommt aus PGPASSWORD
// oder dem macOS-Schlüsselbund und wird nie ausgegeben.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { randomBytes } from "node:crypto";

import { erstellePlan } from "./import-plan/plan.mjs";
import { leseXlsx } from "./import-plan/xlsx.mjs";

const HIER = dirname(fileURLToPath(import.meta.url));

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
  node scripts/import-plan.mjs --datei <pfad.xlsx> --nur-analyse
  node scripts/import-plan.mjs --datei <pfad.xlsx> --ziel staging|production
       [--trainer-datei <pfad.csv>] [--kohorte "Name" | --kohorte "Name@+7"]...
       [--module I,II] [--ohne-praxis II] [--production-freigabe]
       [--ohne-zuordnung-erlauben] [--nur-trainer] [--ausfuehren]`;

function abbruch(text) {
  console.error(text);
  process.exit(1);
}

const { values: arg } = parseArgs({
  options: {
    datei: { type: "string" },
    ziel: { type: "string" },
    kohorte: { type: "string", multiple: true, default: [] },
    module: { type: "string", default: "I,II" },
    "trainer-datei": { type: "string" },
    "ohne-praxis": { type: "string", default: "" },
    "ohne-zuordnung-erlauben": { type: "boolean", default: false },
    "nur-trainer": { type: "boolean", default: false },
    "nur-analyse": { type: "boolean", default: false },
    ausfuehren: { type: "boolean", default: false },
    "production-freigabe": { type: "boolean", default: false },
    hilfe: { type: "boolean", default: false },
  },
});

if (arg.hilfe) {
  console.log(NUTZUNG);
  process.exit(0);
}
if (!arg.datei) abbruch(`--datei fehlt.\n${NUTZUNG}`);
if (!existsSync(arg.datei)) abbruch(`Datei nicht gefunden: ${arg.datei}`);

// ---------- Excel lesen und Plan bauen ----------
let plan;
try {
  const kommaListe = (wert) => wert.split(",").map((m) => m.trim()).filter(Boolean);
  plan = erstellePlan(leseXlsx(arg.datei), { module: kommaListe(arg.module), ohnePraxis: kommaListe(arg["ohne-praxis"]) });
} catch (fehler) {
  abbruch(`Abbruch beim Lesen der Excel: ${fehler.message}`);
}

const kohorten = arg.kohorte.map((eintrag) => {
  const m = /^(.+?)(?:@([+-]\d+))?$/.exec(eintrag.trim());
  return { name: m[1].trim(), versatz: m[2] ? Number(m[2]) : 0 };
});

function zeigeAnalyse() {
  const { typregel, ohneZuordnung } = plan.analyse;
  const schritte = (liste) => new Set(liste.map((x) => x.teilschritt)).size;
  console.log("\n== Excel ==");
  console.log(
    `Module ${plan.module.length}, Wochen ${plan.wochen.length}, Kompetenzen ${plan.kompetenzen.length}, ` +
      `Teilschritte ${plan.teilschritte.length}, Aufträge ${plan.auftraege.length}, Theorietag-Kurse ${plan.kurse.length}, ` +
      `Begleitkurse ${plan.begleitkurse.length}, Termine ${plan.termine.length}, Trainer:innen ${plan.trainer.length}`
  );
  console.log(
    `Zuordnungen: Lektion ↔ theoretisch ${plan.lektionZuordnungen.length}, Auftrag ↔ praktisch ${plan.auftragZuordnungen.length}`
  );
  console.log(`\n== Typ-Regel SR-71: nicht importiert ==`);
  console.log(
    `Theoretische Teilschritte an Aufträgen: ${schritte(typregel.theoretischAnAuftrag)} Teilschritte, ${typregel.theoretischAnAuftrag.length} Zuordnungen`
  );
  for (const [k, z] of gruppiere(typregel.theoretischAnAuftrag, "auftrag")) console.log(`  ${k}: ${z.join(", ")}`);
  console.log(
    `Praktische Teilschritte an Theorietagen: ${schritte(typregel.praktischAnTheorietag)} Teilschritte, ${typregel.praktischAnTheorietag.length} Zuordnungen`
  );
  for (const [k, z] of gruppiere(typregel.praktischAnTheorietag, "theorietag")) console.log(`  ${k}: ${z.join(", ")}`);
  console.log(`\n== Teilschritte ohne jede Zuordnung (${ohneZuordnung.length}) ==`);
  for (const o of ohneZuordnung) {
    console.log(`  ${o.teilschritt} (${o.typ}) – Theorietag: ${o.theorietage.join(", ") || "–"}; Aufträge: ${o.auftraege.join(", ") || "–"}`);
  }
  console.log(`\n== Nicht importiert (${plan.analyse.nichtImportiert.length}) ==`);
  for (const z of plan.analyse.nichtImportiert) console.log(`  - ${z}`);
  console.log(`\n== Meldungen aus der Excel (${plan.meldungen.length}) ==`);
  for (const m of plan.meldungen) console.log(`  [${m.art}] ${m.text}`);
}

function gruppiere(liste, feld) {
  const karte = new Map();
  for (const x of liste) {
    if (!karte.has(x.teilschritt)) karte.set(x.teilschritt, []);
    karte.get(x.teilschritt).push(x[feld]);
  }
  return karte;
}

zeigeAnalyse();
if (arg["nur-analyse"]) process.exit(0);

// ---------- Ziel und Freigaben ----------
const ziel = ZIELE[arg.ziel];
if (!ziel) abbruch(`--ziel staging oder --ziel production angeben.\n${NUTZUNG}`);
if (arg.ziel === "production" && !arg["production-freigabe"]) {
  abbruch("Abbruch: Production nur mit --production-freigabe (auch für den Probelauf).");
}
const nurTrainer = arg["nur-trainer"];
if (nurTrainer) {
  if (!arg["trainer-datei"]) abbruch("Abbruch: --nur-trainer braucht --trainer-datei.");
  plan.trainer = plan.trainerAlle;
}
if (!nurTrainer && arg.ziel === "production" && plan.analyse.ohneZuordnung.length && !arg["ohne-zuordnung-erlauben"]) {
  abbruch(
    `Abbruch: ${plan.analyse.ohneZuordnung.length} Teilschritte ohne jede Zuordnung (Liste oben). ` +
      "Production erst nach Korrektur in der Excel, oder bewusst mit --ohne-zuordnung-erlauben."
  );
}

// ---------- Trainer-Datei (Kennung, E-Mail[, Anzeigename]) ----------
// Optionale dritte Spalte Anzeigename: ersetzt den Namen aus der Excel beim
// ersten Anlegen der Person (z. B. TR-02 "Simon & Tom" in der Excel -> Simon,
// Entscheidung 2026-10-14: ein Trainer je Termin).
plan.trainerKonten = [];
if (arg["trainer-datei"]) {
  const pfad = arg["trainer-datei"];
  const name = basename(pfad).toLowerCase();
  if (!name.endsWith(".csv")) abbruch(`Abbruch: Trainer-Datei muss reine CSV sein (.csv), nicht ${basename(pfad)}.`);
  if (arg.ziel === "staging" && !name.includes("staging")) {
    abbruch("Abbruch: Auf Staging nur eine Trainer-Datei mit „staging“ im Namen (Test-Adressen, Staging verschickt echte Mails).");
  }
  if (arg.ziel === "production" && name.includes("staging")) abbruch("Abbruch: Staging-Trainer-Datei nicht für Production verwenden.");
  if (!existsSync(pfad)) abbruch(`Trainer-Datei nicht gefunden: ${pfad}`);
  const zeilen = readFileSync(pfad, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/).map((z) => z.trim()).filter(Boolean);
  const kopf = zeilen.shift()?.split(/[,;]/).map((k) => k.trim());
  if (kopf?.[0] !== "Kennung" || kopf?.[1] !== "E-Mail" || (kopf.length > 2 && kopf[2] !== "Anzeigename")) {
    abbruch("Abbruch: Trainer-Datei braucht den Kopf „Kennung,E-Mail“ (optional „,Anzeigename“).");
  }
  const gesehen = new Set();
  for (const zeile of zeilen) {
    const [kennung, email, anzeigename] = zeile.split(/[,;]/).map((w) => w.trim());
    if (gesehen.has(kennung)) abbruch(`Abbruch: Kennung ${kennung} steht mehrfach in der Trainer-Datei.`);
    gesehen.add(kennung);
    if (!/^TR-\d+$/.test(kennung ?? "") || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email ?? "")) {
      abbruch(`Abbruch: Trainer-Datei, ungültige Zeile für ${kennung || "(ohne Kennung)"}.`);
    }
    if (plan.trainer.some((t) => t.kennung === kennung)) plan.trainerKonten.push({ kennung, email, anzeigename: anzeigename || null });
  }
}
const ohneAdresse = plan.trainer.filter((t) => !plan.trainerKonten.some((k) => k.kennung === t.kennung)).map((t) => t.kennung);
if (ohneAdresse.length) console.log(`\nHinweis: keine E-Mail für ${ohneAdresse.join(", ")} – deren Termine ohne Trainer:in.`);

if (!kohorten.length && !nurTrainer) {
  console.log("\nHinweis: keine --kohorte angegeben, es werden nur Inhalte und Kompetenzen importiert, keine Termine.");
}

if (arg.ausfuehren && arg.ziel === "production") {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const eingabe = await rl.question(`\nEchter Import nach ${ziel.label}. Zur Bestätigung die Projekt-Ref eintippen: `);
  rl.close();
  if (eingabe.trim() !== ziel.ref) abbruch("Abbruch: Ref stimmt nicht.");
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
  return existsSync(brew) ? brew : "psql";
}

// ---------- SQL zusammensetzen ----------
const tag = `plan_${randomBytes(6).toString("hex")}`;
const literal = (wert) => `$${tag}$${JSON.stringify(wert)}$${tag}$::jsonb`;

const sql = `
\\set ON_ERROR_STOP 1
\\pset footer off
set client_min_messages = warning;
begin;
${readFileSync(join(HIER, "import-plan", "import.sql"), "utf8")}

${nurTrainer
  ? `select pg_temp.trainer_verknuepfen(${literal(plan)}, 1) \\g /dev/null
select pg_temp.trainer_verknuepfen(${literal(plan)}, 2) \\g /dev/null`
  : `select pg_temp.import_plan(${literal(plan)}, ${literal(kohorten)}, 1) \\g /dev/null
select pg_temp.import_plan(${literal(plan)}, ${literal(kohorten)}, 2) \\g /dev/null`}
set constraints all immediate;

\\echo
\\echo '== Ergebnis je Tabelle (erster Durchgang) =='
select tabelle as "Tabelle",
       coalesce(sum(anzahl) filter (where aktion = 'neu'), 0) as "neu",
       coalesce(sum(anzahl) filter (where aktion = 'geändert'), 0) as "geändert",
       coalesce(sum(anzahl) filter (where aktion = 'gelöscht'), 0) as "gelöscht",
       coalesce(sum(anzahl) filter (where aktion = 'unverändert'), 0) as "unverändert"
  from import_bericht where lauf = 1
 group by tabelle order by min(nr);

\\echo '== Meldungen aus der Datenbank =='
select art as "Art", text as "Meldung" from import_meldung where lauf = 1 order by nr;

\\echo '== Zweiter Durchgang (muss leer sein) =='
select tabelle, aktion, anzahl from import_bericht
 where lauf = 2 and aktion <> 'unverändert' and anzahl > 0;
do $$ begin
  if exists (select 1 from import_bericht where lauf = 2 and aktion <> 'unverändert' and anzahl > 0) then
    raise exception 'Abbruch: Der zweite Durchgang hätte etwas geändert -- Import ist nicht idempotent.';
  end if;
end $$;

${arg.ausfuehren ? "commit;\n\\echo '== GESPEICHERT (COMMIT) =='" : "rollback;\n\\echo '== PROBELAUF: nichts gespeichert (ROLLBACK) =='"}
`;

console.log(`\n== Datenbank: ${ziel.label}, ${arg.ausfuehren ? "ECHTER LAUF" : "Probelauf"}${nurTrainer ? ", nur Trainer-Konten" : ""} ==`);
console.log(`Kohorten: ${kohorten.map((k) => `${k.name}${k.versatz ? ` (Versatz ${k.versatz > 0 ? "+" : ""}${k.versatz} Tage)` : ""}`).join(", ") || "–"}`);

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
