#!/usr/bin/env node
// scripts/lernende-anlegen.mjs
//
// SR-48: Richtet Lernende an vorhandenen Auth-Konten ein (person,
// org_membership, role_assignment learner, aktive enrolment), sodass sie sich
// danach selbst per Magic Link anmelden können. Anleitung:
// docs/lernende-anlegen.md.
//
//   node scripts/lernende-anlegen.mjs --datei <lernende-staging.csv> --nur-pruefen
//   node scripts/lernende-anlegen.mjs --datei <lernende-staging.csv> --ziel staging            (Probelauf)
//   node scripts/lernende-anlegen.mjs --datei <lernende-staging.csv> --ziel staging --ausfuehren
//   node scripts/lernende-anlegen.mjs --datei <lernende.csv> --ziel production --production-freigabe [--ausfuehren]
//   … --plan-datei <plan.xlsx> --trainer-datei <trainer-….csv> [--kohorte "Name@+7"] [--ohne-praxis II]
//        (danach Plan-Import für die Kohorten der Liste, damit die Lernenden ihre Praxistage bekommen)
//
// Praxistage (field_job, schedule_entry mit enrolment_id) hängen an der
// Einschreibung und entstehen nur über scripts/import-plan.mjs (Entscheidung
// Anna 18.10., „Variante B“). Mit --plan-datei ruft dieses Skript nach seinem
// eigenen Teil den Plan-Import als Kindprozess auf: im Probelauf ebenfalls
// als Probelauf; im echten Lauf erst als Probelauf, dann nach „ja“ mit
// --ausfuehren (Production fragt dort zusätzlich die Ref ab). Nach jedem
// echten Lauf zählt eine lesende Kontrolle, wie viele aktive Einschreibungen
// der Kohorten keine eigenen Praxistage haben, obwohl die Kohorte welche hat.
//
// Die Auth-Konten legt AfCJ im Supabase-Dashboard an (Authentication → Users →
// Add user → Create new user, Auto Confirm, keine Einladung). Das Skript
// sucht sie nur über die E-Mail in auth.users und schreibt nie dorthin. Es
// verschickt keine Mail (nicht scripts/invite-learner.mjs verwenden).
//
// Standard ist der Probelauf: alles läuft in einer Transaktion, die am Ende
// zurückgerollt wird (ROLLBACK). Im selben Lauf wird alles ein zweites Mal
// ausgeführt; legt der zweite Durchgang etwas an, bricht das Skript ab
// (Idempotenz). Erst mit --ausfuehren wird gespeichert (COMMIT), und nur, wenn
// keine Zeile einen Konflikt hat und jedes Auth-Konto da ist.
//
// Die CSV enthält Namen und E-Mail-Adressen: nicht ins Repo legen. Das Skript
// gibt keine Adresse im Klartext aus (nur maskiert, t***@example.org), keinen
// Namen, schreibt nichts auf die Platte (psql bekommt alles über stdin) und
// stellt psql auf knappe Fehlermeldungen (VERBOSITY terse), damit psql bei
// einem Fehler keine Zeile der Anfrage zeigt. Das Datenbank-Passwort kommt aus
// PGPASSWORD oder dem macOS-Schlüsselbund und wird nie ausgegeben.

import { execFileSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { leseLernendeDatei, pruefeDateiZiel, pruefeDemo } from "./lernende-anlegen/eingabe.mjs";
import {
  analyseArgumente,
  befehlAlsText,
  bewerteKontrolle,
  importPlanArgumente,
  istJa,
  kohortenFuerImport,
  kontrolleSql,
  leseKontrolle,
  pruefePlanDateien,
} from "./lernende-anlegen/plan-import.mjs";

const HIER = dirname(fileURLToPath(import.meta.url));

// Wie in scripts/import-plan.mjs
const ZIELE = {
  staging: {
    ref: "keijrwvegmwgpvprpoxa",
    label: "Staging (Irland)",
    host: "aws-1-eu-west-1.pooler.supabase.com",
    schluesselbund: "cja-db-irl",
    app: "https://cja-mvp-prototyp-git-dev-af-cj-s.vercel.app/login",
  },
  production: {
    ref: "vqfnmkcfjsudsujiuoqm",
    label: "Production (Frankfurt)",
    host: "aws-1-eu-central-1.pooler.supabase.com",
    schluesselbund: "cja-db-fra",
    app: "https://learn.climatejobsacademy.com/login",
  },
};

const NUTZUNG = `Nutzung:
  node scripts/lernende-anlegen.mjs --datei <pfad.csv> --nur-pruefen [--ziel staging|production]
  node scripts/lernende-anlegen.mjs --datei <pfad.csv> --ziel staging|production
       [--programm EFK-EE] [--production-freigabe] [--ausfuehren]
       [--plan-datei <plan.xlsx> --trainer-datei <trainer-….csv>
        [--kohorte "Name@+7"]... [--module I,II] [--ohne-praxis II] [--ohne-zuordnung-erlauben]]
  Mit --plan-datei läuft danach der Plan-Import für die Kohorten der Liste (Praxistage je Einschreibung).
  CSV: E-Mail,Vorname,Nachname,Rufname,Betrieb,Kohorte   (Rufname optional, sonst Vorname)`;

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
      programm: { type: "string", default: "EFK-EE" },
      "nur-pruefen": { type: "boolean", default: false },
      ausfuehren: { type: "boolean", default: false },
      "production-freigabe": { type: "boolean", default: false },
      "plan-datei": { type: "string" },
      "trainer-datei": { type: "string" },
      kohorte: { type: "string", multiple: true, default: [] },
      module: { type: "string" },
      "ohne-praxis": { type: "string" },
      "ohne-zuordnung-erlauben": { type: "boolean", default: false },
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
if (!/^[A-Za-z0-9-]{1,30}$/.test(arg.programm)) abbruch("Abbruch: --programm ist kein gültiges Kürzel (z. B. EFK-EE).");

// ---------- Datei prüfen und lesen ----------
let eintraege;
try {
  pruefeDateiZiel(arg.datei, arg.ziel);
  if (!existsSync(arg.datei)) throw new Error("Lernenden-Datei nicht gefunden.");
  eintraege = leseLernendeDatei(readFileSync(arg.datei, "utf8"));
  pruefeDemo(eintraege);
} catch (fehler) {
  abbruch(`Abbruch:\n${fehler.message}`);
}

// ---------- Plan-Import (optional): vor jeder Datenbank-Verbindung prüfen ----------
const listenKohorten = [...new Set(eintraege.map((e) => e.kohorte))];
const IMPORT_PLAN = join(HIER, "import-plan.mjs");
let planOpts = null;
if (arg["plan-datei"]) {
  try {
    pruefePlanDateien({ planDatei: arg["plan-datei"], trainerDatei: arg["trainer-datei"], ziel: arg.ziel });
    if (!existsSync(arg["plan-datei"])) throw new Error("Plan-Datei nicht gefunden.");
    if (!existsSync(arg["trainer-datei"])) throw new Error("Trainer-Datei nicht gefunden.");
    planOpts = {
      planDatei: arg["plan-datei"],
      ziel: arg.ziel,
      productionFreigabe: arg["production-freigabe"],
      trainerDatei: arg["trainer-datei"],
      kohorten: kohortenFuerImport(listenKohorten, arg.kohorte),
      module: arg.module,
      ohnePraxis: arg["ohne-praxis"],
      ohneZuordnungErlauben: arg["ohne-zuordnung-erlauben"],
    };
  } catch (fehler) {
    abbruch(`Abbruch:\n${fehler.message}`);
  }
} else if (
  arg["trainer-datei"] || arg.kohorte.length || arg.module !== undefined || arg["ohne-praxis"] !== undefined || arg["ohne-zuordnung-erlauben"]
) {
  abbruch("Abbruch: --trainer-datei, --kohorte, --module, --ohne-praxis und --ohne-zuordnung-erlauben nur zusammen mit --plan-datei.");
}

console.log(`\n== Lernenden-Datei: ${eintraege.length} Zeilen ==`);
for (const e of eintraege) console.log(`  Zeile ${e.zeile}: ${e.maskiert} -> Betrieb „${e.betrieb}“, Kohorte „${e.kohorte}“`);
if (planOpts) {
  // Excel vorab lesen (import-plan --nur-analyse, keine Datenbank), damit ein
  // Fehler in der Plan-Datei auffällt, bevor Lernende gespeichert sind.
  const analyse = spawnSync(process.execPath, analyseArgumente({ ...planOpts, skript: IMPORT_PLAN }), { stdio: ["ignore", "ignore", "inherit"] });
  if (analyse.status !== 0) abbruch("Abbruch: Die Plan-Datei lässt sich nicht lesen (Meldung oben). Nichts angefasst.");
  console.log(`\n== Plan-Import danach: Kohorten ${planOpts.kohorten.map((k) => `„${k}“`).join(", ")} (Plan-Datei gelesen) ==`);
}
if (arg["nur-pruefen"]) {
  console.log("\nNur geprüft, keine Datenbank.");
  process.exit(0);
}

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
// Je Zeile: E-Mail (nur zum Suchen in auth.users), maskierte Adresse für die
// Ausgabe, Name, Rufname, Betrieb, Kohorte.
const zeilen = eintraege.map((e) => ({
  zeile: e.zeile,
  email: e.email,
  konto: e.maskiert,
  name: e.name,
  rufname: e.rufname,
  betrieb: e.betrieb,
  kohorte: e.kohorte,
}));
const tag = `lern_${randomBytes(6).toString("hex")}`;
const json = JSON.stringify(zeilen);
if (json.includes(tag)) abbruch("Abbruch: interner Fehler beim Zusammensetzen (Trennzeichen kommt im Inhalt vor).");
const literal = `$${tag}$${json}$${tag}$::jsonb`;
const programm = `'${arg.programm}'`;

const sql = `
\\set ON_ERROR_STOP 1
\\set VERBOSITY terse
\\pset footer off
set client_min_messages = warning;
begin;
${readFileSync(join(HIER, "lernende-anlegen", "anlegen.sql"), "utf8")}

select pg_temp.lernende_anlegen(${literal}, ${programm}, 1) \\g /dev/null
select pg_temp.lernende_anlegen(${literal}, ${programm}, 2) \\g /dev/null
set constraints all immediate;

\\echo
\\echo '== Ergebnis je Zeile (erster Durchgang) =='
select zeile as "Zeile", konto as "Konto", status as "Status", coalesce(hinweis, '') as "Hinweis"
  from lernende_zeile where lauf = 1 order by zeile;

\\echo '== Ergebnis je Tabelle (erster Durchgang) =='
select tabelle as "Tabelle",
       coalesce(sum(anzahl) filter (where aktion = 'neu'), 0) as "neu",
       coalesce(sum(anzahl) filter (where aktion = 'unverändert'), 0) as "unverändert"
  from lernende_bericht where lauf = 1
 group by tabelle order by min(nr);

\\echo '== Zweiter Durchgang (muss leer sein) =='
select zeile as "Zeile", konto as "Konto", status as "Status"
  from lernende_zeile where lauf = 2 and status in ('neu', 'ergänzt') order by zeile;
do $$ begin
  if exists (select 1 from lernende_bericht where lauf = 2 and aktion = 'neu' and anzahl > 0)
     or exists (select 1 from lernende_zeile where lauf = 2 and status in ('neu', 'ergänzt')) then
    raise exception 'Abbruch: Der zweite Durchgang hätte etwas angelegt -- nicht idempotent.';
  end if;
end $$;

${arg.ausfuehren
  ? `do $$ begin
  if exists (select 1 from lernende_zeile where lauf = 1 and status in ('Konflikt', 'Auth-Konto fehlt')) then
    raise exception 'Abbruch: Zeilen mit Konflikt oder ohne Auth-Konto (Liste oben). Nichts gespeichert. Erst klären oder die Zeilen aus der CSV nehmen.';
  end if;
end $$;
commit;
\\echo '== GESPEICHERT (COMMIT) =='`
  : "rollback;\n\\echo '== PROBELAUF: nichts gespeichert (ROLLBACK) =='"}
`;

console.log(`\n== Datenbank: ${ziel.label}, ${arg.ausfuehren ? "ECHTER LAUF" : "Probelauf"}, Programm ${arg.programm} ==`);

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
if (ergebnis.status !== 0) process.exit(ergebnis.status ?? 1);

// ---------- Plan-Import und Kontrolle ----------
const anzeigeOpts = planOpts ?? {
  planDatei: "<plan.xlsx>",
  ziel: arg.ziel,
  productionFreigabe: arg["production-freigabe"],
  trainerDatei: `<trainer-${arg.ziel}.csv>`,
  kohorten: listenKohorten,
};
const nachholBefehl = befehlAlsText(importPlanArgumente(anzeigeOpts));
const nachholText = `   ${nachholBefehl}
   (erst so als Probelauf, dann denselben Befehl mit --ausfuehren${planOpts ? "" : "; Kohorten mit Versatz als \"Name@+7\" angeben, siehe docs/import-plan.md"})`;

function importPlanLauf(ausfuehren, bestaetigung) {
  const argumente = importPlanArgumente({ ...planOpts, skript: IMPORT_PLAN }, { ausfuehren, bestaetigung });
  console.log(`\n== Plan-Import (${ausfuehren ? "ECHTER LAUF" : "Probelauf"}): ${befehlAlsText(importPlanArgumente(planOpts, { ausfuehren, bestaetigung }))} ==`);
  return spawnSync(process.execPath, argumente, { stdio: "inherit" }).status === 0;
}

function kontrolle() {
  const sqlKontrolle = kontrolleSql(listenKohorten, `k_${randomBytes(6).toString("hex")}`);
  const lauf = spawnSync(
    psqlPfad(),
    [`host=${ziel.host} port=5432 dbname=postgres user=postgres.${ziel.ref} sslmode=require`, "-X", "-q", "-A", "-t", "-P", "pager=off"],
    { input: sqlKontrolle, encoding: "utf8", stdio: ["pipe", "pipe", "inherit"], env: { ...process.env, PGPASSWORD: passwort() } }
  );
  console.log("\n== Kontrolle: Praxistage je aktiver Einschreibung ==");
  let ergebnisKontrolle;
  try {
    if (lauf.status !== 0) throw new Error("psql-Fehler");
    ergebnisKontrolle = bewerteKontrolle(leseKontrolle(lauf.stdout), listenKohorten);
  } catch {
    console.log(`WARNUNG: Kontrolle nicht möglich. Bitte prüfen, ob alle Lernenden Praxistage haben; sonst Plan-Import erneut ausführen:\n${nachholText}`);
    return false;
  }
  for (const z of ergebnisKontrolle.zeilen) console.log(z);
  if (ergebnisKontrolle.ohne > 0) {
    console.log(`
!!! WARNUNG: ${ergebnisKontrolle.ohne} Lernende ohne Praxistage – sie sehen einen falschen Stand
!!! (z. B. „Weiter geht's Samstag“, Kompetenzen eines späteren Moduls). Plan-Import erneut ausführen:
${nachholText}`);
    return false;
  }
  return true;
}

const startText = `Startnachricht an die Lernenden: Anmelden selbst per Magic Link auf
   ${ziel.app}
   (E-Mail eingeben, Link aus der Mail öffnen). Keine Einladungsmail verschicken.`;

if (!arg.ausfuehren) {
  if (planOpts) {
    console.log(`
== Plan-Import als Probelauf ==
Hinweis: Dieser Probelauf hat die Einschreibungen eben zurückgerollt. Der Plan-Import-Probelauf
sieht die neuen Lernenden darum noch nicht: Praxistage für neue Lernende zeigt erst der echte Lauf.
Er zeigt aber, ob Plan, Trainer-Datei und Kohorten durchlaufen.`);
    if (!importPlanLauf(false)) abbruch("\nPlan-Import-Probelauf fehlgeschlagen (Meldung oben). Vor dem echten Lauf klären.");
  }
  console.log(`
== Nach dem echten Lauf (--ausfuehren) ==
1. Praxistage: ${planOpts ? "Der echte Lauf mit --plan-datei führt den Plan-Import selbst aus (Probelauf, dann Frage „ja“)." : `Die neuen Lernenden bekommen ihre Praxistage erst über den Plan-Import
   (field_job je aktiver Einschreibung). Am einfachsten denselben Aufruf mit --plan-datei und --trainer-datei,
   sonst danach von Hand:
${nachholText}`}
2. ${startText}`);
  process.exit(0);
}

// Echter Lauf: Lernende sind gespeichert (COMMIT oben).
let importFertig = !planOpts;
if (planOpts) {
  const fehlerText = (grund) => `
!!! ${grund}
!!! Die Lernenden SIND angelegt, haben aber noch KEINE Praxistage (sie sehen einen falschen Stand).
!!! Nachholen:
${nachholText}`;
  if (!importPlanLauf(false)) {
    console.log(fehlerText("Plan-Import-Probelauf fehlgeschlagen (Meldung oben)."));
  } else {
    console.log(`
Prüfen: Bei schon importierten Kohorten sollte oben nur bei field_job und schedule_entry (Praxis) etwas neu sein.
Ist bei live_session oder schedule_entry (live) etwas neu, stimmt vermutlich der Versatz nicht (--kohorte "Name@+7").`);
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const antwort = await rl.question("\nPlan-Import jetzt speichern? Tippe ja: ");
    rl.close();
    if (!istJa(antwort)) {
      console.log(fehlerText("Plan-Import nicht gespeichert (keine Bestätigung)."));
    } else if (!importPlanLauf(true, antwort)) {
      console.log(fehlerText("Plan-Import fehlgeschlagen (Meldung oben)."));
    } else {
      importFertig = true;
    }
  }
}

const kontrolleOk = kontrolle();

console.log(`
== Danach ==
${importFertig && kontrolleOk ? "1. Praxistage: Kontrolle ohne Befund (Lernende ohne Praxistage: 0, Einzelheiten oben)." : "1. Praxistage: NICHT vollständig – siehe Warnung oben, dort steht der Befehl zum Nachholen."}
2. ${startText}`);
if (!importFertig || !kontrolleOk) process.exit(1);
